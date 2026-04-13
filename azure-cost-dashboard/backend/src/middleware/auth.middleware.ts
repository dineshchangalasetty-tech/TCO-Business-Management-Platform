import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { UnauthorizedError } from '../utils/errors';
import { CacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

interface JwtPayload {
  oid: string;        // Object ID
  sub: string;        // Subject
  name?: string;
  preferred_username?: string;
  email?: string;
  roles?: string[];
  tid: string;        // Tenant ID
  aud: string;        // Audience
  iss: string;        // Issuer
  exp: number;
  iat: number;
}

interface MsftOidcConfig {
  jwks_uri: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      accessToken?: string;
    }
  }
}

const cache = CacheService.getInstance();
const JWKS_CACHE_TTL = 3600; // 1 hour

/**
 * MSAL/Azure AD JWT Bearer token authentication middleware.
 * Validates the Authorization header Bearer token against Azure AD JWKS.
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization header missing or malformed');
    }

    const token = authHeader.slice(7);
    const payload = await verifyAzureAdToken(token);

    req.user = payload;
    req.accessToken = token;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      logger.warn('Authentication failed', { error: (error as Error).message });
      next(new UnauthorizedError('Token validation failed'));
    }
  }
}

/**
 * Verify an Azure AD JWT token against the tenant's JWKS endpoint.
 */
async function verifyAzureAdToken(token: string): Promise<JwtPayload> {
  const tenantId = process.env['AZURE_TENANT_ID'];
  const clientId = process.env['AZURE_CLIENT_ID'];

  if (!tenantId || !clientId) {
    throw new UnauthorizedError('Azure AD configuration missing');
  }

  // Decode header to get kid (key ID)
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw new UnauthorizedError('Invalid JWT structure');
  }

  const kid = decoded.header.kid;
  const jwks = await getJwks(tenantId);
  const signingKey = jwks.keys.find((k: { kid: string }) => k.kid === kid);

  if (!signingKey) {
    throw new UnauthorizedError('Signing key not found in JWKS');
  }

  const publicKey = jwkToPem(signingKey);

  try {
    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      audience: clientId,
      issuer: [
        `https://login.microsoftonline.com/${tenantId}/v2.0`,
        `https://sts.windows.net/${tenantId}/`,
      ],
    }) as JwtPayload;

    return payload;
  } catch (jwtError) {
    throw new UnauthorizedError(`Token verification failed: ${(jwtError as Error).message}`);
  }
}

interface JwksKey {
  kid: string;
  n: string;
  e: string;
  kty: string;
  use: string;
  x5c?: string[];
}

async function getJwks(tenantId: string): Promise<{ keys: JwksKey[] }> {
  const cacheKey = `jwks:${tenantId}`;
  const cached = await cache.get<{ keys: JwksKey[] }>(cacheKey);
  if (cached) return cached;

  // Fetch OIDC configuration first to get the JWKS URI
  const oidcConfigUrl = `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`;
  const oidcResponse = await axios.get<MsftOidcConfig>(oidcConfigUrl);
  const jwksUri = oidcResponse.data.jwks_uri;

  const jwksResponse = await axios.get<{ keys: JwksKey[] }>(jwksUri);
  await cache.set(cacheKey, jwksResponse.data, JWKS_CACHE_TTL);
  return jwksResponse.data;
}

/**
 * Convert a JWK RSA key to PEM format.
 */
function jwkToPem(jwk: JwksKey): string {
  if (jwk.x5c?.[0]) {
    return `-----BEGIN CERTIFICATE-----\n${jwk.x5c[0]}\n-----END CERTIFICATE-----`;
  }
  // Minimal base64url → PEM conversion (production should use jwk-to-pem library)
  const n = Buffer.from(jwk.n, 'base64url');
  const e = Buffer.from(jwk.e, 'base64url');
  return buildRsaPublicKey(n, e);
}

function buildRsaPublicKey(n: Buffer, e: Buffer): string {
  function encodeLengthDer(len: number): Buffer {
    if (len < 128) return Buffer.from([len]);
    const bytes = Math.ceil(len.toString(16).length / 2);
    return Buffer.concat([Buffer.from([0x80 | bytes]), Buffer.from(len.toString(16).padStart(bytes * 2, '0'), 'hex')]);
  }

  function encodeInteger(buf: Buffer): Buffer {
    // Prepend 0x00 if high bit set
    const padded = buf[0]! & 0x80 ? Buffer.concat([Buffer.from([0x00]), buf]) : buf;
    return Buffer.concat([Buffer.from([0x02]), encodeLengthDer(padded.length), padded]);
  }

  const modulus = encodeInteger(n);
  const exponent = encodeInteger(e);
  const sequence = Buffer.concat([modulus, exponent]);
  const sequenceWrapped = Buffer.concat([Buffer.from([0x30]), encodeLengthDer(sequence.length), sequence]);

  const algorithmIdentifier = Buffer.from('300d06092a864886f70d0101010500', 'hex');
  const bitString = Buffer.concat([Buffer.from([0x03]), encodeLengthDer(sequenceWrapped.length + 1), Buffer.from([0x00]), sequenceWrapped]);
  const spki = Buffer.concat([Buffer.from([0x30]), encodeLengthDer(algorithmIdentifier.length + bitString.length), algorithmIdentifier, bitString]);

  const b64 = spki.toString('base64').match(/.{1,64}/g)?.join('\n') ?? '';
  return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`;
}

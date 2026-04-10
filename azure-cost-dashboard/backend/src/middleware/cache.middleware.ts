import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

const cache = CacheService.getInstance();

/**
 * Route-level cache middleware.
 * Caches the response for a specified TTL.
 * @param ttlSeconds - Cache TTL in seconds
 * @param keyFn - Optional function to generate a custom cache key from the request
 */
export function cacheMiddleware(
  ttlSeconds: number,
  keyFn?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const cacheKey = keyFn
      ? keyFn(req)
      : `route:${req.method}:${req.originalUrl}:${req.user?.oid ?? 'anon'}`;

    try {
      const cached = await cache.get<unknown>(cacheKey);
      if (cached !== null) {
        logger.debug('Route cache hit', { cacheKey });
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        res.json(cached);
        return;
      }
    } catch {
      // Cache failure is non-fatal — proceed without cache
    }

    // Override res.json to intercept and cache the response
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, body, ttlSeconds).catch((err) => {
          logger.warn('Failed to cache response', { cacheKey, error: err });
        });
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

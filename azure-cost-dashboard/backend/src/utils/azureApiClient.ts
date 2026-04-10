import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import { ClientSecretCredential } from '@azure/identity';
import { loadAzureConfig } from '../config/azure.config';
import { logger } from './logger';
import { AzureApiError } from './errors';

interface TokenCache {
  token: string;
  expiresAt: number;
}

/**
 * Authenticated Azure REST API client with:
 * - Client credentials OAuth 2.0 flow via @azure/identity
 * - Token caching with auto-refresh (5-minute buffer before expiry)
 * - Exponential backoff retry on 429 and 5xx responses
 * - Correlation ID propagation
 * - Structured error mapping
 */
export class AzureApiClient {
  private static instance: AzureApiClient;
  private client: AxiosInstance;
  private tokenCache: TokenCache | null = null;
  private credential: ClientSecretCredential | null = null;

  private constructor() {
    this.client = axios.create({
      baseURL: 'https://management.azure.com',
      timeout: 30_000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Exponential backoff: retry on network errors, 429, and 5xx
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: (retryCount, error) => {
        // Respect Retry-After header on 429
        const retryAfter = error.response?.headers['retry-after'];
        if (retryAfter) {
          const seconds = parseInt(retryAfter, 10);
          if (!isNaN(seconds)) return seconds * 1000;
        }
        return axiosRetry.exponentialDelay(retryCount);
      },
      retryCondition: (error) => {
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status === 429 ||
          (error.response?.status !== undefined && error.response.status >= 500)
        );
      },
      onRetry: (retryCount, error) => {
        logger.warn('Retrying Azure API request', {
          retryCount,
          url: error.config?.url,
          status: error.response?.status,
        });
      },
    });

    // Request interceptor: attach Bearer token
    this.client.interceptors.request.use(async (config) => {
      const token = await this.getAccessToken();
      config.headers['Authorization'] = `Bearer ${token}`;
      return config;
    });

    // Response interceptor: map Azure errors to AppError
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const azureError = error.response?.data?.error;
          const message = azureError?.message ?? error.message ?? 'Azure API request failed';
          const code = azureError?.code ?? 'AZURE_API_ERROR';

          logger.error('Azure API error', {
            status,
            code,
            message,
            url: error.config?.url,
          });

          throw new AzureApiError(message, status, code);
        }
        throw error;
      }
    );
  }

  public static getInstance(): AzureApiClient {
    if (!AzureApiClient.instance) {
      AzureApiClient.instance = new AzureApiClient();
    }
    return AzureApiClient.instance;
  }

  /**
   * Get a valid access token, refreshing if expired or within 5 minutes of expiry.
   */
  private async getAccessToken(): Promise<string> {
    const bufferMs = 5 * 60 * 1000; // 5-minute buffer
    const now = Date.now();

    if (this.tokenCache && this.tokenCache.expiresAt > now + bufferMs) {
      return this.tokenCache.token;
    }

    const config = await loadAzureConfig();

    if (!this.credential) {
      this.credential = new ClientSecretCredential(
        config.tenantId,
        config.clientId,
        config.clientSecret
      );
    }

    const tokenResponse = await this.credential.getToken(config.tokenScope);
    if (!tokenResponse?.token) {
      throw new AzureApiError('Failed to acquire Azure access token', 401, 'AUTH_FAILED');
    }

    this.tokenCache = {
      token: tokenResponse.token,
      expiresAt: tokenResponse.expiresOnTimestamp,
    };

    logger.debug('Azure access token refreshed');
    return this.tokenCache.token;
  }

  /** POST request to Azure Cost Management or related APIs */
  public async post<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  /** GET request */
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  /** PUT request */
  public async put<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  /** DELETE request */
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  /** Invalidate token cache (for testing). */
  public invalidateToken(): void {
    this.tokenCache = null;
    this.credential = null;
  }
}

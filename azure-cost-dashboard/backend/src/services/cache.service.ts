import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class CacheService {
  private static instance: CacheService;
  private client: Redis | null = null;
  private isConnected = false;
  private connectionAttempted = false;

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected || this.connectionAttempted) return;
    this.connectionAttempted = true;
    const redisUrl = process.env['REDIS_URL'];
    if (!redisUrl) {
      logger.warn('REDIS_URL not configured');
      return;
    }
    try {
      this.client = new Redis(redisUrl, {
        connectTimeout: 5000,
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
      this.client.on('error', (err: Error) => {
        logger.error('Redis error', { error: err.message });
        this.isConnected = false;
      });
      this.client.on('ready', () => { this.isConnected = true; });
      this.client.on('end', () => { this.isConnected = false; });
      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      logger.warn('Redis connection failed', { error });
      this.client = null;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn('Cache get failed', { key, error });
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.warn('Cache set failed', { key, error });
    }
  }

  public async getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) { return cached; }
    const value = await fetchFn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  public async invalidate(key: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try { await this.client.del(key); } catch (error) { logger.warn('Cache invalidate failed', { key, error }); }
  }

  public async invalidatePattern(pattern: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) { await this.client.del(...keys); }
    } catch (error) {
      logger.warn('Cache pattern invalidation failed', { pattern, error });
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      this.client.disconnect();
      this.isConnected = false;
      this.client = null;
    }
  }

  public getIsConnected(): boolean { return this.isConnected; }
}

import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Centralized Redis-backed cache.
 * Uses a separate Redis connection from BullMQ (different logical DB index).
 * Follows the cache-aside pattern: callers use getOrSet(key, ttl, loader).
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;
  private readonly defaultTtl: number;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      db: this.config.get<number>('REDIS_CACHE_DB', 1),
      lazyConnect: false,
      maxRetriesPerRequest: 2,
    });
    this.defaultTtl = this.config.get<number>('CACHE_TTL_SECONDS', 300);

    this.client.on('error', (err) => this.logger.error(`Redis cache error: ${err.message}`));
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtl;
    await this.client.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.del(...keys);
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    const stream = this.client.scanStream({ match: `${prefix}*`, count: 100 });
    const pipeline = this.client.pipeline();
    for await (const keys of stream) {
      if (keys.length) pipeline.del(...keys);
    }
    await pipeline.exec();
  }

  /**
   * Cache-aside: fetch from cache; on miss, call loader, store, and return.
   */
  /** Escape hatch for callers that need low-level Redis commands (SET NX, SETEX, EXISTS, ...). */
  getClient(): Redis {
    return this.client;
  }

  async getOrSet<T>(key: string, loader: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await loader();
    if (fresh !== undefined && fresh !== null) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}

/**
 * ANNY — REDIS PLATFORM (PHASE 5)
 * Enterprise in-memory Redis cluster abstraction for caching, sessions, rate limiting,
 * temporary working memory, distributed locking, and Pub/Sub events.
 */

import { envConfigService } from './envConfigService';

export interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

export type PubSubHandler = (channel: string, message: string) => void;

export class RedisPlatform {
  private static instance: RedisPlatform;
  private cacheMap: Map<string, CacheEntry<any>> = new Map();
  private pubSubChannels: Map<string, Set<PubSubHandler>> = new Map();
  private locks: Map<string, { lockId: string; expiresAt: number }> = new Map();
  private isConnected: boolean = false;

  private constructor() {
    const config = envConfigService.getConfig();
    this.isConnected = Boolean(config.redisUrl);
  }

  public static getInstance(): RedisPlatform {
    if (!RedisPlatform.instance) {
      RedisPlatform.instance = new RedisPlatform();
    }
    return RedisPlatform.instance;
  }

  public async checkHealth(): Promise<{ status: 'SIMULATED' | 'NOT_CONFIGURED'; latencyMs: number; keysCount: number }> {
    const startTime = Date.now();
    const config = envConfigService.getConfig();
    return {
      status: config.redisUrl ? 'SIMULATED' : 'NOT_CONFIGURED',
      latencyMs: Date.now() - startTime,
      keysCount: this.cacheMap.size
    };
  }

  // Key-Value Caching
  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    const expiresAt = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
    this.cacheMap.set(key, { value, expiresAt });
    return true;
  }

  public async get<T>(key: string): Promise<T | null> {
    const entry = this.cacheMap.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cacheMap.delete(key);
      return null;
    }

    return entry.value as T;
  }

  public async del(key: string): Promise<boolean> {
    return this.cacheMap.delete(key);
  }

  // Rate Limiting (Token Bucket / Sliding Window)
  public async checkRateLimit(identifier: string, limit: number = 60, windowSeconds: number = 60): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    let records: number[] = (await this.get<number[]>(key)) || [];
    records = records.filter(ts => ts > now - windowMs);

    if (records.length >= limit) {
      const oldest = records[0] || now;
      return {
        allowed: false,
        remaining: 0,
        resetMs: oldest + windowMs - now
      };
    }

    records.push(now);
    await this.set(key, records, windowSeconds);

    return {
      allowed: true,
      remaining: limit - records.length,
      resetMs: windowMs
    };
  }

  // AI Working Memory (Short-term conversation cache)
  public async storeWorkingMemory(sessionId: string, data: any, ttlSeconds: number = 3600): Promise<void> {
    const key = `ai_memory:${sessionId}`;
    let history: any[] = (await this.get<any[]>(key)) || [];
    history.push({ ...data, timestamp: new Date().toISOString() });
    
    // Cap working memory at last 50 turns
    if (history.length > 50) history = history.slice(-50);
    await this.set(key, history, ttlSeconds);
  }

  public async getWorkingMemory(sessionId: string): Promise<any[]> {
    return (await this.get<any[]>(`ai_memory:${sessionId}`)) || [];
  }

  // Distributed Lock
  public async acquireLock(resource: string, ttlMs: number = 10000): Promise<string | null> {
    const lockKey = `lock:${resource}`;
    const now = Date.now();

    const existing = this.locks.get(lockKey);
    if (existing && existing.expiresAt > now) {
      return null; // Resource currently locked
    }

    const lockId = `lock_${Math.random().toString(36).substring(2, 10)}`;
    this.locks.set(lockKey, { lockId, expiresAt: now + ttlMs });
    return lockId;
  }

  public async releaseLock(resource: string, lockId: string): Promise<boolean> {
    const lockKey = `lock:${resource}`;
    const existing = this.locks.get(lockKey);
    if (existing && existing.lockId === lockId) {
      this.locks.delete(lockKey);
      return true;
    }
    return false;
  }

  // Pub/Sub Engine
  public subscribe(channel: string, handler: PubSubHandler): () => void {
    if (!this.pubSubChannels.has(channel)) {
      this.pubSubChannels.set(channel, new Set());
    }

    this.pubSubChannels.get(channel)!.add(handler);

    return () => {
      this.pubSubChannels.get(channel)?.delete(handler);
    };
  }

  public publish(channel: string, message: string): void {
    const handlers = this.pubSubChannels.get(channel);
    if (handlers) {
      handlers.forEach(fn => {
        try { fn(channel, message); } catch (e) { console.error('[Redis PubSub Error]', e); }
      });
    }
  }
}

export const redisPlatform = RedisPlatform.getInstance();

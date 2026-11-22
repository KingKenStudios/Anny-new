import { Request, Response, NextFunction } from 'express';
import { createRequire } from 'module';

function getRedisClass(): any {
  if (typeof window !== 'undefined') return null;
  try {
    const req = createRequire(import.meta.url);
    const redis = req('ioredis');
    return redis.default || redis;
  } catch {
    return null;
  }
}

export type RateLimitTier = 'default' | 'auth' | 'aiGeneration' | 'uploadStorage' | 'admin';

export interface RateLimitTierConfig {
  maxRequests: number;
  windowSeconds: number;
}

const DEFAULT_TIERS: Record<RateLimitTier, RateLimitTierConfig> = {
  auth: { maxRequests: 15, windowSeconds: 60 },
  admin: { maxRequests: 60, windowSeconds: 60 },
  aiGeneration: { maxRequests: 40, windowSeconds: 60 },
  uploadStorage: { maxRequests: 30, windowSeconds: 60 },
  default: { maxRequests: 200, windowSeconds: 60 }
};

export class RedisRateLimiter {
  private redisClient: any = null;
  private isConnected: boolean = false;
  private readonly defaultConfig: RateLimitTierConfig = DEFAULT_TIERS.default;

  // In-memory fallback map if Redis server is unreachable in local container
  private memoryStore: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    const redisUrl = String(process.env.REDIS_URL || '').trim();
    const redisHost = String(process.env.REDIS_HOST || '').trim();
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD || undefined;

    if (!redisUrl && !redisHost) {
      this.isConnected = false;
      return;
    }

    const RedisClass = getRedisClass();
    if (RedisClass) {
      try {
        this.redisClient = redisUrl
          ? new RedisClass(redisUrl, {
              lazyConnect: true,
              maxRetriesPerRequest: 1,
              retryStrategy: () => null
            })
          : new RedisClass({
              host: redisHost,
              port: redisPort,
              password: redisPassword,
              lazyConnect: true,
              maxRetriesPerRequest: 1,
              retryStrategy: () => null
            });

        this.redisClient.on('error', () => {
          this.isConnected = false;
        });

        this.redisClient.connect().then(() => {
          this.isConnected = true;
          console.log('[RedisRateLimiter] Connected to Redis for API Gateway rate limiting.');
        }).catch((err: any) => {
          console.warn('[RedisRateLimiter] Redis server unavailable, using internal rate limiter:', err.message);
          this.isConnected = false;
        });
      } catch {
        this.isConnected = false;
      }
    }
  }

  /**
   * Derives a trustworthy rate-limit identity.
   * - Never trusts client-spoofed `x-user-id` headers.
   * - Relies on Express `req.ip` (which only honors X-Forwarded-For when Express `trust proxy` is enabled)
   *   and `req.authUser?.uid` / verified `req.user?.userId` populated by serverAuthService.
   */
  public resolveClientIdentity(req: Request): string {
    const authUser = (req as any).authUser;
    const verifiedUserId =
      (typeof authUser?.uid === 'string' && authUser.uid) ||
      (typeof (req as any).user?.userId === 'string' && (req as any).user.userId) ||
      (typeof (req as any).user?.id === 'string' && (req as any).user.id) ||
      '';

    if (verifiedUserId) {
      return `user:${verifiedUserId}`;
    }

    const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    return `ip:${clientIp}`;
  }

  public createTierMiddleware(tier: RateLimitTier, overrideConfig?: Partial<RateLimitTierConfig>) {
    const baseCfg = DEFAULT_TIERS[tier] || this.defaultConfig;
    const cfg: RateLimitTierConfig = {
      maxRequests: overrideConfig?.maxRequests ?? baseCfg.maxRequests,
      windowSeconds: overrideConfig?.windowSeconds ?? baseCfg.windowSeconds
    };

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const clientId = this.resolveClientIdentity(req);
      const currentWindow = Math.floor(Date.now() / 1000 / cfg.windowSeconds);
      const key = `ratelimit:${tier}:${clientId}:${currentWindow}`;

      let currentCount = 0;

      if (this.isConnected && this.redisClient) {
        try {
          const multi = this.redisClient.multi();
          multi.incr(key);
          multi.expire(key, cfg.windowSeconds);
          const results = await multi.exec();
          if (results && results[0] && !results[0][0]) {
            currentCount = results[0][1] as number;
          } else {
            currentCount = this.checkMemoryFallback(key, cfg.windowSeconds);
          }
        } catch (err) {
          console.warn('[RedisRateLimiter] Redis operation error, falling back to memory store:', (err as Error).message);
          currentCount = this.checkMemoryFallback(key, cfg.windowSeconds);
        }
      } else {
        currentCount = this.checkMemoryFallback(key, cfg.windowSeconds);
      }

      const remaining = Math.max(0, cfg.maxRequests - currentCount);
      const resetEpoch = (currentWindow + 1) * cfg.windowSeconds;

      res.setHeader('X-RateLimit-Tier', tier);
      res.setHeader('X-RateLimit-Limit', cfg.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetEpoch);

      if (currentCount > cfg.maxRequests) {
        res.setHeader('Retry-After', cfg.windowSeconds);
        res.status(429).json({
          error: 'Too Many Requests',
          tier,
          message: `Rate limit of ${cfg.maxRequests} requests per ${cfg.windowSeconds}s exceeded for ${tier}. Please try again shortly.`,
          statusCode: 429,
          resetInSeconds: cfg.windowSeconds
        });
        return;
      }

      next();
    };
  }

  /**
   * Default Express middleware intercepting incoming API gateway requests.
   */
  public middleware = this.createTierMiddleware('default');

  public authMiddleware = this.createTierMiddleware('auth');
  public adminMiddleware = this.createTierMiddleware('admin');
  public aiGenerationMiddleware = this.createTierMiddleware('aiGeneration');
  public uploadStorageMiddleware = this.createTierMiddleware('uploadStorage');

  private checkMemoryFallback(bucketKey: string, windowSeconds: number): number {
    const now = Date.now();
    const entry = this.memoryStore.get(bucketKey);

    if (!entry || now > entry.resetTime) {
      this.memoryStore.set(bucketKey, { count: 1, resetTime: now + windowSeconds * 1000 });
      // Prune stale buckets periodically to keep memory bounded
      if (this.memoryStore.size > 5000) {
        for (const [k, v] of this.memoryStore.entries()) {
          if (now > v.resetTime) this.memoryStore.delete(k);
        }
      }
      return 1;
    }

    entry.count += 1;
    return entry.count;
  }
}

export const redisRateLimiter = new RedisRateLimiter();

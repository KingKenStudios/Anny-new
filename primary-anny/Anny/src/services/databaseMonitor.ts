import { createRequire } from 'module';
import { auditService } from './auditService';

function getPgPoolClass(): any {
  if (typeof window !== 'undefined') return null;
  try {
    const req = createRequire(import.meta.url);
    const pg = req('pg');
    return pg.Pool || pg.default?.Pool;
  } catch {
    return null;
  }
}

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

export interface DatabaseStatusReport {
  postgres: {
    status: 'online' | 'degraded' | 'offline' | 'not_configured';
    configured: boolean;
    latencyMs: number;
    error?: string;
  };
  redis: {
    status: 'online' | 'degraded' | 'offline' | 'not_configured';
    configured: boolean;
    latencyMs: number;
    error?: string;
  };
  lastCheckedAt: string;
}

export class DatabaseMonitor {
  private pgPool: any = null;
  private redisClient: any = null;
  private pgConfigured: boolean = false;
  private redisConfigured: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs: number = 15000;
  private readonly latencySpikeThresholdMs: number = 150;

  private currentStatus: DatabaseStatusReport = {
    postgres: { status: 'not_configured', configured: false, latencyMs: 0 },
    redis: { status: 'not_configured', configured: false, latencyMs: 0 },
    lastCheckedAt: new Date().toISOString()
  };

  constructor() {
    // Only connect to PostgreSQL when explicitly configured via DATABASE_URL
    const pgConnectionString = String(process.env.DATABASE_URL || '').trim();
    const PgPoolClass = pgConnectionString ? getPgPoolClass() : null;
    if (pgConnectionString && PgPoolClass) {
      this.pgConfigured = true;
      try {
        this.pgPool = new PgPoolClass({
          connectionString: pgConnectionString,
          connectionTimeoutMillis: 3000,
          max: 5
        });
      } catch (err) {
        console.warn('[DatabaseMonitor] PG Pool setup warning:', (err as Error).message);
      }
    }

    // Only connect to Redis when explicitly configured via REDIS_URL or REDIS_HOST
    const redisUrl = String(process.env.REDIS_URL || '').trim();
    const redisHost = String(process.env.REDIS_HOST || '').trim();
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const RedisClass = (redisUrl || redisHost) ? getRedisClass() : null;
    if ((redisUrl || redisHost) && RedisClass) {
      this.redisConfigured = true;
      try {
        this.redisClient = redisUrl
          ? new RedisClass(redisUrl, {
              lazyConnect: true,
              connectTimeout: 3000,
              retryStrategy: () => null
            })
          : new RedisClass({
              host: redisHost,
              port: redisPort,
              password: process.env.REDIS_PASSWORD || undefined,
              lazyConnect: true,
              connectTimeout: 3000,
              retryStrategy: () => null
            });

        this.redisClient.on('error', () => {
          // Prevent unhandled error event crash when optional Redis server is unreachable
        });
      } catch (err) {
        console.warn('[DatabaseMonitor] Redis client setup warning:', (err as Error).message);
      }
    }
  }

  /**
   * Starts periodic database and Redis health monitor when either optional service is configured.
   */
  public startMonitoring(): void {
    if (this.intervalId) return;
    if (!this.pgConfigured && !this.redisConfigured) {
      this.currentStatus = {
        postgres: { status: 'not_configured', configured: false, latencyMs: 0 },
        redis: { status: 'not_configured', configured: false, latencyMs: 0 },
        lastCheckedAt: new Date().toISOString()
      };
      return;
    }

    console.log(`[DatabaseMonitor] Starting database health monitoring service (interval: ${this.checkIntervalMs}ms)...`);
    void this.executeCheck();

    this.intervalId = setInterval(() => {
      void this.executeCheck();
    }, this.checkIntervalMs);
  }

  public stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public async executeCheck(): Promise<DatabaseStatusReport> {
    const timestamp = new Date().toISOString();

    let pgLatencyMs = 0;
    let pgStatus: 'online' | 'degraded' | 'offline' | 'not_configured' = this.pgConfigured ? 'offline' : 'not_configured';
    let pgError: string | undefined = undefined;

    if (this.pgPool) {
      const startTime = performance.now();
      try {
        const client = await this.pgPool.connect();
        try {
          await client.query('SELECT 1');
          pgLatencyMs = Math.round(performance.now() - startTime);
          pgStatus = pgLatencyMs > this.latencySpikeThresholdMs ? 'degraded' : 'online';
        } finally {
          client.release();
        }
      } catch (err) {
        pgStatus = 'offline';
        pgError = (err as Error).message;
        pgLatencyMs = Math.round(performance.now() - startTime);
      }
    }

    let redisLatencyMs = 0;
    let redisStatus: 'online' | 'degraded' | 'offline' | 'not_configured' = this.redisConfigured ? 'offline' : 'not_configured';
    let redisError: string | undefined = undefined;

    if (this.redisClient) {
      const startTime = performance.now();
      try {
        const pong = await this.redisClient.ping();
        redisLatencyMs = Math.round(performance.now() - startTime);
        redisStatus = pong === 'PONG'
          ? (redisLatencyMs > this.latencySpikeThresholdMs ? 'degraded' : 'online')
          : 'degraded';
      } catch (err) {
        redisStatus = 'offline';
        redisError = (err as Error).message;
        redisLatencyMs = Math.round(performance.now() - startTime);
      }
    }

    this.currentStatus = {
      postgres: { status: pgStatus, configured: this.pgConfigured, latencyMs: pgLatencyMs, error: pgError },
      redis: { status: redisStatus, configured: this.redisConfigured, latencyMs: redisLatencyMs, error: redisError },
      lastCheckedAt: timestamp
    };

    if (pgLatencyMs > this.latencySpikeThresholdMs || redisLatencyMs > this.latencySpikeThresholdMs) {
      console.warn(`[DatabaseMonitor] Latency spike detected! PG: ${pgLatencyMs}ms, Redis: ${redisLatencyMs}ms`);
      await auditService.logEvent({
        action: 'database_latency_spike',
        severity: 'warning',
        details: {
          pgLatencyMs,
          redisLatencyMs,
          thresholdMs: this.latencySpikeThresholdMs,
          pgStatus,
          redisStatus,
          timestamp
        }
      });
    }

    return this.currentStatus;
  }

  public getMonitorStatus(): DatabaseStatusReport {
    return this.currentStatus;
  }
}

export const databaseMonitor = new DatabaseMonitor();

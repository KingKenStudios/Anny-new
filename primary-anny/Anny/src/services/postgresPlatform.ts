/**
 * ANNY — POSTGRESQL PLATFORM (PHASE 4)
 * High-performance PostgreSQL platform supporting ORM query abstraction,
 * connection pooling, health checks, transaction management, schema migrations, and audit logging.
 */

import { createRequire } from 'module';
import { envConfigService } from './envConfigService';
import { registerServerPostgresPlatform } from './postgresBridge';

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

/** Production must never report volatile in-memory storage as durable persistence. */
export function requiresDurablePersistence(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === 'production' || env.ANNY_REQUIRE_DURABLE_PERSISTENCE === 'true';
}

export interface DatabaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId?: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress?: string;
}

export interface MigrationStatus {
  version: string;
  name: string;
  appliedAt: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface PostgresHealthResult {
  status: 'CONNECTED' | 'SIMULATED' | 'CONNECTION_FAILED' | 'NOT_CONFIGURED';
  configured: boolean;
  readStatus: 'POSTGRESQL_READ_PASS' | 'POSTGRESQL_READ_FAIL' | 'NOT_CONFIGURED' | 'SIMULATED';
  writeStatus: 'POSTGRESQL_WRITE_PASS' | 'POSTGRESQL_WRITE_FAIL' | 'NOT_CONFIGURED' | 'SIMULATED';
  latencyMs: number;
  poolSize: number;
  activeDatabase?: string;
  error?: string;
}

export class PostgresPlatform {
  private static instance: PostgresPlatform;
  private pool: any = null;
  private isConnected: boolean = false;
  private inMemoryTables: Map<string, Map<string, DatabaseRecord>> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private migrations: MigrationStatus[] = [];

  private constructor() {
    this.initializeSchemaAndMemory();
    registerServerPostgresPlatform(this);
  }

  public static getInstance(): PostgresPlatform {
    if (!PostgresPlatform.instance) {
      PostgresPlatform.instance = new PostgresPlatform();
    }
    return PostgresPlatform.instance;
  }

  private initializeSchemaAndMemory(): void {
    const config = envConfigService.getConfig();
    const dbUrl = config.databaseUrl || process.env.DATABASE_URL || process.env.POSTGRES_URL;
    const PgPoolClass = getPgPoolClass();

    if (dbUrl && PgPoolClass) {
      try {
        this.pool = new PgPoolClass({
          connectionString: dbUrl,
          connectionTimeoutMillis: 3000,
          idleTimeoutMillis: 10000,
          max: 10
        });
        this.isConnected = true;
      } catch (e: any) {
        console.warn('[PostgresPlatform] Failed to initialize pg Pool:', e.message);
        this.pool = null;
        this.isConnected = false;
      }
    }

    // Bootstrap core system tables for in-memory fallback & migration tracking
    this.inMemoryTables.set('users', new Map());
    this.inMemoryTables.set('sessions', new Map());
    this.inMemoryTables.set('projects', new Map());
    this.inMemoryTables.set('audit_logs', new Map());
    this.inMemoryTables.set('ai_executions', new Map());
    this.inMemoryTables.set('memory_items', new Map());
    this.inMemoryTables.set('studio_records', new Map());

    // No versioned migration has run yet. Schema creation is performed by the
    // live health/bootstrap path and must not be represented as a completed migration.
  }

  public async checkHealth(): Promise<PostgresHealthResult> {
    const startTime = Date.now();
    const config = envConfigService.getConfig();
    const dbUrl = config.databaseUrl || process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (!dbUrl || !this.pool) {
      const latencyMs = Date.now() - startTime;
      return {
        status: 'NOT_CONFIGURED',
        configured: false,
        readStatus: 'NOT_CONFIGURED',
        writeStatus: 'NOT_CONFIGURED',
        latencyMs,
        poolSize: 0,
        error: 'POSTGRESQL_NOT_CONFIGURED (Set DATABASE_URL in env to activate live Postgres database)'
      };
    }

    try {
      // Perform live SELECT 1 test
      const selectRes = await this.pool.query('SELECT NOW() as current_time, current_database() as db_name;');
      const activeDb = selectRes.rows[0]?.db_name || 'postgres';

      // Ensure test memory table exists
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS memory_items (
          id VARCHAR(100) PRIMARY KEY,
          owner_user_id VARCHAR(160) NOT NULL DEFAULT 'anonymous',
          session_id VARCHAR(160),
          project_id VARCHAR(160),
          scope VARCHAR(20) NOT NULL DEFAULT 'private',
          type VARCHAR(50),
          content TEXT,
          topic VARCHAR(180),
          importance DOUBLE PRECISION DEFAULT 0.5,
          source VARCHAR(50) DEFAULT 'system',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_memory_owner_scope ON memory_items(owner_user_id, scope);
        CREATE INDEX IF NOT EXISTS idx_memory_project ON memory_items(project_id);
        CREATE INDEX IF NOT EXISTS idx_memory_topic ON memory_items(topic);
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(100) PRIMARY KEY,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          user_id VARCHAR(160),
          action VARCHAR(100) NOT NULL,
          resource VARCHAR(180) NOT NULL,
          details JSONB NOT NULL DEFAULT '{}'::jsonb,
          ip_address VARCHAR(64)
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
        CREATE TABLE IF NOT EXISTS studio_records (
          id VARCHAR(100) PRIMARY KEY,
          owner_user_id VARCHAR(160) NOT NULL,
          kind VARCHAR(40) NOT NULL,
          title VARCHAR(160) NOT NULL,
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_studio_records_owner ON studio_records(owner_user_id, created_at DESC);
      `);

      const latencyMs = Date.now() - startTime;
      return {
        status: 'CONNECTED',
        configured: true,
        readStatus: 'POSTGRESQL_READ_PASS',
        writeStatus: 'POSTGRESQL_WRITE_PASS',
        latencyMs,
        poolSize: this.pool.totalCount || 1,
        activeDatabase: activeDb
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        status: 'CONNECTION_FAILED',
        configured: true,
        readStatus: 'POSTGRESQL_READ_FAIL',
        writeStatus: 'POSTGRESQL_WRITE_FAIL',
        latencyMs,
        poolSize: 0,
        error: `POSTGRESQL_CONNECTION_FAILED: ${err.message}`
      };
    }
  }

  public isDurableDatabaseAvailable(): boolean {
    return Boolean(this.pool);
  }

  private authSessionSchemaPromise: Promise<void> | null = null;

  private async ensureAuthSessionSchema(): Promise<void> {
    if (!this.pool) return;
    if (!this.authSessionSchemaPromise) {
      this.authSessionSchemaPromise = this.pool.query(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          token_hash CHAR(64) PRIMARY KEY,
          refresh_token_hash CHAR(64) NOT NULL UNIQUE,
          user_id VARCHAR(160) NOT NULL,
          username VARCHAR(320) NOT NULL,
          role VARCHAR(40) NOT NULL,
          access_expires_at BIGINT NOT NULL,
          refresh_expires_at BIGINT NOT NULL,
          revoked_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
          ON auth_sessions(user_id, access_expires_at) WHERE revoked_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_auth_sessions_refresh_active
          ON auth_sessions(refresh_token_hash) WHERE revoked_at IS NULL;
      `).then(() => undefined).catch((error: any) => {
        this.authSessionSchemaPromise = null;
        throw new Error(`POSTGRES_AUTH_SESSION_SCHEMA_FAILED: ${error?.message || 'Unable to initialize auth session storage.'}`);
      });
    }
    await this.authSessionSchemaPromise;
  }

  private async withAuthSessionPersistence<T>(
    operation: (pool: any) => Promise<T>,
    fallback: T
  ): Promise<T> {
    if (!this.pool) {
      if (requiresDurablePersistence()) {
        throw new Error('POSTGRES_NOT_CONFIGURED: Durable authentication session storage is required.');
      }
      return fallback;
    }
    await this.ensureAuthSessionSchema();
    return operation(this.pool);
  }

  /** Persist only one-way hashes of bearer credentials; raw tokens never enter PostgreSQL. */
  public async storeAuthSession(record: {
    tokenHash: string;
    refreshTokenHash: string;
    userId: string;
    username: string;
    role: string;
    accessExpiresAt: number;
    refreshExpiresAt: number;
  }): Promise<boolean> {
    return this.withAuthSessionPersistence(async pool => {
      await pool.query(
        `INSERT INTO auth_sessions
          (token_hash, refresh_token_hash, user_id, username, role, access_expires_at, refresh_expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [record.tokenHash, record.refreshTokenHash, record.userId, record.username, record.role,
          record.accessExpiresAt, record.refreshExpiresAt]
      );
      return true;
    }, false);
  }

  public async findAuthSessionByTokenHash(tokenHash: string): Promise<any | null> {
    return this.withAuthSessionPersistence(async pool => {
      const result = await pool.query(
        `SELECT token_hash, refresh_token_hash, user_id, username, role,
                access_expires_at, refresh_expires_at, revoked_at
           FROM auth_sessions
          WHERE token_hash = $1 AND revoked_at IS NULL AND access_expires_at > $2
          LIMIT 1`,
        [tokenHash, Date.now()]
      );
      return result.rows[0] || null;
    }, null);
  }

  public async findAuthSessionByRefreshHash(refreshTokenHash: string): Promise<any | null> {
    return this.withAuthSessionPersistence(async pool => {
      const result = await pool.query(
        `SELECT token_hash, refresh_token_hash, user_id, username, role,
                access_expires_at, refresh_expires_at, revoked_at
           FROM auth_sessions
          WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND refresh_expires_at > $2
          LIMIT 1`,
        [refreshTokenHash, Date.now()]
      );
      return result.rows[0] || null;
    }, null);
  }

  public async revokeAuthSessionByTokenHash(tokenHash: string): Promise<boolean> {
    return this.withAuthSessionPersistence(async pool => {
      const result = await pool.query(
        'UPDATE auth_sessions SET revoked_at = NOW(), updated_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
        [tokenHash]
      );
      return Number(result.rowCount || 0) > 0;
    }, false);
  }

  public async revokeAuthSessionByRefreshHash(refreshTokenHash: string): Promise<boolean> {
    return this.withAuthSessionPersistence(async pool => {
      const result = await pool.query(
        'UPDATE auth_sessions SET revoked_at = NOW(), updated_at = NOW() WHERE refresh_token_hash = $1 AND revoked_at IS NULL',
        [refreshTokenHash]
      );
      return Number(result.rowCount || 0) > 0;
    }, false);
  }

  public async revokeAuthSessionsForUser(userId: string): Promise<number> {
    return this.withAuthSessionPersistence(async pool => {
      const result = await pool.query(
        'UPDATE auth_sessions SET revoked_at = NOW(), updated_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId]
      );
      return Number(result.rowCount || 0);
    }, 0);
  }

  /** Atomically consumes an old refresh credential and inserts its replacement. */
  public async rotateAuthSession(
    oldRefreshTokenHash: string,
    replacement: {
      tokenHash: string;
      refreshTokenHash: string;
      userId: string;
      username: string;
      role: string;
      accessExpiresAt: number;
      refreshExpiresAt: number;
    }
  ): Promise<boolean> {
    return this.withAuthSessionPersistence(async pool => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const revoked = await client.query(
          `UPDATE auth_sessions SET revoked_at = NOW(), updated_at = NOW()
            WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND refresh_expires_at > $2`,
          [oldRefreshTokenHash, Date.now()]
        );
        if (Number(revoked.rowCount || 0) !== 1) {
          await client.query('ROLLBACK');
          return false;
        }
        await client.query(
          `INSERT INTO auth_sessions
            (token_hash, refresh_token_hash, user_id, username, role, access_expires_at, refresh_expires_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [replacement.tokenHash, replacement.refreshTokenHash, replacement.userId,
            replacement.username, replacement.role, replacement.accessExpiresAt, replacement.refreshExpiresAt]
        );
        await client.query('COMMIT');
        return true;
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch {}
        throw error;
      } finally {
        client.release();
      }
    }, false);
  }

  // Generic Repository Queries with Postgres Pool or In-Memory fallback
  public async insert<T extends DatabaseRecord>(tableName: string, record: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const now = new Date().toISOString();
    const id = `${tableName}_${Math.random().toString(36).substring(2, 10)}`;
    const fullRecord = {
      ...record,
      id,
      createdAt: now,
      updatedAt: now
    } as unknown as T;

    if (this.pool) {
      if (tableName === 'studio_records') {
        try {
          await this.pool.query(
            `INSERT INTO studio_records (id, owner_user_id, kind, title, payload, updated_at)
             VALUES ($1,$2,$3,$4,$5::jsonb,NOW())
             ON CONFLICT (id) DO UPDATE SET kind=$3, title=$4, payload=$5::jsonb, updated_at=NOW()`,
            [
              id,
              String((record as any).ownerUserId || 'anonymous'),
              String((record as any).kind || 'architecture'),
              String((record as any).title || 'Untitled Record'),
              JSON.stringify((record as any).payload || {})
            ]
          );
        } catch (err: any) {
          throw new Error(`POSTGRES_WRITE_FAILED: studio_records insert was not persisted: ${err.message}`);
        }
      } else if (tableName === 'memory_items') {
        try {
          await this.pool.query(
            `INSERT INTO memory_items (id, owner_user_id, session_id, project_id, scope, type, content, topic, importance, source, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
             ON CONFLICT (id) DO UPDATE SET content=$7, topic=$8, importance=$9, source=$10, updated_at=NOW()`,
            [id, (record as any).owner_user_id || 'anonymous', (record as any).session_id || 'default', (record as any).project_id || 'default', (record as any).scope || 'private', (record as any).type || 'general', String((record as any).content || ''), (record as any).topic || null, Number((record as any).importance ?? 0.5), (record as any).source || 'system']
          );
        } catch (err: any) {
          throw new Error(`POSTGRES_WRITE_FAILED: memory_items insert was not persisted: ${err.message}`);
        }
      } else {
        throw new Error(`POSTGRES_TABLE_NOT_IMPLEMENTED: durable inserts for '${tableName}' are not implemented; refusing an in-memory success response.`);
      }
    } else if (requiresDurablePersistence()) {
      throw new Error('POSTGRES_NOT_CONFIGURED: durable persistence is required; in-memory insert is disabled.');
    }

    if (!this.pool) {
      if (!this.inMemoryTables.has(tableName)) {
        this.inMemoryTables.set(tableName, new Map());
      }
      this.inMemoryTables.get(tableName)!.set(id, fullRecord);
    }

    await this.logAudit({
      action: 'INSERT',
      resource: tableName,
      details: { recordId: id }
    });

    return fullRecord;
  }

  public async findById<T extends DatabaseRecord>(tableName: string, id: string): Promise<T | null> {
    if (this.pool) {
      if (tableName === 'studio_records') {
        try {
          const res = await this.pool.query('SELECT * FROM studio_records WHERE id = $1', [id]);
          if (res.rows.length === 0) return null;
          const row = res.rows[0];
          return {
            id: row.id, ownerUserId: row.owner_user_id, kind: row.kind, title: row.title, payload: row.payload,
            createdAt: row.created_at, updatedAt: row.updated_at
          } as unknown as T;
        } catch (err: any) {
          throw new Error(`POSTGRES_READ_FAILED: studio_records lookup failed: ${err.message}`);
        }
      }
      if (tableName !== 'memory_items') {
        throw new Error(`POSTGRES_TABLE_NOT_IMPLEMENTED: durable reads for '${tableName}' are not implemented.`);
      }
      try {
        const res = await this.pool.query('SELECT * FROM memory_items WHERE id = $1', [id]);
        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        return {
          id: row.id, owner_user_id: row.owner_user_id, session_id: row.session_id, project_id: row.project_id,
          scope: row.scope, type: row.type, content: row.content, topic: row.topic, importance: row.importance, source: row.source,
          created_at: row.created_at, updated_at: row.updated_at, createdAt: row.created_at, updatedAt: row.updated_at
        } as unknown as T;
      } catch (err: any) {
        throw new Error(`POSTGRES_READ_FAILED: memory_items lookup failed: ${err.message}`);
      }
    } else if (requiresDurablePersistence()) {
      throw new Error('POSTGRES_NOT_CONFIGURED: durable persistence is required; in-memory reads are disabled.');
    }

    const table = this.inMemoryTables.get(tableName);
    if (!table || !table.has(id)) return null;
    return table.get(id) as T;
  }

  /**
   * Retrieve memory rows by exact owner and scope before ranking them.
   * This prevents unrelated users' rows from being loaded into the application
   * and avoids the generic 100-row window hiding older memories.
   */
  public async queryMemoryItems(
    ownerUserId: string,
    scope: 'private' | 'global',
    limit: number = 100
  ): Promise<DatabaseRecord[]> {
    const owner = String(ownerUserId || '').trim();
    if (!owner || (scope === 'global' && owner !== 'global') || (scope === 'private' && owner === 'global')) {
      return [];
    }
    const safeLimit = Math.max(1, Math.min(500, Math.floor(Number(limit) || 100)));

    if (this.pool) {
      try {
        const res = await this.pool.query(
          'SELECT * FROM memory_items WHERE owner_user_id = $1 AND scope = $2 ORDER BY importance DESC, created_at DESC LIMIT $3',
          [owner, scope, safeLimit]
        );
        return res.rows.map(row => ({
          id: row.id,
          owner_user_id: row.owner_user_id,
          session_id: row.session_id,
          project_id: row.project_id,
          scope: row.scope,
          type: row.type,
          content: row.content,
          topic: row.topic,
          importance: row.importance,
          source: row.source,
          created_at: row.created_at,
          updated_at: row.updated_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
      } catch (err: any) {
        throw new Error(\`POSTGRES_READ_FAILED: scoped memory retrieval failed: \${err.message}\`);
      }
    }

    if (requiresDurablePersistence()) {
      throw new Error('POSTGRES_NOT_CONFIGURED: durable scoped memory retrieval is required.');
    }

    const table = this.inMemoryTables.get('memory_items');
    if (!table) return [];
    return (Array.from(table.values()) as DatabaseRecord[])
      .filter(row => row.owner_user_id === owner && row.scope === scope)
      .sort((a, b) =>
        Number(b.importance ?? 0) - Number(a.importance ?? 0) ||
        String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
      )
      .slice(0, safeLimit);
  }

  public async query<T extends DatabaseRecord>(tableName: string, filterFn?: (item: T) => boolean): Promise<T[]> {
    if (this.pool) {
      if (tableName === 'studio_records') {
        try {
          const res = await this.pool.query('SELECT * FROM studio_records ORDER BY created_at DESC LIMIT 100');
          const items = res.rows.map(row => ({
            id: row.id, ownerUserId: row.owner_user_id, kind: row.kind, title: row.title, payload: row.payload,
            createdAt: row.created_at, updatedAt: row.updated_at
          })) as unknown as T[];
          return filterFn ? items.filter(filterFn) : items;
        } catch (err: any) {
          throw new Error(`POSTGRES_READ_FAILED: studio_records query failed: ${err.message}`);
        }
      }
      if (tableName !== 'memory_items') {
        throw new Error(`POSTGRES_TABLE_NOT_IMPLEMENTED: durable queries for '${tableName}' are not implemented.`);
      }
      try {
        const res = await this.pool.query('SELECT * FROM memory_items ORDER BY created_at DESC LIMIT 100');
        const items = res.rows.map(row => ({
          id: row.id, owner_user_id: row.owner_user_id, session_id: row.session_id, project_id: row.project_id,
          scope: row.scope, type: row.type, content: row.content, topic: row.topic, importance: row.importance, source: row.source,
          created_at: row.created_at, updated_at: row.updated_at, createdAt: row.created_at, updatedAt: row.updated_at
        })) as unknown as T[];
        return filterFn ? items.filter(filterFn) : items;
      } catch (err: any) {
        throw new Error(`POSTGRES_READ_FAILED: memory_items query failed: ${err.message}`);
      }
    } else if (requiresDurablePersistence()) {
      throw new Error('POSTGRES_NOT_CONFIGURED: durable persistence is required; in-memory queries are disabled.');
    }

    const table = this.inMemoryTables.get(tableName);
    if (!table) return [];

    const items = Array.from(table.values()) as T[];
    return filterFn ? items.filter(filterFn) : items;
  }

  public async update<T extends DatabaseRecord>(tableName: string, id: string, updates: Partial<T>): Promise<T | null> {
    if (this.pool || requiresDurablePersistence()) {
      throw new Error(`POSTGRES_UPDATE_NOT_IMPLEMENTED: durable updates for '${tableName}' are not implemented; refusing an in-memory mutation.`);
    }
    const table = this.inMemoryTables.get(tableName);
    if (!table || !table.has(id)) return null;

    const existing = table.get(id) as T;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    table.set(id, updated);

    await this.logAudit({
      action: 'UPDATE',
      resource: tableName,
      details: { recordId: id, fields: Object.keys(updates) }
    });

    return updated;
  }

  public async delete(tableName: string, id: string): Promise<boolean> {
    if (this.pool || requiresDurablePersistence()) {
      throw new Error(`POSTGRES_DELETE_NOT_IMPLEMENTED: durable deletes for '${tableName}' are not implemented; refusing an in-memory mutation.`);
    }
    const table = this.inMemoryTables.get(tableName);
    if (!table || !table.has(id)) return false;

    table.delete(id);
    await this.logAudit({
      action: 'DELETE',
      resource: tableName,
      details: { recordId: id }
    });

    return true;
  }

  // Audit Logging
  public async logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const fullEntry: AuditLogEntry = {
      id: `audit_${Math.random().toString(36).substring(2, 10)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };

    if (this.pool) {
      try {
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR(100) PRIMARY KEY,
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            user_id VARCHAR(160),
            action VARCHAR(100) NOT NULL,
            resource VARCHAR(180) NOT NULL,
            details JSONB NOT NULL DEFAULT '{}'::jsonb,
            ip_address VARCHAR(64)
          )
        `);
        await this.pool.query(
          `INSERT INTO audit_logs (id, timestamp, user_id, action, resource, details, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
          [fullEntry.id, fullEntry.timestamp, fullEntry.userId || null, fullEntry.action,
            fullEntry.resource, JSON.stringify(fullEntry.details || {}), fullEntry.ipAddress || null]
        );
        return fullEntry;
      } catch (err: any) {
        throw new Error(`POSTGRES_AUDIT_WRITE_FAILED: audit event was not persisted: ${err.message}`);
      }
    }
    if (requiresDurablePersistence()) {
      throw new Error('POSTGRES_NOT_CONFIGURED: durable audit logging is required; in-memory audit logging is disabled.');
    }
    this.auditLogs.push(fullEntry);
    if (this.auditLogs.length > 1000) this.auditLogs.shift();
    return fullEntry;
  }

  public getAuditLogs(limit: number = 50): AuditLogEntry[] {
    if (this.pool || requiresDurablePersistence()) {
      throw new Error('POSTGRES_AUDIT_READ_ASYNC_REQUIRED: use a durable asynchronous audit query before exposing audit records.');
    }
    return [...this.auditLogs].reverse().slice(0, limit);
  }

  public async getAuditLogsAsync(limit: number = 50): Promise<AuditLogEntry[]> {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    if (this.pool) {
      try {
        const res = await this.pool.query(
          'SELECT id, timestamp, user_id, action, resource, details, ip_address FROM audit_logs ORDER BY timestamp DESC LIMIT $1',
          [safeLimit]
        );
        return res.rows.map((row: any) => ({
          id: row.id,
          timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : String(row.timestamp),
          userId: row.user_id || undefined,
          action: row.action,
          resource: row.resource,
          details: row.details || {},
          ipAddress: row.ip_address || undefined
        }));
      } catch (err: any) {
        throw new Error(`POSTGRES_AUDIT_READ_FAILED: ${err.message}`);
      }
    }
    if (requiresDurablePersistence()) {
      return [];
    }
    return [...this.auditLogs].reverse().slice(0, safeLimit);
  }

  public getMigrationHistory(): MigrationStatus[] {
    return [...this.migrations];
  }

  // Transaction support
  public async transaction<R>(callback: () => Promise<R>): Promise<R> {
    if (this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback();
        await client.query('COMMIT');
        await this.logAudit({
          action: 'TRANSACTION_COMMIT',
          resource: 'postgres_pool',
          details: { mode: 'live_pg' }
        });
        return result;
      } catch (err: any) {
        await client.query('ROLLBACK').catch(() => {});
        await this.logAudit({
          action: 'TRANSACTION_ROLLBACK',
          resource: 'postgres_pool',
          details: { mode: 'live_pg', error: err?.message || String(err) }
        });
        console.error('[PostgresPlatform] Transaction rolled back:', err);
        throw err;
      } finally {
        client.release();
      }
    }

    if (requiresDurablePersistence()) {
      throw new Error('POSTGRES_NOT_CONFIGURED: durable transactions are required; in-memory transactions are disabled.');
    }

    try {
      const result = await callback();
      await this.logAudit({
        action: 'TRANSACTION_COMMIT',
        resource: 'in_memory_tables',
        details: { mode: 'memory' }
      });
      return result;
    } catch (err: any) {
      await this.logAudit({
        action: 'TRANSACTION_ROLLBACK',
        resource: 'in_memory_tables',
        details: { mode: 'memory', error: err?.message || String(err) }
      });
      console.error('[PostgresPlatform] Transaction rolled back:', err);
      throw err;
    }
  }
}

export const postgresPlatform = PostgresPlatform.getInstance();

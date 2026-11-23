/**
 * ANNY — DURABLE PROJECT PERSISTENCE SERVICE
 * Stores full generated website & web-application projects (files, manifests,
 * versions, build/preview status, and ownership) in PostgreSQL when configured,
 * with atomic disk-backed JSON persistence (.anny-data/projects.json) for
 * full offline & self-hosted durability across restarts.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

export type ProjectBuildStatus = 'IDLE' | 'BUILDING' | 'READY' | 'FAILED';
export type ProjectPreviewStatus = 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR';

export interface PersistedProjectRecord {
  id: string;
  projectId: string;
  project_id: string;
  ownerUserId: string;
  userId: string;
  sessionId?: string;
  name: string;
  description: string;
  projectType: string;
  category: string;
  model: string;
  status: string;
  version: number;
  buildStatus: ProjectBuildStatus;
  previewStatus: ProjectPreviewStatus;
  files: Record<string, string>;
  files_count: number;
  manifest?: Record<string, any> | null;
  buildLogs: string[];
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
  created_at: string;
  updated_at: string;
}

export interface PersistedPreviewSession {
  previewId: string;
  projectId: string;
  ownerUserId: string;
  name: string;
  version: number;
  status: ProjectPreviewStatus;
  runtimeMode: 'ISOLATED_OPQ_ORIGIN_SANDBOX';
  entryFile: string;
  lastError?: string | null;
  startedAt: string;
  updatedAt: string;
}

export interface UpsertProjectInput {
  projectId: string;
  ownerUserId: string;
  sessionId?: string;
  name?: string;
  description?: string;
  projectType?: string;
  category?: string;
  model?: string;
  status?: string;
  files?: Record<string, string>;
  manifest?: Record<string, any> | null;
  buildStatus?: ProjectBuildStatus;
  previewStatus?: ProjectPreviewStatus;
  buildLogs?: string[];
  lastError?: string | null;
  bumpVersion?: boolean;
  isAdmin?: boolean;
}

const VALID_PROJECT_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export function isValidProjectId(id: unknown): id is string {
  return typeof id === 'string' && VALID_PROJECT_ID_REGEX.test(id.trim());
}

export function sanitizeProjectFilesMap(rawFiles: unknown): Record<string, string> {
  if (!rawFiles || typeof rawFiles !== 'object' || Array.isArray(rawFiles)) {
    return {};
  }
  const clean: Record<string, string> = {};
  for (const [rawKey, rawVal] of Object.entries(rawFiles as Record<string, unknown>)) {
    if (typeof rawKey !== 'string' || typeof rawVal !== 'string') continue;
    const trimmed = rawKey.trim();
    if (!trimmed || trimmed.length > 260) continue;
    if (trimmed.includes('\0') || trimmed.includes('\\') || trimmed.includes('//')) continue;
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const segments = normalized.split('/').filter(Boolean);
    if (segments.length === 0) continue;
    if (segments.some((s) => s === '.' || s === '..' || /^\.env(\.|$)/i.test(s))) continue;
    if (segments.slice(0, -1).some((s) => /\.(?:json|jsonc|webmanifest)$/i.test(s))) continue;
    clean[normalized] = rawVal;
  }
  return clean;
}

function getPgPoolClass(): any {
  if (typeof window !== 'undefined') return null;
  try {
    const req = createRequire(import.meta.url);
    const pg = req('pg');
    return pg.Pool || pg.default?.Pool || null;
  } catch {
    return null;
  }
}

export class ProjectPersistenceService {
  private static instance: ProjectPersistenceService;
  private storePath: string;
  private records: Map<string, PersistedProjectRecord> = new Map();
  private previewSessions: Map<string, PersistedPreviewSession> = new Map();
  private pool: any = null;
  private pgSchemaReady = false;
  private projectWriteLocks: Map<string, Promise<void>> = new Map();

  private constructor(customStorePath?: string) {
    this.storePath = customStorePath || this.resolveDefaultStorePath();
    this.initPgPool();
    this.loadFromDisk();
  }

  public static getInstance(): ProjectPersistenceService {
    if (!ProjectPersistenceService.instance) {
      ProjectPersistenceService.instance = new ProjectPersistenceService();
    }
    return ProjectPersistenceService.instance;
  }

  private resolveDefaultStorePath(): string {
    const baseDir = process.env.ANNY_DATA_DIR
      ? path.resolve(process.env.ANNY_DATA_DIR)
      : path.join(process.cwd(), '.anny-data');
    return path.join(baseDir, 'projects.json');
  }

  public setPersistencePathForTests(filePath: string): void {
    this.storePath = path.resolve(filePath);
    this.records.clear();
    this.previewSessions.clear();
    this.loadFromDisk();
  }

  private initPgPool(): void {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) return;
    const PgPool = getPgPoolClass();
    if (!PgPool) return;
    try {
      this.pool = new PgPool({
        connectionString: dbUrl,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 10000,
        max: 6,
      });
    } catch {
      this.pool = null;
    }
  }

  private async ensurePgSchema(): Promise<boolean> {
    if (!this.pool) return false;
    if (this.pgSchemaReady) return true;
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS anny_projects (
          project_id VARCHAR(128) PRIMARY KEY,
          owner_user_id VARCHAR(160) NOT NULL,
          session_id VARCHAR(160),
          name VARCHAR(160) NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          project_type VARCHAR(64) NOT NULL DEFAULT 'website',
          category VARCHAR(64) NOT NULL DEFAULT 'Website',
          model VARCHAR(64) NOT NULL DEFAULT 'Anny Core',
          status VARCHAR(32) NOT NULL DEFAULT 'Active',
          version INTEGER NOT NULL DEFAULT 1,
          build_status VARCHAR(32) NOT NULL DEFAULT 'IDLE',
          preview_status VARCHAR(32) NOT NULL DEFAULT 'STOPPED',
          files JSONB NOT NULL DEFAULT '{}'::jsonb,
          manifest JSONB,
          build_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
          last_error TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_anny_projects_owner ON anny_projects(owner_user_id, updated_at DESC);

        CREATE TABLE IF NOT EXISTS anny_preview_sessions (
          preview_id VARCHAR(80) PRIMARY KEY,
          project_id VARCHAR(128) NOT NULL UNIQUE,
          owner_user_id VARCHAR(160) NOT NULL,
          name VARCHAR(160) NOT NULL,
          version INTEGER NOT NULL,
          status VARCHAR(32) NOT NULL,
          runtime_mode VARCHAR(64) NOT NULL,
          entry_file VARCHAR(260) NOT NULL,
          last_error TEXT,
          started_at TIMESTAMP WITH TIME ZONE NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_anny_preview_sessions_owner
          ON anny_preview_sessions(owner_user_id, updated_at DESC);
      `);
      this.pgSchemaReady = true;
      return true;
    } catch (err: any) {
      console.warn('[ProjectPersistence] Postgres schema init skipped, using disk store:', err?.message || err);
      return false;
    }
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.storePath)) return;
      try { fs.chmodSync(this.storePath, 0o600); } catch {}
      const raw = fs.readFileSync(this.storePath, 'utf8');
      if (!raw.trim()) return;
      const parsed = JSON.parse(raw);
      const list: PersistedProjectRecord[] = Array.isArray(parsed?.projects)
        ? parsed.projects
        : Array.isArray(parsed)
          ? parsed
          : [];
      for (const item of list) {
        if (item && isValidProjectId(item.projectId)) {
          const files = sanitizeProjectFilesMap(item.files);
          this.records.set(item.projectId, {
            ...item,
            id: item.projectId,
            project_id: item.projectId,
            files,
            files_count: Object.keys(files).length,
            buildLogs: Array.isArray(item.buildLogs) ? item.buildLogs : [],
            version: typeof item.version === 'number' && item.version >= 1 ? item.version : 1,
          });
        }
      }
      const previewList: PersistedPreviewSession[] = Array.isArray(parsed?.previewSessions)
        ? parsed.previewSessions
        : [];
      for (const session of previewList) {
        if (
          session &&
          /^prev_[a-f0-9]{16,64}$/.test(session.previewId) &&
          isValidProjectId(session.projectId) &&
          typeof session.ownerUserId === 'string' &&
          session.ownerUserId.length > 0 &&
          ['STARTING', 'RUNNING', 'STOPPED', 'ERROR'].includes(session.status)
        ) {
          this.previewSessions.set(session.previewId, session);
        }
      }
    } catch (err: any) {
      console.warn('[ProjectPersistence] Failed to load projects store:', err?.message || err);
    }
  }

  private saveToDisk(): boolean {
    try {
      const dir = path.dirname(this.storePath);
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      try { fs.chmodSync(dir, 0o700); } catch {}
      const tmpPath = `${this.storePath}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      const payload = JSON.stringify(
        {
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
          projects: Array.from(this.records.values()),
          previewSessions: Array.from(this.previewSessions.values()),
        },
        null,
        2
      );
      fs.writeFileSync(tmpPath, payload, { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(tmpPath, this.storePath);
      try { fs.chmodSync(this.storePath, 0o600); } catch {}
      return true;
    } catch (err: any) {
      console.warn('[ProjectPersistence] Disk persistence write warning:', err?.message || err);
      return false;
    }
  }

  private async acquireProjectWriteLock(projectId: string): Promise<() => void> {
    const previous = this.projectWriteLocks.get(projectId) || Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>(resolve => { release = resolve; });
    this.projectWriteLocks.set(projectId, current);
    await previous;
    return () => {
      if (this.projectWriteLocks.get(projectId) === current) {
        this.projectWriteLocks.delete(projectId);
      }
      release();
    };
  }

  public async upsertProject(input: UpsertProjectInput): Promise<PersistedProjectRecord> {
    if (!isValidProjectId(input.projectId)) {
      throw new Error('INVALID_PROJECT_ID');
    }
    const cleanId = input.projectId.trim();
    const owner = String(input.ownerUserId || '').trim();
    if (!owner) {
      throw new Error('MISSING_PROJECT_OWNER');
    }

    const releaseProjectLock = await this.acquireProjectWriteLock(cleanId);
    try {
      const existing = await this.getProjectById(cleanId);
      if (existing && existing.ownerUserId !== owner && !input.isAdmin) {
        throw new Error('FORBIDDEN_PROJECT_OWNERSHIP');
      }
      const now = new Date().toISOString();
    const incomingFiles = input.files !== undefined ? sanitizeProjectFilesMap(input.files) : undefined;
    const files = incomingFiles !== undefined ? incomingFiles : existing?.files || {};
    const nextVersion = existing
      ? input.bumpVersion || (incomingFiles && Object.keys(incomingFiles).length > 0)
        ? existing.version + 1
        : existing.version
      : 1;

    const record: PersistedProjectRecord = {
      id: cleanId,
      projectId: cleanId,
      project_id: cleanId,
      ownerUserId: existing?.ownerUserId || owner,
      userId: existing?.ownerUserId || owner,
      sessionId: input.sessionId ?? existing?.sessionId,
      name: (typeof input.name === 'string' && input.name.trim()
        ? input.name.trim()
        : existing?.name || cleanId
      ).slice(0, 140),
      description: (typeof input.description === 'string'
        ? input.description
        : existing?.description || 'ANNY Website & App Project'
      ).slice(0, 500),
      projectType: (input.projectType || existing?.projectType || 'website').slice(0, 64),
      category: (input.category || existing?.category || 'Website').slice(0, 64),
      model: (input.model || existing?.model || 'Anny Core').slice(0, 64),
      status: input.status || existing?.status || 'Active',
      version: nextVersion,
      buildStatus: input.buildStatus || existing?.buildStatus || (Object.keys(files).length > 0 ? 'READY' : 'IDLE'),
      previewStatus: input.previewStatus || existing?.previewStatus || 'STOPPED',
      files,
      files_count: Object.keys(files).length,
      manifest: input.manifest !== undefined ? input.manifest : existing?.manifest || null,
      buildLogs: Array.isArray(input.buildLogs)
        ? input.buildLogs.slice(-100).map((l) => String(l).slice(0, 500))
        : existing?.buildLogs || [],
      lastError: input.lastError !== undefined ? input.lastError : existing?.lastError || null,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

      let persistedToPostgres = false;
      if (await this.ensurePgSchema()) {
        try {
          const result = await this.pool.query(
            `INSERT INTO anny_projects (
              project_id, owner_user_id, session_id, name, description, project_type, category,
              model, status, version, build_status, preview_status, files, manifest, build_logs, last_error,
              created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17,$18)
            ON CONFLICT (project_id) DO UPDATE SET
              session_id=$3, name=$4, description=$5, project_type=$6, category=$7,
              model=$8, status=$9, version=$10, build_status=$11, preview_status=$12,
              files=$13::jsonb, manifest=$14::jsonb, build_logs=$15::jsonb, last_error=$16, updated_at=$18
            WHERE anny_projects.owner_user_id = EXCLUDED.owner_user_id OR $19::boolean
            RETURNING project_id`,
            [
              record.projectId,
              record.ownerUserId,
              record.sessionId || null,
              record.name,
              record.description,
              record.projectType,
              record.category,
              record.model,
              record.status,
              record.version,
              record.buildStatus,
              record.previewStatus,
              JSON.stringify(record.files),
              record.manifest ? JSON.stringify(record.manifest) : null,
              JSON.stringify(record.buildLogs),
              record.lastError || null,
              record.createdAt,
              record.updatedAt,
              Boolean(input.isAdmin),
            ]
          );
          if (Number(result.rowCount || 0) === 0) {
            throw new Error('FORBIDDEN_PROJECT_OWNERSHIP');
          }
          persistedToPostgres = true;
        } catch (err: any) {
          if (String(err?.message || '').includes('FORBIDDEN_PROJECT_OWNERSHIP')) throw err;
          console.warn('[ProjectPersistence] Postgres upsert warning (saved to disk):', err?.message || err);
        }
      }

      this.records.set(cleanId, record);
      const diskSaved = this.saveToDisk();
      if (!diskSaved && !persistedToPostgres) {
        if (existing) this.records.set(cleanId, existing);
        else this.records.delete(cleanId);
        throw new Error('PROJECT_DISK_PERSISTENCE_FAILED');
      }
      return record;
    } finally {
      releaseProjectLock();
    }
  }

  private mapPreviewSessionRow(row: any): PersistedPreviewSession {
    const toIso = (value: any) => value instanceof Date ? value.toISOString() : String(value || new Date().toISOString());
    return {
      previewId: String(row.preview_id),
      projectId: String(row.project_id),
      ownerUserId: String(row.owner_user_id),
      name: String(row.name || row.project_id),
      version: Number(row.version || 1),
      status: String(row.status || 'STOPPED') as ProjectPreviewStatus,
      runtimeMode: 'ISOLATED_OPQ_ORIGIN_SANDBOX',
      entryFile: String(row.entry_file || '/src/App.tsx'),
      lastError: row.last_error || null,
      startedAt: toIso(row.started_at),
      updatedAt: toIso(row.updated_at)
    };
  }

  public async upsertPreviewSession(input: PersistedPreviewSession): Promise<PersistedPreviewSession> {
    if (!/^prev_[a-f0-9]{16,64}$/.test(input.previewId) || !isValidProjectId(input.projectId)) {
      throw new Error('INVALID_PREVIEW_SESSION');
    }
    const owner = String(input.ownerUserId || '').trim();
    if (!owner) throw new Error('MISSING_PREVIEW_OWNER');
    if (owner.length > 128 || /[\u0000-\u001f\u007f]/.test(owner)) {
      throw new Error('INVALID_PREVIEW_OWNER');
    }
    if (!Number.isInteger(input.version) || input.version < 1) throw new Error('INVALID_PREVIEW_VERSION');
    if (!['STARTING', 'RUNNING', 'STOPPED', 'ERROR'].includes(input.status)) {
      throw new Error('INVALID_PREVIEW_STATUS');
    }

    const project = await this.getProjectById(input.projectId);
    if (!project) throw new Error('PROJECT_NOT_FOUND');
    if (project.ownerUserId !== owner) throw new Error('FORBIDDEN_PROJECT_OWNERSHIP');

    const record: PersistedPreviewSession = {
      ...input,
      ownerUserId: owner,
      name: String(input.name || project.name).slice(0, 160),
      entryFile: String(input.entryFile || '/src/App.tsx').slice(0, 260),
      lastError: input.lastError ? String(input.lastError).slice(0, 1000) : null,
      startedAt: input.startedAt || new Date().toISOString(),
      updatedAt: input.updatedAt || new Date().toISOString()
    };

    if (this.pool) {
      if (!(await this.ensurePgSchema())) {
        throw new Error('PREVIEW_SESSION_STORE_UNAVAILABLE');
      }
      try {
        const result = await this.pool.query(
          `INSERT INTO anny_preview_sessions
            (preview_id, project_id, owner_user_id, name, version, status, runtime_mode, entry_file, last_error, started_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (project_id) DO UPDATE SET
             preview_id=EXCLUDED.preview_id, name=EXCLUDED.name, version=EXCLUDED.version,
             status=EXCLUDED.status, runtime_mode=EXCLUDED.runtime_mode, entry_file=EXCLUDED.entry_file,
             last_error=EXCLUDED.last_error, updated_at=EXCLUDED.updated_at
           WHERE anny_preview_sessions.owner_user_id = EXCLUDED.owner_user_id
           RETURNING preview_id`,
          [record.previewId, record.projectId, record.ownerUserId, record.name, record.version,
            record.status, record.runtimeMode, record.entryFile, record.lastError,
            record.startedAt, record.updatedAt]
        );
        if (Number(result.rowCount || 0) === 0) throw new Error('FORBIDDEN_PREVIEW_OWNERSHIP');
      } catch (error: any) {
        if (String(error?.message || '').includes('FORBIDDEN_PREVIEW_OWNERSHIP')) throw error;
        throw new Error('PREVIEW_SESSION_STORE_UNAVAILABLE');
      }
    }

    const previousProjectSessions = Array.from(this.previewSessions.entries())
      .filter(([, existing]) => existing.projectId === record.projectId);
    for (const [id] of previousProjectSessions) {
      if (id !== record.previewId) this.previewSessions.delete(id);
    }
    const previousSession = this.previewSessions.get(record.previewId);
    this.previewSessions.set(record.previewId, record);
    const diskSaved = this.saveToDisk();
    if (!diskSaved && !this.pool) {
      for (const [id] of this.previewSessions.entries()) {
        if (this.previewSessions.get(id)?.projectId === record.projectId) this.previewSessions.delete(id);
      }
      previousProjectSessions.forEach(([id, session]) => this.previewSessions.set(id, session));
      if (previousSession) this.previewSessions.set(record.previewId, previousSession);
      throw new Error('PROJECT_DISK_PERSISTENCE_FAILED');
    }
    return record;
  }

  public async getPreviewSessionById(previewId: string): Promise<PersistedPreviewSession | null> {
    if (!/^prev_[a-f0-9]{16,64}$/.test(previewId)) return null;
    if (this.pool) {
      if (!(await this.ensurePgSchema())) throw new Error('PREVIEW_SESSION_STORE_UNAVAILABLE');
      try {
        const result = await this.pool.query(
          'SELECT * FROM anny_preview_sessions WHERE preview_id = $1 LIMIT 1',
          [previewId]
        );
        if (result.rows.length === 0) return null;
        const record = this.mapPreviewSessionRow(result.rows[0]);
        this.previewSessions.set(record.previewId, record);
        return record;
      } catch {
        throw new Error('PREVIEW_SESSION_STORE_UNAVAILABLE');
      }
    }
    return this.previewSessions.get(previewId) || null;
  }

  public async getPreviewSessionByProjectId(projectId: string): Promise<PersistedPreviewSession | null> {
    if (!isValidProjectId(projectId)) return null;
    const cleanId = projectId.trim();
    if (this.pool) {
      if (!(await this.ensurePgSchema())) throw new Error('PREVIEW_SESSION_STORE_UNAVAILABLE');
      try {
        const result = await this.pool.query(
          'SELECT * FROM anny_preview_sessions WHERE project_id = $1 LIMIT 1',
          [cleanId]
        );
        if (result.rows.length === 0) return null;
        const record = this.mapPreviewSessionRow(result.rows[0]);
        this.previewSessions.set(record.previewId, record);
        return record;
      } catch {
        throw new Error('PREVIEW_SESSION_STORE_UNAVAILABLE');
      }
    }
    return Array.from(this.previewSessions.values()).find(session => session.projectId === cleanId) || null;
  }

  public async getProjectById(projectId: string): Promise<PersistedProjectRecord | null> {
    if (!isValidProjectId(projectId)) return null;
    const cleanId = projectId.trim();
    const cached = this.records.get(cleanId);
    if (cached) return cached;

    if (await this.ensurePgSchema()) {
      try {
        const res = await this.pool.query('SELECT * FROM anny_projects WHERE project_id = $1 LIMIT 1', [cleanId]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          const files = sanitizeProjectFilesMap(row.files);
          const createdIso = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || new Date().toISOString());
          const updatedIso = row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || createdIso);
          const rec: PersistedProjectRecord = {
            id: row.project_id,
            projectId: row.project_id,
            project_id: row.project_id,
            ownerUserId: row.owner_user_id,
            userId: row.owner_user_id,
            sessionId: row.session_id || undefined,
            name: row.name,
            description: row.description || '',
            projectType: row.project_type || 'website',
            category: row.category || 'Website',
            model: row.model || 'Anny Core',
            status: row.status || 'Active',
            version: Number(row.version || 1),
            buildStatus: (row.build_status || 'IDLE') as ProjectBuildStatus,
            previewStatus: (row.preview_status || 'STOPPED') as ProjectPreviewStatus,
            files,
            files_count: Object.keys(files).length,
            manifest: row.manifest || null,
            buildLogs: Array.isArray(row.build_logs) ? row.build_logs : [],
            lastError: row.last_error || null,
            createdAt: createdIso,
            updatedAt: updatedIso,
            created_at: createdIso,
            updated_at: updatedIso,
          };
          this.records.set(cleanId, rec);
          return rec;
        }
      } catch (err: any) {
        console.warn('[ProjectPersistence] Postgres getProjectById warning:', err?.message || err);
      }
    }
    return null;
  }

  public async listProjects(requesterUid: string, isAdmin: boolean): Promise<PersistedProjectRecord[]> {
    if (await this.ensurePgSchema()) {
      try {
        const res = isAdmin
          ? await this.pool.query('SELECT * FROM anny_projects ORDER BY updated_at DESC LIMIT 200')
          : await this.pool.query('SELECT * FROM anny_projects WHERE owner_user_id = $1 ORDER BY updated_at DESC LIMIT 200', [requesterUid]);
        for (const row of res.rows) {
          const files = sanitizeProjectFilesMap(row.files);
          const createdIso = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || new Date().toISOString());
          const updatedIso = row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || createdIso);
          this.records.set(row.project_id, {
            id: row.project_id,
            projectId: row.project_id,
            project_id: row.project_id,
            ownerUserId: row.owner_user_id,
            userId: row.owner_user_id,
            sessionId: row.session_id || undefined,
            name: row.name,
            description: row.description || '',
            projectType: row.project_type || 'website',
            category: row.category || 'Website',
            model: row.model || 'Anny Core',
            status: row.status || 'Active',
            version: Number(row.version || 1),
            buildStatus: (row.build_status || 'IDLE') as ProjectBuildStatus,
            previewStatus: (row.preview_status || 'STOPPED') as ProjectPreviewStatus,
            files,
            files_count: Object.keys(files).length,
            manifest: row.manifest || null,
            buildLogs: Array.isArray(row.build_logs) ? row.build_logs : [],
            lastError: row.last_error || null,
            createdAt: createdIso,
            updatedAt: updatedIso,
            created_at: createdIso,
            updated_at: updatedIso,
          });
        }
      } catch (err: any) {
        console.warn('[ProjectPersistence] Postgres listProjects warning:', err?.message || err);
      }
    }

    const list = Array.from(this.records.values()).filter((p) => isAdmin || p.ownerUserId === requesterUid);
    list.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return list;
  }

  public async updateProjectFiles(
    projectId: string,
    ownerUserId: string,
    files: Record<string, string>,
    options?: { isAdmin?: boolean; name?: string; buildStatus?: ProjectBuildStatus; buildLogs?: string[]; lastError?: string | null }
  ): Promise<PersistedProjectRecord> {
    if (!isValidProjectId(projectId)) throw new Error('INVALID_PROJECT_ID');
    const existing = await this.getProjectById(projectId);
    if (existing && !options?.isAdmin && existing.ownerUserId !== ownerUserId) {
      throw new Error('FORBIDDEN_PROJECT_OWNERSHIP');
    }
    const cleanFiles = sanitizeProjectFilesMap(files);
    return this.upsertProject({
      projectId,
      ownerUserId: existing?.ownerUserId || ownerUserId,
      name: options?.name || existing?.name,
      files: cleanFiles,
      buildStatus: options?.buildStatus || (Object.keys(cleanFiles).length > 0 ? 'READY' : 'IDLE'),
      buildLogs: options?.buildLogs,
      lastError: options?.lastError,
      bumpVersion: true,
      isAdmin: options?.isAdmin,
    });
  }

  public async updateProjectPreviewState(
    projectId: string,
    previewStatus: ProjectPreviewStatus,
    lastError?: string | null
  ): Promise<PersistedProjectRecord | null> {
    const existing = await this.getProjectById(projectId);
    if (!existing) return null;
    return this.upsertProject({
      projectId,
      ownerUserId: existing.ownerUserId,
      previewStatus,
      lastError: lastError !== undefined ? lastError : existing.lastError,
      bumpVersion: false,
    });
  }

  public async deleteProject(projectId: string, requesterUid: string, isAdmin: boolean): Promise<boolean> {
    if (!isValidProjectId(projectId)) return false;
    const cleanId = projectId.trim();
    const existing = await this.getProjectById(cleanId);
    if (!existing) return false;
    if (!isAdmin && existing.ownerUserId !== requesterUid) {
      throw new Error('FORBIDDEN_PROJECT_OWNERSHIP');
    }
    this.records.delete(cleanId);
    this.saveToDisk();

    if (await this.ensurePgSchema()) {
      try {
        await this.pool.query('DELETE FROM anny_projects WHERE project_id = $1', [cleanId]);
      } catch (err: any) {
        console.warn('[ProjectPersistence] Postgres deleteProject warning:', err?.message || err);
      }
    }
    return true;
  }
}

export const projectPersistenceService = ProjectPersistenceService.getInstance();

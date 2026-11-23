import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { ProjectPersistenceService } from './projectPersistenceService';

function createIsolatedService() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'anny-project-owner-test-'));
  const service = Object.create(ProjectPersistenceService.prototype) as any;
  service.storePath = path.join(directory, 'projects.json');
  service.records = new Map();
  service.previewSessions = new Map();
  service.pool = null;
  service.pgSchemaReady = false;
  service.projectWriteLocks = new Map();
  return {
    service: service as ProjectPersistenceService,
    directory,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true })
  };
}

test('project upsert rejects a different tenant and preserves the original owner and files', async () => {
  const fixture = createIsolatedService();
  try {
    await fixture.service.upsertProject({
      projectId: 'shared-project',
      ownerUserId: 'tenant-a',
      name: 'Tenant A project',
      files: { '/src/App.tsx': 'export default function A() { return null; }' }
    });

    await assert.rejects(
      () => fixture.service.upsertProject({
        projectId: 'shared-project',
        ownerUserId: 'tenant-b',
        name: 'Tenant B overwrite',
        files: { '/src/App.tsx': 'export default function B() { return null; }' }
      }),
      /FORBIDDEN_PROJECT_OWNERSHIP/
    );

    const saved = await fixture.service.getProjectById('shared-project');
    assert.equal(saved?.ownerUserId, 'tenant-a');
    assert.equal(saved?.name, 'Tenant A project');
    assert.match(saved?.files['/src/App.tsx'] || '', /function A/);

    const disk = JSON.parse(fs.readFileSync(path.join(fixture.directory, 'projects.json'), 'utf8'));
    assert.equal(disk.projects[0].ownerUserId, 'tenant-a');
  } finally {
    fixture.cleanup();
  }
});

test('concurrent first writes for the same project ID cannot claim it for two tenants', async () => {
  const fixture = createIsolatedService();
  try {
    const outcomes = await Promise.allSettled([
      fixture.service.upsertProject({
        projectId: 'race-project',
        ownerUserId: 'tenant-a',
        name: 'Tenant A'
      }),
      fixture.service.upsertProject({
        projectId: 'race-project',
        ownerUserId: 'tenant-b',
        name: 'Tenant B'
      })
    ]);

    const fulfilled = outcomes.filter(result => result.status === 'fulfilled');
    const rejected = outcomes.filter(result => result.status === 'rejected');
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.match(String((rejected[0] as PromiseRejectedResult).reason?.message), /FORBIDDEN_PROJECT_OWNERSHIP/);

    const saved = await fixture.service.getProjectById('race-project');
    assert.ok(['tenant-a', 'tenant-b'].includes(saved?.ownerUserId || ''));
    const disk = JSON.parse(fs.readFileSync(path.join(fixture.directory, 'projects.json'), 'utf8'));
    assert.equal(disk.projects.length, 1);
    assert.equal(disk.projects[0].ownerUserId, saved?.ownerUserId);
  } finally {
    fixture.cleanup();
  }
});

test('verified administrator can update a project without changing its tenant owner', async () => {
  const fixture = createIsolatedService();
  try {
    await fixture.service.upsertProject({
      projectId: 'admin-project',
      ownerUserId: 'tenant-a',
      files: { '/README.md': 'original' }
    });
    const updated = await fixture.service.upsertProject({
      projectId: 'admin-project',
      ownerUserId: 'administrator',
      isAdmin: true,
      files: { '/README.md': 'admin-maintained' },
      bumpVersion: true
    });

    assert.equal(updated.ownerUserId, 'tenant-a');
    assert.equal(updated.files['/README.md'], 'admin-maintained');
    assert.equal(updated.version, 2);
  } finally {
    fixture.cleanup();
  }
});


class FakeProjectPool {
  rows = new Map<string, any>();

  async query(sql: string, params: any[] = []): Promise<any> {
    if (/CREATE TABLE IF NOT EXISTS anny_projects/.test(sql)) {
      return { rows: [], rowCount: 0 };
    }
    if (/SELECT \* FROM anny_projects/.test(sql)) {
      if (/WHERE project_id = \\$1/.test(sql)) {
        const row = this.rows.get(params[0]);
        return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
      }
      const rows = [...this.rows.values()].filter(row =>
        !/WHERE owner_user_id = \\$1/.test(sql) || row.owner_user_id === params[0]
      );
      return { rows: rows.map(row => ({ ...row })), rowCount: rows.length };
    }
    if (/INSERT INTO anny_projects/.test(sql)) {
      const [projectId, ownerUserId, sessionId, name, description, projectType, category,
        model, status, version, buildStatus, previewStatus, files, manifest, buildLogs,
        lastError, createdAt, updatedAt, isAdmin] = params;
      const existing = this.rows.get(projectId);
      if (existing && existing.owner_user_id !== ownerUserId && !isAdmin) {
        return { rows: [], rowCount: 0 };
      }
      this.rows.set(projectId, {
        project_id: projectId,
        owner_user_id: existing?.owner_user_id || ownerUserId,
        session_id: sessionId,
        name,
        description,
        project_type: projectType,
        category,
        model,
        status,
        version,
        build_status: buildStatus,
        preview_status: previewStatus,
        files: JSON.parse(files),
        manifest: manifest ? JSON.parse(manifest) : null,
        build_logs: JSON.parse(buildLogs),
        last_error: lastError,
        created_at: createdAt,
        updated_at: updatedAt
      });
      return { rows: [{ project_id: projectId }], rowCount: 1 };
    }
    throw new Error('Unexpected SQL in fake project pool');
  }
}

test('PostgreSQL owner predicate blocks cross-process first-write races', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'anny-project-pg-race-'));
  const pool = new FakeProjectPool();
  const createService = (fileName: string) => {
    const service = Object.create(ProjectPersistenceService.prototype) as any;
    service.storePath = path.join(directory, fileName);
    service.records = new Map();
    service.pool = pool;
    service.pgSchemaReady = false;
    service.projectWriteLocks = new Map();
    return service as ProjectPersistenceService;
  };
  const instanceA = createService('a.json');
  const instanceB = createService('b.json');

  try {
    const results = await Promise.allSettled([
      instanceA.upsertProject({ projectId: 'database-race', ownerUserId: 'tenant-a', name: 'A' }),
      instanceB.upsertProject({ projectId: 'database-race', ownerUserId: 'tenant-b', name: 'B' })
    ]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter(result => result.status === 'rejected').length, 1);
    assert.equal(pool.rows.get('database-race')?.owner_user_id,
      (results.find(result => result.status === 'fulfilled') as PromiseFulfilledResult<any>).value.ownerUserId);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});


test('preview session metadata survives disk restoration without storing capability credentials', async () => {
  const fixture = createIsolatedService();
  try {
    await fixture.service.upsertProject({
      projectId: 'preview-project',
      ownerUserId: 'tenant-a',
      name: 'Private project'
    });
    const previewRecord = {
      previewId: 'prev_0123456789abcdef01234567',
      projectId: 'preview-project',
      ownerUserId: 'tenant-a',
      name: 'Private project',
      version: 1,
      status: 'RUNNING' as const,
      runtimeMode: 'ISOLATED_OPQ_ORIGIN_SANDBOX' as const,
      entryFile: '/src/App.tsx',
      lastError: null,
      startedAt: '2026-11-23T00:00:00.000Z',
      updatedAt: '2026-11-23T00:01:00.000Z'
    };
    await fixture.service.upsertPreviewSession(previewRecord);

    const disk = JSON.parse(fs.readFileSync(path.join(fixture.directory, 'projects.json'), 'utf8'));
    assert.equal(disk.previewSessions.length, 1);
    assert.equal(disk.previewSessions[0].previewId, previewRecord.previewId);
    assert.equal('capabilityToken' in disk.previewSessions[0], false);

    const restored = Object.create(ProjectPersistenceService.prototype) as any;
    restored.storePath = path.join(fixture.directory, 'projects.json');
    restored.records = new Map();
    restored.previewSessions = new Map();
    restored.pool = null;
    restored.pgSchemaReady = false;
    restored.projectWriteLocks = new Map();
    restored.loadFromDisk();

    const loaded = await restored.getPreviewSessionById(previewRecord.previewId);
    assert.equal(loaded?.projectId, 'preview-project');
    assert.equal(loaded?.ownerUserId, 'tenant-a');
    assert.equal(loaded?.status, 'RUNNING');
    assert.equal((await restored.getPreviewSessionByProjectId('preview-project'))?.previewId, previewRecord.previewId);

    await assert.rejects(
      () => restored.upsertPreviewSession({ ...previewRecord, ownerUserId: 'tenant-b' }),
      /FORBIDDEN_PROJECT_OWNERSHIP/
    );
  } finally {
    fixture.cleanup();
  }
});


test('PostgreSQL project reads refresh stale cache and authoritative misses do not resurrect deleted records', async () => {
  const fixture = createIsolatedService();
  const pool = new FakeProjectPool();
  const service = fixture.service as any;
  service.pool = pool;
  service.pgSchemaReady = true;
  try {
    const created = await fixture.service.upsertProject({
      projectId: 'fresh-project',
      ownerUserId: 'tenant-a',
      name: 'Initial name'
    });
    service.records.set('fresh-project', { ...created, name: 'stale cached name' });
    pool.rows.get('fresh-project').name = 'latest database name';

    const fresh = await fixture.service.getProjectById('fresh-project');
    assert.equal(fresh?.name, 'latest database name');

    service.records.set('deleted-project', {
      ...created,
      projectId: 'deleted-project',
      project_id: 'deleted-project',
      id: 'deleted-project'
    });
    const missing = await fixture.service.getProjectById('deleted-project');
    assert.equal(missing, null);
    assert.equal(service.records.has('deleted-project'), false);
  } finally {
    fixture.cleanup();
  }
});

test('successful PostgreSQL tenant lists never merge stale cached projects', async () => {
  const fixture = createIsolatedService();
  const pool = new FakeProjectPool();
  const service = fixture.service as any;
  service.pool = pool;
  service.pgSchemaReady = true;
  try {
    await fixture.service.upsertProject({
      projectId: 'database-current',
      ownerUserId: 'tenant-a',
      name: 'Current database project'
    });
    service.records.set('stale-cache-only', {
      ...service.records.get('database-current'),
      projectId: 'stale-cache-only',
      project_id: 'stale-cache-only',
      id: 'stale-cache-only',
      name: 'Stale cached project'
    });

    const projects = await fixture.service.listProjects('tenant-a', false);
    assert.deepEqual(projects.map(project => project.projectId), ['database-current']);
  } finally {
    fixture.cleanup();
  }
});

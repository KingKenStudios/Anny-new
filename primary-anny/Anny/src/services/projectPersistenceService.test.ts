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
      const row = this.rows.get(params[0]);
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
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

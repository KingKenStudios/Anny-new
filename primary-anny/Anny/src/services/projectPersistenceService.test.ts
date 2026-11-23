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

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { PreviewRuntimeService } from './previewRuntimeService';
import { projectPersistenceService } from './projectPersistenceService';

function createPreviewRuntimeForRestoreTest(): PreviewRuntimeService {
  const service = Object.create(PreviewRuntimeService.prototype) as any;
  service.sessionsById = new Map();
  service.previewIdByProject = new Map();
  service.localCapabilitySecret = null;
  service.cachedReactVendorJs = null;
  service.tailwindCompilerPromise = null;
  service.compiledCssCache = new Map();
  return service as PreviewRuntimeService;
}

test('preview sessions and capability URLs restore after a fresh runtime instance', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'anny-preview-restore-'));
  const originalDataDir = process.env.ANNY_DATA_DIR;
  const originalSessionSecret = process.env.SESSION_SECRET;
  const singleton = projectPersistenceService as any;
  const originalPool = singleton.pool;

  try {
    process.env.ANNY_DATA_DIR = directory;
    delete process.env.SESSION_SECRET;
    singleton.pool = null;
    projectPersistenceService.setPersistencePathForTests(path.join(directory, 'projects.json'));

    await projectPersistenceService.upsertProject({
      projectId: 'preview-restore-project',
      ownerUserId: 'tenant-a',
      name: 'Preview restore project',
      files: { '/src/App.tsx': 'export default function App(){ return null; }' }
    });

    const persistedAt = '2026-11-23T10:00:00.000Z';
    await projectPersistenceService.upsertPreviewSession({
      previewId: 'prev_0123456789abcdef01234567',
      projectId: 'preview-restore-project',
      ownerUserId: 'tenant-a',
      name: 'Preview restore project',
      version: 1,
      status: 'RUNNING',
      runtimeMode: 'ISOLATED_OPQ_ORIGIN_SANDBOX',
      entryFile: '/src/App.tsx',
      lastError: null,
      startedAt: persistedAt,
      updatedAt: persistedAt
    });

    const firstRuntime = createPreviewRuntimeForRestoreTest();
    const secondRuntime = createPreviewRuntimeForRestoreTest();
    const first = await firstRuntime.getPreviewSessionStatus(
      'prev_0123456789abcdef01234567',
      'tenant-a',
      false
    );
    const restoredAfterRestart = await secondRuntime.getPreviewSessionStatus(
      'prev_0123456789abcdef01234567',
      'tenant-a',
      false
    );

    assert.equal(first.capabilityToken, restoredAfterRestart.capabilityToken);
    assert.equal(first.previewUrl, restoredAfterRestart.previewUrl);
    assert.match(first.previewUrl, /token=[a-f0-9]{64}/);
    await assert.rejects(
      () => secondRuntime.getPreviewSessionStatus(first.previewId, 'tenant-b', false),
      /FORBIDDEN_PREVIEW_OWNERSHIP/
    );
  } finally {
    singleton.pool = originalPool;
    if (originalDataDir === undefined) delete process.env.ANNY_DATA_DIR;
    else process.env.ANNY_DATA_DIR = originalDataDir;
    if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSessionSecret;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

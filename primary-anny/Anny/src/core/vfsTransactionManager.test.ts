import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WorkspaceManager } from './workspaceManager';
import { vfsTransactionManager } from './vfsTransactionManager';

test('VFS write transactions serialize per project and release the lock on rollback and commit', async () => {
  const manager = WorkspaceManager.getInstance();
  const previous = manager.getCurrentWorkspace();
  const projectId = 'vfs-lock-test-' + Date.now();
  manager.switchWorkspace(projectId, 'VFS Lock Test', 'global', 'test');
  const vfs = manager.getVFS();
  const path = '/transaction-test.txt';

  try {
    const tx1 = await vfsTransactionManager.begin(projectId, 'session-1', 'global');
    await assert.rejects(
      () => vfsTransactionManager.begin(projectId, 'session-2', 'global'),
      /PROJECT_TRANSACTION_BUSY/
    );
    vfsTransactionManager.writeFile(tx1, path, 'rollback-content');
    assert.equal(vfs.readFile(path), 'rollback-content');
    await vfsTransactionManager.rollback(tx1);
    assert.equal(vfs.exists(path), false);

    const tx2 = await vfsTransactionManager.begin(projectId, 'session-3', 'global');
    vfsTransactionManager.writeFile(tx2, path, 'committed-content');
    await vfsTransactionManager.commit(tx2);
    assert.equal(vfs.readFile(path), 'committed-content');

    const tx3 = await vfsTransactionManager.begin(projectId, 'session-4', 'global');
    await vfsTransactionManager.rollback(tx3);
  } finally {
    if (previous) manager.switchWorkspace(previous.id, previous.name, previous.organizationId, previous.type);
  }
});

test('VFS transactions require the active project and exact organization scope', async () => {
  const manager = WorkspaceManager.getInstance();
  const previous = manager.getCurrentWorkspace();
  const projectId = 'vfs-scope-test-' + Date.now();
  manager.switchWorkspace(projectId, 'VFS Scope Test', 'tenant-a', 'test');
  try {
    await assert.rejects(
      () => vfsTransactionManager.begin(projectId, 'session-a', 'tenant-b'),
      /SECURITY_VIOLATION/
    );
    await assert.rejects(
      () => vfsTransactionManager.begin(projectId, 'session-global', 'global'),
      /SECURITY_VIOLATION/
    );
    await assert.rejects(
      () => vfsTransactionManager.begin('different-project', 'session-a', 'tenant-a'),
      /PROJECT_CONTEXT_REQUIRED/
    );

    const tx = await vfsTransactionManager.begin(projectId, 'session-a', 'tenant-a');
    await vfsTransactionManager.rollback(tx);
  } finally {
    if (previous) manager.switchWorkspace(previous.id, previous.name, previous.organizationId, previous.type);
  }
});

test('VFS writes and snapshots reject inactive transaction IDs', async () => {
  assert.throws(
    () => vfsTransactionManager.writeFile(undefined, '/unauthorized.txt', 'no'),
    /PHANTOM_WRITE_ERROR/
  );
  assert.throws(
    () => vfsTransactionManager.deleteFile('not-a-transaction', '/unauthorized.txt'),
    /PHANTOM_WRITE_ERROR/
  );
  assert.throws(
    () => vfsTransactionManager.getActiveSnapshot('not-a-transaction'),
    /TRANSACTION_NOT_ACTIVE/
  );
});


test('initialization writes and deletes are limited to the active workspace', () => {
  const manager = WorkspaceManager.getInstance();
  const previous = manager.getCurrentWorkspace();
  const projectId = 'vfs-init-test-' + Date.now();
  manager.switchWorkspace(projectId, 'VFS Initialization Test', 'global', 'test');
  const vfs = manager.getVFS();
  try {
    vfsTransactionManager.initializeProjectFile('/allowed.txt', 'allowed');
    assert.equal(vfs.readFile('/allowed.txt'), 'allowed');
    assert.throws(
      () => vfsTransactionManager.initializeProjectFile('/other.txt', 'blocked', 'another-project'),
      /PROJECT_CONTEXT_REQUIRED/
    );
    assert.throws(
      () => vfsTransactionManager.initializeProjectFileDelete('/allowed.txt', 'another-project'),
      /PROJECT_CONTEXT_REQUIRED/
    );
    vfsTransactionManager.initializeProjectFileDelete('/allowed.txt');
    assert.equal(vfs.exists('/allowed.txt'), false);
  } finally {
    if (previous) manager.switchWorkspace(previous.id, previous.name, previous.organizationId, previous.type);
  }
});

test('transactional writes fail if active workspace changes after authorization', async () => {
  const manager = WorkspaceManager.getInstance();
  const previous = manager.getCurrentWorkspace();
  const projectId = 'vfs-context-change-' + Date.now();
  manager.switchWorkspace(projectId, 'VFS Context Test', 'global', 'test');
  try {
    const tx = await vfsTransactionManager.begin(projectId, 'session-1', 'global');
    manager.switchWorkspace('different-project', 'Different Project', 'global', 'test');
    assert.throws(
      () => vfsTransactionManager.writeFile(tx, '/blocked.txt', 'blocked'),
      /PROJECT_CONTEXT_MISMATCH/
    );
    await vfsTransactionManager.rollback(tx);
  } finally {
    if (previous) manager.switchWorkspace(previous.id, previous.name, previous.organizationId, previous.type);
  }
});

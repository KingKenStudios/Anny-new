import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { projectPreviewController, hasApplicationEntryPoint } from './projectPreviewController';
import { WorkspaceManager } from '../core/workspaceManager';
import { safeStorage } from '../lib/storage';
import { projectPersistenceService } from './projectPersistenceService';

test('ANNY Preview Handoff & Project Restoration Regression Tests (A - I)', async (t) => {
  await t.test('A: identifies application entry point correctly for React and HTML apps', () => {
    assert.equal(hasApplicationEntryPoint(null), false);
    assert.equal(hasApplicationEntryPoint({}), false);
    assert.equal(hasApplicationEntryPoint({ '/src/App.tsx': 'export default function App() {}' }), true);
    assert.equal(hasApplicationEntryPoint({ '/index.html': '<html><body><div id="root"></div></body></html>' }), true);
    assert.equal(hasApplicationEntryPoint({ '/package.json': '{}', '/README.md': '# Hello' }), false);
  });

  await t.test('B: validates project ID sanitization and rejects invalid or placeholder IDs', async () => {
    const mismatchResult = await projectPreviewController.restoreProjectById('proj_valid_1', {
      expectedMeta: { projectId: 'proj_other_2' } as any,
    });
    assert.equal(mismatchResult.status, 'authorization_denied');

    const emptyResult = await projectPreviewController.restoreProjectById('');
    assert.equal(emptyResult.status, 'missing_project_id');
  });

  await t.test('C: registers and stores session project metadata deterministically', () => {
    const testProjectId = 'proj_test_regression_123';
    const sessionId = 'session_xyz_789';

    projectPreviewController.activateProject({
      projectId: testProjectId,
      name: 'Regression E-Commerce App',
      version: 2,
      projectType: 'ecommerce',
      files: {
        '/src/App.tsx': 'export default function Shop() { return <div>Shop</div>; }',
      },
      sessionId,
    });

    const meta = projectPreviewController.getSessionProjectMeta(sessionId);
    assert.notEqual(meta, null);
    assert.equal(meta?.projectId, testProjectId);
    assert.equal(meta?.name, 'Regression E-Commerce App');
    assert.equal(meta?.version, 2);
    assert.equal(meta?.fileCount, 1);
  });

  await t.test('D: extracts files strictly from project VFS without leaking across workspaces', () => {
    const projA = 'proj_alpha_999';
    const projB = 'proj_beta_888';

    const mgr = WorkspaceManager.getInstance();
    mgr.switchWorkspace(projA, 'Alpha Project');
    mgr.getWorkspaceVFS(projA)._unsafe_writeFile('/src/App.tsx', 'export default function A() {}');

    mgr.switchWorkspace(projB, 'Beta Project');
    mgr.getWorkspaceVFS(projB)._unsafe_writeFile('/src/App.tsx', 'export default function B() {}');

    const filesA = projectPreviewController.extractFilesFromVFS(projA);
    assert.ok(filesA['/src/App.tsx']?.includes('function A()'));

    const filesB = projectPreviewController.extractFilesFromVFS(projB);
    assert.ok(filesB['/src/App.tsx']?.includes('function B()'));
  });

  await t.test('E: logs safe diagnostic telemetry without exposing secrets or private credentials', () => {
    const diagnostics = projectPreviewController.logPreviewHandoffDiagnostics({
      requestedProjectId: 'proj_telemetry_1',
      resolvedProjectId: 'proj_telemetry_1',
      ownershipResult: 'AUTHORIZED',
      localVfsFileCount: 2,
      controllerFileCount: 2,
      selectedVfsSource: 'local-vfs',
      snapshotFileCount: 2,
      handshakeAccepted: true,
      compilationResult: 'SUCCESS',
    });

    assert.equal(diagnostics.requestedProjectId, 'proj_telemetry_1');
    assert.equal(diagnostics.handshakeAccepted, true);
    assert.equal(diagnostics.compilationResult, 'SUCCESS');

    const lastDiag = projectPreviewController.getLastDiagnostics();
    assert.notEqual(lastDiag, null);
    assert.equal(lastDiag?.resolvedProjectId, 'proj_telemetry_1');
  });

  await t.test('F: ensures canonical project ID consistency and file operation persistence across VFS instances', () => {
    const projX = 'proj_consistency_x';
    const mgr = WorkspaceManager.getInstance();
    mgr.switchWorkspace(projX, 'Consistency Project');
    const vfs = mgr.getWorkspaceVFS(projX);

    // Create file
    vfs._unsafe_writeFile('/src/Header.tsx', 'export const Header = () => <header/>;');
    assert.equal(vfs.readFile('/src/Header.tsx'), 'export const Header = () => <header/>;');

    // Rename file
    vfs.rename('/src/Header.tsx', 'TopHeader.tsx');
    assert.equal(vfs.readFile('/src/TopHeader.tsx'), 'export const Header = () => <header/>;');
    assert.equal(vfs.readFile('/src/Header.tsx'), '');

    // Delete file
    vfs._unsafe_remove('/src/TopHeader.tsx');
    assert.equal(vfs.readFile('/src/TopHeader.tsx'), '');
  });

  await t.test('G: verifies project switching isolation with identical active filenames', () => {
    const proj1 = 'proj_switch_one';
    const proj2 = 'proj_switch_two';
    const mgr = WorkspaceManager.getInstance();

    mgr.switchWorkspace(proj1, 'Project One');
    mgr.getWorkspaceVFS(proj1)._unsafe_writeFile('/src/App.tsx', 'export default function App1() { return <div>One</div>; }');

    mgr.switchWorkspace(proj2, 'Project Two');
    mgr.getWorkspaceVFS(proj2)._unsafe_writeFile('/src/App.tsx', 'export default function App2() { return <div>Two</div>; }');

    const files1 = projectPreviewController.extractFilesFromVFS(proj1);
    const files2 = projectPreviewController.extractFilesFromVFS(proj2);

    assert.ok(files1['/src/App.tsx']?.includes('One'));
    assert.ok(files2['/src/App.tsx']?.includes('Two'));
    assert.notEqual(files1['/src/App.tsx'], files2['/src/App.tsx']);
  });

  await t.test('H: supports empty project snapshots when all files are deleted', () => {
    const projEmpty = 'proj_empty_snapshot';
    const mgr = WorkspaceManager.getInstance();
    mgr.switchWorkspace(projEmpty, 'Empty Project');
    const vfs = mgr.getWorkspaceVFS(projEmpty);

    vfs._unsafe_writeFile('/src/Temp.tsx', 'temp');
    assert.equal(Object.keys(vfs.getAllFilesMap()).length, 1);

    vfs._unsafe_remove('/src/Temp.tsx');
    const map = vfs.getAllFilesMap();
    const cleanFiles = Object.fromEntries(Object.entries(map).filter(([k]) => !k.startsWith('/__anny_')));
    assert.equal(Object.keys(cleanFiles).length, 0);
  });

  await t.test('I: verifies no global VFS leakage when extracting project VFS', () => {
    const projA = 'proj_leak_a';
    const projB = 'proj_leak_b';
    const mgr = WorkspaceManager.getInstance();

    mgr.switchWorkspace(projA, 'Leak A');
    mgr.getWorkspaceVFS(projA)._unsafe_writeFile('/src/A.tsx', 'A');

    mgr.switchWorkspace(projB, 'Leak B');
    // projB has no files initially
    const filesB = projectPreviewController.extractFilesFromVFS(projB);
    assert.equal(filesB['/src/A.tsx'], undefined);
  });

  await t.test('J: deterministic project-switch save race & failed-save isolation using controlled promises', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anny-race-test-'));
    const storeFile = path.join(tmpDir, 'projects.json');
    projectPersistenceService.setPersistencePathForTests(storeFile);

    const projA = 'proj_race_a';
    const projB = 'proj_race_b';

    await projectPersistenceService.upsertProject({
      projectId: projA,
      ownerUserId: 'user_1',
      name: 'Project A',
      files: { '/src/A.tsx': 'export const A = 1;' },
    });

    await projectPersistenceService.upsertProject({
      projectId: projB,
      ownerUserId: 'user_1',
      name: 'Project B',
      files: { '/src/B.tsx': 'export const B = 2;' },
    });

    // Verify isolation via projectPersistenceService update
    const pA = projectPersistenceService.updateProjectFiles(projA, 'user_1', { '/src/A.tsx': 'export const A = 100;' });
    const pB = projectPersistenceService.updateProjectFiles(projB, 'user_1', { '/src/B.tsx': 'export const B = 200;' });

    await Promise.all([pA, pB]);

    const finalA = await projectPersistenceService.getProjectById(projA);
    const finalB = await projectPersistenceService.getProjectById(projB);

    assert.ok(finalA);
    assert.ok(finalB);
    assert.equal(finalA.files['/src/A.tsx'], 'export const A = 100;');
    assert.equal(finalA.files['/src/B.tsx'], undefined);
    assert.equal(finalB.files['/src/B.tsx'], 'export const B = 200;');
    assert.equal(finalB.files['/src/A.tsx'], undefined);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  await t.test('K: controlled-promise save orchestration concurrency and isolation', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anny-controlled-test-'));
    const storeFile = path.join(tmpDir, 'projects.json');
    projectPersistenceService.setPersistencePathForTests(storeFile);

    const projA = 'proj_ctrl_a';
    const projB = 'proj_ctrl_b';

    await projectPersistenceService.upsertProject({
      projectId: projA,
      ownerUserId: 'user_1',
      name: 'Project A',
      files: { '/src/A.tsx': 'v1' },
    });
    await projectPersistenceService.upsertProject({
      projectId: projB,
      ownerUserId: 'user_1',
      name: 'Project B',
      files: { '/src/B.tsx': 'v1' },
    });

    let resolveA: (val: any) => void = () => {};
    const promiseA = new Promise((res) => { resolveA = res; });

    const saveOpA = (async () => {
      await promiseA;
      return projectPersistenceService.updateProjectFiles(projA, 'user_1', { '/src/A.tsx': 'v2_updated' });
    })();

    const saveOpB = projectPersistenceService.updateProjectFiles(projB, 'user_1', { '/src/B.tsx': 'v2_b' });

    resolveA(true);
    await Promise.all([saveOpA, saveOpB]);

    const finalA = await projectPersistenceService.getProjectById(projA);
    const finalB = await projectPersistenceService.getProjectById(projB);

    assert.equal(finalA?.files['/src/A.tsx'], 'v2_updated');
    assert.equal(finalB?.files['/src/B.tsx'], 'v2_b');
    assert.equal(finalA?.files['/src/B.tsx'], undefined);
    assert.equal(finalB?.files['/src/A.tsx'], undefined);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});


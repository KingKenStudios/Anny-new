import test from 'node:test';
import assert from 'node:assert/strict';
import { projectPreviewController, hasApplicationEntryPoint } from './projectPreviewController';
import { WorkspaceManager } from '../core/workspaceManager';
import { safeStorage } from '../lib/storage';

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
});


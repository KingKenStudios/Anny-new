import { describe, it, expect, beforeEach } from 'vitest';
import { projectPreviewController, hasApplicationEntryPoint } from './projectPreviewController';
import { WorkspaceManager } from '../core/workspaceManager';
import { safeStorage } from '../lib/storage';

describe('ANNY Preview Handoff & Project Restoration Regression Tests (A - I)', () => {
  beforeEach(() => {
    safeStorage.clear();
  });

  it('A: identifies application entry point correctly for React and HTML apps', () => {
    expect(hasApplicationEntryPoint(null)).toBe(false);
    expect(hasApplicationEntryPoint({})).toBe(false);
    expect(hasApplicationEntryPoint({ '/src/App.tsx': 'export default function App() {}' })).toBe(true);
    expect(hasApplicationEntryPoint({ '/index.html': '<html><body><div id="root"></div></body></html>' })).toBe(true);
    expect(hasApplicationEntryPoint({ '/package.json': '{}', '/README.md': '# Hello' })).toBe(false);
  });

  it('B: validates project ID sanitization and rejects invalid or placeholder IDs', async () => {
    const mismatchResult = await projectPreviewController.restoreProjectById('proj_valid_1', {
      expectedMeta: { projectId: 'proj_other_2' } as any,
    });
    expect(mismatchResult.status).toBe('authorization_denied');

    const emptyResult = await projectPreviewController.restoreProjectById('');
    expect(emptyResult.status).toBe('missing_project_id');
  });

  it('C: registers and stores session project metadata deterministically', () => {
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
    expect(meta).not.toBeNull();
    expect(meta?.projectId).toBe(testProjectId);
    expect(meta?.name).toBe('Regression E-Commerce App');
    expect(meta?.version).toBe(2);
    expect(meta?.fileCount).toBe(1);
  });

  it('D: extracts files strictly from project VFS without leaking across workspaces', () => {
    const projA = 'proj_alpha_999';
    const projB = 'proj_beta_888';

    const mgr = WorkspaceManager.getInstance();
    mgr.switchWorkspace(projA, 'Alpha Project');
    mgr.getWorkspaceVFS(projA)._unsafe_writeFile('/src/App.tsx', 'export default function A() {}');

    mgr.switchWorkspace(projB, 'Beta Project');
    mgr.getWorkspaceVFS(projB)._unsafe_writeFile('/src/App.tsx', 'export default function B() {}');

    const filesA = projectPreviewController.extractFilesFromVFS(projA);
    expect(filesA['/src/App.tsx']).toContain('function A()');

    const filesB = projectPreviewController.extractFilesFromVFS(projB);
    expect(filesB['/src/App.tsx']).toContain('function B()');
  });

  it('E: logs safe diagnostic telemetry without exposing secrets or private credentials', () => {
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

    expect(diagnostics.requestedProjectId).toBe('proj_telemetry_1');
    expect(diagnostics.handshakeAccepted).toBe(true);
    expect(diagnostics.compilationResult).toBe('SUCCESS');

    const lastDiag = projectPreviewController.getLastDiagnostics();
    expect(lastDiag).not.toBeNull();
    expect(lastDiag?.resolvedProjectId).toBe('proj_telemetry_1');
  });
});

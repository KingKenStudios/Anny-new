import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectWebsiteOrAppIntent } from '../utils/chatHelpers';
import { projectPersistenceService } from '../services/projectPersistenceService';
import { previewRuntimeService, STANDALONE_TAB_SANDBOX_CSP } from '../services/previewRuntimeService';
import { bundleVFSForIsolatedPreview } from '../components/StandalonePreviewRunner';

test('detectWebsiteOrAppIntent detects website & app build prompts accurately without hijacking normal chat or media', () => {
  const r1 = detectWebsiteOrAppIntent('Could you build me a modern e-commerce website?');
  assert.equal(r1.isBuildRequest, true);

  const r2 = detectWebsiteOrAppIntent('Design a portfolio website for an architect');
  assert.equal(r2.isBuildRequest, true);

  const r3 = detectWebsiteOrAppIntent('Create a landing page for my AI startup');
  assert.equal(r3.isBuildRequest, true);

  const q = detectWebsiteOrAppIntent('What is React Server Components and how does it work?');
  assert.equal(q.isBuildRequest, false);

  const img = detectWebsiteOrAppIntent('Generate an image of a sunset over Lagos');
  assert.equal(img.isBuildRequest, false);

  const followup = detectWebsiteOrAppIntent('Add an about page and make the hero background darker', {
    hasActiveProject: true,
  });
  assert.equal(followup.isBuildRequest, true);
  assert.equal(followup.isProjectEdit, true);
});

test('projectPersistenceService persists, reloads from disk, bumps versions, and enforces ownership', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anny-proj-test-'));
  const storeFile = path.join(tmpDir, 'projects.json');
  projectPersistenceService.setPersistencePathForTests(storeFile);

  const projId = 'proj_test_alpha_1';
  const created = await projectPersistenceService.upsertProject({
    projectId: projId,
    ownerUserId: 'user_owner_1',
    name: 'Alpha Commerce',
    description: 'Storefront test project',
    projectType: 'ecommerce',
    files: {
      '/src/App.tsx': 'export default function App() { return <div>Alpha</div>; }',
      '/package.json': '{"name":"alpha-commerce"}',
    },
    buildStatus: 'READY',
    previewStatus: 'STOPPED',
  });

  assert.equal(created.version, 1);
  assert.equal(created.files_count, 2);
  assert.ok(fs.existsSync(storeFile));

  // Reload from disk into memory
  projectPersistenceService.setPersistencePathForTests(storeFile);
  const reloaded = await projectPersistenceService.getProjectById(projId);
  assert.ok(reloaded);
  assert.equal(reloaded.name, 'Alpha Commerce');
  assert.equal(reloaded.ownerUserId, 'user_owner_1');
  assert.equal(reloaded.version, 1);

  // Cross-user write & delete access must fail with FORBIDDEN_PROJECT_OWNERSHIP
  await assert.rejects(
    () =>
      projectPersistenceService.updateProjectFiles(projId, 'user_other_2', {
        '/src/App.tsx': 'export default function Hacked() { return null; }',
      }),
    /FORBIDDEN_PROJECT_OWNERSHIP/
  );
  await assert.rejects(
    () => projectPersistenceService.deleteProject(projId, 'user_other_2', false),
    /FORBIDDEN_PROJECT_OWNERSHIP/
  );

  // Updating files increments version cleanly
  const updated = await projectPersistenceService.updateProjectFiles(
    projId,
    'user_owner_1',
    {
      '/src/App.tsx': 'export default function App() { return <div>Alpha v2</div>; }',
      '/src/About.tsx': 'export function About() { return <div>About</div>; }',
      '/package.json': '{"name":"alpha-commerce"}',
    }
  );
  assert.equal(updated.version, 2);
  assert.equal(updated.files_count, 3);

  // Delete cleans up record
  const deleted = await projectPersistenceService.deleteProject(projId, 'user_owner_1', false);
  assert.equal(deleted, true);
  assert.equal(await projectPersistenceService.getProjectById(projId), null);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('previewRuntimeService compiles React 19 + Tailwind CSS offline, manages sessions, and enforces sandbox CSP', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anny-prev-test-'));
  const storeFile = path.join(tmpDir, 'projects.json');
  projectPersistenceService.setPersistencePathForTests(storeFile);

  const vendorJs = previewRuntimeService.getReactVendorBundle();
  assert.ok(vendorJs.length > 50_000);
  assert.ok(vendorJs.includes('createRoot'));

  const css = await previewRuntimeService.compileTailwindCssFromSources({
    '/src/App.tsx': `export default function App() { return <div className="min-h-screen bg-slate-950 text-emerald-400 p-6">Hello</div>; }`,
    '/src/index.css': `@import "tailwindcss";\nbody { margin: 0; }`,
  });
  assert.ok(css.length > 100);
  assert.ok(css.includes('min-h-screen') || css.includes('bg-slate-950'));

  const projId = 'proj_prev_runtime_1';
  const session = await previewRuntimeService.createOrRefreshPreviewSession({
    projectId: projId,
    ownerUserId: 'guest_owner_1',
    name: 'Preview Test App',
    files: {
      '/src/App.tsx': `import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
export default function App() {
  return <BrowserRouter><nav><Link to="/about">About</Link></nav><Routes><Route path="/" element={<h1>Home</h1>} /><Route path="/about" element={<h1>About</h1>} /></Routes></BrowserRouter>;
}`,
      '/src/index.css': `@import "tailwindcss";`,
    },
  });

  assert.equal(session.status, 'RUNNING');
  assert.ok(session.previewUrl.includes(session.previewId));

  const urlObj = new URL(`http://localhost:3000${session.previewUrl}`);
  const token = urlObj.searchParams.get('token') || '';
  const served = await previewRuntimeService.serveIsolatedPreviewHtml(session.previewId, token);

  assert.ok(served.html.includes('createRoot'));
  assert.ok(served.html.includes('PREVIEW_NAVIGATION') || served.html.includes('BrowserRouter'));
  assert.ok(STANDALONE_TAB_SANDBOX_CSP.includes('sandbox allow-scripts allow-forms allow-modals'));

  // Invalid token must fail
  await assert.rejects(
    () => previewRuntimeService.serveIsolatedPreviewHtml(session.previewId, 'bad_token_000000000000000000000000'),
    /UNAUTHORIZED_PREVIEW_CAPABILITY/
  );

  // Stop session prevents serving
  const stopped = await previewRuntimeService.stopPreviewSession(session.previewId, 'guest_owner_1', false);
  assert.equal(stopped.status, 'STOPPED');
  await assert.rejects(
    () => previewRuntimeService.serveIsolatedPreviewHtml(session.previewId, token),
    /PREVIEW_SESSION_STOPPED/
  );

  // Missing entry file returns honest error rather than fake success
  await assert.rejects(
    () =>
      previewRuntimeService.createOrRefreshPreviewSession({
        projectId: 'proj_missing_entry',
        ownerUserId: 'guest_owner_1',
        name: 'Broken App',
        files: {
          '/README.md': '# Not a React app',
        },
      }),
    /NO_VALID_PREVIEW_ENTRY_FILE/
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('bundleVFSForIsolatedPreview bundles react-router-dom, inline vendor React, compiled CSS, and navigation commands', () => {
  const filesMap: Record<string, string> = {
    '/src/App.tsx': `import { Routes, Route, Link } from 'react-router-dom';
export default function App() {
  return <div><Link to="/pricing">Pricing</Link><Routes><Route path="/" element={<span>Home</span>} /><Route path="/pricing" element={<span>Pricing</span>} /></Routes></div>;
}`,
    '/src/index.css': `@import "tailwindcss";`,
  };
  const vfsStub = {
    exists: (p: string) => Boolean(filesMap[p]),
    readFile: (p: string) => filesMap[p] || '',
    getAllFiles: () => Object.entries(filesMap).map(([path, content]) => ({ path, content })),
  };

  const result = bundleVFSForIsolatedPreview(vfsStub, {
    projectId: 'proj_bundle_check',
    parentOrigin: 'https://example.local',
    inlineReactVendorScript: 'window.__TEST_REACT_VENDOR__=true;',
    compiledCss: '.bg-slate-950{background:#020617;}',
  });

  assert.equal(result.entryFile, '/src/App.tsx');
  assert.ok(result.transpiledModules['/src/App.tsx']);
  assert.ok(result.srcDoc.includes('window.__TEST_REACT_VENDOR__=true;'));
  assert.ok(result.srcDoc.includes('.bg-slate-950{background:#020617;}'));
  assert.ok(result.srcDoc.includes('PREVIEW_NAVIGATION'));
  assert.ok(result.srcDoc.includes('PREVIEW_NAVIGATE_COMMAND'));
});

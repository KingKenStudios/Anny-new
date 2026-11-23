import test from 'node:test';
import assert from 'node:assert/strict';
import { annyOrganizationGovernance } from '../core/AnnyOrganizationGovernanceLayer';
import { AnnyOrganizationExecutionController } from '../core/AnnyOrganizationExecutionContext';
import {
  extractProtectedTokens,
  analyzeLanguageWithCodeSwitching,
  selectOptimalLanguageModel,
  generateUniversalLanguageMatrix,
  runLivePhase38Certification,
  type RuntimeCapabilitySnapshot,
} from '../core/AnnyUniversalLanguageFabric';
import {
  parseGeneratedProjectPayload,
  pruneConflictingFilePaths,
} from '../core/realAppCodeSynthesizer';
import { projectPreviewController } from './projectPreviewController';

const mockHostSnapshot: RuntimeCapabilitySnapshot = {
  hasGemini: true,
  hasOpenAI: false,
  hasAnthropic: false,
  hasSahara: false,
  hasLocalStt: false,
  hasOllama: false,
  totalRamBytes: 16 * 1024 ** 3,
  freeRamBytes: 8 * 1024 ** 3,
  cpuCores: 8,
  platform: 'linux',
  arch: 'x64',
};

test('AnnyOrganizationGovernanceLayer seeds Akinwumi Group canonical entities and rejects forbidden merges', () => {
  const records = annyOrganizationGovernance.listCanonicalRecords();
  const ids = records.map((r) => r.orgId);
  assert.ok(ids.includes('akinwumi_group'));
  assert.ok(ids.includes('keda'));
  assert.ok(ids.includes('mechatronics'));
  assert.ok(ids.includes('cybersecurity'));
  assert.ok(ids.includes('king_ken_studios'));

  const rejected = annyOrganizationGovernance.registerOrganization(
    'keda_mechatronics',
    'Keda Mechatronics',
    'Merged Entity',
    'Industrial',
    ['robotics'],
    []
  );
  assert.equal(rejected.valid, false);
  assert.ok(rejected.errorCode);

  const uniqueId = `akinwumi_test_unit_${Date.now()}`;
  const accepted = annyOrganizationGovernance.registerOrganization(
    uniqueId,
    'Akinwumi Labs Test Unit',
    'R&D Division',
    'Research',
    ['ai_research'],
    ['ALabs']
  );
  assert.equal(accepted.valid, true);
  assert.ok(annyOrganizationGovernance.getCanonicalRecord(uniqueId));
});

test('AnnyOrganizationExecutionController resolves cross-org security audit with isolated scopes', () => {
  const ctx = AnnyOrganizationExecutionController.resolveContext(
    "Audit Keda's security and assess vulnerabilities in Keda infrastructure",
    { userAuthorized: true }
  );
  assert.equal(ctx.executingOrganization, 'cybersecurity');
  assert.equal(ctx.targetOrganization, 'keda');
  assert.equal(ctx.relationshipType, 'PROTECTS');
  assert.ok(['AUTHORIZED', 'NOT_REQUIRED'].includes(ctx.authorizationStatus));
  assert.ok(ctx.memoryWriteScopes.length > 0);
  assert.ok(ctx.memoryReadScopes.length > 0);
});

test('extractProtectedTokens losslessly preserves inline code, fenced blocks, URLs, and function calls', () => {
  const sample =
    'Jowo lo si `https://anny.ai/api/v1` ki o si fi `const token = "live_987";` se ise.\n```ts\nconst x = 42;\n```\nCall fetchWithAuth("/api/runtime/status") or open https://akinwumigroup.com.';
  const extracted = extractProtectedTokens(sample);
  assert.ok(extracted.tokens.length >= 4);
  assert.ok(!extracted.maskedText.includes('const token = "live_987";'));
  assert.equal(extracted.restore(extracted.maskedText), sample);
});

test('Universal Language Fabric covers 70 languages, detects code-switching, and passes Phase 38 probes with 0 FAIL', () => {
  const matrix = generateUniversalLanguageMatrix(mockHostSnapshot);
  assert.equal(matrix.summary.totalLanguages, 70);
  assert.equal(matrix.summary.africanCount, 29);
  assert.equal(matrix.summary.globalCount, 41);

  const lid = analyzeLanguageWithCodeSwitching(
    'Mo fe lo si office loni but there is heavy traffic on the road.'
  );
  assert.ok(lid.codeSwitchingSegments.length >= 2);

  const sel = selectOptimalLanguageModel({ language: 'yo', task: 'ASR' }, mockHostSnapshot);
  assert.equal(sel.language, 'yo');
  assert.ok(sel.selectedModel.modelId.includes('mms'));

  const cert = runLivePhase38Certification(mockHostSnapshot);
  assert.equal(cert.summary.total, 40);
  assert.equal(cert.summary.failed, 0);
});

test('parseGeneratedProjectPayload serializes object-valued /package.json instead of flattening into /package.json/*', () => {
  const raw = JSON.stringify({
    projectName: 'king-ken-nation',
    files: {
      '/package.json': {
        name: 'king-ken-nation',
        version: '1.0.0',
        scripts: { dev: 'vite', build: 'vite build' },
        dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
      },
      '/tsconfig.json': {
        compilerOptions: { target: 'ES2020', jsx: 'react-jsx' },
      },
      '/index.html': '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
      '/src/main.tsx': 'import React from "react"; export default function Main() { return null; }',
    },
  });

  const parsed = parseGeneratedProjectPayload(raw);
  assert.ok(parsed.files['/package.json'], 'Expected /package.json string');
  assert.ok(parsed.files['/tsconfig.json'], 'Expected /tsconfig.json string');
  assert.equal(
    Object.keys(parsed.files).some((k) => k.startsWith('/package.json/')),
    false,
    'Must not flatten /package.json into /package.json/* subpaths'
  );
  const pkg = JSON.parse(parsed.files['/package.json']);
  assert.equal(pkg.name, 'king-ken-nation');
  assert.equal(pkg.scripts.dev, 'vite');
});

test('pruneConflictingFilePaths reconstructs flattened /package.json/* entries and resolves file-vs-directory collisions', () => {
  const flattenedOnly = pruneConflictingFilePaths({
    '/package.json/name': 'king-ken-nation',
    '/package.json/scripts/dev': 'vite',
    '/package.json/scripts/build': 'vite build',
    '/index.html': '<!doctype html><html><body></body></html>',
  });
  assert.ok(flattenedOnly['/package.json']);
  assert.equal(Object.keys(flattenedOnly).some((k) => k.startsWith('/package.json/')), false);
  const reconstructed = JSON.parse(flattenedOnly['/package.json']);
  assert.equal(reconstructed.name, 'king-ken-nation');
  assert.equal(reconstructed.scripts.build, 'vite build');

  const colliding = pruneConflictingFilePaths({
    '/package.json': JSON.stringify({ name: 'king-ken-nation', scripts: { dev: 'vite' } }),
    '/package.json/name': 'stale-name',
    '/package.json/scripts/dev': 'stale-dev',
    '/src/App.tsx': 'export default function App() { return <div>OK</div>; }',
  });
  assert.ok(colliding['/package.json']);
  assert.equal(colliding['/package.json/name'], undefined);
  assert.equal(colliding['/package.json/scripts/dev'], undefined);
  assert.equal(JSON.parse(colliding['/package.json']).name, 'king-ken-nation');
});

test('projectPreviewController.activateProject safely writes projects even if conflicting /package.json/* entries are passed', () => {
  const state = projectPreviewController.activateProject({
    projectId: `king_ken_collision_${Date.now()}`,
    name: 'king-ken-nation',
    files: {
      '/package.json': JSON.stringify({
        name: 'king-ken-nation',
        version: '1.0.0',
        scripts: { dev: 'vite', build: 'vite build' },
        dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
      }),
      '/package.json/name': 'king-ken-nation',
      '/package.json/scripts/dev': 'vite',
      '/index.html': '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
      '/src/main.tsx': 'import React from "react"; import { createRoot } from "react-dom/client"; import App from "./App"; createRoot(document.getElementById("root")!).render(<App />);',
      '/src/App.tsx': 'export default function App() { return <main><h1>King Ken Nation</h1></main>; }',
      '/src/styles.css': 'body { margin: 0; font-family: sans-serif; }',
    },
  });

  const filePaths = Object.keys(state.files);
  assert.notEqual(state.status, 'failed');
  assert.equal(state.runtimeError, null);
  assert.ok(filePaths.includes('/package.json'));
  assert.equal(filePaths.some((p) => p.startsWith('/package.json/')), false);
});


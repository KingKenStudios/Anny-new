import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyProjectRequest,
  parseGeneratedProjectPayload,
  synthesizeAppFiles,
  type SynthesisChatExecutor,
} from '../core/realAppCodeSynthesizer';
import { verifyGeneratedProject } from '../core/generatedProjectValidator';
import { VirtualFileSystem } from '../core/virtualFileSystem';
import { bundleVFSForIsolatedPreview } from '../components/StandalonePreviewRunner';

function makeValidWebsiteFiles(): Record<string, string> {
  return {
    'package.json': JSON.stringify(
      {
        name: 'voltgrid-automation',
        version: '1.0.0',
        private: true,
        scripts: { dev: 'vite', build: 'vite build' },
        dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1', 'lucide-react': '^0.460.0' },
        devDependencies: { vite: '^5.4.0', typescript: '^5.5.0' },
      },
      null,
      2
    ),
    'index.html': `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>VoltGrid Automation</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`,
    'src/main.tsx': `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './styles.css';\nReactDOM.createRoot(document.getElementById('root')!).render(<App />);`,
    'src/styles.css': `body { margin: 0; font-family: system-ui, sans-serif; background: #ffffff; color: #0f172a; }`,
    'src/data/services.json': JSON.stringify([
      { id: 'plc', title: 'PLC & SCADA Integration', status: 'ISO 9001' },
      { id: 'hv', title: 'Industrial Switchgear', status: 'IEC 61439' },
    ]),
    'src/App.tsx': `import React, { useState } from 'react';\nimport services from './data/services.json';\nexport default function App() {\n  const [selected, setSelected] = useState(services[0].id);\n  return (\n    <main className="min-h-screen bg-white text-slate-900 p-8">\n      <h1>VoltGrid Electrical Engineering & Industrial Automation</h1>\n      <ul>{services.map((s: any) => <li key={s.id} onClick={() => setSelected(s.id)}>{s.title}</li>)}</ul>\n      <p>Selected: {selected}</p>\n    </main>\n  );\n}\n`,
    'README.md': `# VoltGrid\n\nRun locally:\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`,
  };
}

test('classifyProjectRequest accurately detects archetypes and honest backend requirements', () => {
  const website = classifyProjectRequest(
    'Create a modern professional website for an electrical engineering and industrial automation company.'
  );
  assert.equal(website.projectType, 'website');
  assert.equal(website.requiresBackend, false);

  const inventory = classifyProjectRequest(
    'Build an inventory management application for an electrical workshop with stock tracking, inventory categories, search, add item, edit item, delete item and dashboard statistics.'
  );
  assert.equal(inventory.projectType, 'fullstack_web_app');
  assert.equal(inventory.requiresBackend, false);

  const backendInventory = classifyProjectRequest(
    'Build a full-stack inventory management app with a REST API backend and PostgreSQL database.'
  );
  assert.equal(backendInventory.projectType, 'fullstack_web_app');
  assert.equal(backendInventory.requiresBackend, true);

  assert.equal(classifyProjectRequest('Build an online store with checkout').projectType, 'ecommerce');
  assert.equal(classifyProjectRequest('Create a KPI analytics dashboard').projectType, 'dashboard');
  assert.equal(classifyProjectRequest('Build a product waitlist landing page').projectType, 'landing_page');
  assert.equal(classifyProjectRequest('Create an architect portfolio website').projectType, 'portfolio');
  assert.equal(classifyProjectRequest('Build a multi-tenant SaaS subscription platform').projectType, 'saas');
  assert.equal(classifyProjectRequest('Build an admin panel for user moderation').projectType, 'admin_panel');
  assert.equal(classifyProjectRequest('Create a mobile iOS and Android companion app').projectType, 'mobile_app');
  assert.equal(classifyProjectRequest('Build an Electron desktop utility app').projectType, 'desktop_app');
  assert.equal(classifyProjectRequest('Build an interactive 2D arcade puzzle game').projectType, 'game');
  assert.equal(classifyProjectRequest('Create a clean UI wireframe prototype').projectType, 'ui_mockup');
  assert.equal(classifyProjectRequest('Write a TypeScript helper utility module').projectType, 'code_only');
});

test('parseGeneratedProjectPayload handles raw JSON, markdown-fenced JSON with inner README code blocks, nested trees, file arrays, tool calls, and multi-file code blocks', () => {
  const validFiles = makeValidWebsiteFiles();

  // 1. Normal raw JSON
  const raw = parseGeneratedProjectPayload(
    JSON.stringify({ manifest: { title: 'VoltGrid', summary: 'Site' }, files: validFiles })
  );
  assert.equal(raw.sourceFormat, 'json');
  assert.equal(Object.keys(raw.files).length, Object.keys(validFiles).length);
  assert.equal(raw.truncated, false);

  // 2. Markdown-fenced JSON containing nested ```bash fences inside README.md (exact prior bug!)
  const fencedWithInnerBackticks = `Here is the complete project:\n\`\`\`json\n${JSON.stringify({
    manifest: { title: 'VoltGrid' },
    files: validFiles,
  })}\n\`\`\`\n`;
  const fenced = parseGeneratedProjectPayload(fencedWithInnerBackticks);
  assert.equal(Object.keys(fenced.files).length, Object.keys(validFiles).length);
  assert.ok(fenced.files['/README.md'].includes('```bash'));

  // 3. Nested directory tree
  const nestedTree = parseGeneratedProjectPayload(
    JSON.stringify({
      files: {
        'package.json': validFiles['package.json'],
        src: {
          'App.tsx': validFiles['src/App.tsx'],
          data: { 'services.json': validFiles['src/data/services.json'] },
        },
      },
    })
  );
  assert.ok(nestedTree.files['/src/App.tsx']);
  assert.ok(nestedTree.files['/src/data/services.json']);

  // 4. Array of files [{ path, content }]
  const arrayPayload = parseGeneratedProjectPayload(
    JSON.stringify({
      files: [
        { path: 'package.json', content: validFiles['package.json'] },
        { path: 'src/App.tsx', content: validFiles['src/App.tsx'] },
      ],
    })
  );
  assert.ok(arrayPayload.files['/package.json']);
  assert.ok(arrayPayload.files['/src/App.tsx']);

  // 5. Tool call response
  const toolCallPayload = parseGeneratedProjectPayload('', {
    name: 'emit_project_files',
    args: {
      manifest: { title: 'Tool App' },
      files: { 'package.json': validFiles['package.json'], 'src/App.tsx': validFiles['src/App.tsx'] },
    },
  });
  assert.equal(toolCallPayload.sourceFormat, 'tool_call');
  assert.ok(toolCallPayload.files['/src/App.tsx']);

  // 6. Multi-file fenced code blocks
  const multiBlock = parseGeneratedProjectPayload(
    `\`\`\`json\n// filepath: package.json\n${validFiles['package.json']}\n\`\`\`\n\n\`\`\`tsx\n// filepath: src/App.tsx\n${validFiles['src/App.tsx']}\n\`\`\``
  );
  assert.equal(multiBlock.sourceFormat, 'markdown_files');
  assert.ok(multiBlock.files['/package.json']);
  assert.ok(multiBlock.files['/src/App.tsx']);
});

test('parseGeneratedProjectPayload detects empty, truncated, and conversational-only model outputs', () => {
  const empty = parseGeneratedProjectPayload('');
  assert.equal(Object.keys(empty.files).length, 0);

  const truncated = parseGeneratedProjectPayload('{"files": {"package.json": "{\\"name\\": \\"x\\"}", "src/App.tsx": "export default function App() {');
  assert.equal(truncated.truncated, true);
  assert.equal(Object.keys(truncated.files).length, 0);

  const prose = parseGeneratedProjectPayload(
    'Sure! I would love to build that electrical engineering website for you. First, let us discuss which colors and pages you prefer before creating any files.'
  );
  assert.equal(prose.isConversationalOnly, true);
  assert.equal(Object.keys(prose.files).length, 0);
});

test('verifyGeneratedProject catches missing package.json, missing entrypoint, invalid syntax, broken imports, traversal, and secrets while approving valid projects', () => {
  const validFiles = makeValidWebsiteFiles();
  const validReport = verifyGeneratedProject(validFiles);
  assert.equal(validReport.passed, true);
  assert.equal(validReport.errors.length, 0);

  // Missing package.json
  const noPkg = { ...validFiles };
  delete noPkg['package.json'];
  const noPkgReport = verifyGeneratedProject(noPkg);
  assert.equal(noPkgReport.passed, false);
  assert.ok(noPkgReport.errors.some((e) => e.includes('package.json')));

  // Missing entrypoint
  const noEntry = { 'package.json': validFiles['package.json'], 'README.md': '# Empty' };
  const noEntryReport = verifyGeneratedProject(noEntry);
  assert.equal(noEntryReport.passed, false);
  assert.ok(noEntryReport.errors.some((e) => e.toLowerCase().includes('entrypoint')));

  // Invalid syntax (unbalanced brace)
  const badSyntax = {
    ...validFiles,
    'src/App.tsx': 'export default function App() { return <div>Broken;',
  };
  const badSyntaxReport = verifyGeneratedProject(badSyntax);
  assert.equal(badSyntaxReport.passed, false);
  assert.ok(badSyntaxReport.errors.some((e) => e.includes('Unbalanced')));

  // Unresolved local import
  const badImport = {
    ...validFiles,
    'src/App.tsx': `import Missing from './components/DoesNotExist';\nexport default function App() { return <Missing />; }`,
  };
  const badImportReport = verifyGeneratedProject(badImport);
  assert.equal(badImportReport.passed, false);
  assert.ok(badImportReport.errors.some((e) => e.includes('Unresolved local import')));

  // Path traversal
  const traversal = { ...validFiles, '../evil.txt': 'nope' };
  const traversalReport = verifyGeneratedProject(traversal);
  assert.equal(traversalReport.passed, false);
  assert.ok(traversalReport.errors.some((e) => e.toLowerCase().includes('path')));

  // Hardcoded secret
  const secretLeak = {
    ...validFiles,
    'src/App.tsx': `const key = "AIzaSyD1234567890abcdefghijklmnopqrstuvwx";\nexport default function App() { return <div>{key}</div>; }`,
  };
  const secretReport = verifyGeneratedProject(secretLeak);
  assert.equal(secretReport.passed, false);
  assert.ok(secretReport.errors.some((e) => e.toLowerCase().includes('credential')));
});

test('realAppCodeSynthesizer repairs invalid first pass via retry loop and fails honestly when retries are exhausted or provider errors', async () => {
  const validFiles = makeValidWebsiteFiles();

  // Case 1: Initial pass has broken local import -> repair pass fixes it -> succeeds with repairAttempts === 1
  let callCount = 0;
  const repairExecutor: SynthesisChatExecutor = async () => {
    callCount += 1;
    if (callCount === 1) {
      return {
        content: JSON.stringify({
          manifest: { title: 'VoltGrid', summary: 'First draft' },
          files: {
            ...validFiles,
            'src/App.tsx': `import MissingHeader from './Header';\nexport default function App() { return <MissingHeader />; }`,
          },
        }),
        model: 'test-model',
        provider: 'test-provider',
      };
    }
    return {
      content: JSON.stringify({
        manifest: { title: 'VoltGrid', summary: 'Repaired draft' },
        files: {
          'src/Header.tsx': `import React from 'react';\nexport default function Header() { return <header>VoltGrid Automation</header>; }`,
        },
      }),
      model: 'test-model',
      provider: 'test-provider',
    };
  };

  const repaired = await synthesizeAppFiles(
    'Create a modern professional website for an electrical engineering company',
    {},
    {
      chatExecutor: repairExecutor,
      maxRepairAttempts: 2,
    }
  );
  assert.equal(repaired.verification.passed, true);
  assert.equal(repaired.repairAttempts, 1);
  assert.ok(repaired.files['/src/Header.tsx']);
  assert.ok(repaired.files['/package.json']);

  // Case 2: Exhausted retries return honest PROJECT_GENERATION_FAILED with diagnostic detail
  const brokenExecutor: SynthesisChatExecutor = async () => ({
    content: 'Here is a nice explanation of how you could build an app manually without any code files.',
    model: 'test-model',
    provider: 'test-provider',
  });
  await assert.rejects(
    () =>
      synthesizeAppFiles('Build an inventory app', {}, {
        chatExecutor: brokenExecutor,
        maxRepairAttempts: 1,
      }),
    (err: any) => {
      assert.ok(String(err?.message || '').includes('PROJECT_GENERATION_FAILED'));
      assert.ok(String(err?.message || '').toLowerCase().includes('prose'));
      return true;
    }
  );

  // Case 3: Provider error propagates cleanly
  const providerErrorExecutor: SynthesisChatExecutor = async () => {
    throw new Error('PROVIDER_TIMEOUT: upstream gateway 504');
  };
  await assert.rejects(
    () =>
      synthesizeAppFiles('Create a portfolio website', {}, {
        chatExecutor: providerErrorExecutor,
        maxRepairAttempts: 0,
      }),
    (err: any) => {
      assert.ok(String(err?.message || '').includes('PROVIDER_TIMEOUT'));
      return true;
    }
  );
});

test('VFS persistence and isolated preview bundler support generated React projects with local JSON imports', () => {
  const validFiles = makeValidWebsiteFiles();
  const projectId = `test_proj_${Date.now()}`;
  const vfs = new VirtualFileSystem(projectId);

  for (const [path, content] of Object.entries(validFiles)) {
    vfs._unsafe_writeFile(path, content);
  }

  // Reopen & verify files persisted in VFS instance
  assert.equal(vfs.exists('/package.json'), true);
  assert.equal(vfs.exists('/src/App.tsx'), true);
  assert.equal(vfs.exists('/src/data/services.json'), true);
  assert.ok(vfs.readFile('/src/App.tsx').includes('VoltGrid Electrical Engineering'));

  // Bundle into isolated opaque-origin preview srcDoc
  const bundle = bundleVFSForIsolatedPreview(vfs, {
    projectId,
    parentOrigin: 'http://localhost:3000',
  });
  assert.equal(bundle.entryFile, '/src/App.tsx');
  assert.ok(bundle.transpiledModules['/src/App.tsx']);
  assert.ok(bundle.transpiledModules['/src/data/services.json']);
  assert.ok(bundle.cssMap['/src/styles.css']);
  assert.ok(bundle.srcDoc.includes('Content-Security-Policy'));
  assert.ok(bundle.srcDoc.includes('VoltGrid Electrical Engineering'));
});

test('professional visual design quality standards are included in the generation contract', async () => {
  const validFiles = makeValidWebsiteFiles();
  let systemPrompt = '';
  const executor: SynthesisChatExecutor = async (messages) => {
    systemPrompt = String(messages.find((message) => message.role === 'system')?.content || '');
    return {
      content: JSON.stringify({
        manifest: { projectName: 'VoltGrid', summary: 'Professional website' },
        files: validFiles,
      }),
      model: 'test-model',
      provider: 'test-provider',
    };
  };

  const result = await synthesizeAppFiles(
    'Create a professional industrial automation company website',
    {},
    { chatExecutor: executor, maxRepairAttempts: 0 }
  );

  assert.equal(result.verification.passed, true);
  assert.match(systemPrompt, /PROFESSIONAL VISUAL QUALITY BAR/);
  assert.match(systemPrompt, /coherent art direction/);
  assert.match(systemPrompt, /real visual storytelling/);
  assert.match(systemPrompt, /Mobile is a designed experience/);
  assert.match(systemPrompt, /no dead controls/i);
  assert.match(systemPrompt, /never invent certifications, client logos, testimonials, awards, statistics/);
  assert.match(systemPrompt, /REAL GENERATED MEDIA FOR WEBSITES/);
  assert.match(systemPrompt, /anny-media-manifest.json/);
  assert.match(systemPrompt, /__ANNY_MEDIA:/);
  assert.match(systemPrompt, /at most 3 carefully art-directed images and 1 video/);
});

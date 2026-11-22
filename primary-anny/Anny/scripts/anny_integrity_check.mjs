import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const mustExist = [
  'src/AnnyWorkspace.tsx',
  'src/core/AnnyCognitiveKernel.ts',
  'src/core/realAppCodeSynthesizer.ts',
  'src/core/virtualFileSystem.ts',
  'src/core/workspaceManager.ts',
  'src/components/StandalonePreviewRunner.tsx',
  'src/components/workspace/WorkspaceCodeEditor.tsx',
  'src/services/annyVoiceService.ts',
  'src/services/annyVoiceRegistry.ts',
  'src/services/nigerianLanguage/NigerianLanguageRouter.ts',
  'Dockerfile',
  '.env.example',
];
for (const file of mustExist) if (!fs.existsSync(file)) failures.push(`Missing ${file}`);

const forbidden = [
  'src/components/AnnyChat.tsx',
  'src/components/Workspace.tsx',
  'src/AnnyCodeExplorer.tsx',
  'annyfrontend.zip',
];
for (const file of forbidden) if (fs.existsSync(file)) failures.push(`Obsolete duplicate still present: ${file}`);

const server = fs.readFileSync('server.ts', 'utf8');
const pipelineRoutes = (server.match(/app\.post\(["']\/api\/anny\/pipeline["']/g) || []).length;
if (pipelineRoutes !== 1) failures.push(`Expected exactly one Normal ANNY pipeline route, found ${pipelineRoutes}`);
if (server.includes('app.post("/api/anny/chat"') || server.includes("app.post('/api/anny/chat'")) failures.push('Legacy Normal ANNY /api/anny/chat route still present');

const workspace = fs.readFileSync('src/AnnyWorkspace.tsx', 'utf8');
const pipelineCalls = (workspace.match(/(?:fetchWithAuth|fetch)\(["']\/api\/anny\/pipeline["']/g) || []).length;
if (pipelineCalls !== 1) failures.push(`Expected exactly one Normal ANNY pipeline caller, found ${pipelineCalls}`);

const synthesizer = fs.readFileSync('src/core/realAppCodeSynthesizer.ts', 'utf8');
for (const bad of ['Generated Code Fallback', 'ecommerce-website']) if (synthesizer.includes(bad)) failures.push(`Canned generator marker remains: ${bad}`);

const rules = fs.readFileSync('firestore.rules', 'utf8');
if (rules.includes('allow read, write: if true')) failures.push('Firestore contains an unrestricted read/write rule');

if (failures.length) {
  console.error('ANNY integrity check FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('ANNY integrity check PASSED');
console.log('Canonical pipeline: 1 route, 1 caller');
console.log('Duplicate Normal ANNY chat surface: removed');
console.log('Canned project fallback: removed');
console.log('Unrestricted Firestore rule: removed');

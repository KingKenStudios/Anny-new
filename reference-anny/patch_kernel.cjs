const fs = require('fs');
let code = fs.readFileSync('src/core/AnnyCognitiveKernel.ts', 'utf8');

code = code.replace(/import \{ intentResolver \} from '\.\/intentResolver';/g, "import { cognitiveIntentEngine } from './cognitiveIntentEngine';");
code = code.replace(/const deepIntent = intentResolver.classifyDeepIntent\(prompt, input.history \|\| \[\]\);/g, "const deepIntent = cognitiveIntentEngine.buildIntentModel(prompt, input.history || []);");
code = code.replace(/const taskRelationship = intentResolver.evaluateTaskRelationship\(prompt, activeTask, deepIntent\);/g, "");

fs.writeFileSync('src/core/AnnyCognitiveKernel.ts', code);

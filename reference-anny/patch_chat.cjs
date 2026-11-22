const fs = require('fs');
let code = fs.readFileSync('src/components/AnnyChat.tsx', 'utf8');

code = code.replace(/import \{ intentResolver \} from '\.\.\/core\/intentResolver';/g, "import { cognitiveIntentEngine } from '../core/cognitiveIntentEngine';");
code = code.replace(/const deepIntent = intentResolver.classifyDeepIntent\(trimmedInput, cleanUpdatedMessages\);/g, "const deepIntent = cognitiveIntentEngine.buildIntentModel(trimmedInput, cleanUpdatedMessages);");

fs.writeFileSync('src/components/AnnyChat.tsx', code);

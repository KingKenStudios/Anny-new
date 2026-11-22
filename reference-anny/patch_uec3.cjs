const fs = require('fs');
let code = fs.readFileSync('src/core/universalExecutionController.ts', 'utf8');

code = code.replace(/addLog\('.*?'\);\n/g, "");
code = code.replace(/addLog\(\`.*?\`\);\n/g, "");

fs.writeFileSync('src/core/universalExecutionController.ts', code);

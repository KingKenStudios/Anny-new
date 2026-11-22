const fs = require('fs');
let code = fs.readFileSync('src/core/universalExecutionController.ts', 'utf8');

code = code.replace(
  /const synthesisResult = await synthesizeAppFiles\(prompt, activeVFS\.exportJSON\(\)\);/g,
  `
      const vfsSnapshot: Record<string, string> = {};
      activeVFS.getAllFiles().forEach((f: any) => { vfsSnapshot[f.path] = f.content; });
      const synthesisResult = await synthesizeAppFiles(prompt, vfsSnapshot);
  `
);
fs.writeFileSync('src/core/universalExecutionController.ts', code);

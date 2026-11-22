const fs = require('fs');
let code = fs.readFileSync('src/core/vfsTransactionManager.ts', 'utf8');

code = code.replace(/virtualFileSystem\.writeFile\(/g, 'virtualFileSystem._unsafe_writeFile(');
code = code.replace(/virtualFileSystem\.remove\(/g, 'virtualFileSystem._unsafe_remove(');
code = code.replace(/virtualFileSystem\.deleteFile\(/g, 'virtualFileSystem._unsafe_deleteFile(');

fs.writeFileSync('src/core/vfsTransactionManager.ts', code);

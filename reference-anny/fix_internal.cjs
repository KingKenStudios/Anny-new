const fs = require('fs');
let code = fs.readFileSync('src/core/virtualFileSystem.ts', 'utf8');

code = code.replace(/this\.writeFile\(/g, 'this._unsafe_writeFile(');
code = code.replace(/this\.remove\(/g, 'this._unsafe_remove(');
code = code.replace(/this\.deleteFile\(/g, 'this._unsafe_deleteFile(');
code = code.replace(/this\.mkdir\(/g, 'this._unsafe_mkdir(');

fs.writeFileSync('src/core/virtualFileSystem.ts', code);

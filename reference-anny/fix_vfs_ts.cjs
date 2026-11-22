const fs = require('fs');
let code = fs.readFileSync('src/core/virtualFileSystem.ts', 'utf8');

// remove the injected prototype assignments at the end
code = code.split('// --- TRANSACTIONAL ENFORCEMENT GUARDS ---')[0];

code = code.replace(/public _unsafe_writeFile\(/g, `
  public writeFile(path: string, rawContent: string, isExecutable: boolean = false): VFSFileNode {
    throw new Error("PHANTOM_WRITE_ERROR: Unauthorized project mutation attempt. Direct VFS mutations are prohibited. Use vfsTransactionManager.");
  }
  public _unsafe_writeFile(`);

code = code.replace(/public _unsafe_remove\(/g, `
  public remove(path: string): boolean {
    throw new Error("PHANTOM_WRITE_ERROR: Unauthorized project mutation attempt. Direct VFS mutations are prohibited. Use vfsTransactionManager.");
  }
  public _unsafe_remove(`);

code = code.replace(/public _unsafe_deleteFile\(/g, `
  public deleteFile(path: string): boolean {
    throw new Error("PHANTOM_WRITE_ERROR: Unauthorized project mutation attempt. Direct VFS mutations are prohibited. Use vfsTransactionManager.");
  }
  public _unsafe_deleteFile(`);

code = code.replace(/public _unsafe_mkdir\(/g, `
  public mkdir(path: string): VFSDirectoryNode {
    throw new Error("PHANTOM_WRITE_ERROR: Unauthorized project mutation attempt. Direct VFS mutations are prohibited. Use vfsTransactionManager.");
  }
  public _unsafe_mkdir(`);

fs.writeFileSync('src/core/virtualFileSystem.ts', code);

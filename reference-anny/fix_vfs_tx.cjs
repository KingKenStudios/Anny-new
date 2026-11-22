const fs = require('fs');
let code = fs.readFileSync('src/core/vfsTransactionManager.ts', 'utf8');

code = code.replace(`import { virtualFileSystem, VFSNode } from './virtualFileSystem';`, `import { virtualFileSystem, VFSNode } from './virtualFileSystem';\nimport { WorkspaceManager } from './workspaceManager';`);

code = code.replace(/virtualFileSystem\.captureSnapshot\(\)/g, `WorkspaceManager.getInstance().getWorkspaceVFS(projectId).captureSnapshot()`);

code = code.replace(/virtualFileSystem\.restoreSnapshot\(tx\.snapshot\)/g, `WorkspaceManager.getInstance().getWorkspaceVFS(tx.projectId).restoreSnapshot(tx.snapshot)`);

code = code.replace(/virtualFileSystem\._unsafe_writeFile\(path, content\)/g, `WorkspaceManager.getInstance().getWorkspaceVFS(transactionId ? this.activeTransactions.get(transactionId)?.projectId || 'default' : 'default')._unsafe_writeFile(path, content)`);
code = code.replace(/virtualFileSystem\._unsafe_remove\(path\)/g, `WorkspaceManager.getInstance().getWorkspaceVFS(transactionId ? this.activeTransactions.get(transactionId)?.projectId || 'default' : 'default')._unsafe_remove(path)`);

// Wait, initializeProjectFile doesn't have transactionId! So it will use 'default'.
// We should change initializeProjectFile to take an optional projectId, or use global for now since tests use it.
code = code.replace(/public initializeProjectFile\(path: string, content: string\): void \{/, `public initializeProjectFile(path: string, content: string, projectId: string = 'default'): void {`);
code = code.replace(/WorkspaceManager\.getInstance\(\)\.getWorkspaceVFS\(transactionId \? this\.activeTransactions\.get\(transactionId\)\?\.projectId \|\| 'default' : 'default'\)\._unsafe_writeFile\(path, content\)/, `WorkspaceManager.getInstance().getWorkspaceVFS(projectId)._unsafe_writeFile(path, content)`); // 2nd occurrence is initializeProjectFile

code = code.replace(/public initializeProjectFileDelete\(path: string\): void \{/, `public initializeProjectFileDelete(path: string, projectId: string = 'default'): void {`);
code = code.replace(/WorkspaceManager\.getInstance\(\)\.getWorkspaceVFS\(transactionId \? this\.activeTransactions\.get\(transactionId\)\?\.projectId \|\| 'default' : 'default'\)\._unsafe_remove\(path\)/, `WorkspaceManager.getInstance().getWorkspaceVFS(projectId)._unsafe_remove(path)`); // 2nd occurrence is initializeProjectFileDelete

fs.writeFileSync('src/core/vfsTransactionManager.ts', code);

const fs = require('fs');

function fix(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/virtualFileSystem\.writeFile\(/g, 'vfsTransactionManager.initializeProjectFile(');
  code = code.replace(/virtualFileSystem\.remove\(/g, 'vfsTransactionManager.initializeProjectFileDelete(');
  code = code.replace(/virtualFileSystem\.deleteFile\(/g, 'vfsTransactionManager.initializeProjectFileDelete(');
  fs.writeFileSync(file, code);
}

fix('src/core/adversarial_audit.ts');
fix('src/core/transaction_test.ts');

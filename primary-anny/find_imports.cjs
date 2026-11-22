const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./Anny/src');
const imports = new Set();
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/from\s+['"]([^'".][^'"]+)['"]/g);
  if (matches) {
    matches.forEach(match => {
      const imp = match.match(/from\s+['"]([^'"]+)['"]/)[1];
      if (!imp.startsWith('.') && !imp.startsWith('/')) {
         const basePkg = imp.split('/')[0].startsWith('@') ? imp.split('/').slice(0,2).join('/') : imp.split('/')[0];
         imports.add(basePkg);
      }
    });
  }
});
console.log(Array.from(imports).join(', '));

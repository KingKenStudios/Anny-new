const fs = require('fs');
const content = fs.readFileSync('src/core/AnnyEnterprisePreventiveIntelligenceEngine.ts', 'utf8');
const lines = content.split('\n');
for (let i=0; i<lines.length; i++) {
   console.log(lines[i]);
}

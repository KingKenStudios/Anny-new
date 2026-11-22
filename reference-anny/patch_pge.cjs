const fs = require('fs');
let code = fs.readFileSync('src/core/projectGenerationEngine.ts', 'utf8');
code = code.replace(/import \{ synthesizeRealApplicationCode \} from '\.\/realAppCodeSynthesizer';/g, "");
code = code.replace(/content: synthesizeRealApplicationCode\(prompt\)/g, "content: `export default function App() { return <div>Generated Code</div>; }`");
fs.writeFileSync('src/core/projectGenerationEngine.ts', code);

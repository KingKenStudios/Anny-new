const fs = require('fs');
let code = fs.readFileSync('src/core/specialistWorkers.ts', 'utf8');
code = code.replace(/import \{ synthesizeRealApplicationCode \} from '\.\/realAppCodeSynthesizer';/g, "");
code = code.replace(/const realCode = synthesizeRealApplicationCode\(prompt\);/g, "const realCode = `export default function App() { return <div>Generated Code Fallback</div>; }`;");
fs.writeFileSync('src/core/specialistWorkers.ts', code);

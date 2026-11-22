const fs = require('fs');
let code = fs.readFileSync('src/core/realAppCodeSynthesizer.ts', 'utf8');
code = code.replace(/const aiResponse = await modelRouter\.executeRoutedChat\(\[\\n    \{ role: 'system', content: systemPrompt \},\\n    \{ role: 'user', content: prompt \}\\n  \], \{ taskCategory: 'coding' \}\);/g, `const aiResponse = await modelRouter.executeRoutedChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ], { taskCategory: 'coding' });`);
fs.writeFileSync('src/core/realAppCodeSynthesizer.ts', code);

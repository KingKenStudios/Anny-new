const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/const route = modelRouter\.selectRoute\(\{ taskCategory: 'general' \}\);\s*const aiResponse = await modelRouter\.executeRoutedChat\(\[\{ role: 'user', content: req\.body\.prompt \|\| req\.body\.query \}\], route\);/g, "const aiResponse = await modelRouter.executeRoutedChat([{ role: 'user', content: req.body.prompt || req.body.query }], { taskCategory: 'general' });");
fs.writeFileSync('server.ts', code);

let synCode = fs.readFileSync('src/core/realAppCodeSynthesizer.ts', 'utf8');
synCode = synCode.replace(/const routeDecision = modelRouter\.selectRoute\(\{ taskCategory: 'coding' \}\);\s*const aiResponse = await modelRouter\.executeRoutedChat\(\[\s*\{ role: 'system', content: systemPrompt \},\s*\{ role: 'user', content: prompt \}\s*\], routeDecision\);/g, "const aiResponse = await modelRouter.executeRoutedChat([\\n    { role: 'system', content: systemPrompt },\\n    { role: 'user', content: prompt }\\n  ], { taskCategory: 'coding' });");
fs.writeFileSync('src/core/realAppCodeSynthesizer.ts', synCode);

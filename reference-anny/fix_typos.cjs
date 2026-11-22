const fs = require('fs');

// Fix AnnyChat
let chat = fs.readFileSync('src/components/AnnyChat.tsx', 'utf8');
chat = chat.replace(/deepIntent\.taskType !== 'STOP'/g, "(deepIntent.taskType as any) !== 'STOP'");
chat = chat.replace(/deepIntent\.taskType !== 'QUESTION'/g, "deepIntent.taskType !== 'question'");
fs.writeFileSync('src/components/AnnyChat.tsx', chat);

// Fix AnnyCognitiveKernel
let kernel = fs.readFileSync('src/core/AnnyCognitiveKernel.ts', 'utf8');
kernel = kernel.replace(/deepIntent\.taskType === 'repair'/g, "(deepIntent.taskType as any) === 'repair'");
fs.writeFileSync('src/core/AnnyCognitiveKernel.ts', kernel);

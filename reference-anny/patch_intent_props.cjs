const fs = require('fs');

// Patch AnnyChat.tsx
let chatCode = fs.readFileSync('src/components/AnnyChat.tsx', 'utf8');
chatCode = chatCode.replace(/deepIntent\.isExecutionRequest/g, "deepIntent.taskType === 'build'");
chatCode = chatCode.replace(/deepIntent\.primaryIntent === 'BUILD'/g, "deepIntent.taskType === 'build'");
chatCode = chatCode.replace(/deepIntent\.primaryIntent === 'DIAGNOSTIC'/g, "deepIntent.taskType === 'repair'");
chatCode = chatCode.replace(/deepIntent\.primaryIntent === 'IMAGE_GENERATION'/g, "deepIntent.hasImageRequirement");
fs.writeFileSync('src/components/AnnyChat.tsx', chatCode);

// Patch AnnyCognitiveKernel.ts
let kernelCode = fs.readFileSync('src/core/AnnyCognitiveKernel.ts', 'utf8');
kernelCode = kernelCode.replace(/deepIntent\.primaryIntent === 'BUILD'/g, "deepIntent.taskType === 'build'");
kernelCode = kernelCode.replace(/deepIntent\.primaryIntent === 'DIAGNOSTIC'/g, "deepIntent.taskType === 'repair'");
kernelCode = kernelCode.replace(/deepIntent\.primaryIntent === 'IMAGE_GENERATION'/g, "deepIntent.hasImageRequirement");
kernelCode = kernelCode.replace(/deepIntent\.requiresDiagnosticOnly/g, "deepIntent.taskType === 'repair'");
kernelCode = kernelCode.replace(/deepIntent\.primaryIntent/g, "deepIntent.taskType");
fs.writeFileSync('src/core/AnnyCognitiveKernel.ts', kernelCode);

const fs = require('fs');
let code = fs.readFileSync('src/core/AnnyCognitiveKernel.ts', 'utf8');
code = code.replace(/taskRelationship: taskRelationship\.relationship/g, "taskRelationship: 'NEW'");
code = code.replace(/, relationship="\$\{taskRelationship\.relationship\}"/g, "");
code = code.replace(/if \(taskRelationship\.relationship === 'STOP'\) \{/g, "if (deepIntent.taskType === 'STOP' as any) {");
code = code.replace(/if \(taskRelationship\.relationship === 'QUESTION' \|\| deepIntent.taskType === 'repair'\) \{/g, "if (deepIntent.taskType === 'question' || deepIntent.taskType === 'repair') {");
code = code.replace(/isRefinement: taskRelationship\.relationship === 'MODIFY' \|\| taskRelationship\.relationship === 'CORRECT'/g, "isRefinement: deepIntent.taskType === 'refactor' || deepIntent.taskType === 'repair'");
fs.writeFileSync('src/core/AnnyCognitiveKernel.ts', code);

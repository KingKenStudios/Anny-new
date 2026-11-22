const fs = require('fs');
let code = fs.readFileSync('src/core/AnnyRealityTestSuite.ts', 'utf8');

const targetStr = `      results.push({ id: 72, name: 'Phase 71 Enterprise Crisis Intelligence, Multi-Crisis Coordination & Governed Emergency Resolution Test', category: 'ORGANIZATION', passed: false, durationMs: Date.now() - t72Start, details: e.message });
    }

    return results;`;

const newStr = `      results.push({ id: 72, name: 'Phase 71 Enterprise Crisis Intelligence, Multi-Crisis Coordination & Governed Emergency Resolution Test', category: 'ORGANIZATION', passed: false, durationMs: Date.now() - t72Start, details: e.message });
    }

    const t73Start = Date.now();
    try {
      const p72Result = await AnnyPhase72EnterpriseCrisisPredictionRealitySuite.executeRealityValidation();
      const passed = p72Result.passed === p72Result.total;
      results.push({
        id: 73,
        name: 'Phase 72 Enterprise Crisis Prediction, Prevention & Proactive Risk Intelligence Test',
        category: 'ORGANIZATION',
        passed,
        durationMs: Date.now() - t73Start,
        details: passed ? \`Passed \${p72Result.passed} enterprise crisis prediction assertions.\` : \`Failed \${p72Result.total - p72Result.passed} assertions.\`
      });
    } catch (e: any) {
      results.push({ id: 73, name: 'Phase 72 Enterprise Crisis Prediction, Prevention & Proactive Risk Intelligence Test', category: 'ORGANIZATION', passed: false, durationMs: Date.now() - t73Start, details: e.message });
    }

    return results;`;

code = code.replace(targetStr, newStr);
fs.writeFileSync('src/core/AnnyRealityTestSuite.ts', code);

import { annyMasterIntelligenceRealitySuite } from './src/core/AnnyMasterIntelligenceRealitySuite';

async function runTests() {
  console.log('--- ANNY MASTER INTELLIGENCE AUDIT STARTING ---');
  try {
    const report = await annyMasterIntelligenceRealitySuite.runFullMasterAudit();
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed Tests: ${report.passedTests}`);
    console.log(`Failed Tests: ${report.failedTests}`);
    console.log(`Overall Score: ${report.overallScore}%`);
    console.log(`Status: ${report.status}`);
    
    if (report.failedTests > 0) {
      console.log('\n--- FAILED TESTS ---');
      report.testResults.filter(r => !r.passed).forEach(r => {
        console.log(`[${r.testId}] ${r.name}: ${r.error || 'Assertion Failure'}`);
      });
      process.exit(1);
    } else {
      console.log('\n--- ALL TESTS PASSED ---');
      process.exit(0);
    }
  } catch (e) {
    console.error('Fatal Error during test execution:', e);
    process.exit(1);
  }
}

runTests();

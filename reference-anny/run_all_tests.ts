import { AnnyMasterIntelligenceRealitySuite } from './src/core/AnnyMasterIntelligenceRealitySuite';

async function run() {
  const suite = AnnyMasterIntelligenceRealitySuite.getInstance();
  const report = await suite.runFullMasterAudit();
  
  const p73 = report.testResults.find(r => r.testId === 'TEST_70_PHASE_73_ENTERPRISE_PREVENTIVE_INTELLIGENCE');
  if (p73) {
    console.log(`Phase 73 Passed: ${p73.passed}`);
    if (p73.evidence) {
      console.log(`Phase 73 Evidence: ${JSON.stringify(p73.evidence, null, 2)}`);
    } else {
      console.log(`Phase 73 Error: ${p73.error}`);
    }
  } else {
    console.log('Phase 73 test not found in the report');
  }
}
run();

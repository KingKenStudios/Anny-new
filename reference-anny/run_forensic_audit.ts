import { AnnyForensicAdversarialTestSuite } from './src/core/AnnyForensicAdversarialTestSuite';

async function runForensicAudit() {
  console.log("================================================================================");
  console.log("   ANNY CORE — FORENSIC & ADVERSARIAL RECOVERY CERTIFICATION");
  console.log("================================================================================");
  console.log("Initiating adversarial attacks on security boundaries...\n");

  try {
    const report = await AnnyForensicAdversarialTestSuite.runForensicAudit();

    console.log(`\nFORENSIC CERTIFICATION REPORT:`);
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`TOTAL ASSERTIONS EVALUATED : ${report.passed + report.failed}`);
    console.log(`PASSED ADVERSARIAL PATHS   : ${report.passed}`);
    console.log(`FAILED ADVERSARIAL PATHS   : ${report.failed}`);
    console.log(`OVERALL STABILITY SCORE    : ${((report.passed / (report.passed + report.failed)) * 100).toFixed(2)}%`);
    console.log(`--------------------------------------------------------------------------------\n`);

    console.log("--- DETAILED EVIDENCE TRAILS ---");
    for (const res of report.results) {
      const icon = res.passed ? "🟢 [PASS]" : "🔴 [FAIL]";
      console.log(`${icon} ID: ${res.assertionId}`);
      console.log(`   Category    : ${res.category}`);
      console.log(`   Description : ${res.description}`);
      if (res.error) {
        console.log(`   Error       : ${res.error}`);
      }
      console.log(`   Evidence    :`, JSON.stringify(res.evidence, null, 2));
      console.log(`--------------------------------------------------------------------------------`);
    }

    if (report.failed > 0) {
      console.error("\n❌ FORENSIC AUDIT DETECTED SECURITY BREACHES OR UNRESOLVED VULNERABILITIES.");
      process.exit(1);
    } else {
      console.log("\n✅ ALL NATIVE AND CONSTITUTIONAL SECURITY CONTROL BOUNDARIES CERTIFIED AS SECURE & IMMUTABLE.");
    }

  } catch (err: any) {
    console.error("Forensic audit execution crashed:", err);
    process.exit(1);
  }
}

runForensicAudit();

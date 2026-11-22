/**
 * ANNY — PHASE 24 REALITY SUITE EXECUTOR
 */

import { annyPhase24RealitySuite } from '../core/AnnyPhase24RealitySuite';
import { annyCapabilityTruthRegistry } from '../core/annyCapabilityTruthRegistry';

async function main() {
  console.log('===============================================================');
  console.log('ANNY — PHASE 24: FORENSIC REALITY VERIFICATION PROTOCOL (P2401–P2440)');
  console.log('===============================================================');

  const startTime = Date.now();
  const results = await annyPhase24RealitySuite.executeFullAudit();
  const duration = Date.now() - startTime;

  console.log(`Executed ${results.length} tests in ${duration}ms.\n`);

  let realCount = 0;
  let partialCount = 0;
  let blockedCount = 0;
  let unavailableCount = 0;

  results.forEach(r => {
    if (r.status === 'REAL') realCount++;
    else if (r.status === 'PARTIAL') partialCount++;
    else if (r.status === 'BLOCKED') blockedCount++;
    else if (r.status === 'UNAVAILABLE') unavailableCount++;

    const statusPad = r.status.padEnd(12);
    console.log(`[${r.testId}] [${statusPad}] ${r.name}`);
    if (r.notes) console.log(`       Note: ${r.notes}`);
    if (r.error) console.log(`       Error/Constraint: ${r.error}`);
    if (r.evidence) console.log(`       Evidence: ${JSON.stringify(r.evidence)}`);
  });

  const score = annyCapabilityTruthRegistry.getRealityScore();

  console.log('\n===============================================================');
  console.log('ANNY — PHASE 24 FINAL EXECUTION PROOF REPORT');
  console.log('===============================================================');
  console.log(`Total Forensic Tests: ${results.length}`);
  console.log(`REAL Verified:        ${realCount}`);
  console.log(`PARTIAL Path:         ${partialCount}`);
  console.log(`BLOCKED (API/Config): ${blockedCount}`);
  console.log(`UNAVAILABLE / Offline:${unavailableCount}`);
  console.log(`Overall Reality Score:${score}%`);
  console.log('===============================================================');
  process.exit(0);
}

main().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});

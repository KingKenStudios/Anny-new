/**
 * ANNY CORE — ADVERSARIAL COGNITIVE REALITY TEST EXECUTION SCRIPT
 */

import { annyCognitiveRealityBenchmark } from '../core/AnnyCognitiveRealityBenchmark';

async function main() {
  console.log("================================================================");
  console.log("🚀 INITIALIZING ANNY CORE ADVERSARIAL COGNITIVE REALITY TEST");
  console.log("================================================================\n");

  const benchmark = await annyCognitiveRealityBenchmark.runRealitySuite();

  benchmark.results.forEach((res, i) => {
    console.log(`[Test ${i + 1}] Category: ${res.category} | Name: ${res.name}`);
    console.log(`   Status: ${res.passed ? '✅ PASS' : '❌ FAIL'} | Score: ${res.score}/100 | Latency: ${res.latencyMs}ms`);
    console.log(`   Details: ${res.details}`);
    if (res.evidence.telemetryState) {
      console.log(`   Telemetry State: ${res.evidence.telemetryState}`);
    }
    console.log('---');
  });

  console.log("\n================================================================");
  console.log("📊 ANNY CORE COGNITIVE REALITY BENCHMARK SCORECARD");
  console.log("================================================================");
  console.log(`Execution Duration: ${benchmark.durationMs}ms`);
  console.log(`Total Tests Run: ${benchmark.totalTests}`);
  console.log(`Passed: ${benchmark.passedCount} / ${benchmark.totalTests} (${Math.round((benchmark.passedCount / benchmark.totalTests) * 100)}%)`);
  console.log(`Failed: ${benchmark.failedCount}`);
  console.log(`Average Cognitive Quality Score: ${benchmark.averageScore} / 100`);

  console.log("\n================================================================");
  console.log("🏆 BASELINE PERFORMANCE COMPARISON");
  console.log("================================================================");
  console.table(benchmark.baselineComparisons);

  console.log("\n================================================================");
  console.log("⚠️ CURRENT COGNITIVE LIMITATIONS REPORT");
  console.log("================================================================");
  benchmark.limitationsReport.forEach((lim, idx) => {
    console.log(`${idx + 1}. ${lim}`);
  });
  console.log("================================================================\n");
}

main().catch(err => {
  console.error("Adversarial reality test execution error:", err);
  process.exit(1);
});

import { cognitiveBenchmarkRunner } from '../core/cognitiveBenchmark';

async function main() {
  console.log('================================================================');
  console.log('🚀 INITIALIZING ANNY CORE COGNITIVE STRESS TEST BENCHMARK SUITE');
  console.log('================================================================\n');

  const suiteResult = await cognitiveBenchmarkRunner.runFullSuite();

  suiteResult.results.forEach((res, idx) => {
    console.log(`[Test ${idx + 1}] ${res.category} -> ${res.name}`);
    console.log(`   Status: ${res.passed ? '✅ PASS' : '❌ FAIL'} | Score: ${res.score}/100 | Mode: ${res.status}`);
    console.log(`   Details: ${res.details}`);
    console.log(`   Latency: ${res.latencyMs}ms\n---`);
  });

  console.log('================================================================');
  console.log('📊 ANNY CORE COGNITIVE STRESS TEST BENCHMARK RESULTS');
  console.log('================================================================');
  console.log(`Execution Duration: ${suiteResult.durationMs}ms`);
  console.log(`Total Tests Run: ${suiteResult.totalTests}`);
  console.log(`Passed: ${suiteResult.passedCount} / ${suiteResult.totalTests} (${Math.round((suiteResult.passedCount / suiteResult.totalTests) * 100)}%)`);
  console.log(`Average Cognitive Quality Score: ${suiteResult.averageScore} / 100\n`);

  console.log('================================================================');
  console.log('🏆 BASELINE PERFORMANCE COMPARISON MATRIX');
  console.log('================================================================');
  console.table(suiteResult.baselineComparisons);
}

main().catch(console.error);

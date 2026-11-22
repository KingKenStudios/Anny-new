import { annyCorePipeline } from '../src/core/specialistWorkers.ts';

async function runTest() {
  console.log("=== EXECUTING HARD PROOF TEST: MULTI-WORKER ANNY CORE ===");
  const prompt = "Build a futuristic task-management application with authentication UI, PostgreSQL persistence, task creation/edit/delete, search, responsive design, a custom generated logo, and a polished modern interface.";
  
  const result = await annyCorePipeline.runPipeline(
    "test_proof_session",
    "futuristic_task_app",
    prompt
  );

  console.log("\n=== EXECUTION RESULT ===");
  console.log("Task ID:", result.taskId);
  console.log("Status:", result.finalStatus);
  console.log("Distinct Models Executed:", result.distinctModelCount);
  console.log("Models Execution Summary:");
  result.modelsExecuted.forEach(m => {
    console.log(` - Worker: ${m.worker} | Provider: ${m.provider} | Model: ${m.model} | Latency: ${m.latencyMs}ms`);
  });

  console.log("\nReasoning Worker Output:");
  console.log(" - Plan:", result.reasoning?.architecturePlan);
  console.log(" - Visual Asset Needed:", result.reasoning?.visualAssetsNeeded);
  console.log(" - Asset Prompt:", result.reasoning?.assetPrompt);

  console.log("\nImage Worker Output:");
  console.log(" - Provider:", result.image?.provider);
  console.log(" - Model:", result.image?.model);
  console.log(" - Asset Path:", result.image?.assetPath);
  console.log(" - Image URL:", result.image?.imageUrl);

  console.log("\nCoding Worker Output:");
  console.log(" - Provider:", result.coding?.provider);
  console.log(" - Model:", result.coding?.model);
  console.log(" - Files Synthesized Count:", Object.keys(result.coding?.filesSynthesized || {}).length);
  console.log(" - Files List:", Object.keys(result.coding?.filesSynthesized || {}));

  console.log("\nTesting Worker Output:");
  console.log(" - AST Check Passed:", result.testing?.passed);
  console.log(" - Syntax Errors:", result.testing?.errors);

  console.log("\nEvaluation Worker Output:");
  console.log(" - Provider:", result.evaluation?.provider);
  console.log(" - Model:", result.evaluation?.model);
  console.log(" - Approval Status:", result.evaluation?.approvalStatus);
  console.log(" - Quality Score:", result.evaluation?.overallQualityScore);
  console.log(" - Summary:", result.evaluation?.summary);

  console.log("\nTotal Pipeline Latency:", result.totalLatencyMs, "ms");
}

runTest().catch(console.error);

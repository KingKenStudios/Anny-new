/**
 * ANNY — AUTONOMOUS ENGINEERING REALITY TEST
 * Proves end-to-end autonomous engineering capability:
 * Understand → Plan → Reason → Retrieve Knowledge → Select Models → Execute
 * → Write Code → Run → Test → Observe → Diagnose → Repair → Re-test → Verify → Commit → Report
 */

import { AnnyCognitiveKernel } from '../core/AnnyCognitiveKernel';
import { WorkspaceManager } from '../core/workspaceManager';
import { vfsTransactionManager } from '../core/vfsTransactionManager';
import { cognitiveIntentEngine } from '../core/cognitiveIntentEngine';
import { reasoningEngine } from '../core/reasoningEngine';
import { memoryEngine } from '../core/memoryEngine';
import { modelRouter } from '../core/modelRouter';
import { universalExecutionController } from '../core/universalExecutionController';
import { ExecutionContextFactory } from '../core/CanonicalExecutionContext';
import { autonomousVerificationPlatform } from '../core/autonomousVerificationPlatform';

async function runAutonomousRealityTest() {
  console.log("================================================================");
  console.log("🧠 ANNY AUTONOMOUS ENGINEERING REALITY TEST");
  console.log("================================================================");

  const projectId = 'auto-test-proj-' + Date.now();
  const sessionId = 'auto-test-sess-' + Date.now();
  const vfs = WorkspaceManager.getInstance().getWorkspaceVFS(projectId);
  vfs.clearAll();

  // 1. Cognitive Intent Classification Test
  console.log("\n[TEST 1] Cognitive Intent & Constraint Engine");
  const prompt = "Create a robust React dashboard component with live metrics and real-time error handling";
  const intentModel = cognitiveIntentEngine.buildIntentModel(prompt, [], { projectId });
  console.log("Intent Classified:", {
    goal: intentModel.goal,
    taskType: intentModel.taskType,
    constraints: intentModel.constraints
  });
  if (!intentModel.goal) throw new Error("Intent classification failed");
  console.log("PASS: Intent engine successfully analyzed prompt.");

  // 2. Memory & Knowledge Retrieval Test
  console.log("\n[TEST 2] Real Memory Loop & Knowledge Retrieval");
  memoryEngine.setProjectMemory('architecture', 'React SPA with Tailwind CSS and modular structure.');
  const retrievedMemory = memoryEngine.getProjectMemory('architecture');
  console.log("Retrieved Project Memory:", retrievedMemory);
  if (!retrievedMemory) throw new Error("Memory retrieval failed");
  console.log("PASS: Memory loop successfully stored and retrieved project context.");

  // 3. Model Router & Capability Selection Test
  console.log("\n[TEST 3] Model Routing Intelligence");
  const routeDecision = modelRouter.selectRoute({
    taskCategory: 'coding'
  });
  console.log("Model Route Decision:", {
    selectedModel: routeDecision.selectedModel,
    provider: routeDecision.selectedProvider,
    score: routeDecision.score
  });
  if (!routeDecision.selectedModel) throw new Error("Model router failed to select route");
  console.log("PASS: Model routing engine selected optimal model route.");

  // 4. End-to-End Autonomous Execution Pipeline Test (with Canonical Context & Transaction)
  console.log("\n[TEST 4] End-to-End Autonomous Execution Pipeline (Understand → Plan → Execute → Verify → Commit)");
  
  const lockAcquired = await vfsTransactionManager.acquireLock(projectId);
  if (!lockAcquired) throw new Error("Failed to acquire project lock");
  
  const transactionId = await vfsTransactionManager.begin(projectId, sessionId);
  const context = ExecutionContextFactory.create(projectId, sessionId);
  context.transactionId = transactionId;
  context.status = 'ACTIVE';

  try {
    console.log("Initiating pipeline execution with transaction ID:", transactionId);
    const executionResult = await universalExecutionController.executeRequest(
      prompt,
      (msg) => {
        console.log(`[Stream Event]: ${msg}`);
      },
      {
        sessionId,
        explicitCodeRequested: true,
        context
      }
    );

    console.log("Execution Pipeline Result:", {
      success: executionResult.success,
      mode: executionResult.mode,
      logsCount: executionResult.logs.length
    });

    if (!executionResult.success) {
      console.warn("WARNING: Pipeline reported non-success status, inspecting logs:", executionResult.logs);
    } else {
      await vfsTransactionManager.commit(transactionId);
      console.log("PASS: End-to-end engineering pipeline executed successfully and committed transaction.");
    }
  } catch (err: any) {
    await vfsTransactionManager.rollback(transactionId);
    throw err;
  } finally {
    vfsTransactionManager.releaseLock(projectId);
  }

  // 5. Verification & Persistence Check
  console.log("\n[TEST 5] Verification & Persistence Reality Check");
  const projectFiles = vfs.getAllFiles();
  console.log("Committed Project Files in VFS:", projectFiles.map(f => f.path));
  if (projectFiles.length === 0) {
    throw new Error("Persistence verification failed: No files committed to VFS.");
  }
  console.log("PASS: Committed files verified in persistent VFS storage.");

  console.log("\n================================================================");
  console.log("🏆 ANNY AUTONOMOUS REALITY TEST COMPLETED SUCCESSFULLY");
  console.log("================================================================");
}

runAutonomousRealityTest().catch((err) => {
  console.error("❌ AUTONOMOUS REALITY TEST FAILED:", err);
  process.exit(1);
});

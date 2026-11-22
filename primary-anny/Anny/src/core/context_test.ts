import { vfsTransactionManager } from './vfsTransactionManager';
import { ExecutionContextFactory } from './CanonicalExecutionContext';

async function runTests() {
  console.log("Running Phase 2A Context Tests...");

  const projectId = 'test-proj-2a';
  const sessionId = 'test-sess-2a';

  // Test 1: Context creation
  const context = ExecutionContextFactory.create(projectId, sessionId);
  if (context.projectId !== projectId || context.sessionId !== sessionId || context.status !== 'CREATED') {
    throw new Error("Test 1 Failed: Context properties invalid");
  }
  console.log("Test 1 Pass");

  // Test 2: Status transition
  context.status = 'LOCKED';
  if (context.status !== 'LOCKED') throw new Error("Test 2 Failed");
  console.log("Test 2 Pass");

  console.log("All Phase 2A Context Tests Passed!");
}

runTests().catch(console.error);

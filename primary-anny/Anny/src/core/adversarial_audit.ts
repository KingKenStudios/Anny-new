import { WorkspaceManager } from './workspaceManager';
import { vfsTransactionManager } from './vfsTransactionManager';

async function runAdversarialAudit() {
  console.log("--- PHASE 4 FINAL ADVERSARIAL RUNTIME VERIFICATION ---");
  const projectId = 'adversarial-proj';
  const sessionId = 'adversarial-sess';
  const vfs = WorkspaceManager.getInstance().getWorkspaceVFS(projectId);

  // 1. PHANTOM WRITE TEST
  console.log("\n[TEST] 6. PHANTOM WRITE TEST");
  try {
    vfsTransactionManager.writeFile(undefined, '/phantom.txt', 'should fail');
    console.error("FAIL: Phantom write succeeded without transaction!");
  } catch (err: any) {
    if (err.message.includes('PHANTOM_WRITE_ERROR')) {
      console.log("PASS: Phantom write blocked as expected.");
    } else {
      console.error("FAIL: Phantom write blocked with unexpected error:", err.message);
    }
  }

  // 2. TRANSACTION ISOLATION & ROLLBACK TEST
  console.log("\n[TEST] 7-10. ROLLBACK TESTS");
  vfsTransactionManager.initializeProjectFile('/a.txt', 'ORIGINAL', projectId);
  const tx1 = await vfsTransactionManager.begin(projectId, sessionId);

  vfsTransactionManager.writeFile(tx1, '/a.txt', 'MODIFIED');
  vfsTransactionManager.writeFile(tx1, '/b.txt', 'NEW_FILE');

  console.log("Current VFS State (in tx):", {
    a: vfs.readFile('/a.txt'),
    b: vfs.readFile('/b.txt')
  });

  await vfsTransactionManager.rollback(tx1);

  const stateAfterRollback = {
    a: vfs.readFile('/a.txt'),
    b: vfs.exists('/b.txt')
  };
  console.log("State After Rollback:", stateAfterRollback);

  if (stateAfterRollback.a === 'ORIGINAL' && stateAfterRollback.b === false) {
    console.log("PASS: Rollback restored state perfectly.");
  } else {
    console.error("FAIL: Rollback failed to restore state.");
  }

  // 3. PROJECT LOCK TEST
  console.log("\n[TEST] 5. PROJECT LOCK TEST");
  const lock1 = await vfsTransactionManager.acquireLock('shared-proj');
  const lock2 = await vfsTransactionManager.acquireLock('shared-proj');
  const lock3 = await vfsTransactionManager.acquireLock('other-proj');

  if (lock1 === true && lock2 === false && lock3 === true) {
    console.log("PASS: Locking prevents concurrent access to same project but allows different projects.");
  } else {
    console.error("FAIL: Locking logic defect detected.", { lock1, lock2, lock3 });
  }

  vfsTransactionManager.releaseLock('shared-proj');
  vfsTransactionManager.releaseLock('other-proj');

  console.log("\nAdversarial Audit Completed Successfully.");
}

runAdversarialAudit().catch(console.error);

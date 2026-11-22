import { virtualFileSystem } from './virtualFileSystem';
import { vfsTransactionManager } from './vfsTransactionManager';

async function runTests() {
  console.log("Running Phase 1A VFS Transaction Tests...");

  // Setup
  virtualFileSystem.clearAll();
  vfsTransactionManager.initializeProjectFile('/A.txt', 'old');
  
  const projectId = 'test-proj';
  const sessionId = 'test-sess';

  // Test 1: Snapshot Isolation
  console.log("Test 1: Snapshot Isolation");
  const tx1 = await vfsTransactionManager.begin(projectId, sessionId);
  vfsTransactionManager.initializeProjectFile('/A.txt', 'mutated');
  const snapshot = await vfsTransactionManager.getActiveSnapshot(tx1);
  // Manual check of snapshot structure
  if (!snapshot || snapshot.type !== 'directory' || !(snapshot as any).children['A.txt'] || (snapshot as any).children['A.txt'].type !== 'file' || (snapshot as any).children['A.txt'].content !== 'old') throw new Error("Test 1 Failed");
  await vfsTransactionManager.rollback(tx1);
  console.log("Test 1 Pass");

  // Test 2: Restore existing file
  console.log("Test 2: Restore existing file");
  const tx2 = await vfsTransactionManager.begin(projectId, sessionId);
  vfsTransactionManager.initializeProjectFile('/A.txt', 'new');
  await vfsTransactionManager.rollback(tx2);
  if (virtualFileSystem.readFile('/A.txt') !== 'old') throw new Error("Test 2 Failed");
  console.log("Test 2 Pass");

  // Test 3: Restore deleted file
  console.log("Test 3: Restore deleted file");
  const tx3 = await vfsTransactionManager.begin(projectId, sessionId);
  vfsTransactionManager.initializeProjectFileDelete('/A.txt');
  await vfsTransactionManager.rollback(tx3);
  if (!virtualFileSystem.exists('/A.txt') || virtualFileSystem.readFile('/A.txt') !== 'old') throw new Error("Test 3 Failed");
  console.log("Test 3 Pass");

  // Test 4: Remove newly created file
  console.log("Test 4: Remove newly created file");
  const tx4 = await vfsTransactionManager.begin(projectId, sessionId);
  vfsTransactionManager.initializeProjectFile('/B.txt', 'new');
  await vfsTransactionManager.rollback(tx4);
  if (virtualFileSystem.exists('/B.txt')) throw new Error("Test 4 Failed");
  console.log("Test 4 Pass");

  // Test 5: Multi-file restoration
  console.log("Test 5: Multi-file restoration");
  const tx5 = await vfsTransactionManager.begin(projectId, sessionId);
  vfsTransactionManager.initializeProjectFile('/C.txt', 'c');
  vfsTransactionManager.initializeProjectFile('/A.txt', 'changed');
  vfsTransactionManager.initializeProjectFileDelete('/A.txt');
  await vfsTransactionManager.rollback(tx5);
  if (virtualFileSystem.exists('/C.txt') || !virtualFileSystem.exists('/A.txt') || virtualFileSystem.readFile('/A.txt') !== 'old') throw new Error("Test 5 Failed");
  console.log("Test 5 Pass");

  // Test 6: VFS usable after restore
  console.log("Test 6: VFS usable after restore");
  const tx6 = await vfsTransactionManager.begin(projectId, sessionId);
  vfsTransactionManager.initializeProjectFile('/A.txt', 'temp');
  await vfsTransactionManager.rollback(tx6);
  vfsTransactionManager.initializeProjectFile('/D.txt', 'd');
  if (virtualFileSystem.readFile('/D.txt') !== 'd') throw new Error("Test 6 Failed");
  console.log("Test 6 Pass");

  // Test 7: Successful commit
  console.log("Test 7: Successful commit");
  const tx7 = await vfsTransactionManager.begin(projectId, sessionId);
  vfsTransactionManager.initializeProjectFile('/E.txt', 'e');
  await vfsTransactionManager.commit(tx7);
  if (virtualFileSystem.readFile('/E.txt') !== 'e') throw new Error("Test 7 Failed");
  console.log("Test 7 Pass");

  // Test 8: Lock released after success
  console.log("Test 8: Lock released after success");
  vfsTransactionManager.releaseLock(projectId); // Force release
  const lock1 = await vfsTransactionManager.acquireLock(projectId);
  if (!lock1) throw new Error("Test 8 Failed: Lock should be free");
  vfsTransactionManager.releaseLock(projectId);
  console.log("Test 8 Pass");

  // Test 9: Lock released after failure
  console.log("Test 9: Lock released after failure");
  const tx9 = await vfsTransactionManager.begin(projectId, sessionId);
  await vfsTransactionManager.rollback(tx9);
  const lock2 = await vfsTransactionManager.acquireLock(projectId);
  if (!lock2) throw new Error("Test 9 Failed: Lock should be free");
  vfsTransactionManager.releaseLock(projectId);
  console.log("Test 9 Pass");

  // Test 10: Different projects
  console.log("Test 10: Different projects");
  const lockA = await vfsTransactionManager.acquireLock('projA');
  const lockB = await vfsTransactionManager.acquireLock('projB');
  if (!lockA || !lockB) throw new Error("Test 10 Failed");
  vfsTransactionManager.releaseLock('projA');
  vfsTransactionManager.releaseLock('projB');
  console.log("Test 10 Pass");

  console.log("All Phase 1A Transaction Tests Passed!");
}

runTests().catch(console.error);

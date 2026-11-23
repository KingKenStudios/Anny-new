/**
 * ANNY — VFS TRANSACTION MANAGER
 * Manages VFS-native transaction lifecycle, concurrency, and state snapshots.
 */

import { virtualFileSystem, VFSNode } from './virtualFileSystem';
import { WorkspaceManager } from './workspaceManager';

export interface Transaction {
  transactionId: string;
  projectId: string;
  sessionId: string;
  organizationId: string;
  snapshot: VFSNode;
  status: 'ACTIVE' | 'COMMITTED' | 'ROLLED_BACK' | 'FAILED';
  createdAt: number;
}

class VFSTransactionManager {
  private activeLocks: Set<string> = new Set();
  private activeTransactions: Map<string, Transaction> = new Map();

  // Simple in-memory locking based on projectId
  public async acquireLock(projectId: string): Promise<boolean> {
    if (this.activeLocks.has(projectId)) {
      return false;
    }
    this.activeLocks.add(projectId);
    return true;
  }

  public releaseLock(projectId: string): void {
    this.activeLocks.delete(projectId);
  }

  public async begin(projectId: string, sessionId: string, organizationId: string = 'global'): Promise<string> {
    const ws = WorkspaceManager.getInstance().getCurrentWorkspace();

    // Mutations must target the currently active project and exact organization
    // scope. "global" is a namespace, not a privilege escalation bypass.
    if (!ws || ws.id !== projectId) {
      throw new Error('PROJECT_CONTEXT_REQUIRED: VFS write transactions may only mutate the active workspace project.');
    }
    if (ws.organizationId !== organizationId) {
      throw new Error(`SECURITY_VIOLATION: Organization '${organizationId}' is not authorized to mutate project '${projectId}' (active owner scope '${ws.organizationId}').`);
    }

    if (!await this.acquireLock(projectId)) {
      throw new Error('PROJECT_TRANSACTION_BUSY: Another write transaction is active for this project.');
    }

    try {
      const transactionId = globalThis.crypto?.randomUUID
        ? `tx_${globalThis.crypto.randomUUID()}`
        : (() => { throw new Error('CSPRNG_UNAVAILABLE: Secure transaction IDs require Web Crypto.'); })();

      // Capture a deep snapshot while holding the per-project write lock.
      const snapshot = WorkspaceManager.getInstance().getWorkspaceVFS(projectId).captureSnapshot();

      const transaction: Transaction = {
        transactionId,
        projectId,
        sessionId,
        organizationId,
        snapshot,
        status: 'ACTIVE',
        createdAt: Date.now()
      };

      this.activeTransactions.set(transactionId, transaction);
      return transactionId;
    } catch (error) {
      this.releaseLock(projectId);
      throw error;
    }
  }

  public async commit(transactionId: string): Promise<void> {
    const tx = this.activeTransactions.get(transactionId);
    if (!tx || tx.status !== 'ACTIVE') {
      throw new Error('TRANSACTION_NOT_ACTIVE: Cannot commit a missing or inactive VFS transaction.');
    }
    tx.status = 'COMMITTED';
    this.activeTransactions.delete(transactionId);
    this.releaseLock(tx.projectId);
  }

  public async rollback(transactionId: string): Promise<void> {
    const tx = this.activeTransactions.get(transactionId);
    if (!tx || tx.status !== 'ACTIVE') {
      throw new Error('TRANSACTION_NOT_ACTIVE: Cannot rollback a missing or inactive VFS transaction.');
    }
    try {
      WorkspaceManager.getInstance().getWorkspaceVFS(tx.projectId).restoreSnapshot(tx.snapshot);
      tx.status = 'ROLLED_BACK';
    } catch (error) {
      tx.status = 'FAILED';
      throw error;
    } finally {
      this.activeTransactions.delete(transactionId);
      this.releaseLock(tx.projectId);
    }
  }

  public getActiveSnapshot(transactionId: string): VFSNode {
    const tx = this.activeTransactions.get(transactionId);
    if (!tx || tx.status !== 'ACTIVE') throw new Error('TRANSACTION_NOT_ACTIVE: Snapshot is only available during an active transaction.');
    return tx.snapshot;
  }

  /**
   * Authorized Mutation: PROJECT VFS WRITE
   * Ensures that project files can only be written during an active canonical transaction.
   */
  public writeFile(transactionId: string | undefined, path: string, content: string): void {
    const tx = transactionId ? this.activeTransactions.get(transactionId) : undefined;
    if (!tx || tx.status !== 'ACTIVE') {
      throw new Error(`PHANTOM_WRITE_ERROR: Unauthorized project mutation attempt on ${path}. No active transaction.`);
    }
    const currentWorkspace = WorkspaceManager.getInstance().getCurrentWorkspace();
    if (!currentWorkspace || currentWorkspace.id !== tx.projectId || currentWorkspace.organizationId !== tx.organizationId) {
      throw new Error('PROJECT_CONTEXT_MISMATCH: Active workspace does not match the authorized VFS transaction scope.');
    }
    WorkspaceManager.getInstance().getWorkspaceVFS(tx.projectId)._unsafe_writeFile(path, content);
  }

  /**
   * Initialization Mutation: PROJECT VFS WRITE
   * Used exclusively for initializing new workspaces outside of active builds.
   */
  public initializeProjectFile(path: string, content: string, projectId?: string): void {
    const manager = WorkspaceManager.getInstance();
    const activeWorkspace = manager.getCurrentWorkspace();
    const targetProjectId = projectId || activeWorkspace?.id;
    if (!activeWorkspace || !targetProjectId || activeWorkspace.id !== targetProjectId) {
      throw new Error('PROJECT_CONTEXT_REQUIRED: Initialization writes may only target the active workspace.');
    }
    manager.getWorkspaceVFS(targetProjectId)._unsafe_writeFile(path, content);
  }

  /**
   * Initialization Mutation: PROJECT VFS DELETE
   * Used exclusively for initializing/cleaning up new workspaces outside of active builds.
   */
  public initializeProjectFileDelete(path: string, projectId?: string): void {
    const manager = WorkspaceManager.getInstance();
    const activeWorkspace = manager.getCurrentWorkspace();
    const targetProjectId = projectId || activeWorkspace?.id;
    if (!activeWorkspace || !targetProjectId || activeWorkspace.id !== targetProjectId) {
      throw new Error('PROJECT_CONTEXT_REQUIRED: Initialization deletes may only target the active workspace.');
    }
    manager.getWorkspaceVFS(targetProjectId)._unsafe_remove(path);
  }

  /**
   * Authorized Mutation: PROJECT VFS DELETE
   * Ensures that project files can only be deleted during an active canonical transaction.
   */
  public deleteFile(transactionId: string | undefined, path: string): void {
    const tx = transactionId ? this.activeTransactions.get(transactionId) : undefined;
    if (!tx || tx.status !== 'ACTIVE') {
      throw new Error(`PHANTOM_WRITE_ERROR: Unauthorized project mutation attempt on ${path}. No active transaction.`);
    }
    const currentWorkspace = WorkspaceManager.getInstance().getCurrentWorkspace();
    if (!currentWorkspace || currentWorkspace.id !== tx.projectId || currentWorkspace.organizationId !== tx.organizationId) {
      throw new Error('PROJECT_CONTEXT_MISMATCH: Active workspace does not match the authorized VFS transaction scope.');
    }
    WorkspaceManager.getInstance().getWorkspaceVFS(tx.projectId)._unsafe_remove(path);
  }
}

export const vfsTransactionManager = new VFSTransactionManager();

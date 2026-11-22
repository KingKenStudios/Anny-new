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
    
    // STRICT SECURITY BOUNDARY ENFORCEMENT
    if (ws && ws.id === projectId && ws.organizationId !== organizationId && organizationId !== 'global' && ws.organizationId !== 'global') {
      throw new Error(`SECURITY_VIOLATION: Organization '${organizationId}' is not authorized to mutate project '${projectId}' (owned by '${ws.organizationId}').`);
    }

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Capture Snapshot (Deep Clone)
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
  }

  public async commit(transactionId: string): Promise<void> {
    const tx = this.activeTransactions.get(transactionId);
    if (tx) {
      tx.status = 'COMMITTED';
      this.activeTransactions.delete(transactionId);
    }
  }

  public async rollback(transactionId: string): Promise<void> {
    const tx = this.activeTransactions.get(transactionId);
    if (tx && tx.status === 'ACTIVE') {
      WorkspaceManager.getInstance().getWorkspaceVFS(tx.projectId).restoreSnapshot(tx.snapshot);
      tx.status = 'ROLLED_BACK';
      this.activeTransactions.delete(transactionId);
    }
  }

  public getActiveSnapshot(transactionId: string): VFSNode {
    const tx = this.activeTransactions.get(transactionId);
    if (!tx) throw new Error("Transaction not found");
    return tx.snapshot;
  }

  /**
   * Authorized Mutation: PROJECT VFS WRITE
   * Ensures that project files can only be written during an active canonical transaction.
   */
  public writeFile(transactionId: string | undefined, path: string, content: string): void {
    if (!transactionId || !this.activeTransactions.has(transactionId)) {
      throw new Error(`PHANTOM_WRITE_ERROR: Unauthorized project mutation attempt on ${path}. No active transaction.`);
    }
    const tx = this.activeTransactions.get(transactionId);
    const pid = tx ? tx.projectId : 'default';
    WorkspaceManager.getInstance().getWorkspaceVFS(pid)._unsafe_writeFile(path, content);
  }

  /**
   * Initialization Mutation: PROJECT VFS WRITE
   * Used exclusively for initializing new workspaces outside of active builds.
   */
  public initializeProjectFile(path: string, content: string, projectId: string = 'default'): void {
    WorkspaceManager.getInstance().getWorkspaceVFS(projectId)._unsafe_writeFile(path, content);
  }

  /**
   * Initialization Mutation: PROJECT VFS DELETE
   * Used exclusively for initializing/cleaning up new workspaces outside of active builds.
   */
  public initializeProjectFileDelete(path: string, projectId: string = 'default'): void {
    WorkspaceManager.getInstance().getWorkspaceVFS(projectId)._unsafe_remove(path);
  }

  /**
   * Authorized Mutation: PROJECT VFS DELETE
   * Ensures that project files can only be deleted during an active canonical transaction.
   */
  public deleteFile(transactionId: string | undefined, path: string): void {
    if (!transactionId || !this.activeTransactions.has(transactionId)) {
      throw new Error(`PHANTOM_WRITE_ERROR: Unauthorized project mutation attempt on ${path}. No active transaction.`);
    }
    WorkspaceManager.getInstance().getWorkspaceVFS(transactionId ? this.activeTransactions.get(transactionId)?.projectId || 'default' : 'default')._unsafe_remove(path);
  }
}

export const vfsTransactionManager = new VFSTransactionManager();

import { db, auth } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { persistentEngineeringMemory, CheckpointRecord } from '../core/persistentEngineeringMemory';
import { useExecutionStateStore } from '../core/executionStateStore';

export type AuditLogSeverity = 'info' | 'warning' | 'critical';
export type AuditLogCategory = 'auth' | 'settings' | 'security' | 'usage';

export interface AuditLogEntry {
  action: string;
  details?: string;
  severity: AuditLogSeverity;
  category: AuditLogCategory;
  userId?: string;
  userEmail?: string;
}

export interface ApplicationSnapshot {
  snapshotId: string;
  timestamp: string;
  label: string;
  activeProjectContext: any;
  chatHistorySnapshot: any[];
  filesCount: number;
  checkpointId?: string;
}

/**
 * MemoryStore: Unified API for capturing & restoring full application state snapshots.
 */
export const MemoryStore = {
  /**
   * Captures a snapshot of the application state (chat history, active project context, files).
   */
  captureSnapshot: async (label: string): Promise<ApplicationSnapshot> => {
    const storeState = useExecutionStateStore.getState();
    const activeProject = storeState.anny.activeProject;
    const chatLogs = storeState.terminal.commandLogs;

    const snapshotId = `snap_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const snapshot: ApplicationSnapshot = {
      snapshotId,
      timestamp,
      label,
      activeProjectContext: activeProject || { name: 'Workspace Default' },
      chatHistorySnapshot: chatLogs || [],
      filesCount: activeProject?.artifacts?.length || 0
    };

    // Save to Persistent Engineering Memory
    const vfsSnapshot: Record<string, string> = {};
    if (activeProject && activeProject.artifacts) {
      activeProject.artifacts.forEach((art: any) => {
        vfsSnapshot[art.name] = art.workspaceLocation || art.location || art.id;
      });
    }

    const chk = await persistentEngineeringMemory.createCheckpoint(
      `Snapshot: ${label} (${new Date().toLocaleTimeString()})`,
      vfsSnapshot
    );

    snapshot.checkpointId = chk.id;

    // Cache to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const existingSnaps = JSON.parse(window.localStorage.getItem('anny_memory_snapshots') || '[]');
        existingSnaps.unshift(snapshot);
        window.localStorage.setItem('anny_memory_snapshots', JSON.stringify(existingSnaps.slice(0, 50)));
      } catch (err) {
        console.warn('Failed to cache memory snapshot:', err);
      }
    }

    console.log(`[MemoryStore] Application state snapshot captured: ${snapshotId} (${label})`);
    return snapshot;
  },

  /**
   * Retrieves all saved application snapshots.
   */
  getSnapshots: (): ApplicationSnapshot[] => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return JSON.parse(window.localStorage.getItem('anny_memory_snapshots') || '[]');
      } catch (e) {
        return [];
      }
    }
    return [];
  },

  /**
   * Restores application state from a snapshot or checkpoint.
   */
  restoreSnapshot: async (snapshotIdOrCheckpointId: string): Promise<boolean> => {
    const snapshots = MemoryStore.getSnapshots();
    const targetSnap = snapshots.find(s => s.snapshotId === snapshotIdOrCheckpointId || s.checkpointId === snapshotIdOrCheckpointId);

    if (targetSnap && targetSnap.checkpointId) {
      return persistentEngineeringMemory.restoreCheckpoint(targetSnap.checkpointId);
    }

    return persistentEngineeringMemory.restoreCheckpoint(snapshotIdOrCheckpointId);
  }
};

/**
 * Persists a significant system action to the audit_logs collection.
 * This should be used for tracking admin changes, security events, and logins.
 */
export async function logAudit(entry: AuditLogEntry) {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await addDoc(collection(db, 'audit_logs'), {
      ...entry,
      userId: entry.userId || user.uid || 'anonymous',
      userEmail: entry.userEmail || user.email || 'anonymous',
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.warn('Failed to commit audit entry:', error);
  }
}

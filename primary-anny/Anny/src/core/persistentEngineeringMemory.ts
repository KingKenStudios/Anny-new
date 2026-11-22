/**
 * ANNY — PERSISTENT ENGINEERING MEMORY (PEM v1.0)
 * Project-centric persistent memory engine that retains requirements, architecture decisions,
 * task history, assets, database schemas, deployment logs, and digital twin snapshots.
 */

import { systemBus } from './systemBus';
import { capabilityManager } from './capabilityManager';
import { integrationRegistry } from './integrationRegistry';
import { WorkspaceManager } from './workspaceManager';
import { vfsTransactionManager } from './vfsTransactionManager';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface CheckpointRecord {
  id: string;
  label: string;
  timestamp: string;
  vfsSnapshot: Record<string, string>;
  filesCount: number;
}

export interface ProjectEngineeringMemoryState {
  projectId: string;
  projectName: string;
  version: string;
  requirementsSummary: string[];
  architecturalDecisions: Array<{ id: string; title: string; decision: string; status: string }>;
  learnedPreferences: Record<string, any>;
  checkpoints: CheckpointRecord[];
  indexedArtifactsCount: number;
  generatedAssetsCount: number;
  checkpointsCount: number;
  auditScore: number;
  lastUpdated: string;
}

export class PersistentEngineeringMemory {
  private static instance: PersistentEngineeringMemory;
  private memoryState: ProjectEngineeringMemoryState;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.memoryState = this.loadInitialMemory();
    this.registerWithOS();
    this.initAutoLifecycleCheckpoints();
    // Phase 21: Hydrate from Firestore only once Firebase Auth has a signed-in user
    if (typeof window !== 'undefined' && auth) {
      if (auth.currentUser) {
        void this.hydrate();
      }
      onAuthStateChanged(auth, (user) => {
        if (user) {
          void this.hydrate();
        }
      });
    }
  }

  private getCloudProjectDocId(uid: string): string {
    const rawId = this.memoryState.projectId || 'proj_anny_anny_master';
    const prefix = `${uid}_`;
    return rawId.startsWith(prefix) ? rawId : `${prefix}${rawId}`;
  }

  public async hydrate(): Promise<void> {
    const uid = auth?.currentUser?.uid;
    if (!uid) {
      // Guest / unauthenticated mode uses local memory only; skip Firestore read
      return;
    }
    try {
      const projectRef = doc(db, 'projects', this.getCloudProjectDocId(uid));
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const cloudData = projectSnap.data();
        this.memoryState = {
          ...this.memoryState,
          ...cloudData,
          lastUpdated: new Date().toLocaleTimeString()
        } as ProjectEngineeringMemoryState;
        this.notify();
        console.log(`[PEM] Successfully hydrated memory from Firestore for project: ${this.memoryState.projectId}`);
      }
    } catch (err) {
      console.warn('[PEM Hydration Error] Failed to pull from Firestore:', err);
    }
  }

  private initAutoLifecycleCheckpoints(): void {
    systemBus.subscribe('*', (event) => {
      const autoEvents = [
        'ExecutionCompleted', 
        'RepairCompleted', 
        'GenerationCompleted', 
        'AuditCompleted', 
        'BuildCompleted'
      ];
      if (autoEvents.includes(event.type)) {
        try {
          const vfsSnapshot: Record<string, string> = {};
          const files = WorkspaceManager.getInstance().getVFS().getAllFiles();
          files.forEach(f => { vfsSnapshot[f.path] = f.content; });
          if (Object.keys(vfsSnapshot).length > 0) {
            this.createCheckpoint(
              `Auto-Check: ${event.type} (${new Date().toLocaleTimeString()})`,
              vfsSnapshot
            );
          }
        } catch (err) {
          console.error('[PEM Auto-Checkpoint Error]', err);
        }
      }
    });
  }

  public static getInstance(): PersistentEngineeringMemory {
    if (!PersistentEngineeringMemory.instance) {
      PersistentEngineeringMemory.instance = new PersistentEngineeringMemory();
    }
    return PersistentEngineeringMemory.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('[PersistentMemory Notification Error]', e); }
    });
  }

  private registerWithOS(): void {
    integrationRegistry.register({
      id: 'subsystem_persistent_engineering_memory',
      name: 'Persistent Engineering Memory (PEM v1.0)',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      dependencies: ['GlobalStateManager', 'SystemBus', 'CapabilityManager'],
      capabilities: [
        'Project-centric Permanent Memory Storage',
        'Architecture Decision Records (ADRs) & Requirements Log',
        'Checkpoints & VFS Snapshot Restoration Engine',
        'Cross-session Project Digital Twin & Asset Lineage Retention'
      ],
      emittedEvents: ['MemoryPersisted', 'CheckpointCreated', 'CheckpointRestored'],
      lastRegistered: new Date().toLocaleTimeString()
    });

    capabilityManager.register({
      id: 'cap_persistent_engineering_memory',
      name: 'Persistent Project Memory Platform',
      category: 'storage',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      isConnected: true,
      supportedCapabilities: [
        'LocalStorage & Firestore Schema Mirroring',
        'Project Architecture Decision Persistence',
        'Full Checkpoint Snapshot & Restoration Engine',
        'Cross-Task Context Retention'
      ],
      limitations: [],
      lastVerified: new Date().toLocaleTimeString(),
      metrics: { cpuPct: 0.1, memoryMb: 10.0, latencyMs: 1 }
    });

    systemBus.publish('SubsystemRegistered', 'PersistentEngineeringMemory', {
      subsystemId: 'subsystem_persistent_engineering_memory',
      timestamp: new Date().toLocaleTimeString()
    });
  }

  private loadInitialMemory(): ProjectEngineeringMemoryState {
    const STORAGE_KEY = 'anny_anny_project_memory';
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (!parsed.checkpoints) parsed.checkpoints = [];
          if (!parsed.learnedPreferences) {
            parsed.learnedPreferences = {
              deepThinkingRequired: true,
              autoImagePlacement: true,
              preserveProjectNames: true
            };
          }
          return parsed;
        } catch (e) {
          console.error('Failed to parse cached project memory:', e);
        }
      }
    }

    return {
      projectId: 'proj_anny_anny_master',
      projectName: 'ANNY Universal Engineering System',
      version: '1.0.0',
      learnedPreferences: {
        deepThinkingRequired: true,
        autoImagePlacement: true,
        preserveProjectNames: true
      },
      requirementsSummary: [
        'Universal Offline-First Engineering Operating System',
        'Modular 16-Engine Architecture with Zero Breaking Changes',
        'Multi-format Universal Artifact Engine (Code, Images, CAD, PLC, ROS2)',
        'Comprehensive Environment & Capability Verification'
      ],
      architecturalDecisions: [
        { id: 'adr_1', title: 'Modular Clean Hexagonal Architecture', decision: 'Adopted SystemBus PubSub and singleton core engines', status: 'ACCEPTED' },
        { id: 'adr_2', title: 'Universal Preview Engine Router', decision: 'Dynamic artifact-type preview routing for 28 artifact types', status: 'ACCEPTED' },
        { id: 'adr_3', title: 'Single Ingress Port 3000 Policy', decision: 'Strict reverse proxy ingress on Port 3000', status: 'ACCEPTED' }
      ],
      checkpoints: [
        {
          id: 'chk_init',
          label: 'Initial Architecture Baseline',
          timestamp: new Date().toLocaleTimeString(),
          vfsSnapshot: { 'src/App.tsx': '// Initial App' },
          filesCount: 1
        }
      ],
      indexedArtifactsCount: 3,
      generatedAssetsCount: 1,
      checkpointsCount: 1,
      auditScore: 98,
      lastUpdated: new Date().toLocaleTimeString()
    };
  }

  public async saveMemoryState(partial: Partial<ProjectEngineeringMemoryState>): Promise<void> {
    this.memoryState = {
      ...this.memoryState,
      ...partial,
      lastUpdated: new Date().toLocaleTimeString()
    };

    // 1. Local Persistence (Fast)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('anny_anny_project_memory', JSON.stringify(this.memoryState));
      } catch (e) {
        console.error('Failed to save project memory:', e);
      }
    }

    // 2. Cloud Persistence (Durable — only for authenticated users)
    const uid = auth?.currentUser?.uid;
    if (uid) {
      try {
        const projectRef = doc(db, 'projects', this.getCloudProjectDocId(uid));
        await setDoc(projectRef, {
          projectId: this.memoryState.projectId,
          projectName: this.memoryState.projectName,
          userId: uid,
          version: this.memoryState.version,
          requirementsSummary: this.memoryState.requirementsSummary,
          lastUpdated: new Date().toISOString(),
          learnedPreferences: this.memoryState.learnedPreferences
        }, { merge: true });
      } catch (err) {
        console.warn('[PEM Cloud Sync Error] Failed to persist to Firestore:', err);
      }
    }

    systemBus.publish('MemoryPersisted', 'PersistentEngineeringMemory', {
      projectId: this.memoryState.projectId,
      lastUpdated: this.memoryState.lastUpdated
    });

    this.notify();
  }

  public getMemoryState(): ProjectEngineeringMemoryState {
    return { ...this.memoryState };
  }

  public async recordBuildLog(log: { timestamp: string; module: string; status: string; errorCount: number; warningCount: number; repairCount: number }): Promise<void> {
    await this.saveMemoryState({
      lastUpdated: log.timestamp,
      auditScore: Math.max(0, 100 - log.errorCount * 10 - log.warningCount * 2)
    });
  }

  public async createCheckpoint(label: string, vfsSnapshot: Record<string, string>): Promise<CheckpointRecord> {
    const chk: CheckpointRecord = {
      id: `chk_${Date.now()}`,
      label,
      timestamp: new Date().toISOString(),
      vfsSnapshot,
      filesCount: Object.keys(vfsSnapshot).length
    };

    const updatedCheckpoints = [...(this.memoryState.checkpoints || []), chk];
    await this.saveMemoryState({
      checkpoints: updatedCheckpoints,
      checkpointsCount: updatedCheckpoints.length
    });

    // Cloud Persistence for Checkpoint
    const uid = auth?.currentUser?.uid;
    if (uid) {
      try {
        const checkpointRef = doc(db, 'projects', this.getCloudProjectDocId(uid), 'checkpoints', chk.id);
        await setDoc(checkpointRef, { ...chk, userId: uid });
      } catch (err) {
        console.warn('[PEM Checkpoint Cloud Error] Failed to persist checkpoint to Firestore:', err);
      }
    }

    systemBus.publish('CheckpointCreated', 'PersistentEngineeringMemory', {
      checkpointId: chk.id,
      label: chk.label
    });

    return chk;
  }

  public restoreCheckpoint(checkpointId: string, context?: import('./CanonicalExecutionContext').CanonicalExecutionContext, restoreCallback?: (files: Record<string, string>) => void): boolean {
    const chk = (this.memoryState.checkpoints || []).find(c => c.id === checkpointId);
    if (!chk) return false;

    // Restore to VFS
    Object.entries(chk.vfsSnapshot).forEach(([path, content]) => {
      if (context && context.transactionId) {
        vfsTransactionManager.writeFile(context.transactionId, path, content);
      } else {
        throw new Error('PHANTOM_WRITE_ERROR: restoreCheckpoint requires an active transaction context.');
      }
    });

    if (restoreCallback) {
      restoreCallback(chk.vfsSnapshot);
    }

    systemBus.publish('CheckpointRestored', 'PersistentEngineeringMemory', {
      checkpointId: chk.id,
      label: chk.label
    });

    this.notify();
    return true;
  }

  public async addADR(title: string, decision: string, status: string = 'ACCEPTED'): Promise<void> {
    const newAdr = {
      id: `adr_${Date.now()}`,
      title,
      decision,
      status
    };
    const updated = [...this.memoryState.architecturalDecisions, newAdr];
    await this.saveMemoryState({ architecturalDecisions: updated });

    // Cloud Persistence for ADR
    const uid = auth?.currentUser?.uid;
    if (uid) {
      try {
        const adrRef = doc(db, 'projects', this.getCloudProjectDocId(uid), 'decisions', newAdr.id);
        await setDoc(adrRef, {
          ...newAdr,
          userId: uid,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('[PEM ADR Cloud Error] Failed to persist ADR to Firestore:', err);
      }
    }
  }

  public async recordDecision(title: string, decision: string, status: string = 'ACCEPTED'): Promise<void> {
    await this.addADR(title, decision, status);
  }

  public async addRequirement(req: string): Promise<void> {
    if (!this.memoryState.requirementsSummary.includes(req)) {
      await this.saveMemoryState({
        requirementsSummary: [...this.memoryState.requirementsSummary, req]
      });
    }
  }

  public async recordRequirement(req: string): Promise<void> {
    await this.addRequirement(req);
  }

  public async learnUserPreference(key: string, value: any): Promise<void> {
    const prefs = { ...(this.memoryState.learnedPreferences || {}), [key]: value };
    await this.saveMemoryState({ learnedPreferences: prefs });
  }

  public async recordRemediationAttempt(record: {
    gapId: string;
    capabilityId: string;
    diagnosis: string;
    attemptedSolution: string;
    result: 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
    failureReason?: string;
    evidence?: Record<string, any>;
    rollbackInfo?: string;
  }): Promise<void> {
    const history = (this.memoryState.learnedPreferences?.remediationHistory || []) as any[];
    history.push({
      ...record,
      timestamp: new Date().toISOString()
    });
    await this.learnUserPreference('remediationHistory', history);
  }

  public getRemediationHistory(capabilityId?: string): any[] {
    const all = (this.memoryState.learnedPreferences?.remediationHistory || []) as any[];
    if (capabilityId) {
      return all.filter(r => r.capabilityId === capabilityId);
    }
    return all;
  }

  public hasFailedRemediation(capabilityId: string, solutionApproach: string): boolean {
    const history = this.getRemediationHistory(capabilityId);
    return history.some(r => r.attemptedSolution === solutionApproach && r.result === 'FAILED');
  }

  public getLearnedPreferences(): Record<string, any> {
    return this.memoryState.learnedPreferences || {
      autoEmbedImages: true,
      preferDeepThinking: true,
      highContrastDarkTheme: true,
      cleanDomainNaming: true
    };
  }

  public generateLearnedContextPrompt(): string {
    const prefs = this.getLearnedPreferences();
    return `
[ANNY LEARNED COGNITIVE MEMORY & USER PREFERENCES]
- Deep Thinking: Always run internal architectural reasoning before executing build/upgrade actions.
- Image Embedding: Automatically embed curated high-resolution Unsplash image URLs in generated JSX/TSX layout components (hero banners, card grid thumbnails, profile avatars) with proper Tailwind styling.
- Naming Discipline: Preserve existing project name when upgrading/updating code. Never name a project after action verbs like "upgrade website with images".
- Framework Standards: React + Tailwind CSS + Lucide Icons + TypeScript.
    `.trim();
  }
}

export const persistentEngineeringMemory = PersistentEngineeringMemory.getInstance();

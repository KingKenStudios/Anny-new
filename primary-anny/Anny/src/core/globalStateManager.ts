/**
 * ANNY — GLOBAL STATE MANAGER (PHASE 30)
 * Central OS State Repository tracking state across all 12 core subsystems.
 * Automatically stays synchronized via the Enterprise System Bus.
 */

import { systemBus, AnnyEvent } from './systemBus';

export interface GlobalOSState {
  workspace: {
    activeProjectId: string | null;
    activeProjectName: string;
    totalFiles: number;
    lastUpdated: string;
  };
  builder: {
    status: 'idle' | 'analyzing' | 'building' | 'repairing' | 'completed' | 'failed';
    currentStage: string;
    buildCount: number;
    lastBuildResult: 'success' | 'failed' | 'none';
  };
  runtime: {
    activeProvider: string;
    status: 'online' | 'offline' | 'degraded';
    port: number;
    activeProcesses: number;
  };
  preview: {
    provider: string;
    mode: string;
    url: string;
    isRendering: boolean;
  };
  memory: {
    shortTermItems: number;
    longTermItems: number;
    lastSynced: string;
  };
  knowledge: {
    indexedDocs: number;
    domainPacksCount: number;
  };
  agents: {
    totalAgents: number;
    activeAgents: number;
  };
  deployment: {
    target: string;
    status: 'ready' | 'deploying' | 'deployed';
  };
  capabilityManager: {
    totalCapabilities: number;
    healthyCount: number;
  };
  telemetry: {
    cpuPct: number;
    memoryMb: number;
    uptimeSeconds: number;
  };
  security: {
    threatStatus: 'secure' | 'warning' | 'breach';
    auditLogsCount: number;
  };
  pluginSystem: {
    loadedPlugins: number;
  };
}

export class GlobalStateManager {
  private static instance: GlobalStateManager;
  private state: GlobalOSState;
  private listeners: Set<(state: GlobalOSState) => void> = new Set();
  private startTime: number = Date.now();

  private constructor() {
    this.state = this.getInitialState();
    this.listenToSystemBus();
  }

  public static getInstance(): GlobalStateManager {
    if (!GlobalStateManager.instance) {
      GlobalStateManager.instance = new GlobalStateManager();
    }
    return GlobalStateManager.instance;
  }

  private getInitialState(): GlobalOSState {
    return {
      workspace: {
        activeProjectId: 'default_ws',
        activeProjectName: 'ANNY Workspace',
        totalFiles: 14,
        lastUpdated: new Date().toLocaleTimeString()
      },
      builder: {
        status: 'idle',
        currentStage: 'Idle',
        buildCount: 1,
        lastBuildResult: 'success'
      },
      runtime: {
        activeProvider: 'Local Node.js Runtime',
        status: 'online',
        port: 3000,
        activeProcesses: 1
      },
      preview: {
        provider: 'Vite iFrame Preview',
        mode: 'vite_iframe',
        url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        isRendering: true
      },
      memory: {
        shortTermItems: 24,
        longTermItems: 142,
        lastSynced: new Date().toLocaleTimeString()
      },
      knowledge: {
        indexedDocs: 85,
        domainPacksCount: 16
      },
      agents: {
        totalAgents: 8,
        activeAgents: 3
      },
      deployment: {
        target: 'Docker Compose',
        status: 'ready'
      },
      capabilityManager: {
        totalCapabilities: 7,
        healthyCount: 6
      },
      telemetry: {
        cpuPct: 1.4,
        memoryMb: 128.5,
        uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000)
      },
      security: {
        threatStatus: 'secure',
        auditLogsCount: 42
      },
      pluginSystem: {
        loadedPlugins: 5
      }
    };
  }

  public subscribe(listener: (state: GlobalOSState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.state.telemetry.uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    this.listeners.forEach(fn => {
      try { fn({ ...this.state }); } catch (e) { console.error('[GlobalState Error]', e); }
    });
  }

  public getState(): GlobalOSState {
    return { ...this.state };
  }

  public updateState(updater: (draft: GlobalOSState) => void): void {
    updater(this.state);
    this.notify();
  }

  public updateBuilderState(partial: Partial<GlobalOSState['builder']>): void {
    this.state.builder = { ...this.state.builder, ...partial };
    this.notify();
  }

  public updatePreviewState(partial: Partial<GlobalOSState['preview']>): void {
    this.state.preview = { ...this.state.preview, ...partial };
    this.notify();
  }

  public updateDeploymentState(partial: Partial<GlobalOSState['deployment']>): void {
    this.state.deployment = { ...this.state.deployment, ...partial };
    this.notify();
  }

  private listenToSystemBus(): void {
    systemBus.subscribe('*', (event: AnnyEvent) => {
      const payload = event.payload || {};
      switch (event.type) {
        case 'WorkspaceCreated':
        case 'WorkspaceOpened':
        case 'WorkspaceUpdated':
          this.state.workspace.activeProjectId = payload.projectId || this.state.workspace.activeProjectId;
          this.state.workspace.activeProjectName = payload.projectName || this.state.workspace.activeProjectName;
          if (typeof payload.totalFiles === 'number') {
            this.state.workspace.totalFiles = payload.totalFiles;
          }
          this.state.workspace.lastUpdated = new Date().toLocaleTimeString();
          break;

        case 'FilesGenerated':
          this.state.workspace.totalFiles = payload.count || this.state.workspace.totalFiles;
          this.state.workspace.lastUpdated = new Date().toLocaleTimeString();
          break;

        case 'BuildStarted':
          this.state.builder.status = 'building';
          this.state.builder.currentStage = payload.stage || 'Build Started';
          break;

        case 'BuildStageChanged': {
          const stageName = String(payload.stage || payload || '');
          const lowerStage = stageName.toLowerCase();
          this.state.builder.currentStage = stageName || this.state.builder.currentStage;
          if (lowerStage.includes('analyz') || lowerStage.includes('understand') || lowerStage.includes('intent')) {
            this.state.builder.status = 'analyzing';
          } else if (lowerStage.includes('repair')) {
            this.state.builder.status = 'repairing';
          } else if (lowerStage.includes('fail')) {
            this.state.builder.status = 'failed';
            this.state.builder.lastBuildResult = 'failed';
          } else if (lowerStage.includes('complete')) {
            this.state.builder.status = 'completed';
            this.state.builder.lastBuildResult = 'success';
          } else if (this.state.builder.status !== 'failed') {
            this.state.builder.status = 'building';
          }
          break;
        }

        case 'BuildCompleted':
          this.state.builder.status = 'completed';
          this.state.builder.currentStage = 'Pipeline Completed';
          this.state.builder.buildCount += 1;
          this.state.builder.lastBuildResult = 'success';
          break;

        case 'BuildFailed':
          this.state.builder.status = 'failed';
          this.state.builder.currentStage = payload.error ? `Failed: ${String(payload.error).slice(0, 60)}` : 'Build Failed';
          this.state.builder.lastBuildResult = 'failed';
          break;

        case 'BuildCancelled':
          this.state.builder.status = 'idle';
          this.state.builder.currentStage = 'Cancelled';
          this.state.builder.lastBuildResult = 'failed';
          break;

        case 'RepairStarted':
        case 'RepairTriggered':
          this.state.builder.status = 'repairing';
          this.state.builder.currentStage = 'Self-Healing AST Repair';
          break;

        case 'RepairCompleted': {
          const ok = payload.buildSuccess !== false;
          this.state.builder.status = ok ? 'completed' : 'failed';
          this.state.builder.currentStage = ok ? 'Repair Verified' : 'Repair Incomplete';
          this.state.builder.lastBuildResult = ok ? 'success' : 'failed';
          break;
        }

        case 'RepairFailed':
          this.state.builder.status = 'failed';
          this.state.builder.currentStage = 'Repair Failed';
          this.state.builder.lastBuildResult = 'failed';
          break;

        case 'RuntimeStarted':
          this.state.runtime.status = 'online';
          this.state.runtime.activeProvider = payload.provider || this.state.runtime.activeProvider;
          this.state.runtime.activeProcesses = Math.max(1, this.state.runtime.activeProcesses);
          break;

        case 'RuntimeStopped':
          this.state.runtime.status = 'offline';
          this.state.runtime.activeProcesses = 0;
          this.state.preview.isRendering = false;
          break;

        case 'RuntimeStateChanged': {
          const rtStatus = String(payload.status || '').toUpperCase();
          if (rtStatus === 'RUNNING') {
            this.state.runtime.status = 'online';
            this.state.runtime.activeProcesses = Math.max(1, this.state.runtime.activeProcesses);
          } else if (rtStatus === 'ERROR' || rtStatus === 'CRASHED') {
            this.state.runtime.status = 'degraded';
          } else if (rtStatus === 'STOPPED') {
            this.state.runtime.status = 'offline';
            this.state.runtime.activeProcesses = 0;
          }
          break;
        }

        case 'PreviewReady':
        case 'PreviewRefreshed':
        case 'PreviewRouted':
          this.state.preview.isRendering = true;
          this.state.preview.url = payload.url || this.state.preview.url;
          break;

        case 'DeploymentStarted':
        case 'CloudDeploymentTriggered':
          this.state.deployment.status = 'deploying';
          if (payload.target) this.state.deployment.target = payload.target;
          break;

        case 'DeploymentCompleted':
          this.state.deployment.status = 'deployed';
          break;

        case 'DeploymentReady':
          this.state.deployment.status = 'ready';
          break;

        case 'SecurityAlert':
          this.state.security.threatStatus = payload.severity === 'critical' ? 'breach' : 'warning';
          this.state.security.auditLogsCount += 1;
          break;

        case 'AgentStarted':
          this.state.agents.activeAgents += 1;
          break;

        case 'AgentStopped':
          this.state.agents.activeAgents = Math.max(0, this.state.agents.activeAgents - 1);
          break;
      }

      this.notify();
    });
  }
}

export const globalStateManager = GlobalStateManager.getInstance();

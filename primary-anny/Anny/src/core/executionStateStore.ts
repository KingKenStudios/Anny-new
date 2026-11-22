/**
 * ANNY — EXECUTION STATE STORE (Zustand)
 * Unified singular source of truth aggregating state across:
 * 1. IndustrialDiagnostics & Hardware Sensors
 * 2. Terminal CLI Execution & Commands Log
 * 3. Anny Core Orchestrator, Queue, Universal Preview & Engineering Memory
 */

import { create } from 'zustand';
import { systemBus } from './systemBus';
import { executionStreamManager } from './executionStreamManager';
import { persistentEngineeringMemory, ProjectEngineeringMemoryState } from './persistentEngineeringMemory';

export interface ProjectQueueItem {
  id: string;
  name: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'repairing';
  currentStage: string;
  progressPct: number;
  logs: string[];
  errors: string[];
  artifacts: string[];
  previewUrl: string;
}
import { universalPreviewEngine, PreviewRouteSpec, PreviewHealthReport } from './universalPreviewEngine';
import { capabilityManager, SubsystemCapability } from './capabilityManager';

export interface DiagnosticsState {
  systemHealth: 'healthy' | 'warning' | 'degraded';
  cpuUsagePct: number;
  memoryMb: number;
  activeSensorsCount: number;
  lastReadingTimestamp: string;
}

export interface TerminalLogItem {
  id: string;
  command: string;
  output: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
}

export interface TerminalState {
  activeTerminalId: string;
  commandLogs: TerminalLogItem[];
  lastExecutedCommand: string;
}

export interface AnnyState {
  activeProject: ProjectQueueItem | undefined;
  queue: ProjectQueueItem[];
  activePreviewRoute: PreviewRouteSpec;
  previewHealth: PreviewHealthReport | null;
  engineeringMemory: ProjectEngineeringMemoryState;
  capabilities: SubsystemCapability[];
  systemStatus: string;
}

export interface ExecutionStateStore {
  diagnostics: DiagnosticsState;
  terminal: TerminalState;
  anny: AnnyState;

  // Actions
  updateDiagnostics: (partial: Partial<DiagnosticsState>) => void;
  addTerminalCommandLog: (log: { command: string; output: string; status: 'success' | 'error' | 'pending' }) => void;
  setActiveTerminalId: (id: string) => void;
  updateAnnyState: (partial: Partial<AnnyState>) => void;
  syncAllSubsystems: () => void;
}

export const useExecutionStateStore = create<ExecutionStateStore>((set, get) => {
  // Initial sync function
  const initialSync = () => {
    const streamState = executionStreamManager.getState();
    const progressPct = (() => {
      switch (streamState.currentStage) {
        case 'analyzing': return 15;
        case 'planning': return 30;
        case 'editing': return 50;
        case 'validation': return 70;
        case 'build': return 85;
        case 'runtime': return 92;
        case 'persistence': return 97;
        case 'finalization': return 100;
        default: return 50;
      }
    })();

    const activeProject: ProjectQueueItem | undefined = streamState.isRunning || streamState.currentStatus === 'failed' || streamState.currentStatus === 'completed' ? {
      id: 'canonical-execution',
      name: streamState.currentMessage || 'Active Task',
      type: 'Engineering Pipeline',
      status: streamState.isRunning ? 'running' : streamState.currentStatus === 'failed' ? 'failed' : 'completed',
      currentStage: streamState.currentStage || 'Processing',
      progressPct,
      logs: streamState.historyItems ? streamState.historyItems.map(item => `[${item.stage.toUpperCase()}] ${item.message}`) : [],
      errors: streamState.error ? [streamState.error] : [],
      artifacts: [],
      previewUrl: ''
    } : undefined;

    const queue: ProjectQueueItem[] = activeProject ? [activeProject] : [];
    const activePreviewRoute = universalPreviewEngine.getActiveRoute();
    const engineeringMemory = persistentEngineeringMemory.getMemoryState();
    const capabilities = capabilityManager.getAll();

    return {
      diagnostics: {
        systemHealth: 'healthy' as const,
        cpuUsagePct: 1.2,
        memoryMb: 245.8,
        activeSensorsCount: 12,
        lastReadingTimestamp: new Date().toLocaleTimeString()
      },
      terminal: {
        activeTerminalId: 'term-1',
        commandLogs: [
          {
            id: 'log_1',
            command: 'npm run build',
            output: '✓ Compiled dist/server.cjs (5.2 MB) on Port 3000',
            timestamp: new Date().toLocaleTimeString(),
            status: 'success' as const
          }
        ],
        lastExecutedCommand: 'npm run build'
      },
      anny: {
        activeProject,
        queue,
        activePreviewRoute,
        previewHealth: universalPreviewEngine.validatePreviewHealth(),
        engineeringMemory,
        capabilities,
        systemStatus: activeProject ? activeProject.status : 'IDLE'
      }
    };
  };

  const store = {
    ...initialSync(),

    updateDiagnostics: (partial: Partial<DiagnosticsState>) => {
      set(state => ({
        diagnostics: { ...state.diagnostics, ...partial }
      }));
    },

    addTerminalCommandLog: (log: { command: string; output: string; status: 'success' | 'error' | 'pending' }) => {
      const item: TerminalLogItem = {
        id: `term_log_${Date.now()}`,
        command: log.command,
        output: log.output,
        timestamp: new Date().toLocaleTimeString(),
        status: log.status
      };
      set(state => ({
        terminal: {
          ...state.terminal,
          lastExecutedCommand: log.command,
          commandLogs: [item, ...state.terminal.commandLogs]
        }
      }));

      systemBus.publish('TerminalCommandExecuted', 'Terminal', {
        command: log.command,
        output: log.output,
        status: log.status
      });
    },

    setActiveTerminalId: (id: string) => {
      set(state => ({
        terminal: { ...state.terminal, activeTerminalId: id }
      }));
    },

    updateAnnyState: (partial: Partial<AnnyState>) => {
      set(state => ({
        anny: { ...state.anny, ...partial }
      }));
    },

    syncAllSubsystems: () => {
      const streamState = executionStreamManager.getState();
      const progressPct = (() => {
        switch (streamState.currentStage) {
          case 'analyzing': return 15;
          case 'planning': return 30;
          case 'editing': return 50;
          case 'validation': return 70;
          case 'build': return 85;
          case 'runtime': return 92;
          case 'persistence': return 97;
          case 'finalization': return 100;
          default: return 50;
        }
      })();

      const activeProject: ProjectQueueItem | undefined = streamState.isRunning || streamState.currentStatus === 'failed' || streamState.currentStatus === 'completed' ? {
        id: 'canonical-execution',
        name: streamState.currentMessage || 'Active Task',
        type: 'Engineering Pipeline',
        status: streamState.isRunning ? 'running' : streamState.currentStatus === 'failed' ? 'failed' : 'completed',
        currentStage: streamState.currentStage || 'Processing',
        progressPct,
        logs: streamState.historyItems ? streamState.historyItems.map(item => `[${item.stage.toUpperCase()}] ${item.message}`) : [],
        errors: streamState.error ? [streamState.error] : [],
        artifacts: [],
        previewUrl: ''
      } : undefined;

      const queue: ProjectQueueItem[] = activeProject ? [activeProject] : [];
      const activePreviewRoute = universalPreviewEngine.getActiveRoute();
      const engineeringMemory = persistentEngineeringMemory.getMemoryState();
      const capabilities = capabilityManager.getAll();

      set(state => ({
        anny: {
          ...state.anny,
          activeProject,
          queue,
          activePreviewRoute,
          engineeringMemory,
          capabilities,
          systemStatus: activeProject ? activeProject.status : 'IDLE'
        }
      }));
    }
  };

  return store;
});

// Auto-Sync setup with core subsystems & systemBus
if (typeof window !== 'undefined') {
  executionStreamManager.subscribe(() => {
    useExecutionStateStore.getState().syncAllSubsystems();
  });

  persistentEngineeringMemory.subscribe(() => {
    useExecutionStateStore.getState().syncAllSubsystems();
  });

  universalPreviewEngine.subscribe(() => {
    useExecutionStateStore.getState().syncAllSubsystems();
  });

  systemBus.subscribe('*', (event) => {
    if (event.type === 'TerminalCommandExecuted') {
      if (event.source === 'Terminal') return; // Strict source guard to prevent infinite feedback loop
      const payload = event.payload || {};
      if (payload.command) {
        useExecutionStateStore.getState().addTerminalCommandLog({
          command: payload.command,
          output: payload.output || 'Command executed',
          status: payload.status || 'success'
        });
      }
    } else {
      useExecutionStateStore.getState().syncAllSubsystems();
    }
  });
}

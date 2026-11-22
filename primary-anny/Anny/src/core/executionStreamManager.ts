/**
 * ANNY — REAL-TIME EXECUTION STREAM MANAGER
 * Handles the execution lifecycle, tracking active operations, file activity,
 * step timer, and stage history in real-time.
 */

import { systemBus } from './systemBus';
import { safeStorage } from '../lib/storage';

export type AnnyExecutionStage =
  | 'analyzing'
  | 'planning'
  | 'editing'
  | 'validation'
  | 'build'
  | 'runtime'
  | 'persistence'
  | 'finalization';

export type AnnyExecutionStatus =
  | 'started'
  | 'running'
  | 'completed'
  | 'failed';

export interface AnnyFileState {
  filePath: string;
  status: 'active' | 'completed' | 'failed'; // ●, ✓, ✕
  operation?: string; // e.g. 'read' | 'edit' | 'create' | 'delete' | 'patch' | 'compile' | 'typecheck'
  timestamp: number;
}

export interface AnnyExecutionStreamItem {
  id: string;
  stage: AnnyExecutionStage;
  status: AnnyExecutionStatus;
  message: string;
  activeFile?: AnnyFileState;
  files: AnnyFileState[];
  timestamp: number;
  error?: string;
}

export interface ExecutionStreamState {
  isRunning: boolean;
  execId?: string;
  startTime: number | null;
  elapsedSec: number;
  currentStage: AnnyExecutionStage;
  currentMessage: string;
  currentStatus: AnnyExecutionStatus;
  activeFile?: AnnyFileState;
  fileHistory: AnnyFileState[];
  historyItems: AnnyExecutionStreamItem[];
  completedMessages: string[];
  error?: string;
}

type StreamSubscriber = (state: ExecutionStreamState) => void;

export class ExecutionStreamManager {
  private static instance: ExecutionStreamManager;

  private state: ExecutionStreamState = {
    isRunning: false,
    startTime: null,
    elapsedSec: 0,
    currentStage: 'analyzing',
    currentMessage: 'Analyzing project context',
    currentStatus: 'started',
    fileHistory: [],
    historyItems: [],
    completedMessages: []
  };

  private subscribers: Set<StreamSubscriber> = new Set();
  private timerInterval: any = null;

  private constructor() {
    this.loadFromStorage();
    this.setupSystemBusListeners();
  }

  public static getInstance(): ExecutionStreamManager {
    if (!ExecutionStreamManager.instance) {
      ExecutionStreamManager.instance = new ExecutionStreamManager();
    }
    return ExecutionStreamManager.instance;
  }

  public getState(): ExecutionStreamState {
    return { ...this.state, fileHistory: [...this.state.fileHistory], historyItems: [...this.state.historyItems], completedMessages: [...this.state.completedMessages] };
  }

  public subscribe(fn: StreamSubscriber): () => void {
    this.subscribers.add(fn);
    fn(this.getState());
    return () => this.subscribers.delete(fn);
  }

  private notify(): void {
    this.saveToStorage();
    const snapshot = this.getState();
    this.subscribers.forEach(fn => {
      try { fn(snapshot); } catch (e) { console.error('[ExecutionStreamManager Notify Error]', e); }
    });
  }

  private saveToStorage(): void {
    try {
      safeStorage.setItem('anny_execution_stream_state', JSON.stringify({
        ...this.state,
        fileHistory: this.state.fileHistory,
        historyItems: this.state.historyItems.slice(-50),
        completedMessages: this.state.completedMessages.slice(-30)
      }));
    } catch (_e) {}
  }

  private loadFromStorage(): void {
    try {
      const raw = safeStorage.getItem('anny_execution_stream_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.state = {
            ...this.state,
            ...parsed,
            fileHistory: Array.isArray(parsed.fileHistory) ? parsed.fileHistory : [],
            historyItems: Array.isArray(parsed.historyItems) ? parsed.historyItems : [],
            completedMessages: Array.isArray(parsed.completedMessages) ? parsed.completedMessages : []
          };
          // A fresh page load has no live background timer or active network stream;
          // prevent the UI from booting stuck in an infinite "Running" state.
          if (this.state.isRunning) {
            this.state.isRunning = false;
            this.state.currentStatus = 'failed';
            this.state.currentMessage = 'Previous execution interrupted before completion';
            this.state.fileHistory = this.state.fileHistory.map(f =>
              f.status === 'active' ? { ...f, status: 'failed' } : f
            );
            this.state.activeFile = undefined;
          }
        }
      }
    } catch (_e) {}
  }

  public startExecution(initialMessage: string = 'Analyzing prompt and workspace context', execId?: string): void {
    this.stopTimer();
    const now = Date.now();
    this.state = {
      isRunning: true,
      execId: execId || `exec_${now}`,
      startTime: now,
      elapsedSec: 0,
      currentStage: 'analyzing',
      currentMessage: initialMessage,
      currentStatus: 'running',
      fileHistory: [],
      historyItems: [],
      completedMessages: []
    };

    this.timerInterval = setInterval(() => {
      if (this.state.startTime && this.state.isRunning) {
        const diff = (Date.now() - this.state.startTime) / 1000;
        this.state.elapsedSec = Math.round(diff * 10) / 10;
        this.notify();
      }
    }, 100);

    systemBus.publish('ExecutionConnected', 'ExecutionStreamManager', { message: initialMessage });
    this.notify();
  }

  public setStage(
    stage: AnnyExecutionStage,
    message: string,
    operation?: string
  ): void {
    if (!this.state.isRunning) {
      this.startExecution(message);
    }

    // Preserve previous active message in completedMessages if distinct
    if (this.state.currentMessage && this.state.currentMessage !== message) {
      if (!this.state.completedMessages.includes(this.state.currentMessage)) {
        this.state.completedMessages.push(this.state.currentMessage);
      }
    }

    this.state.currentStage = stage;
    this.state.currentMessage = message;
    this.state.currentStatus = 'running';

    // Record snapshot item in history
    const historyItem: AnnyExecutionStreamItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      stage,
      status: 'running',
      message,
      activeFile: this.state.activeFile,
      files: [...this.state.fileHistory],
      timestamp: Date.now()
    };
    this.state.historyItems.push(historyItem);

    systemBus.publish('StudioProgress', 'ExecutionStreamManager', {
      stage,
      title: message,
      progress: this.getStageProgress(stage)
    });

    this.notify();
  }

  public touchFile(filePath: string, status: 'active' | 'completed' | 'failed' = 'active', operation: string = 'edit'): void {
    if (!filePath) return;
    const normPath = filePath.startsWith('/') ? filePath : '/' + filePath;
    const actionLabel = operation === 'create' ? 'Creating' : 'Updating';

    // Check if file is already tracked
    const existingIndex = this.state.fileHistory.findIndex(f => f.filePath === normPath);
    const fileItem: AnnyFileState = {
      filePath: normPath,
      status,
      operation,
      timestamp: Date.now()
    };

    if (existingIndex >= 0) {
      this.state.fileHistory[existingIndex] = fileItem;
    } else {
      this.state.fileHistory.push(fileItem);
    }

    if (status === 'active') {
      this.state.activeFile = fileItem;
      this.state.currentStage = 'editing';
      this.state.currentMessage = `${actionLabel} ${normPath}`;
    } else if (this.state.activeFile?.filePath === normPath) {
      this.state.activeFile = { ...fileItem, status };
      if (status === 'completed') {
        this.state.currentMessage = `Completed ${normPath}`;
      }
    }

    this.notify();
  }

  public completeFile(filePath: string, operation: string = 'edit'): void {
    this.touchFile(filePath, 'completed', operation);
  }

  public failFile(filePath: string, error?: string): void {
    this.touchFile(filePath, 'failed', 'error');
    if (error) {
      this.state.error = error;
    }
  }

  public completeExecution(finalMessage: string = 'Runtime verification completed'): void {
    this.stopTimer();

    // Convert active files to completed
    this.state.fileHistory = this.state.fileHistory.map(f => ({ ...f, status: f.status === 'failed' ? 'failed' : 'completed' }));
    this.state.activeFile = undefined;

    if (this.state.currentMessage && !this.state.completedMessages.includes(this.state.currentMessage)) {
      this.state.completedMessages.push(this.state.currentMessage);
    }

    this.state.currentStage = 'finalization';
    this.state.currentMessage = finalMessage;
    this.state.currentStatus = 'completed';
    this.state.isRunning = false;

    systemBus.publish('BuildCompleted', 'ExecutionStreamManager', {
      message: finalMessage,
      fileCount: this.state.fileHistory.length
    });

    this.notify();
  }

  public failExecution(errorMessage: string): void {
    this.stopTimer();
    this.state.fileHistory = this.state.fileHistory.map(f =>
      f.status === 'active' ? { ...f, status: 'failed' } : f
    );
    this.state.activeFile = undefined;
    this.state.currentStatus = 'failed';
    this.state.error = errorMessage;
    this.state.isRunning = false;

    systemBus.publish('BuildFailed', 'ExecutionStreamManager', {
      error: errorMessage
    });

    this.notify();
  }

  public cancelExecution(reason: string = 'Execution cancelled by user'): void {
    if (!this.state.isRunning) return;
    this.stopTimer();
    this.state.fileHistory = this.state.fileHistory.map(f =>
      f.status === 'active' ? { ...f, status: 'failed' } : f
    );
    this.state.activeFile = undefined;
    this.state.currentStatus = 'failed';
    this.state.currentMessage = reason;
    this.state.error = reason;
    this.state.isRunning = false;
    this.notify();
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private getStageProgress(stage: AnnyExecutionStage): number {
    switch (stage) {
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
  }

  private setupSystemBusListeners(): void {
    systemBus.subscribe('BuildStarted', (evt: any) => {
      const prompt = evt?.payload?.prompt || 'Executing request';
      this.startExecution(`Analyzing ${prompt.slice(0, 35)}...`);
    });

    systemBus.subscribe('BuildStageChanged', (evt: any) => {
      const rawStage = evt?.payload?.stage || evt?.payload;
      if (rawStage) {
        this.mapBuildStageToExecutionStage(String(rawStage));
      }
    });

    systemBus.subscribe('BuildCompleted', () => {
      if (this.state.isRunning) {
        this.completeExecution('Build and runtime verification completed');
      }
    });

    systemBus.subscribe('BuildFailed', (evt: any) => {
      if (evt?.source === 'ExecutionStreamManager') return;
      this.failExecution(evt?.payload?.error || 'Operation failed during execution');
    });

    systemBus.subscribe('BuildCancelled', (evt: any) => {
      if (evt?.source === 'ExecutionStreamManager') return;
      this.cancelExecution(evt?.payload?.reason || 'Execution cancelled by user');
    });

    systemBus.subscribe('CompilationChecked', (_evt: any) => {
      this.setStage('validation', 'Running TypeScript & syntax checks');
    });

    systemBus.subscribe('RepairStarted', () => {
      this.setStage('validation', 'Checking errors');
    });

    systemBus.subscribe('RepairCompleted', (evt: any) => {
      if (!this.state.isRunning) return;
      if (evt?.payload?.buildSuccess === false) {
        this.failExecution('Autonomous repair completed with unresolved build issues');
      } else {
        this.setStage('validation', 'Autonomous repair verified');
      }
    });

    systemBus.subscribe('RepairFailed', (evt: any) => {
      if (!this.state.isRunning) return;
      this.failExecution(evt?.payload?.error || 'Autonomous repair failed');
    });

    systemBus.subscribe('RuntimeStarted', () => {
      this.setStage('runtime', 'Rendering preview');
    });

    systemBus.subscribe('FILE_OPERATION_STARTED', (evt: any) => {
      const payload = evt?.payload || evt;
      if (payload?.filePath) {
        this.touchFile(payload.filePath, 'active', payload.operation || 'create');
      }
    });

    systemBus.subscribe('FILE_OPERATION_COMPLETED', (evt: any) => {
      const payload = evt?.payload || evt;
      if (payload?.filePath) {
        this.completeFile(payload.filePath, payload.operation || 'create');
      }
    });

    systemBus.subscribe('FILE_OPERATION_FAILED', (evt: any) => {
      const payload = evt?.payload || evt;
      if (payload?.filePath) {
        this.failFile(payload.filePath, payload.error || 'File operation failed');
      }
    });
  }

  private mapBuildStageToExecutionStage(rawStage: string): void {
    const lower = rawStage.toLowerCase();
    if (lower.includes('understand') || lower.includes('analyz')) {
      this.setStage('analyzing', 'Analyzing project dependencies & context');
    } else if (lower.includes('plan')) {
      this.setStage('planning', 'Synthesizing architecture & component plan');
    } else if (lower.includes('generat') || lower.includes('write') || lower.includes('edit')) {
      // Keep current file operation message if editing files
      if (!this.state.currentMessage || this.state.currentMessage.includes('Analyzing') || this.state.currentMessage.includes('Synthesizing')) {
        this.setStage('editing', 'Preparing code generation');
      }
    } else if (lower.includes('install') || lower.includes('dep')) {
      this.setStage('editing', 'Installing dependencies');
    } else if (lower.includes('compil') || lower.includes('repair') || lower.includes('type')) {
      this.setStage('validation', 'Checking types');
    } else if (lower.includes('runtime') || lower.includes('mount') || lower.includes('preview')) {
      this.setStage('runtime', 'Rendering preview');
    } else if (lower.includes('verify') || lower.includes('verifi')) {
      this.setStage('validation', 'Verifying changes');
    } else if (lower.includes('complete')) {
      this.completeExecution('Finalizing changes');
    }
  }
}

export const executionStreamManager = ExecutionStreamManager.getInstance();

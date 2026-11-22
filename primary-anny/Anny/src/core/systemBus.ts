/**
 * ANNY — ENTERPRISE SYSTEM BUS (PHASE 30)
 * Central event-driven communication backbone orchestrating Event, Command,
 * Query, State, Message, and Log buses across all Anny subsystems.
 */

// ==========================================
// EVENT REGISTRY (STRONGLY TYPED)
// ==========================================

export type AnnyEventType =
  | 'WorkspaceCreated'
  | 'WorkspaceOpened'
  | 'WorkspaceUpdated'
  | 'ProjectGenerated'
  | 'FilesGenerated'
  | 'BuildStarted'
  | 'BuildStageChanged'
  | 'BuildCompleted'
  | 'BuildFailed'
  | 'BuildCancelled'
  | 'CompilationChecked'
  | 'RepairStarted'
  | 'RepairCompleted'
  | 'RuntimeStarted'
  | 'RuntimeStopped'
  | 'PreviewReady'
  | 'PreviewRefreshed'
  | 'VerificationCompleted'
  | 'DeploymentStarted'
  | 'DeploymentCompleted'
  | 'DeploymentReady'
  | 'MemoryUpdated'
  | 'KnowledgeIndexed'
  | 'ModelSelected'
  | 'AgentStarted'
  | 'AgentStopped'
  | 'SubsystemRegistered'
  | 'SystemHealthCheck'
  | 'SecurityAlert'
  | 'StudioProgress'
  | 'EAEPStateChanged'
  | 'EASFStateChanged'
  | 'EASFSubsystemEvent'
  | 'EASAStateChanged'
  | 'EASADecisionRecorded'
  | 'EASDStateChanged'
  | 'EASDTaskCompleted'
  | 'ArtifactCreated'
  | 'ArtifactUpdated'
  | 'FILE_OPERATION_STARTED'
  | 'FILE_OPERATION_COMPLETED'
  | 'FILE_OPERATION_FAILED'
  | 'PreviewRouted'
  | 'IntentClassified'
  | 'CheckpointCreated'
  | 'CheckpointRestored'
  | 'TerminalCommandExecuted'
  | 'ImageGenerated'
  | 'TaskCreated'
  | 'TaskStateUpdated'
  | 'TaskStepCompleted'
  | 'TaskStepFailed'
  | 'TaskStatusChanged'
  | 'TaskCancelled'
  | 'RuntimeStateChanged'
  | 'ProviderStatusChanged'
  | 'ExecutionConnected'
  | 'CloudDeploymentTriggered'
  | 'VerificationCompleted'
  | 'EvidenceRecorded'
  | 'ExperienceRecorded'
  | 'SelfHealingTriggered'
  | 'QACompleted'
  | 'MemoryPersisted'
  | 'DependencyAuditCompleted'
  | 'RepairTriggered'
  | 'RepairCompleted'
  | 'RepairFailed'
  | 'CompileError'
  | 'RuntimeCrash'
  | 'ExecutionFailed';

export interface AnnyEvent<T = any> {
  id: string;
  type: AnnyEventType;
  source: string;
  payload: T;
  timestamp: string;
}

export interface AnnyCommand<T = any> {
  id: string;
  commandName: string;
  targetSubsystem: string;
  payload: T;
  timestamp: string;
}

export interface AnnyQuery<T = any, R = any> {
  id: string;
  queryName: string;
  targetSubsystem: string;
  params: T;
}

export interface AnnyLogEntry {
  id: string;
  subsystem: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
}

export type EventCallback = (event: AnnyEvent) => void;
export type CommandHandler = (command: AnnyCommand) => Promise<any>;
export type QueryHandler = (query: AnnyQuery) => Promise<any>;

// ==========================================
// SYSTEM BUS IMPLEMENTATION
// ==========================================

export class EnterpriseSystemBus {
  private static instance: EnterpriseSystemBus;
  
  // Event Bus
  private eventListeners: Map<AnnyEventType | '*', Set<EventCallback>> = new Map();
  private timeline: AnnyEvent[] = [];
  
  // Command Bus
  private commandHandlers: Map<string, CommandHandler> = new Map();
  private runningCommands: Map<string, AnnyCommand> = new Map();

  // Query Bus
  private queryHandlers: Map<string, QueryHandler> = new Map();

  // Log Bus
  private logs: AnnyLogEntry[] = [];
  private logListeners: Set<(log: AnnyLogEntry) => void> = new Set();

  private busListeners: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): EnterpriseSystemBus {
    if (!EnterpriseSystemBus.instance) {
      EnterpriseSystemBus.instance = new EnterpriseSystemBus();
    }
    return EnterpriseSystemBus.instance;
  }

  public subscribeBusChange(listener: () => void): () => void {
    this.busListeners.add(listener);
    return () => this.busListeners.delete(listener);
  }

  private notifyBus(): void {
    this.busListeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('[SystemBus Error]', e); }
    });
  }

  // --- EVENT BUS ---
  public publish(type: AnnyEventType, source: string, payload: any = {}): AnnyEvent {
    const event: AnnyEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      source,
      payload,
      timestamp: new Date().toLocaleTimeString()
    };

    this.timeline.unshift(event);
    if (this.timeline.length > 500) {
      this.timeline.pop();
    }

    // Trigger specific type listeners
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(fn => {
        try { fn(event); } catch (e) { console.error(`[EventBus Listener Error: ${type}]`, e); }
      });
    }

    // Trigger wildcard listeners
    const wildcards = this.eventListeners.get('*');
    if (wildcards) {
      wildcards.forEach(fn => {
        try { fn(event); } catch (e) { console.error('[EventBus Wildcard Error]', e); }
      });
    }

    this.log(source, 'info', `Event published: ${type}`);
    this.notifyBus();
    return event;
  }

  public subscribe(type: AnnyEventType | '*', callback: EventCallback): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(callback);

    return () => {
      const set = this.eventListeners.get(type);
      if (set) set.delete(callback);
    };
  }

  public getEventTimeline(): AnnyEvent[] {
    return this.timeline;
  }

  // --- COMMAND BUS ---
  public registerCommandHandler(commandName: string, handler: CommandHandler): void {
    this.commandHandlers.set(commandName, handler);
  }

  public async dispatchCommand(commandName: string, targetSubsystem: string, payload: any = {}): Promise<any> {
    const command: AnnyCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      commandName,
      targetSubsystem,
      payload,
      timestamp: new Date().toLocaleTimeString()
    };

    this.runningCommands.set(command.id, command);
    this.log(targetSubsystem, 'info', `Command dispatched: ${commandName}`);
    this.notifyBus();

    const handler = this.commandHandlers.get(commandName);
    if (!handler) {
      this.runningCommands.delete(command.id);
      this.log(targetSubsystem, 'error', `No handler registered for command: ${commandName}`);
      this.notifyBus();
      throw new Error(`Command handler missing for: ${commandName}`);
    }

    try {
      const result = await handler(command);
      this.runningCommands.delete(command.id);
      this.notifyBus();
      return result;
    } catch (err: any) {
      this.runningCommands.delete(command.id);
      this.log(targetSubsystem, 'error', `Command execution failed: ${err.message}`);
      this.notifyBus();
      throw err;
    }
  }

  public getRunningCommands(): AnnyCommand[] {
    return Array.from(this.runningCommands.values());
  }

  // --- QUERY BUS ---
  public registerQueryHandler(queryName: string, handler: QueryHandler): void {
    this.queryHandlers.set(queryName, handler);
  }

  public async executeQuery<T = any, R = any>(queryName: string, targetSubsystem: string, params: T): Promise<R> {
    const query: AnnyQuery<T, R> = {
      id: `qry_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      queryName,
      targetSubsystem,
      params
    };

    const handler = this.queryHandlers.get(queryName);
    if (!handler) {
      throw new Error(`Query handler missing for: ${queryName}`);
    }

    return await handler(query);
  }

  // --- LOG BUS ---
  public log(subsystem: string, level: AnnyLogEntry['level'], message: string): void {
    const entry: AnnyLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      subsystem,
      level,
      message,
      timestamp: new Date().toLocaleTimeString()
    };

    this.logs.unshift(entry);
    if (this.logs.length > 1000) {
      this.logs.pop();
    }

    this.logListeners.forEach(fn => {
      try { fn(entry); } catch (e) { console.error('[LogBus Error]', e); }
    });
  }

  public subscribeLogs(callback: (log: AnnyLogEntry) => void): () => void {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  public getLogs(): AnnyLogEntry[] {
    return this.logs;
  }
}

export const systemBus = EnterpriseSystemBus.getInstance();

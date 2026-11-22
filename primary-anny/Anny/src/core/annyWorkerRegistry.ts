import { CapabilityType } from './modelRouter';

export type WorkerStatus =
  | 'UNREGISTERED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'TRUSTED'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'OFFLINE'
  | 'ONLINE'
  | 'BUSY';

export interface WorkerCapabilities {
  compute: {
    cpuCores: number;
    gpuDetected: boolean;
    vramMb: number;
    ramMb: number;
    acceleratorType?: 'NVIDIA' | 'AMD' | 'APPLE_SILICON' | 'TPU' | 'NONE';
  };
  ai: CapabilityType[];
  media: string[];
  engineering: string[];
  operations: string[];
}

export interface WorkerCommand {
  id: string;
  type: 'EXECUTE_TASK' | 'UPDATE_METADATA' | 'CANCEL_TASK' | 'SHUTDOWN' | 'VERIFY_INTEGRITY';
  payload: any;
  timestamp: number;
  priority: number;
}

export interface WorkerResponse {
  commandId: string;
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'PENDING';
  result?: any;
  error?: string;
  diagnostic?: string;
  artifacts?: Array<{ path: string; content: string; expectedMime: string }>;
  metrics?: {
    durationMs: number;
    vramPeakMb: number;
    tokensProcessed?: number;
  };
}

export interface RemoteWorker {
  id: string;
  name: string;
  status: WorkerStatus;
  capabilities: WorkerCapabilities;
  availableModels: string[];
  workloadQueueDepth: number;
  maxQueueDepth: number;
  averageLatencyMs: number;
  reliabilityScore: number; // 0.0 to 1.0
  lastHeartbeat: number;
  organizationId: string;
  // Execution handler for real protocol
  execute?: (command: WorkerCommand) => Promise<WorkerResponse>;
}

export class AnnyWorkerRegistry {
  private static instance: AnnyWorkerRegistry;
  private workers: Map<string, RemoteWorker> = new Map();

  private constructor() {
    // Phase 21: Sovereign Reality. Workers must register via the protocol.
    // No more seeded/fake workers.
  }

  public static getInstance(): AnnyWorkerRegistry {
    if (!AnnyWorkerRegistry.instance) {
      AnnyWorkerRegistry.instance = new AnnyWorkerRegistry();
    }
    return AnnyWorkerRegistry.instance;
  }

  public registerWorker(worker: RemoteWorker): void {
    this.workers.set(worker.id, worker);
  }

  public getWorker(id: string): RemoteWorker | undefined {
    return this.workers.get(id);
  }

  public listWorkers(): RemoteWorker[] {
    return Array.from(this.workers.values());
  }

  public getAllWorkers(): RemoteWorker[] {
    return this.listWorkers();
  }

  public updateHeartbeat(id: string, workloadDepth?: number): void {
    const worker = this.workers.get(id);
    if (worker) {
      worker.lastHeartbeat = Date.now();
      if (workloadDepth !== undefined) {
        worker.workloadQueueDepth = workloadDepth;
      }
      worker.status = worker.workloadQueueDepth >= worker.maxQueueDepth ? 'BUSY' : (worker.status === 'OFFLINE' ? 'ONLINE' : worker.status);
    }
  }

  public markWorkerStatus(id: string, status: WorkerStatus): void {
    const worker = this.workers.get(id);
    if (worker) {
      worker.status = status;
    }
  }

  public getActiveWorkersForOrganization(orgId: string): RemoteWorker[] {
    const now = Date.now();
    return this.listWorkers().filter(w => {
      // Must not be offline/revoked
      if (['OFFLINE', 'REVOKED', 'SUSPENDED', 'UNREGISTERED', 'PENDING_VERIFICATION'].includes(w.status)) return false;
      // Must have recent heartbeat (e.g. 5 minutes)
      if (now - w.lastHeartbeat > 5 * 60 * 1000) return false;
      // Organization match
      return w.organizationId === orgId || w.organizationId === 'global';
    });
  }
}

export const annyWorkerRegistry = AnnyWorkerRegistry.getInstance();

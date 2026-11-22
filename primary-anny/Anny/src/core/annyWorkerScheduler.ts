import { annyWorkerRegistry, RemoteWorker } from './annyWorkerRegistry';
import { DataClassification, annyRemoteExecutionPolicy } from './annyRemoteExecutionPolicy';
import { HardwareProfile } from './annyHardwareIntelligence';

export interface SchedulerRequest {
  taskId: string;
  taskType: string;
  organizationId: string;
  requiredVramMb: number;
  requiredCapabilities: string[]; // e.g. 'video_generation', 'security_audit'
  dataClassification: DataClassification;
}

export interface SchedulerDecision {
  status: 'ASSIGNED' | 'NO_CAPABLE_WORKER' | 'RESTRICTED_DATA' | 'QUEUED';
  selectedWorkerId?: string;
  reason: string;
}

export class AnnyWorkerScheduler {
  private static instance: AnnyWorkerScheduler;

  private constructor() {}

  public static getInstance(): AnnyWorkerScheduler {
    if (!AnnyWorkerScheduler.instance) {
      AnnyWorkerScheduler.instance = new AnnyWorkerScheduler();
    }
    return AnnyWorkerScheduler.instance;
  }

  public evaluateLocalFirst(hardware: HardwareProfile | null, req: SchedulerRequest): boolean {
    if (!hardware) return false;
    // Check if local has enough VRAM for the task
    if (req.requiredVramMb > 0) {
      if (!hardware.gpuModel || hardware.gpuModel === 'Unknown') return false;
      if (hardware.vramMb < req.requiredVramMb) return false;
    }
    return true; // Local is sufficient
  }

  public scheduleTask(req: SchedulerRequest): SchedulerDecision {
    // 1. Check Policy
    const policy = annyRemoteExecutionPolicy.getPolicyForTask(req.taskType, req.organizationId, req.dataClassification);
    if (!policy.canLeaveLocalDevice) {
      return { status: 'RESTRICTED_DATA', reason: 'Data classification prevents remote execution.' };
    }

    // 2. Get available workers
    const workers = annyWorkerRegistry.getActiveWorkersForOrganization(req.organizationId);
    
    // 3. Filter workers
    const capableWorkers = workers.filter(w => {
      // Must have trust if required
      if (policy.requiresTrustedWorker && w.status !== 'TRUSTED') return false;
      
      // Must have VRAM
      if (w.capabilities.compute.vramMb < req.requiredVramMb) return false;

      // Must have capability
      const hasCap = req.requiredCapabilities.every(reqCap => 
        w.capabilities.media.includes(reqCap) || 
        w.capabilities.engineering.includes(reqCap) || 
        w.capabilities.operations.includes(reqCap)
      );
      if (!hasCap) return false;

      // Must not be totally full
      if (w.workloadQueueDepth >= w.maxQueueDepth) return false;

      return true;
    });

    if (capableWorkers.length === 0) {
      return { status: 'NO_CAPABLE_WORKER', reason: 'No workers available that meet capability and security requirements.' };
    }

    // 4. Score workers
    // Score factors: low queue depth (+), high reliability (+), low latency (+)
    const scoredWorkers = capableWorkers.map(w => {
      const queueRatio = w.workloadQueueDepth / w.maxQueueDepth;
      const latencyPenalty = Math.min(w.averageLatencyMs / 1000, 1); // max penalty at 1s
      const score = (w.reliabilityScore * 50) + ((1 - queueRatio) * 30) + ((1 - latencyPenalty) * 20);
      return { worker: w, score };
    });

    scoredWorkers.sort((a, b) => b.score - a.score);
    const best = scoredWorkers[0].worker;

    return {
      status: 'ASSIGNED',
      selectedWorkerId: best.id,
      reason: `Assigned to ${best.name} (Score: ${scoredWorkers[0].score.toFixed(1)}, Queue: ${best.workloadQueueDepth}/${best.maxQueueDepth})`
    };
  }
}

export const annyWorkerScheduler = AnnyWorkerScheduler.getInstance();

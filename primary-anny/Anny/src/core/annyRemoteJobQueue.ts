import { annyWorkerScheduler, SchedulerRequest } from './annyWorkerScheduler';
import { annyWorkerRegistry } from './annyWorkerRegistry';
import { annyRemoteResultVerifier } from './annyRemoteResultVerifier';
import { hardwareIntelligenceEngine } from './annyHardwareIntelligence';
import { persistentEngineeringMemory } from './persistentEngineeringMemory';

export type JobState =
  | 'CREATED'
  | 'VALIDATING'
  | 'QUEUED'
  | 'ASSIGNED'
  | 'DISPATCHED'
  | 'RUNNING'
  | 'PROGRESSING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'ROLLED_BACK';

export interface RemoteJob {
  id: string;
  projectId: string;
  organizationId: string;
  transactionId?: string;
  taskType: string;
  prompt: string;
  state: JobState;
  assignedWorkerId?: string;
  createdAt: number;
  updatedAt: number;
  retries: number;
  maxRetries: number;
  diagnostics: string[];
  executionPlan?: any;
}

export class AnnyRemoteJobQueue {
  private static instance: AnnyRemoteJobQueue;
  private jobs: Map<string, RemoteJob> = new Map();

  private constructor() {}

  public static getInstance(): AnnyRemoteJobQueue {
    if (!AnnyRemoteJobQueue.instance) {
      AnnyRemoteJobQueue.instance = new AnnyRemoteJobQueue();
    }
    return AnnyRemoteJobQueue.instance;
  }

  public createJob(req: {
    projectId: string;
    organizationId: string;
    transactionId?: string;
    taskType: string;
    prompt: string;
  }): RemoteJob {
    const job: RemoteJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      projectId: req.projectId,
      organizationId: req.organizationId,
      transactionId: req.transactionId,
      taskType: req.taskType,
      prompt: req.prompt,
      state: 'CREATED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retries: 0,
      maxRetries: 3,
      diagnostics: ['Job created.']
    };
    this.jobs.set(job.id, job);
    return job;
  }

  public getJob(id: string): RemoteJob | undefined {
    return this.jobs.get(id);
  }

  public updateState(id: string, state: JobState, diagnostic?: string) {
    const job = this.jobs.get(id);
    if (job) {
      job.state = state;
      job.updatedAt = Date.now();
      if (diagnostic) job.diagnostics.push(diagnostic);
    }
  }

  /**
   * Complete lifecycle of submitting, scheduling, executing, and verifying a remote job.
   */
  public async submitAndExecute(
    jobId: string, 
    schedReq: SchedulerRequest,
    fallbackSimulation?: (job: RemoteJob) => Promise<{ artifacts: any[], diagnostic: string, success: boolean }>
  ): Promise<RemoteJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');

    this.updateState(jobId, 'VALIDATING');
    const localHardware = hardwareIntelligenceEngine.getCachedProfile();

    // 1. Hardware Intelligence Check (Local First)
    if (annyWorkerScheduler.evaluateLocalFirst(localHardware, schedReq)) {
      this.updateState(jobId, 'REJECTED', 'Local execution is sufficient. Skipping remote dispatch.');
      return job;
    }

    // 2. Schedule
    const decision = annyWorkerScheduler.scheduleTask(schedReq);
    if (decision.status !== 'ASSIGNED' || !decision.selectedWorkerId) {
      this.updateState(jobId, 'REJECTED', `Scheduler rejected: ${decision.reason}`);
      return job;
    }

    this.updateState(jobId, 'ASSIGNED', decision.reason);
    job.assignedWorkerId = decision.selectedWorkerId;
    
    // Update worker queue depth
    const worker = annyWorkerRegistry.getWorker(decision.selectedWorkerId);
    if (worker) annyWorkerRegistry.updateHeartbeat(worker.id, worker.workloadQueueDepth + 1);

    // 3. Dispatch & Run
    this.updateState(jobId, 'DISPATCHED', `Dispatching to ${decision.selectedWorkerId}`);
    this.updateState(jobId, 'RUNNING');

    let result: { success: boolean; artifacts: any[]; diagnostic: string };
    
    if (worker?.execute) {
      // Execute via REAL command protocol
      try {
        const response = await worker.execute({
          id: jobId,
          type: 'EXECUTE_TASK',
          payload: { prompt: job.prompt, taskType: job.taskType },
          timestamp: Date.now(),
          priority: 1
        });
        result = {
          success: response.status === 'SUCCESS',
          artifacts: response.artifacts || [],
          diagnostic: response.diagnostic || (response.error ? `Worker error: ${response.error}` : 'Task completed.')
        };
      } catch (err: any) {
        result = { success: false, artifacts: [], diagnostic: `Command dispatch failed: ${err.message}` };
      }
    } else if (fallbackSimulation) {
      // Fallback to simulation if provided
      try {
        result = await fallbackSimulation(job);
      } catch (err: any) {
        result = { success: false, artifacts: [], diagnostic: `Simulation crash: ${err.message}` };
      }
    } else {
      result = { success: false, artifacts: [], diagnostic: 'No execution handler available for assigned worker.' };
    }

    // Free worker queue slot
    if (worker) annyWorkerRegistry.updateHeartbeat(worker.id, Math.max(0, worker.workloadQueueDepth - 1));

    if (!result.success) {
      this.updateState(jobId, 'FAILED', result.diagnostic);
      persistentEngineeringMemory.recordDecision(`Job ${jobId} failed`, result.diagnostic, 'REJECTED');
      return job;
    }

    // 4. Verification
    this.updateState(jobId, 'VERIFYING', 'Worker returned artifacts. Verifying...');
    const vResult = await annyRemoteResultVerifier.verifyAndCommit({
      jobId: job.id,
      workerId: job.assignedWorkerId,
      resultArtifacts: result.artifacts,
      transactionId: job.transactionId,
      taskType: job.taskType
    });

    if (!vResult.verified) {
      this.updateState(jobId, 'FAILED', `Verification failed: ${vResult.reason}`);
      persistentEngineeringMemory.recordDecision(`Job ${jobId} verification failed`, vResult.reason, 'REJECTED');
      return job;
    }

    // 5. Completed
    this.updateState(jobId, 'COMPLETED', `Successfully completed and verified ${vResult.artifactsCommitted} artifacts.`);
    
    // 6. Record memory
    persistentEngineeringMemory.recordDecision(`Job ${jobId} completed`, `Worker ${worker?.name} succeeded.`, 'ACCEPTED');

    return job;
  }
}

export const annyRemoteJobQueue = AnnyRemoteJobQueue.getInstance();

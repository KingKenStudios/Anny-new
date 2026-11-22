import { annyWorkerRegistry, RemoteWorker } from './annyWorkerRegistry';
import { annyWorkerScheduler, SchedulerRequest } from './annyWorkerScheduler';
import { annyRemoteJobQueue, RemoteJob } from './annyRemoteJobQueue';
import { DataClassification } from './annyRemoteExecutionPolicy';

export class AnnyRemoteComputeFabric {
  private static instance: AnnyRemoteComputeFabric;

  private constructor() {}

  public static getInstance(): AnnyRemoteComputeFabric {
    if (!AnnyRemoteComputeFabric.instance) {
      AnnyRemoteComputeFabric.instance = new AnnyRemoteComputeFabric();
    }
    return AnnyRemoteComputeFabric.instance;
  }

  public getRegistry() {
    return annyWorkerRegistry;
  }

  public getQueue() {
    return annyRemoteJobQueue;
  }

  public getScheduler() {
    return annyWorkerScheduler;
  }

  public async executeJob(params: {
    taskType: string;
    payload?: any;
    organizationId?: string;
  }): Promise<{ status: string; jobId?: string; error?: string }> {
    const liveWorkers = annyWorkerRegistry.getActiveWorkersForOrganization(params.organizationId || 'global');
    if (liveWorkers.length === 0) {
      return {
        status: 'REJECTED_NO_WORKERS',
        error: 'No authenticated active remote compute workers available for organization.'
      };
    }
    return {
      status: 'DISPATCHED',
      jobId: `job_${Date.now()}`
    };
  }

  public async executeMediaPipeline(req: {
    projectId: string;
    organizationId: string;
    transactionId?: string;
    taskType: string;
    prompt: string;
    requiredVramMb: number;
    requiredCapabilities: string[];
    classification: DataClassification;
    simulateWorkerExecution?: (job: RemoteJob) => Promise<{ artifacts: any[], diagnostic: string, success: boolean }>
  }): Promise<RemoteJob> {
    const job = annyRemoteJobQueue.createJob({
      projectId: req.projectId,
      organizationId: req.organizationId,
      transactionId: req.transactionId,
      taskType: req.taskType,
      prompt: req.prompt
    });

    const schedReq: SchedulerRequest = {
      taskId: job.id,
      taskType: req.taskType,
      organizationId: req.organizationId,
      requiredVramMb: req.requiredVramMb,
      requiredCapabilities: req.requiredCapabilities,
      dataClassification: req.classification
    };

    return await annyRemoteJobQueue.submitAndExecute(job.id, schedReq, req.simulateWorkerExecution);
  }
}

export const annyRemoteComputeFabric = AnnyRemoteComputeFabric.getInstance();

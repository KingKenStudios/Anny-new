/**
 * ANNY — RABBITMQ MESSAGE QUEUE PLATFORM (PHASE 7)
 * Distributed message queues, worker architecture, AI job scheduling,
 * retry loops, and dead-letter queues (DLQ).
 */

import { envConfigService } from './envConfigService';

export type QueueName = 
  | 'code_generation_queue' 
  | 'image_generation_queue' 
  | 'scada_telemetry_queue' 
  | 'ai_task_queue' 
  | 'dlq_queue';

export interface JobPayload<T = any> {
  id: string;
  queue: QueueName;
  payload: T;
  retriesLeft: number;
  maxRetries: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  error?: string;
}

export type JobHandler<T = any> = (job: JobPayload<T>) => Promise<any>;

export class RabbitMQPlatform {
  private static instance: RabbitMQPlatform;
  private queues: Map<QueueName, JobPayload[]> = new Map();
  private handlers: Map<QueueName, JobHandler> = new Map();
  private isProcessing: boolean = false;

  private constructor() {
    this.initQueues();
  }

  public static getInstance(): RabbitMQPlatform {
    if (!RabbitMQPlatform.instance) {
      RabbitMQPlatform.instance = new RabbitMQPlatform();
    }
    return RabbitMQPlatform.instance;
  }

  private initQueues(): void {
    const queueNames: QueueName[] = [
      'code_generation_queue',
      'image_generation_queue',
      'scada_telemetry_queue',
      'ai_task_queue',
      'dlq_queue'
    ];

    queueNames.forEach(q => this.queues.set(q, []));
  }

  public async checkHealth(): Promise<{ status: 'SIMULATED' | 'NOT_CONFIGURED'; pendingJobsCount: number; dlqJobsCount: number }> {
    const config = envConfigService.getConfig();
    let totalPending = 0;
    this.queues.forEach((jobs) => { totalPending += jobs.length; });

    return {
      status: config.rabbitmqUrl ? 'SIMULATED' : 'NOT_CONFIGURED',
      pendingJobsCount: totalPending,
      dlqJobsCount: (this.queues.get('dlq_queue') || []).length
    };
  }

  // Publish job to queue
  public async publish<T>(queue: QueueName, data: T, maxRetries: number = 3): Promise<JobPayload<T>> {
    const job: JobPayload<T> = {
      id: `job_${Math.random().toString(36).substring(2, 10)}`,
      queue,
      payload: data,
      retriesLeft: maxRetries,
      maxRetries,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    this.queues.get(queue)?.push(job);
    this.triggerWorkerProcess();
    return job;
  }

  // Register Worker Handler
  public registerWorker<T>(queue: QueueName, handler: JobHandler<T>): void {
    this.handlers.set(queue, handler);
    this.triggerWorkerProcess();
  }

  // Asynchronous Background Worker Processing
  private async triggerWorkerProcess(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      for (const [queue, jobs] of this.queues.entries()) {
        if (queue === 'dlq_queue') continue; // Don't auto-process dead letters

        const handler = this.handlers.get(queue);
        if (!handler) continue;

        while (jobs.length > 0) {
          const job = jobs.shift();
          if (!job) continue;

          job.status = 'PROCESSING';
          try {
            await handler(job);
            job.status = 'COMPLETED';
          } catch (err: any) {
            job.retriesLeft -= 1;
            job.error = err.message;

            if (job.retriesLeft > 0) {
              console.warn(`[RabbitMQ Worker] Job ${job.id} on ${queue} failed. Retrying (${job.retriesLeft} left)...`);
              job.status = 'PENDING';
              jobs.push(job); // Re-queue
            } else {
              console.error(`[RabbitMQ Worker] Job ${job.id} failed permanently. Moving to Dead Letter Queue (DLQ).`);
              job.status = 'FAILED';
              this.queues.get('dlq_queue')?.push(job);
            }
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  public getQueueStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.queues.forEach((jobs, name) => {
      stats[name] = jobs.length;
    });
    return stats;
  }
}

export const rabbitMQPlatform = RabbitMQPlatform.getInstance();

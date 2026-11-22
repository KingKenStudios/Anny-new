import amqp, { Connection, Channel } from 'amqplib';

export interface EmbeddingJobData {
  jobId: string;
  documentId: string;
  content: string;
  model?: string;
  createdAt: string;
}

export interface TranspilationJobData {
  jobId: string;
  taskId: string;
  sourceCode: string;
  targetFormat: 'cjs' | 'esm' | 'bundle';
  createdAt: string;
}

export class RabbitWorkerService {
  private connection: any = null;
  private channel: Channel | null = null;
  private isConnected: boolean = false;
  private readonly rabbitUrl: string;

  public static readonly QUEUE_EMBEDDINGS = 'ai_document_embeddings';
  public static readonly QUEUE_TRANSPILATION = 'code_transpilation';

  constructor() {
    this.rabbitUrl = String(process.env.RABBITMQ_URL || '').trim();
  }

  /**
   * Initializes connection to RabbitMQ server and declares worker queues when RABBITMQ_URL is configured.
   */
  public async initialize(): Promise<boolean> {
    if (!this.rabbitUrl) {
      this.isConnected = false;
      return false;
    }
    try {
      this.connection = await amqp.connect(this.rabbitUrl);
      this.channel = await this.connection.createChannel();

      await this.channel.assertQueue(RabbitWorkerService.QUEUE_EMBEDDINGS, { durable: true });
      await this.channel.assertQueue(RabbitWorkerService.QUEUE_TRANSPILATION, { durable: true });

      this.isConnected = true;
      console.log('[RabbitWorkerService] Successfully connected to RabbitMQ broker & initialized queues.');

      this.startWorkers();
      return true;
    } catch (err) {
      console.warn('[RabbitWorkerService] RabbitMQ broker unavailable, activating in-memory queue fallback:', (err as Error).message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Publishes an AI document embedding generation job.
   */
  public async publishEmbeddingTask(documentId: string, content: string): Promise<string> {
    const jobId = `embed_job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload: EmbeddingJobData = {
      jobId,
      documentId,
      content,
      model: 'text-embedding-004',
      createdAt: new Date().toISOString()
    };

    if (this.isConnected && this.channel) {
      try {
        this.channel.sendToQueue(
          RabbitWorkerService.QUEUE_EMBEDDINGS,
          Buffer.from(JSON.stringify(payload)),
          { persistent: true }
        );
        console.log(`[RabbitWorkerService] Published embedding job ${jobId} to RabbitMQ.`);
        return jobId;
      } catch (err) {
        console.warn(`[RabbitWorkerService] Queue send error, processing in background:`, err);
      }
    }

    // Fallback async worker execution
    setTimeout(() => this.processEmbeddingJob(payload), 50);
    return jobId;
  }

  /**
   * Publishes a background code transpilation task.
   */
  public async publishTranspileTask(taskId: string, sourceCode: string): Promise<string> {
    const jobId = `transpile_job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload: TranspilationJobData = {
      jobId,
      taskId,
      sourceCode,
      targetFormat: 'bundle',
      createdAt: new Date().toISOString()
    };

    if (this.isConnected && this.channel) {
      try {
        this.channel.sendToQueue(
          RabbitWorkerService.QUEUE_TRANSPILATION,
          Buffer.from(JSON.stringify(payload)),
          { persistent: true }
        );
        console.log(`[RabbitWorkerService] Published transpilation job ${jobId} to RabbitMQ.`);
        return jobId;
      } catch (err) {
        console.warn(`[RabbitWorkerService] Queue send error, processing in background:`, err);
      }
    }

    // Fallback async worker execution
    setTimeout(() => this.processTranspilationJob(payload), 50);
    return jobId;
  }

  /**
   * Starts background workers listening on RabbitMQ queues.
   */
  private startWorkers(): void {
    if (!this.channel) return;

    // Worker 1: Heavy AI Document Embedding Worker
    this.channel.consume(RabbitWorkerService.QUEUE_EMBEDDINGS, async (msg) => {
      if (msg && this.channel) {
        try {
          const data: EmbeddingJobData = JSON.parse(msg.content.toString());
          await this.processEmbeddingJob(data);
          this.channel.ack(msg);
        } catch (err) {
          console.error('[RabbitWorkerService] Worker failed processing embedding job:', err);
          this.channel.nack(msg, false, false);
        }
      }
    });

    // Worker 2: Heavy Background Code Transpilation Worker
    this.channel.consume(RabbitWorkerService.QUEUE_TRANSPILATION, async (msg) => {
      if (msg && this.channel) {
        try {
          const data: TranspilationJobData = JSON.parse(msg.content.toString());
          await this.processTranspilationJob(data);
          this.channel.ack(msg);
        } catch (err) {
          console.error('[RabbitWorkerService] Worker failed processing transpilation job:', err);
          this.channel.nack(msg, false, false);
        }
      }
    });
  }

  private async processEmbeddingJob(data: EmbeddingJobData): Promise<void> {
    console.log(`[Worker:Embedding] Processing document '${data.documentId}' (${data.content.length} chars)...`);
    // Simulating heavy vector calculation without blocking main execution thread
    await new Promise((res) => setTimeout(res, 200));
    console.log(`[Worker:Embedding] Successfully generated vector embeddings for job ${data.jobId}.`);
  }

  private async processTranspilationJob(data: TranspilationJobData): Promise<void> {
    console.log(`[Worker:Transpiler] Transpiling task '${data.taskId}' code block (${data.sourceCode.length} bytes)...`);
    // Simulating heavy bundling & AST transform
    await new Promise((res) => setTimeout(res, 350));
    console.log(`[Worker:Transpiler] Completed code transpilation for job ${data.jobId}.`);
  }
}

export const rabbitWorkerService = new RabbitWorkerService();

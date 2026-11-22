/**
 * ANNY — ADAPTIVE VIDEO FRAME SCHEDULER WITH STRICT BACKPRESSURE
 * Prevents unbounded frame queues, drops stale frames under slow inference,
 * preserves high-priority scene-change / event frames, and dynamically throttles
 * effective FPS based on measured inference latency.
 */

export interface ScheduledFrameItem<T> {
  id: number;
  payload: T;
  timestamp: number;
  priority: 'normal' | 'event';
}

export interface FrameSchedulerStats {
  targetFps: number;
  effectiveFps: number;
  inFlight: boolean;
  hasPendingSlot: boolean;
  processedCount: number;
  droppedCount: number;
  avgLatencyMs: number;
  maxQueueDepthObserved: number;
}

export interface VideoFrameSchedulerOptions<T> {
  targetFps: number;
  minFps?: number;
  maxFps?: number;
  /** Maximum age of a queued frame before it is discarded as stale */
  maxFrameAgeMs?: number;
  /** Async handler that consumes one frame at a time */
  onProcess: (item: ScheduledFrameItem<T>) => Promise<void>;
  onDrop?: (dropped: ScheduledFrameItem<T>, reason: 'backpressure' | 'stale' | 'stopped') => void;
  onError?: (err: unknown) => void;
}

export class VideoFrameScheduler<T> {
  private targetFps: number;
  private effectiveFps: number;
  private readonly minFps: number;
  private readonly maxFps: number;
  private readonly maxFrameAgeMs: number;
  private readonly onProcess: (item: ScheduledFrameItem<T>) => Promise<void>;
  private readonly onDrop?: (dropped: ScheduledFrameItem<T>, reason: 'backpressure' | 'stale' | 'stopped') => void;
  private readonly onError?: (err: unknown) => void;

  private running = false;
  private paused = false;
  private inFlight = false;
  private pendingSlot: ScheduledFrameItem<T> | null = null;
  private nextId = 1;
  private lastDispatchAt = 0;
  private processedCount = 0;
  private droppedCount = 0;
  private avgLatencyMs = 0;
  private maxQueueDepthObserved = 0;
  private drainPromise: Promise<void> | null = null;

  constructor(options: VideoFrameSchedulerOptions<T>) {
    this.minFps = Math.max(0.1, options.minFps ?? 0.2);
    this.maxFps = Math.max(this.minFps, options.maxFps ?? 30);
    this.targetFps = this.clampFps(options.targetFps);
    this.effectiveFps = this.targetFps;
    this.maxFrameAgeMs = Math.max(500, options.maxFrameAgeMs ?? 5000);
    this.onProcess = options.onProcess;
    this.onDrop = options.onDrop;
    this.onError = options.onError;
  }

  private clampFps(fps: number): number {
    if (fps <= 0) return 0;
    return Math.max(this.minFps, Math.min(this.maxFps, fps));
  }

  start(): void {
    this.running = true;
    this.paused = false;
  }

  pause(): void {
    this.paused = true;
    if (this.pendingSlot) {
      const dropped = this.pendingSlot;
      this.pendingSlot = null;
      this.droppedCount += 1;
      this.onDrop?.(dropped, 'stopped');
    }
  }

  resume(): void {
    if (this.running) {
      this.paused = false;
    }
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    if (this.pendingSlot) {
      const dropped = this.pendingSlot;
      this.pendingSlot = null;
      this.droppedCount += 1;
      this.onDrop?.(dropped, 'stopped');
    }
  }

  setTargetFps(fps: number): void {
    this.targetFps = this.clampFps(fps);
    this.effectiveFps = this.targetFps;
  }

  getMinIntervalMs(): number {
    if (this.effectiveFps <= 0) return Number.POSITIVE_INFINITY;
    return Math.round(1000 / this.effectiveFps);
  }

  /**
   * Submits a newly captured frame.
   * Enforces rate-limiting, single-slot backpressure (never queues unbounded),
   * and priority preservation for scene-change / event frames.
   * Returns true if accepted (immediately dispatched or placed in single pending slot), false if dropped.
   */
  submit(payload: T, priority: 'normal' | 'event' = 'normal', now = Date.now()): boolean {
    if (!this.running || this.paused || this.targetFps <= 0) {
      return false;
    }

    const item: ScheduledFrameItem<T> = {
      id: this.nextId++,
      payload,
      timestamp: now,
      priority,
    };

    const minInterval = this.getMinIntervalMs();
    const elapsed = now - this.lastDispatchAt;

    // Rate-limit normal frames unless an event frame arrives
    if (!this.inFlight && priority === 'normal' && this.lastDispatchAt > 0 && elapsed < minInterval) {
      this.droppedCount += 1;
      this.onDrop?.(item, 'backpressure');
      return false;
    }

    if (this.inFlight) {
      // Strict single-slot backpressure: never allow queue > 1
      if (this.pendingSlot) {
        // Preserve an existing high-priority event frame if incoming frame is normal
        if (this.pendingSlot.priority === 'event' && priority === 'normal') {
          this.droppedCount += 1;
          this.onDrop?.(item, 'backpressure');
          return false;
        }
        // Replace stale pending slot with fresher frame
        const replaced = this.pendingSlot;
        this.droppedCount += 1;
        this.onDrop?.(replaced, 'backpressure');
      }
      this.pendingSlot = item;
      this.maxQueueDepthObserved = Math.max(this.maxQueueDepthObserved, 1);
      return true;
    }

    this.dispatch(item);
    return true;
  }

  private dispatch(item: ScheduledFrameItem<T>): void {
    this.inFlight = true;
    this.lastDispatchAt = item.timestamp;

    const start = Date.now();
    this.drainPromise = (async () => {
      try {
        await this.onProcess(item);
        const latency = Math.max(1, Date.now() - start);
        this.processedCount += 1;
        this.avgLatencyMs =
          this.avgLatencyMs === 0 ? latency : Number((this.avgLatencyMs * 0.7 + latency * 0.3).toFixed(2));
        this.adaptFps(latency);
      } catch (err) {
        this.onError?.(err);
      } finally {
        this.inFlight = false;
        this.drainPending();
      }
    })();
  }

  private drainPending(): void {
    if (!this.running || this.paused) {
      if (this.pendingSlot) {
        const dropped = this.pendingSlot;
        this.pendingSlot = null;
        this.droppedCount += 1;
        this.onDrop?.(dropped, 'stopped');
      }
      return;
    }

    const next = this.pendingSlot;
    if (!next) return;
    this.pendingSlot = null;

    const age = Date.now() - next.timestamp;
    if (age > this.maxFrameAgeMs && next.priority !== 'event') {
      this.droppedCount += 1;
      this.onDrop?.(next, 'stale');
      return;
    }

    this.dispatch(next);
  }

  private adaptFps(lastLatencyMs: number): void {
    if (this.targetFps <= 0) return;
    const budgetMs = 1000 / this.effectiveFps;
    if (lastLatencyMs > budgetMs * 0.85) {
      // Inference is slower than budget -> step down effective FPS smoothly
      const sustainable = 1000 / Math.max(100, lastLatencyMs * 1.25);
      this.effectiveFps = Number(
        Math.max(this.minFps, Math.min(this.effectiveFps * 0.8, sustainable)).toFixed(2)
      );
    } else if (lastLatencyMs < budgetMs * 0.45 && this.effectiveFps < this.targetFps) {
      // Headroom available -> step back up toward target FPS
      this.effectiveFps = Number(
        Math.min(this.targetFps, this.effectiveFps * 1.15).toFixed(2)
      );
    }
  }

  /**
   * Resolves when any currently in-flight frame (and pending slot) finishes processing.
   */
  async waitForIdle(): Promise<void> {
    while (this.inFlight && this.drainPromise) {
      await this.drainPromise;
    }
  }

  getStats(): FrameSchedulerStats {
    return {
      targetFps: this.targetFps,
      effectiveFps: this.effectiveFps,
      inFlight: this.inFlight,
      hasPendingSlot: this.pendingSlot !== null,
      processedCount: this.processedCount,
      droppedCount: this.droppedCount,
      avgLatencyMs: this.avgLatencyMs,
      maxQueueDepthObserved: this.maxQueueDepthObserved,
    };
  }
}

/**
 * ANNY — VISION TELEMETRY TRACKER
 * Tracks real rolling FPS, capture/local/AI latencies, dropped frames,
 * reconnect attempts, and active provider/transport state.
 */

import type { VisionAnalysisTransport, VisionTelemetrySnapshot } from './types';

export class VisionTelemetry {
  private captureTimestamps: number[] = [];
  private localTimestamps: number[] = [];
  private aiTimestamps: number[] = [];

  private targetLocalFps = 12;
  private targetAiFps = 0.5;
  private captureLatencyMs = 0;
  private localLatencyMs = 0;
  private aiLatencyMs = 0;
  private droppedFrames = 0;
  private processedLocalFrames = 0;
  private processedAiFrames = 0;
  private reconnectCount = 0;
  private inFlightAi = false;
  private activeProvider = 'none';
  private activeModel = 'none';
  private activeTransport: VisionAnalysisTransport = 'none';
  private lastError: string | null = null;

  private readonly windowMs = 2500;

  private pruneAndRate(list: number[], now: number): number {
    const cutoff = now - this.windowMs;
    while (list.length > 0 && list[0] < cutoff) {
      list.shift();
    }
    if (list.length === 0) return 0;
    if (list.length === 1) return Number((1000 / this.windowMs).toFixed(2));
    const spanSec = Math.max(0.25, (now - list[0]) / 1000);
    return Number((list.length / spanSec).toFixed(2));
  }

  recordCapture(latencyMs: number, now = Date.now()): void {
    this.captureLatencyMs = Number(latencyMs.toFixed(2));
    this.captureTimestamps.push(now);
    this.pruneAndRate(this.captureTimestamps, now);
  }

  recordLocalFrame(latencyMs: number, now = Date.now()): void {
    this.localLatencyMs = Number(latencyMs.toFixed(2));
    this.processedLocalFrames += 1;
    this.localTimestamps.push(now);
    this.pruneAndRate(this.localTimestamps, now);
  }

  recordAiFrame(latencyMs: number, now = Date.now()): void {
    this.aiLatencyMs = Number(latencyMs.toFixed(2));
    this.processedAiFrames += 1;
    this.aiTimestamps.push(now);
    this.pruneAndRate(this.aiTimestamps, now);
  }

  recordDroppedFrame(count = 1): void {
    this.droppedFrames += count;
  }

  recordReconnect(): void {
    this.reconnectCount += 1;
  }

  setTargets(targetLocalFps: number, targetAiFps: number): void {
    this.targetLocalFps = Number(targetLocalFps.toFixed(2));
    this.targetAiFps = Number(targetAiFps.toFixed(2));
  }

  setInFlightAi(inFlight: boolean): void {
    this.inFlightAi = inFlight;
  }

  setProvider(provider: string, model: string, transport: VisionAnalysisTransport): void {
    this.activeProvider = provider;
    this.activeModel = model;
    this.activeTransport = transport;
  }

  setError(error: string | null): void {
    this.lastError = error;
  }

  getSnapshot(now = Date.now()): VisionTelemetrySnapshot {
    return {
      captureFps: this.pruneAndRate(this.captureTimestamps, now),
      localPerceptionFps: this.pruneAndRate(this.localTimestamps, now),
      aiAnalysisFps: this.pruneAndRate(this.aiTimestamps, now),
      targetLocalFps: this.targetLocalFps,
      targetAiFps: this.targetAiFps,
      captureLatencyMs: this.captureLatencyMs,
      localLatencyMs: this.localLatencyMs,
      aiLatencyMs: this.aiLatencyMs,
      droppedFrames: this.droppedFrames,
      processedLocalFrames: this.processedLocalFrames,
      processedAiFrames: this.processedAiFrames,
      reconnectCount: this.reconnectCount,
      inFlightAi: this.inFlightAi,
      activeProvider: this.activeProvider,
      activeModel: this.activeModel,
      activeTransport: this.activeTransport,
      lastError: this.lastError,
    };
  }

  reset(): void {
    this.captureTimestamps = [];
    this.localTimestamps = [];
    this.aiTimestamps = [];
    this.captureLatencyMs = 0;
    this.localLatencyMs = 0;
    this.aiLatencyMs = 0;
    this.droppedFrames = 0;
    this.processedLocalFrames = 0;
    this.processedAiFrames = 0;
    this.reconnectCount = 0;
    this.inFlightAi = false;
    this.activeProvider = 'none';
    this.activeModel = 'none';
    this.activeTransport = 'none';
    this.lastError = null;
  }
}

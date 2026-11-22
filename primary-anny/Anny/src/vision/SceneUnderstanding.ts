/**
 * ANNY — SHARED SCENE UNDERSTANDING & PERCEPTION STATE STORE
 * Single source of truth connecting LiveVisionController to ANNY's chat,
 * voice interaction, cognitive pipeline, and robot/spatial intelligence modules.
 */

import {
  ROBOT_VISION_SAFETY_DISCLAIMER,
  type SharedPerceptionState,
  type VisionCapabilityReport,
  type VisionStatusFlags,
  type VisionTelemetrySnapshot,
} from './types';
import { TemporalSceneMemory } from './TemporalSceneMemory';

export type PerceptionStateListener = (state: SharedPerceptionState) => void;

export interface RobotPerceptionPacket {
  active: boolean;
  stale: boolean;
  timestamp: number;
  cameraMoving: boolean;
  objectMotionActive: boolean;
  sceneChanged: boolean;
  trackedEntityCount: number;
  trackedEntities: Array<{
    trackId: string;
    label: string;
    direction: string;
    box: { x: number; y: number; w: number; h: number };
    confidence: number;
  }>;
  latestSceneSummary: string | null;
  rosHardwareConnected: false;
  visionOnlyUnverifiedForPhysicalSafety: true;
  safetyDisclaimer: string;
}

const DEFAULT_STATUS: VisionStatusFlags = {
  cameraConnected: false,
  videoStreamActive: false,
  localPerceptionActive: false,
  liveAiSessionActive: false,
  voiceSessionActive: false,
  paused: false,
  reconnecting: false,
};

const DEFAULT_CAPABILITIES: VisionCapabilityReport = {
  cameraAvailable: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
  screenShareAvailable: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia),
  videoFileAnalysisAvailable: typeof document !== 'undefined',
  localMotionTrackingAvailable: true,
  localPoseAvailable: typeof window !== 'undefined',
  localPoseLoaded: false,
  localObjectClassifierLoaded: false,
  onlineLiveStreamAvailable: false,
  onlineFrameAnalysisAvailable: false,
  localVlmAvailable: false,
  offlineMode: false,
  activeTransport: 'none',
  limitations: ['Vision session has not been started.'],
};

const DEFAULT_TELEMETRY: VisionTelemetrySnapshot = {
  captureFps: 0,
  localPerceptionFps: 0,
  aiAnalysisFps: 0,
  targetLocalFps: 12,
  targetAiFps: 0.5,
  captureLatencyMs: 0,
  localLatencyMs: 0,
  aiLatencyMs: 0,
  droppedFrames: 0,
  processedLocalFrames: 0,
  processedAiFrames: 0,
  reconnectCount: 0,
  inFlightAi: false,
  activeProvider: 'none',
  activeModel: 'none',
  activeTransport: 'none',
  lastError: null,
};

export class SceneUnderstandingStore {
  private state: SharedPerceptionState;
  private listeners = new Set<PerceptionStateListener>();
  private memory: TemporalSceneMemory;

  constructor(memory?: TemporalSceneMemory) {
    this.memory = memory || new TemporalSceneMemory();
    this.state = this.createInitialState();
  }

  private createInitialState(): SharedPerceptionState {
    return {
      updatedAt: 0,
      status: { ...DEFAULT_STATUS },
      source: null,
      mode: 'balanced',
      activeTransport: 'none',
      activeProvider: 'none',
      activeModel: 'none',
      latestSceneDescription: null,
      latestSceneUpdatedAt: null,
      trackedEntities: [],
      aiObjects: [],
      latestMotion: null,
      latestPose: null,
      recentEvents: [],
      recentTranscripts: [],
      capabilities: { ...DEFAULT_CAPABILITIES },
      telemetry: { ...DEFAULT_TELEMETRY },
      stale: true,
      robotSafetyDisclaimer: ROBOT_VISION_SAFETY_DISCLAIMER,
    };
  }

  attachMemory(memory: TemporalSceneMemory): void {
    this.memory = memory;
  }

  getState(): SharedPerceptionState {
    const active = this.state.status.videoStreamActive && !this.state.status.paused;
    return {
      ...this.state,
      stale: !active || this.memory.isStale(),
    };
  }

  update(patch: Partial<SharedPerceptionState>): void {
    const nextStatus = patch.status ? { ...this.state.status, ...patch.status } : this.state.status;
    const active = nextStatus.videoStreamActive && !nextStatus.paused;
    this.state = {
      ...this.state,
      ...patch,
      status: nextStatus,
      updatedAt: Date.now(),
      stale: !active || this.memory.isStale(),
    };
    this.emit();
  }

  subscribe(listener: PerceptionStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snap = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(snap);
      } catch {
        // Never allow a subscriber error to break the perception pipeline
      }
    }
  }

  /**
   * Generates a bounded, truthful natural-language perception context block
   * for injection into ANNY's chat and cognitive kernel.
   */
  buildPromptContext(now = Date.now()): string {
    const active =
      this.state.status.videoStreamActive &&
      (this.state.status.localPerceptionActive || this.state.status.liveAiSessionActive);
    return this.memory.buildPromptContext({
      active,
      source: this.state.source,
      provider: this.state.activeProvider,
      now,
    });
  }

  /**
   * Produces a structured perception packet for ANNY Robot Mode / Spatial Intelligence.
   * Explicitly prohibits claiming hardware ROS connectivity or certified physical safety.
   */
  getRobotPerceptionPacket(now = Date.now()): RobotPerceptionPacket {
    const snap = this.getState();
    const active = snap.status.videoStreamActive && snap.status.localPerceptionActive;
    return {
      active,
      stale: !active || this.memory.isStale(now),
      timestamp: now,
      cameraMoving: Boolean(snap.latestMotion?.cameraMoving),
      objectMotionActive: Boolean(snap.latestMotion?.objectMotionActive),
      sceneChanged: Boolean(snap.latestMotion?.sceneChanged),
      trackedEntityCount: snap.trackedEntities.length,
      trackedEntities: snap.trackedEntities.map((t) => ({
        trackId: t.trackId,
        label: t.label,
        direction: t.velocity.direction,
        box: t.box,
        confidence: t.confidence,
      })),
      latestSceneSummary: snap.latestSceneDescription,
      rosHardwareConnected: false,
      visionOnlyUnverifiedForPhysicalSafety: true,
      safetyDisclaimer: ROBOT_VISION_SAFETY_DISCLAIMER,
    };
  }

  reset(): void {
    this.memory.clear();
    this.state = this.createInitialState();
    this.emit();
  }
}

export const sceneUnderstanding = new SceneUnderstandingStore();

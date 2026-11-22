/**
 * ANNY — REAL-TIME VISION & LIVE PERCEPTION TYPES
 * Shared canonical types for continuous video perception, local offline vision,
 * temporal scene memory, object/motion tracking, and live AI streaming.
 */

export type VisionOperatingMode =
  | 'low_bandwidth'
  | 'balanced'
  | 'high_quality'
  | 'local_offline'
  | 'continuous_live'
  | 'on_demand';

export type VisionInputSource = 'camera' | 'screen' | 'video_file';

export type VisionAnalysisTransport =
  | 'none'
  | 'local_only'
  | 'continuous_frame_analysis'
  | 'native_live_stream';

export type VisionResolutionPreset = 'low' | 'medium' | 'high';

export type DirectionLabel =
  | 'stationary'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right';

export interface NormalizedBox {
  /** Normalized left coordinate [0..1] */
  x: number;
  /** Normalized top coordinate [0..1] */
  y: number;
  /** Normalized width [0..1] */
  w: number;
  /** Normalized height [0..1] */
  h: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface MotionVector {
  /** Normalized horizontal delta per frame (-1..1) */
  dx: number;
  /** Normalized vertical delta per frame (-1..1) */
  dy: number;
  /** Euclidean speed magnitude */
  magnitude: number;
  direction: DirectionLabel;
}

export interface ProcessedGrayFrame {
  frameIndex: number;
  timestamp: number;
  width: number;
  height: number;
  /** Grayscale luminance buffer (width * height), values 0..255 */
  luma: Uint8Array;
  /** 16-bin normalized luminance histogram */
  histogram: Float32Array;
  meanLuma: number;
  sourceWidth: number;
  sourceHeight: number;
}

export interface EncodedFramePayload {
  base64: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  byteLength: number;
  timestamp: number;
  captureLatencyMs: number;
}

export interface MotionRegion {
  regionId: string;
  box: NormalizedBox;
  centroid: Point2D;
  intensity: number;
  areaRatio: number;
  vector: MotionVector;
}

export interface MotionAnalysisResult {
  frameIndex: number;
  timestamp: number;
  /** Overall compensated foreground motion intensity [0..1] */
  motionScore: number;
  /** Estimated global camera pan/tilt vector */
  cameraMotion: MotionVector;
  /** True when global background displacement indicates camera movement */
  cameraMoving: boolean;
  /** True when independent object motion is detected after camera compensation */
  objectMotionActive: boolean;
  /** True when a significant scene cut or large structural change occurs */
  sceneChanged: boolean;
  sceneChangeMagnitude: number;
  foregroundRatio: number;
  noiseFloor: number;
  regions: MotionRegion[];
}

export interface TrackedEntity {
  trackId: string;
  label: string;
  source: 'local_motion' | 'local_pose' | 'ai_vision';
  box: NormalizedBox;
  centroid: Point2D;
  velocity: MotionVector;
  confidence: number;
  firstSeenAt: number;
  lastSeenAt: number;
  ageFrames: number;
  missedFrames: number;
  state: 'active' | 'occluded' | 'exited';
}

export interface TrackingEvent {
  id: string;
  type: 'appeared' | 'moved' | 'disappeared' | 'scene_changed' | 'camera_motion';
  timestamp: number;
  trackId?: string;
  label?: string;
  summary: string;
  box?: NormalizedBox;
  magnitude?: number;
}

export interface PoseLandmark2D {
  x: number;
  y: number;
  visibility: number;
}

export interface LocalPoseResult {
  detected: boolean;
  landmarks: PoseLandmark2D[];
  box?: NormalizedBox;
  confidence: number;
  timestamp: number;
}

export interface AiDetectedObject {
  label: string;
  confidence: number;
  box?: NormalizedBox;
  attributes?: string[];
}

export interface AiVisionObservation {
  id: string;
  timestamp: number;
  description: string;
  objects: AiDetectedObject[];
  sceneSummary?: string;
  transport: VisionAnalysisTransport;
  provider: string;
  model: string;
  latencyMs: number;
  confidence?: number;
  rawMode: 'native_live_stream' | 'continuous_frame_analysis' | 'snapshot';
}

export interface VisionStatusFlags {
  /** Hardware/media stream source is acquired */
  cameraConnected: boolean;
  /** Video element or file stream is actively producing frames */
  videoStreamActive: boolean;
  /** Local real-time motion/tracking/pose pipeline is running */
  localPerceptionActive: boolean;
  /** Online AI vision (native live stream or continuous frame analysis) is actively running */
  liveAiSessionActive: boolean;
  /** Real-time live audio/voice session is actively running */
  voiceSessionActive: boolean;
  /** Perception loop is intentionally paused while keeping preview or stream */
  paused: boolean;
  /** Session is attempting to recover from disconnect */
  reconnecting: boolean;
}

export interface VisionCapabilityReport {
  cameraAvailable: boolean;
  screenShareAvailable: boolean;
  videoFileAnalysisAvailable: boolean;
  localMotionTrackingAvailable: boolean;
  localPoseAvailable: boolean;
  localPoseLoaded: boolean;
  localObjectClassifierLoaded: boolean;
  onlineLiveStreamAvailable: boolean;
  onlineFrameAnalysisAvailable: boolean;
  localVlmAvailable: boolean;
  offlineMode: boolean;
  activeTransport: VisionAnalysisTransport;
  limitations: string[];
}

export interface VisionTelemetrySnapshot {
  captureFps: number;
  localPerceptionFps: number;
  aiAnalysisFps: number;
  targetLocalFps: number;
  targetAiFps: number;
  captureLatencyMs: number;
  localLatencyMs: number;
  aiLatencyMs: number;
  droppedFrames: number;
  processedLocalFrames: number;
  processedAiFrames: number;
  reconnectCount: number;
  inFlightAi: boolean;
  activeProvider: string;
  activeModel: string;
  activeTransport: VisionAnalysisTransport;
  lastError: string | null;
}

export interface VisionDeviceInfo {
  deviceId: string;
  label: string;
  facingMode?: 'user' | 'environment' | 'unknown';
}

export interface VisionTranscriptEntry {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  final: boolean;
}

export interface SharedPerceptionState {
  updatedAt: number;
  status: VisionStatusFlags;
  source: VisionInputSource | null;
  mode: VisionOperatingMode;
  activeTransport: VisionAnalysisTransport;
  activeProvider: string;
  activeModel: string;
  latestSceneDescription: string | null;
  latestSceneUpdatedAt: number | null;
  trackedEntities: TrackedEntity[];
  aiObjects: AiDetectedObject[];
  latestMotion: MotionAnalysisResult | null;
  latestPose: LocalPoseResult | null;
  recentEvents: TrackingEvent[];
  recentTranscripts: VisionTranscriptEntry[];
  capabilities: VisionCapabilityReport;
  telemetry: VisionTelemetrySnapshot;
  stale: boolean;
  /** Explicit robot/spatial safety disclaimer: vision alone is never a certified physical safety barrier. */
  robotSafetyDisclaimer: string;
}

export interface VisionModeConfig {
  mode: VisionOperatingMode;
  targetLocalFps: number;
  targetAiFps: number;
  maxAiWidth: number;
  jpegQuality: number;
  enableOnlineAi: boolean;
  preferNativeLiveStream: boolean;
}

export const VISION_MODE_PRESETS: Record<VisionOperatingMode, VisionModeConfig> = {
  low_bandwidth: {
    mode: 'low_bandwidth',
    targetLocalFps: 6,
    targetAiFps: 0.35,
    maxAiWidth: 480,
    jpegQuality: 0.62,
    enableOnlineAi: true,
    preferNativeLiveStream: false,
  },
  balanced: {
    mode: 'balanced',
    targetLocalFps: 12,
    targetAiFps: 0.5,
    maxAiWidth: 640,
    jpegQuality: 0.72,
    enableOnlineAi: true,
    preferNativeLiveStream: false,
  },
  high_quality: {
    mode: 'high_quality',
    targetLocalFps: 15,
    targetAiFps: 1.0,
    maxAiWidth: 768,
    jpegQuality: 0.82,
    enableOnlineAi: true,
    preferNativeLiveStream: true,
  },
  local_offline: {
    mode: 'local_offline',
    targetLocalFps: 15,
    targetAiFps: 0,
    maxAiWidth: 640,
    jpegQuality: 0.75,
    enableOnlineAi: false,
    preferNativeLiveStream: false,
  },
  continuous_live: {
    mode: 'continuous_live',
    targetLocalFps: 12,
    targetAiFps: 1.0,
    maxAiWidth: 640,
    jpegQuality: 0.72,
    enableOnlineAi: true,
    preferNativeLiveStream: true,
  },
  on_demand: {
    mode: 'on_demand',
    targetLocalFps: 10,
    targetAiFps: 0,
    maxAiWidth: 768,
    jpegQuality: 0.82,
    enableOnlineAi: false,
    preferNativeLiveStream: false,
  },
};

export const RESOLUTION_CONSTRAINTS: Record<
  VisionResolutionPreset,
  { width: number; height: number; label: string }
> = {
  low: { width: 320, height: 240, label: '320×240' },
  medium: { width: 640, height: 480, label: '640×480' },
  high: { width: 1280, height: 720, label: '1280×720' },
};

export const ROBOT_VISION_SAFETY_DISCLAIMER =
  'Visual perception provides situational awareness only and is not a verified physical safety system. Do not rely on camera output alone for collision avoidance or hardware actuation.';

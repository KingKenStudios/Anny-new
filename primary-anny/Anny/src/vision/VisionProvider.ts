/**
 * ANNY — VISION PROVIDER INTERFACES
 * Replaceable contracts for local offline perception providers and online/live AI vision providers.
 */

import type {
  AiVisionObservation,
  EncodedFramePayload,
  LocalPoseResult,
  MotionAnalysisResult,
  ProcessedGrayFrame,
  TrackedEntity,
  TrackingEvent,
  VisionAnalysisTransport,
} from './types';

export interface LocalFramePerceptionResult {
  motion: MotionAnalysisResult;
  tracks: TrackedEntity[];
  events: TrackingEvent[];
  pose: LocalPoseResult | null;
  latencyMs: number;
}

export interface LocalVisionCapabilities {
  motionTrackingAvailable: boolean;
  poseAvailable: boolean;
  poseLoaded: boolean;
  objectClassifierLoaded: boolean;
  limitations: string[];
}

export interface VisionAnalysisRequest {
  frame: EncodedFramePayload;
  prompt: string;
  temporalContext: string;
  mode: 'continuous_frame_analysis' | 'snapshot';
  structured?: boolean;
  signal?: AbortSignal;
}

export interface LiveSessionCallbacks {
  onConnected?: (info: { provider: string; model: string; transport: VisionAnalysisTransport }) => void;
  onDisconnected?: (reason: string) => void;
  onReconnecting?: (attempt: number, delayMs: number) => void;
  onAudioChunk?: (base64Pcm24k: string) => void;
  onInputTranscript?: (text: string, final: boolean) => void;
  onOutputTranscript?: (text: string, final: boolean) => void;
  onObservation?: (obs: AiVisionObservation) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onError?: (error: string) => void;
}

export interface ServerVisionCapabilities {
  liveStreamAvailable: boolean;
  liveModel: string | null;
  frameAnalysisAvailable: boolean;
  frameAnalysisModel: string | null;
  localVlmAvailable: boolean;
  executionMode: string;
  limitations: string[];
}

export interface OnlineVisionProviderContract {
  readonly id: string;
  readonly name: string;
  checkServerCapabilities(): Promise<ServerVisionCapabilities>;
  analyzeFrame(request: VisionAnalysisRequest): Promise<AiVisionObservation>;
  connectLiveSession(options: {
    systemContext?: string;
    callbacks: LiveSessionCallbacks;
  }): Promise<boolean>;
  sendLiveVideoFrame(frame: EncodedFramePayload): boolean;
  sendLiveAudioChunk(base64Pcm16k: string): boolean;
  sendLiveTextPrompt(text: string): boolean;
  disconnectLiveSession(): void;
  isLiveConnected(): boolean;
}

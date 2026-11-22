/**
 * ANNY — LIVE VISION CONTROLLER
 * Central orchestrator coordinating:
 *  - VisionSession (camera / screen / uploaded video lifecycle)
 *  - FrameProcessor (grayscale + bounded JPEG extraction)
 *  - LocalVisionProvider (offline pixel motion, camera-pan compensation, tracking, optional pose)
 *  - LiveVisionProvider (server-side Gemini Live WebSocket + continuous frame analysis)
 *  - LiveAudioBridge (simultaneous 16kHz mic input + 24kHz PCM audio playback)
 *  - VideoFrameScheduler (adaptive FPS + strict single-slot backpressure)
 *  - TemporalSceneMemory & SceneUnderstandingStore (shared perception state for ANNY)
 */

import { FrameProcessor } from './FrameProcessor';
import { LiveAudioBridge } from './LiveAudioBridge';
import { LiveVisionProvider } from './LiveVisionProvider';
import { LocalVisionProvider } from './LocalVisionProvider';
import { sceneUnderstanding, SceneUnderstandingStore } from './SceneUnderstanding';
import { TemporalSceneMemory } from './TemporalSceneMemory';
import { VideoFrameScheduler } from './VideoFrameScheduler';
import { classifyCameraError, VisionSession, type MediaDevicesLike } from './VisionSession';
import { VisionTelemetry } from './VisionTelemetry';
import type { OnlineVisionProviderContract, ServerVisionCapabilities } from './VisionProvider';
import {
  VISION_MODE_PRESETS,
  type EncodedFramePayload,
  type ProcessedGrayFrame,
  type SharedPerceptionState,
  type VisionAnalysisTransport,
  type VisionCapabilityReport,
  type VisionDeviceInfo,
  type VisionInputSource,
  type VisionOperatingMode,
  type VisionResolutionPreset,
  type VisionStatusFlags,
  type VisionTranscriptEntry,
} from './types';

export interface LiveVisionControllerOptions {
  onlineProvider?: OnlineVisionProviderContract;
  localProvider?: LocalVisionProvider;
  store?: SceneUnderstandingStore;
  mediaDevicesProvider?: () => MediaDevicesLike | undefined;
  onTranscript?: (entry: VisionTranscriptEntry) => void;
}

export class LiveVisionController {
  private readonly session: VisionSession;
  private readonly frameProcessor: FrameProcessor;
  private readonly localProvider: LocalVisionProvider;
  private readonly onlineProvider: OnlineVisionProviderContract;
  private readonly audioBridge: LiveAudioBridge;
  private readonly memory: TemporalSceneMemory;
  private readonly telemetry: VisionTelemetry;
  private readonly store: SceneUnderstandingStore;
  private readonly onTranscriptCallback?: (entry: VisionTranscriptEntry) => void;

  private localScheduler: VideoFrameScheduler<ProcessedGrayFrame>;
  private aiScheduler: VideoFrameScheduler<{ frame: EncodedFramePayload; reason: string }>;

  private videoElement: HTMLVideoElement | null = null;
  private captureLoopTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectCameraTimer: ReturnType<typeof setTimeout> | null = null;
  private activeAbortController: AbortController | null = null;

  private mode: VisionOperatingMode = 'balanced';
  private offlineMode = false;
  private trackingEnabled = true;
  private poseEnabled = false;
  private resolution: VisionResolutionPreset = 'medium';
  private facingMode: 'user' | 'environment' = 'environment';
  private selectedDeviceId: string | undefined;
  private devices: VisionDeviceInfo[] = [];
  private transcripts: VisionTranscriptEntry[] = [];
  private transcriptSeq = 1;
  private serverCaps: ServerVisionCapabilities | null = null;
  private lastSceneChangeAiTriggerAt = 0;
  private pausedByVisibility = false;
  private streamReconnectAttempts = 0;

  private status: VisionStatusFlags = {
    cameraConnected: false,
    videoStreamActive: false,
    localPerceptionActive: false,
    liveAiSessionActive: false,
    voiceSessionActive: false,
    paused: false,
    reconnecting: false,
  };

  constructor(options: LiveVisionControllerOptions = {}) {
    this.frameProcessor = new FrameProcessor({ analysisWidth: 64, analysisHeight: 48 });
    this.localProvider = options.localProvider || new LocalVisionProvider();
    this.onlineProvider = options.onlineProvider || new LiveVisionProvider();
    this.audioBridge = new LiveAudioBridge();
    this.memory = new TemporalSceneMemory({ maxEvents: 80, maxObservations: 20, maxMotionSamples: 60 });
    this.telemetry = new VisionTelemetry();
    this.store = options.store || sceneUnderstanding;
    this.store.attachMemory(this.memory);
    this.onTranscriptCallback = options.onTranscript;

    this.session = new VisionSession(
      {
        onStreamEnded: (reason) => this.handleUnexpectedStreamEnd(reason),
        onVisibilityChange: (hidden) => this.handleVisibilityChange(hidden),
      },
      options.mediaDevicesProvider
    );

    const preset = VISION_MODE_PRESETS[this.mode];
    this.telemetry.setTargets(preset.targetLocalFps, preset.targetAiFps);

    this.localScheduler = new VideoFrameScheduler<ProcessedGrayFrame>({
      targetFps: preset.targetLocalFps,
      minFps: 3,
      maxFps: 20,
      maxFrameAgeMs: 1200,
      onProcess: async (item) => {
        await this.processLocalGrayFrame(item.payload);
      },
      onDrop: () => {
        this.telemetry.recordDroppedFrame(1);
      },
    });

    this.aiScheduler = new VideoFrameScheduler<{ frame: EncodedFramePayload; reason: string }>({
      targetFps: preset.targetAiFps,
      minFps: 0.2,
      maxFps: 1.0,
      maxFrameAgeMs: 6000,
      onProcess: async (item) => {
        await this.processAiFrame(item.payload.frame, item.payload.reason);
      },
      onDrop: () => {
        this.telemetry.recordDroppedFrame(1);
      },
    });
  }

  attachVideoElement(video: HTMLVideoElement | null): void {
    this.videoElement = video;
    if (video) {
      const stream = this.session.getStream();
      if (stream && video.srcObject !== stream) {
        video.srcObject = stream;
        void video.play().catch(() => {});
      }
    }
  }

  async refreshCapabilities(): Promise<VisionCapabilityReport> {
    if (!this.offlineMode) {
      this.serverCaps = await this.onlineProvider.checkServerCapabilities();
    }
    const caps = this.buildCapabilityReport();
    this.publishState();
    return caps;
  }

  async refreshDevices(): Promise<VisionDeviceInfo[]> {
    this.devices = await this.session.listVideoDevices();
    return this.devices;
  }

  getDevices(): VisionDeviceInfo[] {
    return this.devices;
  }

  getState(): SharedPerceptionState {
    return this.store.getState();
  }

  subscribe(listener: (state: SharedPerceptionState) => void): () => void {
    return this.store.subscribe(listener);
  }

  /**
   * Starts explicit user-initiated vision capture (camera, screen share, or video file).
   */
  async start(options: {
    source?: VisionInputSource;
    deviceId?: string;
    facingMode?: 'user' | 'environment';
    resolution?: VisionResolutionPreset;
    videoFile?: File;
    mode?: VisionOperatingMode;
    offline?: boolean;
  } = {}): Promise<{ ok: boolean; error?: string }> {
    const source = options.source || 'camera';
    if (options.mode) this.mode = options.mode;
    if (typeof options.offline === 'boolean') this.offlineMode = options.offline;
    if (options.resolution) this.resolution = options.resolution;
    if (options.facingMode) this.facingMode = options.facingMode;
    if (options.deviceId !== undefined) this.selectedDeviceId = options.deviceId;

    this.stopCaptureLoops();
    this.clearReconnectTimer();
    this.telemetry.setError(null);

    try {
      const started = await this.session.start({
        source,
        deviceId: this.selectedDeviceId,
        facingMode: this.facingMode,
        resolution: this.resolution,
        videoFile: options.videoFile,
      });

      this.facingMode = started.facingMode;
      this.selectedDeviceId = started.deviceId;
      this.streamReconnectAttempts = 0;

      if (this.videoElement) {
        if (started.stream) {
          this.videoElement.src = '';
          this.videoElement.srcObject = started.stream;
          this.videoElement.loop = false;
        } else if (started.videoUrl) {
          this.videoElement.srcObject = null;
          this.videoElement.src = started.videoUrl;
          this.videoElement.loop = true;
        }
        try {
          await this.videoElement.play();
        } catch {
          // Mobile autoplay policies may require muted playsInline (set on element)
        }
      }

      this.status = {
        ...this.status,
        cameraConnected: true,
        videoStreamActive: true,
        localPerceptionActive: this.trackingEnabled,
        paused: false,
        reconnecting: false,
      };

      // Refresh labeled devices after permission grant
      this.devices = await this.session.listVideoDevices();
      if (!this.offlineMode) {
        this.serverCaps = await this.onlineProvider.checkServerCapabilities();
      }

      this.applyModeSettings();
      this.startCaptureLoops();

      // Start online native live stream if in continuous_live/high_quality mode and available
      const preset = this.getEffectivePreset();
      if (!this.offlineMode && preset.enableOnlineAi && preset.preferNativeLiveStream && this.serverCaps?.liveStreamAvailable) {
        await this.startLiveAiSession();
      } else if (!this.offlineMode && preset.enableOnlineAi && this.serverCaps?.frameAnalysisAvailable) {
        this.status.liveAiSessionActive = true;
        this.telemetry.setProvider(
          'ANNY Vision Core',
          this.serverCaps.frameAnalysisModel || 'gemini-4-hydrogen',
          'continuous_frame_analysis'
        );
      } else {
        this.status.liveAiSessionActive = false;
        this.telemetry.setProvider(
          this.localProvider.name,
          'local-cv',
          this.trackingEnabled ? 'local_only' : 'none'
        );
      }

      this.publishState();
      return { ok: true };
    } catch (err: any) {
      const classified = classifyCameraError(err);
      this.status = {
        cameraConnected: false,
        videoStreamActive: false,
        localPerceptionActive: false,
        liveAiSessionActive: false,
        voiceSessionActive: false,
        paused: false,
        reconnecting: false,
      };
      this.telemetry.setError(classified.message);
      this.publishState();
      return { ok: false, error: classified.message };
    }
  }

  /**
   * Immediately terminates all camera/screen tracks, audio tracks, WebSockets,
   * frame schedulers, timers, and offscreen canvases.
   */
  stop(): void {
    this.clearReconnectTimer();
    this.stopCaptureLoops();
    this.cancelInFlightAi();
    this.onlineProvider.disconnectLiveSession();
    this.audioBridge.stopAll();
    this.session.stop();

    if (this.videoElement) {
      try {
        this.videoElement.pause();
        this.videoElement.srcObject = null;
        this.videoElement.removeAttribute('src');
        this.videoElement.load();
      } catch {
        // ignore DOM teardown errors
      }
    }

    this.localProvider.reset();
    this.frameProcessor.dispose();
    this.memory.clear();
    this.telemetry.reset();

    this.status = {
      cameraConnected: false,
      videoStreamActive: false,
      localPerceptionActive: false,
      liveAiSessionActive: false,
      voiceSessionActive: false,
      paused: false,
      reconnecting: false,
    };

    this.store.reset();
  }

  pause(): void {
    if (!this.status.videoStreamActive) return;
    this.status.paused = true;
    this.localScheduler.pause();
    this.aiScheduler.pause();
    if (this.audioBridge.isMicActive()) {
      this.audioBridge.setMuted(true);
    }
    this.publishState();
  }

  resume(): void {
    if (!this.status.videoStreamActive) return;
    this.status.paused = false;
    this.pausedByVisibility = false;
    this.localScheduler.resume();
    this.aiScheduler.resume();
    if (this.audioBridge.isMicActive()) {
      this.audioBridge.setMuted(false);
    }
    this.publishState();
  }

  async setMode(mode: VisionOperatingMode): Promise<void> {
    this.mode = mode;
    if (mode === 'local_offline') {
      this.offlineMode = true;
    }
    this.applyModeSettings();

    if (!this.status.videoStreamActive) {
      this.publishState();
      return;
    }

    const preset = this.getEffectivePreset();
    if (this.offlineMode || !preset.enableOnlineAi) {
      this.stopLiveVoice();
      this.onlineProvider.disconnectLiveSession();
      this.status.liveAiSessionActive = false;
      this.telemetry.setProvider(
        this.localProvider.name,
        'local-cv',
        this.trackingEnabled ? 'local_only' : 'none'
      );
    } else if (preset.preferNativeLiveStream && this.serverCaps?.liveStreamAvailable) {
      await this.startLiveAiSession();
    } else if (this.serverCaps?.frameAnalysisAvailable) {
      this.onlineProvider.disconnectLiveSession();
      this.status.liveAiSessionActive = true;
      this.telemetry.setProvider(
        'ANNY Vision Core',
        this.serverCaps.frameAnalysisModel || 'gemini-4-hydrogen',
        'continuous_frame_analysis'
      );
    }

    this.publishState();
  }

  async setOfflineMode(offline: boolean): Promise<void> {
    this.offlineMode = offline;
    if (offline) {
      this.stopLiveVoice();
      this.onlineProvider.disconnectLiveSession();
      this.cancelInFlightAi();
      this.status.liveAiSessionActive = false;
      this.applyModeSettings();
      this.telemetry.setProvider(
        this.localProvider.name,
        'local-cv',
        this.trackingEnabled ? 'local_only' : 'none'
      );
      this.publishState();
      return;
    }

    this.serverCaps = await this.onlineProvider.checkServerCapabilities();
    await this.setMode(this.mode === 'local_offline' ? 'balanced' : this.mode);
  }

  setTrackingEnabled(enabled: boolean): void {
    this.trackingEnabled = enabled;
    this.status.localPerceptionActive = this.status.videoStreamActive && enabled;
    if (!enabled) {
      this.localProvider.reset();
    }
    this.publishState();
  }

  async setPoseEnabled(enabled: boolean): Promise<{ loaded: boolean; error?: string }> {
    this.poseEnabled = enabled;
    const res = await this.localProvider.setPoseEnabled(enabled);
    if (!res.loaded && res.error) {
      this.telemetry.setError(res.error);
    }
    this.publishState();
    return res;
  }

  async switchCameraFacing(): Promise<{ ok: boolean; error?: string }> {
    const nextFacing = this.facingMode === 'user' ? 'environment' : 'user';
    this.selectedDeviceId = undefined;
    return this.start({
      source: 'camera',
      facingMode: nextFacing,
      resolution: this.resolution,
    });
  }

  async selectDevice(deviceId: string): Promise<{ ok: boolean; error?: string }> {
    return this.start({
      source: 'camera',
      deviceId,
      resolution: this.resolution,
    });
  }

  async setResolution(resolution: VisionResolutionPreset): Promise<{ ok: boolean; error?: string }> {
    this.resolution = resolution;
    if (!this.status.videoStreamActive || this.session.getSource() !== 'camera') {
      this.publishState();
      return { ok: true };
    }
    return this.start({
      source: 'camera',
      deviceId: this.selectedDeviceId,
      facingMode: this.facingMode,
      resolution,
    });
  }

  /**
   * Starts simultaneous Live Voice + Live Vision over /api/vision/live (Gemini Live API).
   */
  async startLiveVoice(): Promise<{ ok: boolean; error?: string }> {
    if (this.offlineMode) {
      return { ok: false, error: 'Live Voice + Vision requires online mode (currently in Local Offline mode).' };
    }
    if (!this.status.videoStreamActive) {
      return { ok: false, error: 'Start Vision first before enabling Live Voice.' };
    }
    if (!this.onlineProvider.isLiveConnected()) {
      const connected = await this.startLiveAiSession();
      if (!connected) {
        return {
          ok: false,
          error: this.telemetry.getSnapshot().lastError || 'Live AI streaming session could not connect.',
        };
      }
    }

    try {
      await this.audioBridge.startMicrophone((pcm16Base64) => {
        this.onlineProvider.sendLiveAudioChunk(pcm16Base64);
      });
      this.status.voiceSessionActive = true;
      this.publishState();
      return { ok: true };
    } catch (err: any) {
      this.status.voiceSessionActive = false;
      const msg = err?.message || 'Unable to start live voice microphone.';
      this.telemetry.setError(msg);
      this.publishState();
      return { ok: false, error: msg };
    }
  }

  stopLiveVoice(): void {
    this.audioBridge.stopAll();
    this.status.voiceSessionActive = false;
    this.publishState();
  }

  /**
   * Sends a spoken or typed question directly into the active Live AI session,
   * or falls back to analyzing the latest live frame with temporal context.
   */
  async askAboutCurrentView(question: string): Promise<{ ok: boolean; answer?: string; error?: string }> {
    const cleanQ = question.trim();
    if (!cleanQ) return { ok: false, error: 'Empty question' };
    if (!this.status.videoStreamActive) {
      return { ok: false, error: 'Vision stream is not active.' };
    }
    if (this.offlineMode) {
      return {
        ok: true,
        answer: this.store.buildPromptContext(),
      };
    }

    if (this.onlineProvider.isLiveConnected()) {
      this.pushTranscript('user', cleanQ, true);
      this.onlineProvider.sendLiveTextPrompt(cleanQ);
      return { ok: true };
    }

    return this.analyzeCurrentSceneNow(cleanQ, 'snapshot');
  }

  /**
   * Captures a high-clarity JPEG frame from the active video element (for optional Snapshot action).
   */
  captureSnapshotJpeg(): EncodedFramePayload | null {
    if (!this.videoElement || !this.status.videoStreamActive) return null;
    const preset = this.getEffectivePreset();
    return this.frameProcessor.encodeVideoFrameToJpeg(this.videoElement, Math.max(768, preset.maxAiWidth), 0.85);
  }

  /**
   * Performs an explicit on-demand scene analysis using the latest frame + temporal context.
   */
  async analyzeCurrentSceneNow(
    promptText = 'Describe what is visible in the current scene, including key objects, text, movement, and any notable changes.',
    rawMode: 'continuous_frame_analysis' | 'snapshot' = 'snapshot'
  ): Promise<{ ok: boolean; answer?: string; error?: string }> {
    if (!this.status.videoStreamActive || !this.videoElement) {
      return { ok: false, error: 'Vision stream is not active.' };
    }
    if (this.offlineMode) {
      return {
        ok: false,
        error: 'Offline mode is active. Local motion/tracking is running, while cloud scene description is disabled.',
      };
    }
    const preset = this.getEffectivePreset();
    const encoded = this.frameProcessor.encodeVideoFrameToJpeg(
      this.videoElement,
      preset.maxAiWidth,
      preset.jpegQuality
    );
    if (!encoded) {
      return { ok: false, error: 'Video frame is not ready yet.' };
    }

    try {
      this.telemetry.setInFlightAi(true);
      this.publishState();
      const temporalContext = this.store.buildPromptContext();
      const obs = await this.onlineProvider.analyzeFrame({
        frame: encoded,
        prompt: promptText,
        temporalContext,
        mode: rawMode,
        structured: true,
      });
      this.memory.recordAiObservation(obs);
      if (obs.objects.length > 0) {
        this.localProvider.enrichTracksWithAiObjects(obs.objects, obs.timestamp);
      }
      this.telemetry.recordAiFrame(obs.latencyMs);
      this.telemetry.setProvider(obs.provider, obs.model, obs.transport);
      this.telemetry.setError(null);
      this.publishState();
      return { ok: true, answer: obs.description };
    } catch (err: any) {
      const msg = err?.message || 'Scene analysis failed.';
      this.telemetry.setError(msg);
      this.publishState();
      return { ok: false, error: msg };
    } finally {
      this.telemetry.setInFlightAi(false);
      this.publishState();
    }
  }

  /**
   * Direct synthetic RGBA frame entry point for deterministic unit/integration testing
   * and non-DOM pipelines.
   */
  async ingestSyntheticRgbaFrame(
    rgba: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    timestamp = Date.now(),
    optionalEncodedFrame?: EncodedFramePayload
  ): Promise<void> {
    this.status.cameraConnected = true;
    this.status.videoStreamActive = true;
    this.status.localPerceptionActive = this.trackingEnabled;

    const gray = this.frameProcessor.processRgbaBuffer(rgba, width, height, timestamp);
    this.telemetry.recordCapture(0.5, timestamp);
    await this.processLocalGrayFrame(gray, optionalEncodedFrame);
  }

  private async startLiveAiSession(): Promise<boolean> {
    if (this.offlineMode) return false;
    const connected = await this.onlineProvider.connectLiveSession({
      systemContext: this.store.buildPromptContext(),
      callbacks: {
        onConnected: (info) => {
          this.status.liveAiSessionActive = true;
          this.status.reconnecting = false;
          this.telemetry.setProvider(info.provider, info.model, info.transport);
          this.telemetry.setError(null);
          this.publishState();
        },
        onDisconnected: (reason) => {
          this.status.liveAiSessionActive = false;
          this.status.reconnecting = false;
          if (this.status.voiceSessionActive) {
            this.audioBridge.stopAll();
            this.status.voiceSessionActive = false;
          }
          // Fall back truthfully to local perception without stopping camera/local CV
          this.telemetry.setProvider(
            this.localProvider.name,
            'local-cv',
            this.trackingEnabled ? 'local_only' : 'none'
          );
          if (reason && reason !== 'Stopped by user') {
            this.telemetry.setError(`Live AI disconnected (${reason}). Local perception remains active.`);
          }
          this.publishState();
        },
        onReconnecting: (_attempt, _delayMs) => {
          this.status.reconnecting = true;
          this.status.liveAiSessionActive = false;
          this.telemetry.recordReconnect();
          this.publishState();
        },
        onAudioChunk: (pcm24k) => {
          this.audioBridge.enqueueOutputPcm24k(pcm24k);
        },
        onInputTranscript: (text, isFinal) => {
          this.pushTranscript('user', text, isFinal);
        },
        onOutputTranscript: (text, isFinal) => {
          this.pushTranscript('assistant', text, isFinal);
        },
        onObservation: (obs) => {
          this.memory.recordAiObservation(obs);
          this.telemetry.recordAiFrame(obs.latencyMs || 120);
          this.publishState();
        },
        onInterrupted: () => {
          this.audioBridge.interruptPlayback();
        },
        onError: (errMsg) => {
          this.telemetry.setError(errMsg);
          this.publishState();
        },
      },
    });
    return connected;
  }

  private pushTranscript(role: 'user' | 'assistant' | 'system', text: string, final: boolean): void {
    const clean = text.trim();
    if (!clean) return;
    const entry: VisionTranscriptEntry = {
      id: `tr_${this.transcriptSeq++}`,
      role,
      text: clean,
      timestamp: Date.now(),
      final,
    };
    this.transcripts.push(entry);
    if (this.transcripts.length > 24) {
      this.transcripts.splice(0, this.transcripts.length - 24);
    }
    this.onTranscriptCallback?.(entry);
    this.publishState();
  }

  private getEffectivePreset() {
    if (this.offlineMode) return VISION_MODE_PRESETS.local_offline;
    return VISION_MODE_PRESETS[this.mode];
  }

  private applyModeSettings(): void {
    const preset = this.getEffectivePreset();
    this.localScheduler.setTargetFps(this.trackingEnabled ? preset.targetLocalFps : 0);
    this.aiScheduler.setTargetFps(this.offlineMode ? 0 : preset.targetAiFps);
    this.telemetry.setTargets(preset.targetLocalFps, this.offlineMode ? 0 : preset.targetAiFps);
  }

  private startCaptureLoops(): void {
    this.stopCaptureLoops();
    this.localScheduler.start();
    this.aiScheduler.start();

    // 66ms tick (~15Hz max local sampling); schedulers enforce exact adaptive FPS & backpressure
    this.captureLoopTimer = setInterval(() => {
      if (!this.status.videoStreamActive || this.status.paused) return;
      if (!this.videoElement || this.videoElement.readyState < 2 || this.videoElement.paused) return;

      const now = Date.now();
      const capStart = typeof performance !== 'undefined' ? performance.now() : now;
      const gray = this.frameProcessor.extractGrayFrameFromVideo(this.videoElement, now);
      if (!gray) return;

      const capMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - capStart;
      this.telemetry.recordCapture(capMs, now);

      if (this.trackingEnabled) {
        this.localScheduler.submit(gray, 'normal', now);
      }

      if (this.poseEnabled) {
        void this.localProvider.sendVideoToPose(this.videoElement);
      }

      // Online AI frame dispatch (either Live WebSocket <= 1 FPS OR continuous frame analysis)
      const preset = this.getEffectivePreset();
      if (!this.offlineMode && preset.enableOnlineAi) {
        if (this.onlineProvider.isLiveConnected()) {
          const encoded = this.frameProcessor.encodeVideoFrameToJpeg(
            this.videoElement,
            preset.maxAiWidth,
            preset.jpegQuality,
            now
          );
          if (encoded) {
            const sent = this.onlineProvider.sendLiveVideoFrame(encoded);
            if (sent) {
              this.telemetry.recordAiFrame(encoded.captureLatencyMs, now);
            }
          }
        } else if (this.status.liveAiSessionActive && this.serverCaps?.frameAnalysisAvailable) {
          const minInterval = this.aiScheduler.getMinIntervalMs();
          const stats = this.aiScheduler.getStats();
          if (!stats.inFlight && Number.isFinite(minInterval)) {
            const encoded = this.frameProcessor.encodeVideoFrameToJpeg(
              this.videoElement,
              preset.maxAiWidth,
              preset.jpegQuality,
              now
            );
            if (encoded) {
              this.aiScheduler.submit({ frame: encoded, reason: 'periodic' }, 'normal', now);
            }
          }
        }
      }
    }, 66);
  }

  private stopCaptureLoops(): void {
    if (this.captureLoopTimer) {
      clearInterval(this.captureLoopTimer);
      this.captureLoopTimer = null;
    }
    this.localScheduler.stop();
    this.aiScheduler.stop();
  }

  private cancelInFlightAi(): void {
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {}
      this.activeAbortController = null;
    }
  }

  private async processLocalGrayFrame(
    gray: ProcessedGrayFrame,
    optionalEncodedFrame?: EncodedFramePayload
  ): Promise<void> {
    const res = this.localProvider.processFrame(gray);
    this.memory.recordFramePerception(res.motion, res.tracks, res.events);
    this.telemetry.recordLocalFrame(res.latencyMs, gray.timestamp);

    // Trigger priority event frame to online AI on significant scene change (rate-limited)
    const preset = this.getEffectivePreset();
    if (
      res.motion.sceneChanged &&
      !this.offlineMode &&
      preset.enableOnlineAi &&
      gray.timestamp - this.lastSceneChangeAiTriggerAt > 3500
    ) {
      this.lastSceneChangeAiTriggerAt = gray.timestamp;
      const encoded =
        optionalEncodedFrame ||
        (this.videoElement
          ? this.frameProcessor.encodeVideoFrameToJpeg(this.videoElement, preset.maxAiWidth, preset.jpegQuality, gray.timestamp)
          : null);
      if (encoded) {
        if (this.onlineProvider.isLiveConnected()) {
          this.onlineProvider.sendLiveVideoFrame(encoded);
        } else if (this.status.liveAiSessionActive) {
          this.aiScheduler.submit({ frame: encoded, reason: 'scene_change' }, 'event', gray.timestamp);
        }
      }
    }

    this.publishState(res.motion, res.pose);
  }

  private async processAiFrame(frame: EncodedFramePayload, reason: string): Promise<void> {
    if (this.offlineMode || !this.status.videoStreamActive || this.status.paused) return;

    this.cancelInFlightAi();
    const controller = new AbortController();
    this.activeAbortController = controller;
    this.telemetry.setInFlightAi(true);
    this.publishState();

    try {
      const prompt =
        reason === 'scene_change'
          ? 'A significant visual scene change just occurred. Briefly describe what changed and list clearly visible objects.'
          : 'Briefly describe the live scene, any visible objects, text, or ongoing activity. Keep it factual and concise.';
      const obs = await this.onlineProvider.analyzeFrame({
        frame,
        prompt,
        temporalContext: this.store.buildPromptContext(),
        mode: 'continuous_frame_analysis',
        structured: true,
        signal: controller.signal,
      });

      this.memory.recordAiObservation(obs);
      if (obs.objects.length > 0) {
        this.localProvider.enrichTracksWithAiObjects(obs.objects, obs.timestamp);
      }
      this.telemetry.recordAiFrame(obs.latencyMs, obs.timestamp);
      this.telemetry.setProvider(obs.provider, obs.model, obs.transport);
      this.telemetry.setError(null);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const msg = err?.message || 'Continuous frame analysis failed.';
      // Keep local perception alive; degrade online status truthfully
      this.telemetry.setError(`${msg} Local motion & tracking continues.`);
    } finally {
      this.telemetry.setInFlightAi(false);
      if (this.activeAbortController === controller) {
        this.activeAbortController = null;
      }
      this.publishState();
    }
  }

  private handleUnexpectedStreamEnd(reason: string): void {
    const source = this.session.getSource();
    this.status.cameraConnected = false;
    this.status.videoStreamActive = false;
    this.status.localPerceptionActive = false;
    this.telemetry.setError(reason);

    // Attempt camera auto-reconnect up to 2 times (do not auto-prompt screen share)
    if (source === 'camera' && this.streamReconnectAttempts < 2) {
      this.streamReconnectAttempts += 1;
      this.status.reconnecting = true;
      this.telemetry.recordReconnect();
      this.publishState();

      this.reconnectCameraTimer = setTimeout(() => {
        void this.start({
          source: 'camera',
          facingMode: this.facingMode,
          resolution: this.resolution,
        });
      }, 1800);
      return;
    }

    this.status.reconnecting = false;
    this.stopCaptureLoops();
    this.publishState();
  }

  private handleVisibilityChange(hidden: boolean): void {
    if (!this.status.videoStreamActive) return;
    if (hidden && !this.status.paused) {
      this.pausedByVisibility = true;
      this.pause();
    } else if (!hidden && this.pausedByVisibility) {
      this.pausedByVisibility = false;
      this.resume();
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectCameraTimer) {
      clearTimeout(this.reconnectCameraTimer);
      this.reconnectCameraTimer = null;
    }
  }

  private getActiveTransport(): VisionAnalysisTransport {
    if (!this.status.videoStreamActive) return 'none';
    if (!this.offlineMode && this.onlineProvider.isLiveConnected()) return 'native_live_stream';
    if (!this.offlineMode && this.status.liveAiSessionActive) return 'continuous_frame_analysis';
    if (this.status.localPerceptionActive) return 'local_only';
    return 'none';
  }

  private buildCapabilityReport(): VisionCapabilityReport {
    const localCaps = this.localProvider.getCapabilities();
    const transport = this.getActiveTransport();
    const limitations = [...localCaps.limitations];
    if (this.offlineMode) {
      limitations.push('Offline mode is enabled: cloud AI vision and live voice streaming are disabled.');
    } else if (this.serverCaps && !this.serverCaps.liveStreamAvailable && !this.serverCaps.frameAnalysisAvailable) {
      limitations.push('Online AI vision models are not configured on the server; running local perception only.');
    }
    if (this.serverCaps?.limitations?.length) {
      limitations.push(...this.serverCaps.limitations);
    }

    return {
      cameraAvailable: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
      screenShareAvailable: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia),
      videoFileAnalysisAvailable: typeof document !== 'undefined',
      localMotionTrackingAvailable: localCaps.motionTrackingAvailable,
      localPoseAvailable: localCaps.poseAvailable,
      localPoseLoaded: localCaps.poseLoaded,
      localObjectClassifierLoaded: localCaps.objectClassifierLoaded,
      onlineLiveStreamAvailable: Boolean(!this.offlineMode && this.serverCaps?.liveStreamAvailable),
      onlineFrameAnalysisAvailable: Boolean(!this.offlineMode && this.serverCaps?.frameAnalysisAvailable),
      localVlmAvailable: Boolean(this.serverCaps?.localVlmAvailable),
      offlineMode: this.offlineMode,
      activeTransport: transport,
      limitations: Array.from(new Set(limitations)),
    };
  }

  private publishState(latestMotion?: any, latestPose?: any): void {
    const latestObs = this.memory.getLatestObservation();
    const telemetrySnap = this.telemetry.getSnapshot();
    const transport = this.getActiveTransport();

    this.store.update({
      status: { ...this.status },
      source: this.session.getSource(),
      mode: this.mode,
      activeTransport: transport,
      activeProvider: telemetrySnap.activeProvider,
      activeModel: telemetrySnap.activeModel,
      latestSceneDescription: latestObs?.description || null,
      latestSceneUpdatedAt: latestObs?.timestamp || null,
      trackedEntities: this.memory.getActiveTracks(),
      aiObjects: this.memory.getRecentObjects(),
      latestMotion: latestMotion !== undefined ? latestMotion : this.store.getState().latestMotion,
      latestPose: latestPose !== undefined ? latestPose : this.store.getState().latestPose,
      recentEvents: this.memory.getRecentEvents(12),
      recentTranscripts: [...this.transcripts],
      capabilities: this.buildCapabilityReport(),
      telemetry: telemetrySnap,
    });
  }

  getActiveTrackCount(): number {
    return this.session.getActiveTrackCount();
  }

  getMemoryCounts() {
    return this.memory.getCounts();
  }

  getSchedulerStats() {
    return {
      local: this.localScheduler.getStats(),
      ai: this.aiScheduler.getStats(),
    };
  }
}

export const liveVisionController = new LiveVisionController();

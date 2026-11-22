/**
 * ANNY — LOCAL OFFLINE VISION PROVIDER ("ROBOT EYES")
 * Runs 100% locally without any cloud API or network connectivity:
 *  - Pixel-level optical flow & camera-motion-compensated differencing (MotionAnalysisEngine)
 *  - Multi-frame persistent object/region tracking (ObjectTrackingEngine)
 *  - Optional on-demand browser-local MediaPipe Pose detection (lazy loaded, truthful fallback)
 *
 * Strictly honest: never fabricates semantic object classes or scene descriptions.
 */

import { MotionAnalysisEngine } from './MotionAnalysisEngine';
import { ObjectTrackingEngine } from './ObjectTrackingEngine';
import type { LocalFramePerceptionResult, LocalVisionCapabilities } from './VisionProvider';
import type {
  AiDetectedObject,
  LocalPoseResult,
  NormalizedBox,
  PoseLandmark2D,
  ProcessedGrayFrame,
} from './types';

export class LocalVisionProvider {
  readonly id = 'local_robot_eyes';
  readonly name = 'Local Robot Eyes (Offline CV)';

  private readonly motionEngine: MotionAnalysisEngine;
  private readonly trackingEngine: ObjectTrackingEngine;

  private poseEnabled = false;
  private poseLoaded = false;
  private poseLoading = false;
  private poseError: string | null = null;
  private poseInstance: any = null;
  private latestPose: LocalPoseResult | null = null;
  private poseInFlight = false;

  constructor() {
    this.motionEngine = new MotionAnalysisEngine();
    this.trackingEngine = new ObjectTrackingEngine();
  }

  /**
   * Processes one grayscale frame locally through motion analysis & multi-frame tracking.
   * Works synchronously and deterministically in both browsers and Node.js.
   */
  processFrame(frame: ProcessedGrayFrame): LocalFramePerceptionResult {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const motion = this.motionEngine.analyze(frame);

    // Expire pose if older than 1.5s
    const activePose =
      this.poseEnabled &&
      this.latestPose &&
      frame.timestamp - this.latestPose.timestamp <= 1500
        ? this.latestPose
        : null;

    const observations = ObjectTrackingEngine.fromLocalInputs(motion.regions, activePose);
    const { tracks, events } = this.trackingEngine.update(observations, frame.timestamp);
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();

    return {
      motion,
      tracks,
      events,
      pose: activePose,
      latencyMs: Math.max(0, Number((end - start).toFixed(2))),
    };
  }

  /**
   * Enriches active local motion tracks with semantic labels returned by online/local VLM.
   */
  enrichTracksWithAiObjects(objects: AiDetectedObject[], timestamp = Date.now()) {
    return this.trackingEngine.enrichWithAiObjects(objects, timestamp);
  }

  /**
   * Lazily initializes @mediapipe/pose on explicit user opt-in (browser only).
   * Reports honest failure if offline CDN assets or browser support are unavailable.
   */
  async setPoseEnabled(enabled: boolean): Promise<{ loaded: boolean; error?: string }> {
    this.poseEnabled = enabled;
    if (!enabled) {
      this.latestPose = null;
      return { loaded: this.poseLoaded };
    }

    if (this.poseLoaded && this.poseInstance) {
      return { loaded: true };
    }
    if (this.poseLoading) {
      return { loaded: false };
    }
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      this.poseError = 'Local pose estimation requires a browser environment.';
      return { loaded: false, error: this.poseError };
    }

    this.poseLoading = true;
    this.poseError = null;
    try {
      const mp = await import('@mediapipe/pose');
      const PoseCtor = (mp as any).Pose || (window as any).Pose;
      if (!PoseCtor) {
        throw new Error('MediaPipe Pose constructor unavailable in current bundle.');
      }

      const pose = new PoseCtor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      pose.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
      pose.onResults((results: any) => {
        const lms = results?.poseLandmarks;
        if (!Array.isArray(lms) || lms.length === 0) {
          this.latestPose = {
            detected: false,
            landmarks: [],
            confidence: 0,
            timestamp: Date.now(),
          };
          return;
        }

        const landmarks: PoseLandmark2D[] = lms.map((lm: any) => ({
          x: Math.max(0, Math.min(1, Number(lm.x) || 0)),
          y: Math.max(0, Math.min(1, Number(lm.y) || 0)),
          visibility: Math.max(0, Math.min(1, Number(lm.visibility ?? 0.5))),
        }));

        const visible = landmarks.filter((l) => l.visibility >= 0.45);
        if (visible.length < 4) {
          this.latestPose = {
            detected: false,
            landmarks,
            confidence: 0,
            timestamp: Date.now(),
          };
          return;
        }

        let minX = 1;
        let minY = 1;
        let maxX = 0;
        let maxY = 0;
        let visSum = 0;
        for (const lm of visible) {
          if (lm.x < minX) minX = lm.x;
          if (lm.y < minY) minY = lm.y;
          if (lm.x > maxX) maxX = lm.x;
          if (lm.y > maxY) maxY = lm.y;
          visSum += lm.visibility;
        }

        const padX = 0.03;
        const padY = 0.04;
        const bx = Math.max(0, minX - padX);
        const by = Math.max(0, minY - padY);
        const bw = Math.min(1 - bx, maxX - minX + padX * 2);
        const bh = Math.min(1 - by, maxY - minY + padY * 2);
        const box: NormalizedBox = {
          x: Number(bx.toFixed(4)),
          y: Number(by.toFixed(4)),
          w: Number(Math.max(0.05, bw).toFixed(4)),
          h: Number(Math.max(0.08, bh).toFixed(4)),
        };

        this.latestPose = {
          detected: true,
          landmarks,
          box,
          confidence: Number((visSum / visible.length).toFixed(3)),
          timestamp: Date.now(),
        };
      });

      this.poseInstance = pose;
      this.poseLoaded = true;
      return { loaded: true };
    } catch (err: any) {
      this.poseEnabled = false;
      this.poseLoaded = false;
      this.poseError = err?.message || 'Unable to load local MediaPipe Pose model.';
      return { loaded: false, error: this.poseError };
    } finally {
      this.poseLoading = false;
    }
  }

  /**
   * Feeds a live HTMLVideoElement into optional MediaPipe Pose when loaded (non-blocking).
   */
  async sendVideoToPose(video: HTMLVideoElement): Promise<void> {
    if (!this.poseEnabled || !this.poseLoaded || !this.poseInstance || this.poseInFlight) {
      return;
    }
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    this.poseInFlight = true;
    try {
      await this.poseInstance.send({ image: video });
    } catch (err: any) {
      this.poseError = err?.message || 'Pose inference error';
      this.poseEnabled = false;
    } finally {
      this.poseInFlight = false;
    }
  }

  getCapabilities(): LocalVisionCapabilities {
    const isBrowser = typeof window !== 'undefined';
    const limitations: string[] = [
      'Local offline mode tracks pixel motion, camera pan, scene changes, and persistent moving regions without cloud APIs.',
      'Local semantic object classification (e.g., naming arbitrary objects or reading small text) is not installed locally and requires an online AI provider or local Ollama vision model.',
    ];
    if (this.poseError) {
      limitations.push(`Local pose model notice: ${this.poseError}`);
    }
    return {
      motionTrackingAvailable: true,
      poseAvailable: isBrowser,
      poseLoaded: this.poseLoaded,
      objectClassifierLoaded: false,
      limitations,
    };
  }

  reset(): void {
    this.motionEngine.reset();
    this.trackingEngine.reset();
    this.latestPose = null;
  }

  dispose(): void {
    this.reset();
    if (this.poseInstance && typeof this.poseInstance.close === 'function') {
      try {
        this.poseInstance.close();
      } catch {
        // ignore close errors
      }
    }
    this.poseInstance = null;
    this.poseLoaded = false;
    this.poseEnabled = false;
  }
}

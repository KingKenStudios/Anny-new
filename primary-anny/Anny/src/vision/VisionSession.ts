/**
 * ANNY — VISION SESSION & HARDWARE MEDIA LIFECYCLE MANAGER
 * Manages camera streams, front/rear switching, USB device selection,
 * screen sharing, uploaded video file playback, mobile background pause/resume,
 * unexpected track disconnect detection, and guaranteed zero-leak teardown.
 */

import {
  RESOLUTION_CONSTRAINTS,
  type VisionDeviceInfo,
  type VisionInputSource,
  type VisionResolutionPreset,
} from './types';

export interface MediaDevicesLike {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  getDisplayMedia?: (constraints?: DisplayMediaStreamOptions) => Promise<MediaStream>;
  enumerateDevices?: () => Promise<MediaDeviceInfo[]>;
}

export interface VisionSessionCallbacks {
  onStreamEnded?: (reason: string) => void;
  onVisibilityChange?: (hidden: boolean) => void;
}

export interface StartMediaOptions {
  source: VisionInputSource;
  deviceId?: string;
  facingMode?: 'user' | 'environment';
  resolution?: VisionResolutionPreset;
  videoFile?: File;
}

export function classifyCameraError(err: any): {
  code: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'IN_USE' | 'UNSUPPORTED' | 'OVERCONSTRAINED' | 'UNKNOWN';
  message: string;
} {
  const name = String(err?.name || '');
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return {
      code: 'PERMISSION_DENIED',
      message: 'Camera or screen permission was denied. Grant access in your browser site settings and retry.',
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      code: 'NOT_FOUND',
      message: 'No compatible camera device was found on this system.',
    };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      code: 'IN_USE',
      message: 'Camera is currently in use by another application or could not be opened.',
    };
  }
  if (name === 'OverconstrainedError') {
    return {
      code: 'OVERCONSTRAINED',
      message: 'Requested camera resolution or device is unsupported; retrying with standard constraints.',
    };
  }
  if (name === 'AbortError') {
    return {
      code: 'UNKNOWN',
      message: 'Media capture request was canceled.',
    };
  }
  if (String(err?.message || '').toLowerCase().includes('not supported')) {
    return {
      code: 'UNSUPPORTED',
      message: String(err.message),
    };
  }
  return {
    code: 'UNKNOWN',
    message: err?.message || 'Unable to access camera or media source.',
  };
}

export class VisionSession {
  private stream: MediaStream | null = null;
  private videoObjectUrl: string | null = null;
  private currentSource: VisionInputSource | null = null;
  private currentDeviceId: string | undefined;
  private currentFacingMode: 'user' | 'environment' = 'environment';
  private currentResolution: VisionResolutionPreset = 'medium';
  private callbacks: VisionSessionCallbacks;
  private mediaDevicesProvider: () => MediaDevicesLike | undefined;
  private visibilityListenerBound: (() => void) | null = null;
  private activeTrackCount = 0;

  constructor(
    callbacks: VisionSessionCallbacks = {},
    mediaDevicesProvider?: () => MediaDevicesLike | undefined
  ) {
    this.callbacks = callbacks;
    this.mediaDevicesProvider =
      mediaDevicesProvider ||
      (() => (typeof navigator !== 'undefined' ? (navigator.mediaDevices as MediaDevicesLike | undefined) : undefined));
  }

  async listVideoDevices(): Promise<VisionDeviceInfo[]> {
    const md = this.mediaDevicesProvider();
    if (!md?.enumerateDevices) return [];
    try {
      const devices = await md.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, idx) => {
          const label = d.label || `Camera ${idx + 1}`;
          const lower = label.toLowerCase();
          const facingMode =
            lower.includes('back') || lower.includes('rear') || lower.includes('environment')
              ? 'environment'
              : lower.includes('front') || lower.includes('user') || lower.includes('facetime')
                ? 'user'
                : 'unknown';
          return {
            deviceId: d.deviceId,
            label,
            facingMode,
          };
        });
    } catch {
      return [];
    }
  }

  async start(options: StartMediaOptions): Promise<{
    stream: MediaStream | null;
    videoUrl: string | null;
    source: VisionInputSource;
    facingMode: 'user' | 'environment';
    deviceId?: string;
  }> {
    // Always stop previous stream first so tracks never leak
    this.stop();

    const md = this.mediaDevicesProvider();
    this.currentSource = options.source;
    this.currentFacingMode = options.facingMode || this.currentFacingMode;
    this.currentResolution = options.resolution || this.currentResolution;
    this.currentDeviceId = options.deviceId;

    if (options.source === 'video_file') {
      if (!options.videoFile) {
        throw new Error('No video file was provided for playback analysis.');
      }
      if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
        throw new Error('Video file playback is unsupported in this runtime.');
      }
      this.videoObjectUrl = URL.createObjectURL(options.videoFile);
      this.attachVisibilityListener();
      return {
        stream: null,
        videoUrl: this.videoObjectUrl,
        source: 'video_file',
        facingMode: this.currentFacingMode,
      };
    }

    if (options.source === 'screen') {
      if (!md?.getDisplayMedia) {
        throw new Error('Screen sharing (getDisplayMedia) is not supported on this browser or device.');
      }
      const stream = await md.getDisplayMedia({
        video: {
          frameRate: { ideal: 15, max: 30 },
        },
        audio: false,
      });
      this.bindStream(stream);
      return {
        stream,
        videoUrl: null,
        source: 'screen',
        facingMode: 'environment',
      };
    }

    // Camera source
    if (!md?.getUserMedia) {
      throw new Error('Camera access (getUserMedia) is not supported in this browser.');
    }

    const res = RESOLUTION_CONSTRAINTS[this.currentResolution];
    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: res.width },
      height: { ideal: res.height },
      frameRate: { ideal: 24, max: 30 },
    };
    if (options.deviceId) {
      videoConstraints.deviceId = { exact: options.deviceId };
    } else {
      videoConstraints.facingMode = { ideal: this.currentFacingMode };
    }

    let stream: MediaStream;
    try {
      stream = await md.getUserMedia({ video: videoConstraints, audio: false });
    } catch (err: any) {
      // Fallback to unconstrained camera if exact device/resolution failed
      if (err?.name === 'OverconstrainedError' || err?.name === 'ConstraintNotSatisfiedError') {
        stream = await md.getUserMedia({ video: true, audio: false });
      } else {
        throw err;
      }
    }

    this.bindStream(stream);

    const videoTrack = stream.getVideoTracks()[0];
    const settings = typeof videoTrack?.getSettings === 'function' ? videoTrack.getSettings() : {};
    const resolvedDeviceId = settings.deviceId || options.deviceId;
    const resolvedFacing =
      settings.facingMode === 'user' || settings.facingMode === 'environment'
        ? settings.facingMode
        : this.currentFacingMode;

    this.currentDeviceId = resolvedDeviceId;
    this.currentFacingMode = resolvedFacing;

    return {
      stream,
      videoUrl: null,
      source: 'camera',
      facingMode: resolvedFacing,
      deviceId: resolvedDeviceId,
    };
  }

  private bindStream(stream: MediaStream): void {
    this.stream = stream;
    const tracks = stream.getTracks();
    this.activeTrackCount = tracks.length;
    for (const track of tracks) {
      track.onended = () => {
        if (this.stream === stream) {
          this.activeTrackCount = Math.max(0, this.activeTrackCount - 1);
          this.callbacks.onStreamEnded?.(
            this.currentSource === 'screen'
              ? 'Screen share ended.'
              : 'Camera device disconnected or stream ended.'
          );
        }
      };
    }
    this.attachVisibilityListener();
  }

  private attachVisibilityListener(): void {
    if (typeof document === 'undefined' || this.visibilityListenerBound) return;
    this.visibilityListenerBound = () => {
      this.callbacks.onVisibilityChange?.(document.hidden);
    };
    document.addEventListener('visibilitychange', this.visibilityListenerBound);
  }

  private detachVisibilityListener(): void {
    if (typeof document !== 'undefined' && this.visibilityListenerBound) {
      document.removeEventListener('visibilitychange', this.visibilityListenerBound);
      this.visibilityListenerBound = null;
    }
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  getSource(): VisionInputSource | null {
    return this.currentSource;
  }

  getFacingMode(): 'user' | 'environment' {
    return this.currentFacingMode;
  }

  getDeviceId(): string | undefined {
    return this.currentDeviceId;
  }

  getResolution(): VisionResolutionPreset {
    return this.currentResolution;
  }

  getActiveTrackCount(): number {
    if (!this.stream) return 0;
    return this.stream.getTracks().filter((t) => t.readyState !== 'ended').length;
  }

  /**
   * Immediately terminates all camera/screen tracks, object URLs, and listeners.
   */
  stop(): void {
    this.detachVisibilityListener();
    if (this.stream) {
      const tracks = this.stream.getTracks();
      for (const track of tracks) {
        try {
          track.onended = null;
          track.stop();
        } catch {
          // ignore
        }
      }
      this.stream = null;
    }
    this.activeTrackCount = 0;

    if (this.videoObjectUrl) {
      try {
        URL.revokeObjectURL(this.videoObjectUrl);
      } catch {
        // ignore
      }
      this.videoObjectUrl = null;
    }
    this.currentSource = null;
  }
}

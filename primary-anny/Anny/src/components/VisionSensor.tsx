/**
 * ANNY — REAL-TIME LIVE VISION & ROBOT EYES SENSOR UI
 * Integrated directly into ANNY's workspace (never a disconnected demo).
 *
 * Truthful Architecture:
 *  - Explicit user consent required to start camera, screen share, or video file analysis.
 *  - Separated runtime status flags: CAMERA CONNECTED, VIDEO STREAM ACTIVE,
 *    LOCAL PERCEPTION ACTIVE, LIVE AI SESSION ACTIVE, VOICE SESSION ACTIVE.
 *  - Synchronized HTML5 <canvas> overlay rendering ONLY real tracks, motion vectors,
 *    pose skeletons, camera-pan indicators, and scene-change events.
 *  - Supports continuous local offline perception ("Robot Eyes"), continuous frame analysis,
 *    and server-side Gemini Live WebSocket streaming + simultaneous voice conversation.
 *  - Immediate complete teardown of tracks, sockets, audio, and timers on Stop/Close/Unmount.
 */

import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import {
  Activity,
  AlertTriangle,
  Camera,
  Eye,
  EyeOff,
  Film,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  Pause,
  Play,
  Power,
  Radio,
  RefreshCw,
  ScanEye,
  ShieldAlert,
  Sparkles,
  Square,
  SwitchCamera,
  WifiOff,
  X,
} from 'lucide-react';
import {
  liveVisionController,
  renderVisionOverlay,
  RESOLUTION_CONSTRAINTS,
  type SharedPerceptionState,
  type VisionDeviceInfo,
  type VisionOperatingMode,
  type VisionResolutionPreset,
  type VisionTranscriptEntry,
} from '../vision';

interface VisionSensorProps {
  onCapture: (base64Image: string) => void;
  onAnalyze?: (base64Image: string) => void;
  onClose?: () => void;
  onLiveTranscript?: (entry: VisionTranscriptEntry) => void;
  isGuidanceActive?: boolean;
  isStealth?: boolean;
  isAnalyzing?: boolean;
  /** Opening Vision starts the authorized camera immediately; set false only for explicit non-camera embeds. */
  autoStart?: boolean;
}

export interface VisionSensorRef {
  captureFrame: () => string | null;
  stopAll: () => void;
}

const MODE_LABELS: Record<VisionOperatingMode, string> = {
  continuous_live: 'Live Stream (Gemini Live)',
  balanced: 'Balanced (Continuous Frame)',
  low_bandwidth: 'Low Bandwidth',
  high_quality: 'High Quality Live',
  local_offline: 'Local Offline (Robot Eyes)',
  on_demand: 'On-Demand Analysis',
};

const VisionSensor = forwardRef<VisionSensorRef, VisionSensorProps>(
  ({ onCapture, onAnalyze, onClose, onLiveTranscript, isAnalyzing = false, autoStart = true }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [perception, setPerception] = useState<SharedPerceptionState>(() => liveVisionController.getState());
    const [devices, setDevices] = useState<VisionDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [resolution, setResolution] = useState<VisionResolutionPreset>('medium');
    const [mode, setMode] = useState<VisionOperatingMode>('balanced');
    const [offlineMode, setOfflineMode] = useState<boolean>(false);
    const [trackingEnabled, setTrackingEnabled] = useState<boolean>(true);
    const [poseEnabled, setPoseEnabled] = useState<boolean>(false);
    const [showOverlay, setShowOverlay] = useState<boolean>(true);
    const [isMirrored, setIsMirrored] = useState<boolean>(false);
    const [isMinimized, setIsMinimized] = useState<boolean>(false);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [isBusy, setIsBusy] = useState<boolean>(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState<boolean>(true);

    const perceptionRef = useRef(perception);
    perceptionRef.current = perception;

    const lastTranscriptIdRef = useRef<string | null>(null);
    const onLiveTranscriptRef = useRef(onLiveTranscript);
    onLiveTranscriptRef.current = onLiveTranscript;
    const autoStartAttemptedRef = useRef(false);

    // Keep the subscription stable: parent rerenders (including chat typing) must
    // never tear down an active camera session just because a callback changed.
    useEffect(() => {
      const unsubscribe = liveVisionController.subscribe((nextState) => {
        setPerception(nextState);
        if (onLiveTranscriptRef.current && nextState.recentTranscripts.length > 0) {
          const latest = nextState.recentTranscripts[nextState.recentTranscripts.length - 1];
          if (latest.final && latest.id !== lastTranscriptIdRef.current) {
            lastTranscriptIdRef.current = latest.id;
            onLiveTranscriptRef.current(latest);
          }
        }
      });

      void liveVisionController.refreshCapabilities();
      void liveVisionController.refreshDevices().then(setDevices);

      return () => {
        unsubscribe();
        liveVisionController.stop();
      };
    }, []);

    useEffect(() => {
      liveVisionController.attachVideoElement(videoRef.current);
    }, [isMinimized, isExpanded]);

    // Vision activation is the user's explicit opt-in. Start camera as soon as
    // this panel mounts, rather than requiring a second "Start" interaction.
    useEffect(() => {
      if (!autoStart || autoStartAttemptedRef.current) return;
      autoStartAttemptedRef.current = true;
      let cancelled = false;
      const activate = async () => {
        setIsBusy(true);
        setLocalError(null);
        liveVisionController.attachVideoElement(videoRef.current);
        const res = await liveVisionController.start({
          source: 'camera',
          resolution,
          mode,
          offline: offlineMode,
        });
        if (cancelled) return;
        if (!res.ok && res.error) setLocalError(res.error);
        else void liveVisionController.refreshDevices().then((list) => {
          if (!cancelled) setDevices(list);
        });
        setIsBusy(false);
      };
      void activate();
      return () => { cancelled = true; };
    }, [autoStart]);

    // Synchronized overlay rendering loop (runs smoothly on rAF without blocking video)
    useEffect(() => {
      let rafId = 0;
      const draw = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          if (showOverlay && perceptionRef.current.status.videoStreamActive) {
            renderVisionOverlay(canvas, videoRef.current, perceptionRef.current, {
              mirrored: isMirrored && perceptionRef.current.source === 'camera',
              showBoxes: trackingEnabled,
              showMotionVectors: trackingEnabled,
              showPose: poseEnabled,
              showHud: true,
              fitMode: perceptionRef.current.source === 'screen' ? 'contain' : 'cover',
            });
          } else {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
        rafId = requestAnimationFrame(draw);
      };
      rafId = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(rafId);
    }, [showOverlay, trackingEnabled, poseEnabled, isMirrored]);

    useImperativeHandle(ref, () => ({
      captureFrame: () => {
        const snap = liveVisionController.captureSnapshotJpeg();
        return snap ? snap.base64 : null;
      },
      stopAll: () => {
        liveVisionController.stop();
      },
    }));

    const handleStartCamera = async () => {
      setIsBusy(true);
      setLocalError(null);
      try {
        liveVisionController.attachVideoElement(videoRef.current);
        const res = await liveVisionController.start({
          source: 'camera',
          deviceId: selectedDeviceId || undefined,
          resolution,
          mode,
          offline: offlineMode,
        });
        if (!res.ok && res.error) {
          setLocalError(res.error);
        } else {
          const list = await liveVisionController.refreshDevices();
          setDevices(list);
        }
      } finally {
        setIsBusy(false);
      }
    };

    const handleStartScreen = async () => {
      setIsBusy(true);
      setLocalError(null);
      try {
        liveVisionController.attachVideoElement(videoRef.current);
        const res = await liveVisionController.start({
          source: 'screen',
          mode,
          offline: offlineMode,
        });
        if (!res.ok && res.error) {
          setLocalError(res.error);
        }
      } finally {
        setIsBusy(false);
      }
    };

    const handleVideoFileSelected = async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const file = ev.target.files?.[0];
      ev.target.value = '';
      if (!file) return;
      setIsBusy(true);
      setLocalError(null);
      try {
        liveVisionController.attachVideoElement(videoRef.current);
        const res = await liveVisionController.start({
          source: 'video_file',
          videoFile: file,
          mode,
          offline: offlineMode,
        });
        if (!res.ok && res.error) {
          setLocalError(res.error);
        }
      } finally {
        setIsBusy(false);
      }
    };

    const handleStop = () => {
      liveVisionController.stop();
      setLocalError(null);
    };

    const handleClose = () => {
      liveVisionController.stop();
      if (onClose) onClose();
    };

    const handleSwitchCamera = async () => {
      setIsBusy(true);
      setLocalError(null);
      try {
        const res = await liveVisionController.switchCameraFacing();
        if (!res.ok && res.error) setLocalError(res.error);
      } finally {
        setIsBusy(false);
      }
    };

    const handleDeviceSelect = async (devId: string) => {
      setSelectedDeviceId(devId);
      if (perception.status.videoStreamActive && perception.source === 'camera') {
        setIsBusy(true);
        setLocalError(null);
        const res = await liveVisionController.selectDevice(devId);
        if (!res.ok && res.error) setLocalError(res.error);
        setIsBusy(false);
      }
    };

    const handleModeChange = async (nextMode: VisionOperatingMode) => {
      setMode(nextMode);
      if (nextMode === 'local_offline') {
        setOfflineMode(true);
      }
      await liveVisionController.setMode(nextMode);
    };

    const handleToggleOffline = async () => {
      const next = !offlineMode;
      setOfflineMode(next);
      await liveVisionController.setOfflineMode(next);
    };

    const handleToggleTracking = () => {
      const next = !trackingEnabled;
      setTrackingEnabled(next);
      liveVisionController.setTrackingEnabled(next);
    };

    const handleTogglePose = async () => {
      const next = !poseEnabled;
      setPoseEnabled(next);
      const res = await liveVisionController.setPoseEnabled(next);
      if (next && !res.loaded && res.error) {
        setPoseEnabled(false);
        setLocalError(res.error);
      }
    };

    const handleToggleLiveVoice = async () => {
      setLocalError(null);
      if (perception.status.voiceSessionActive) {
        liveVisionController.stopLiveVoice();
        return;
      }
      setIsBusy(true);
      try {
        const res = await liveVisionController.startLiveVoice();
        if (!res.ok && res.error) {
          setLocalError(res.error);
        }
      } finally {
        setIsBusy(false);
      }
    };

    const handleSnapshot = () => {
      const snap = liveVisionController.captureSnapshotJpeg();
      if (snap) {
        onCapture(snap.base64);
      }
    };

    const handleAnalyzeNow = async () => {
      if (onAnalyze) {
        const snap = liveVisionController.captureSnapshotJpeg();
        if (snap) {
          onAnalyze(snap.base64);
          return;
        }
      }
      setIsBusy(true);
      setLocalError(null);
      try {
        const res = await liveVisionController.analyzeCurrentSceneNow();
        if (!res.ok && res.error) setLocalError(res.error);
      } finally {
        setIsBusy(false);
      }
    };

    const { status, telemetry, capabilities } = perception;
    const isActive = status.videoStreamActive;
    const effectiveError = localError || telemetry.lastError;

    const transportLabel =
      perception.activeTransport === 'native_live_stream'
        ? `Native Live Stream (${perception.activeModel})`
        : perception.activeTransport === 'continuous_frame_analysis'
          ? `Continuous Frame Analysis (${perception.activeModel})`
          : perception.activeTransport === 'local_only'
            ? 'Local Offline CV (Motion & Tracking)'
            : 'Idle';

    if (isMinimized) {
      return (
        <div className="fixed bottom-4 right-4 z-[90] flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0b0e17]/95 border border-white/15 shadow-2xl backdrop-blur-xl text-xs text-slate-200">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              status.liveAiSessionActive
                ? 'bg-sky-400 animate-pulse'
                : status.localPerceptionActive
                  ? 'bg-emerald-400 animate-pulse'
                  : status.cameraConnected
                    ? 'bg-amber-400'
                    : 'bg-slate-600'
            }`}
          />
          <span className="font-mono font-semibold text-[11px]">
            {status.liveAiSessionActive
              ? 'LIVE AI VISION'
              : status.localPerceptionActive
                ? 'LOCAL VISION'
                : status.cameraConnected
                  ? 'CAMERA ON'
                  : 'VISION IDLE'}
          </span>
          {status.voiceSessionActive && (
            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px]">
              MIC LIVE
            </span>
          )}
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            title="Restore Vision Panel"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {isActive && (
            <button
              onClick={handleStop}
              className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 cursor-pointer"
              title="Stop Vision Immediately"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleClose}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
            title="Close Vision"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    return (
      <div
        className={`fixed z-[90] flex flex-col bg-[#090c14]/96 border border-white/15 shadow-2xl backdrop-blur-2xl text-slate-100 overflow-hidden transition-all ${
          isExpanded
            ? 'inset-3 sm:inset-6 rounded-2xl'
            : 'bottom-4 right-3 left-3 sm:left-auto sm:right-5 sm:w-[460px] max-h-[86vh] rounded-2xl'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0f1422] border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <ScanEye className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-wide text-white truncate">
                ANNY Live Perception & Robot Eyes
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">{transportLabel}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsExpanded((v) => !v)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
              title={isExpanded ? 'Compact size' : 'Expand panel'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
              title="Minimize"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/25 text-slate-300 hover:text-rose-200 cursor-pointer"
              title="Stop & Close Vision"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Separated Truthful Runtime Status Strip */}
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-[#0c101b] border-b border-white/10 text-[10px] font-mono">
          <span
            className={`px-1.5 py-0.5 rounded border ${
              status.cameraConnected
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-500'
            }`}
          >
            {status.cameraConnected ? '● CAMERA CONNECTED' : '○ CAMERA OFF'}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded border ${
              status.videoStreamActive && !status.paused
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : status.paused
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-slate-500'
            }`}
          >
            {status.paused ? '❚❚ PAUSED' : status.videoStreamActive ? '● STREAM ACTIVE' : '○ STREAM IDLE'}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded border ${
              status.localPerceptionActive
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-slate-500'
            }`}
          >
            {status.localPerceptionActive ? '● LOCAL CV ACTIVE' : '○ LOCAL CV OFF'}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded border ${
              status.liveAiSessionActive
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                : status.reconnecting
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-slate-500'
            }`}
          >
            {status.reconnecting
              ? '↻ AI RECONNECTING'
              : status.liveAiSessionActive
                ? '● LIVE AI ACTIVE'
                : '○ LIVE AI OFF'}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded border ${
              status.voiceSessionActive
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-white/5 border-white/10 text-slate-500'
            }`}
          >
            {status.voiceSessionActive ? '● VOICE LIVE' : '○ VOICE OFF'}
          </span>
        </div>

        {/* Video Viewport + Synchronized Real-Time Canvas Overlay */}
        <div
          className={`relative bg-black overflow-hidden flex items-center justify-center ${
            isExpanded ? 'flex-1 min-h-[280px]' : 'aspect-video w-full'
          }`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full ${
              perception.source === 'screen' ? 'object-contain' : 'object-cover'
            } ${isMirrored && perception.source === 'camera' ? 'scale-x-[-1]' : ''} ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Explicit Pre-Start / Consent State */}
          {!isActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-gradient-to-b from-[#0b1020] to-[#06080f]">
              <ScanEye className="w-8 h-8 text-sky-400 mb-2" />
              <p className="text-xs font-semibold text-white mb-1">
                Explicit Camera & Video Permission Required
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mb-4 leading-relaxed">
                Start continuous live vision with real-time local motion/object tracking and optional live AI streaming. Nothing is recorded or stored automatically.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={handleStartCamera}
                  disabled={isBusy}
                  className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isBusy ? 'Starting...' : 'Start Camera'}</span>
                </button>
                <button
                  onClick={handleStartScreen}
                  disabled={isBusy}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Share Screen</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Analyze Video</span>
                </button>
              </div>
            </div>
          )}

          {/* Top-right live recording indicator when active (privacy guarantee: always visible) */}
          {isActive && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/75 border border-white/15 text-[10px] font-mono text-white">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>{perception.source === 'screen' ? 'SCREEN LIVE' : perception.source === 'video_file' ? 'VIDEO FILE' : 'CAM LIVE'}</span>
            </div>
          )}

          {/* In-flight AI indicator */}
          {(telemetry.inFlightAi || isAnalyzing) && (
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-sky-500/20 border border-sky-400/40 text-[10px] font-mono text-sky-200">
              <Sparkles className="w-3 h-3 animate-spin" />
              <span>Analyzing frame...</span>
            </div>
          )}
        </div>

        {/* Hidden Video File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoFileSelected}
          className="hidden"
        />

        {/* Error / Recovery Banner */}
        {effectiveError && (
          <div className="flex items-start justify-between gap-2 px-3 py-2 bg-rose-950/70 border-y border-rose-500/30 text-[11px] text-rose-200">
            <div className="flex items-start gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-snug break-words">{effectiveError}</span>
            </div>
            <button
              onClick={handleStartCamera}
              className="px-2 py-0.5 rounded bg-rose-500/25 hover:bg-rose-500/40 text-rose-100 font-semibold text-[10px] shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Primary Action Controls */}
        <div className="p-3 bg-[#0d111d] border-b border-white/10 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {isActive ? (
              <>
                <button
                  onClick={handleStop}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Stop camera, AI, and voice immediately"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>
                <button
                  onClick={() => (status.paused ? liveVisionController.resume() : liveVisionController.pause())}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  {status.paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{status.paused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={handleToggleLiveVoice}
                  disabled={offlineMode || isBusy}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40 ${
                    status.voiceSessionActive
                      ? 'bg-rose-500/25 border border-rose-400/50 text-rose-200'
                      : 'bg-sky-500/20 border border-sky-400/40 text-sky-200 hover:bg-sky-500/30'
                  }`}
                  title="Simultaneous Live Voice + Vision conversation"
                >
                  {status.voiceSessionActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span>{status.voiceSessionActive ? 'Voice On' : 'Live Voice'}</span>
                </button>
                <button
                  onClick={handleAnalyzeNow}
                  disabled={offlineMode || isBusy || isAnalyzing}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Analyze current scene immediately"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Analyze</span>
                </button>
                <button
                  onClick={handleSnapshot}
                  className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 text-[11px] cursor-pointer"
                  title="Attach optional snapshot to chat"
                >
                  Snapshot
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleStartCamera}
                  disabled={isBusy}
                  className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Start Camera</span>
                </button>
                <button
                  onClick={handleStartScreen}
                  disabled={isBusy}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Screen</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Video</span>
                </button>
              </>
            )}
          </div>

          {/* Secondary Camera / Source / Perception Toggles */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {isActive && perception.source === 'camera' && (
              <>
                <button
                  onClick={handleSwitchCamera}
                  disabled={isBusy}
                  className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-200 flex items-center gap-1 cursor-pointer"
                  title="Switch Front / Rear Camera"
                >
                  <SwitchCamera className="w-3 h-3" />
                  <span>Flip</span>
                </button>
                <button
                  onClick={() => setIsMirrored((m) => !m)}
                  className={`px-2 py-1 rounded-md cursor-pointer ${
                    isMirrored ? 'bg-sky-500/20 text-sky-300' : 'bg-white/5 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  Mirror
                </button>
              </>
            )}
            <button
              onClick={handleToggleTracking}
              className={`px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer ${
                trackingEnabled ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-slate-400'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Track</span>
            </button>
            <button
              onClick={() => setShowOverlay((v) => !v)}
              className={`px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer ${
                showOverlay ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-slate-400'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Overlay</span>
            </button>
            <button
              onClick={handleTogglePose}
              className={`px-2 py-1 rounded-md cursor-pointer ${
                poseEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle optional browser-local MediaPipe Pose"
            >
              Pose
            </button>
            <button
              onClick={handleToggleOffline}
              className={`px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer ${
                offlineMode ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40' : 'bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
              title="Force 100% local offline perception (no cloud API calls)"
            >
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </button>
            {isActive && (
              <>
                <button
                  onClick={handleStartScreen}
                  className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
                  title="Switch to Screen Share"
                >
                  Screen
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
                  title="Load Video File"
                >
                  Video
                </button>
              </>
            )}
          </div>

          {/* Mode, Resolution & Camera Device Selectors */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            <select
              value={mode}
              onChange={(e) => void handleModeChange(e.target.value as VisionOperatingMode)}
              className="px-2 py-1 rounded-lg bg-[#141a2b] border border-white/10 text-[11px] text-slate-200 outline-none"
              aria-label="Vision operating mode"
            >
              {(Object.keys(MODE_LABELS) as VisionOperatingMode[]).map((k) => (
                <option key={k} value={k}>
                  {MODE_LABELS[k]}
                </option>
              ))}
            </select>

            <select
              value={resolution}
              onChange={(e) => {
                const nextRes = e.target.value as VisionResolutionPreset;
                setResolution(nextRes);
                void liveVisionController.setResolution(nextRes);
              }}
              className="px-2 py-1 rounded-lg bg-[#141a2b] border border-white/10 text-[11px] text-slate-200 outline-none"
              aria-label="Camera resolution preset"
            >
              {(Object.keys(RESOLUTION_CONSTRAINTS) as VisionResolutionPreset[]).map((r) => (
                <option key={r} value={r}>
                  {RESOLUTION_CONSTRAINTS[r].label}
                </option>
              ))}
            </select>

            <select
              value={selectedDeviceId}
              onChange={(e) => void handleDeviceSelect(e.target.value)}
              className="col-span-2 sm:col-span-1 px-2 py-1 rounded-lg bg-[#141a2b] border border-white/10 text-[11px] text-slate-200 outline-none truncate"
              aria-label="Camera device selector"
            >
              <option value="">Default Camera</option>
              {devices.map((dev) => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Perception Telemetry, Tracks & Scene Understanding Drawer */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-[11px] bg-[#080b13]">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="text-[10px] font-mono uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Radio className="w-3 h-3 text-sky-400" />
              <span>Live Perception Feed ({perception.trackedEntities.length} tracks)</span>
            </button>
            <button
              onClick={() => void liveVisionController.refreshCapabilities()}
              className="text-[10px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              title="Refresh provider capabilities"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>{telemetry.localPerceptionFps.toFixed(1)} FPS</span>
            </button>
          </div>

          {showDetails && (
            <>
              {/* Latest Scene Description */}
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-[10px] font-mono text-sky-300 mb-1">
                  SCENE UNDERSTANDING {perception.stale && isActive ? '(WAITING FOR FRESH AI FRAME)' : ''}
                </div>
                <p className="text-slate-200 leading-relaxed">
                  {perception.latestSceneDescription ||
                    (isActive
                      ? offlineMode || !status.liveAiSessionActive
                        ? 'Local offline perception is running (pixel motion, camera pan, and region tracking). Enable online AI mode or click Analyze for semantic scene description.'
                        : 'Waiting for first live AI visual observation...'
                      : 'Vision is currently inactive. Start camera, screen share, or video file analysis to enable live perception.')}
                </p>
              </div>

              {/* Active Tracked Regions / Entities */}
              {perception.trackedEntities.length > 0 && (
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <div className="text-[10px] font-mono text-amber-300">TRACKED ENTITIES</div>
                  <div className="flex flex-wrap gap-1.5">
                    {perception.trackedEntities.map((t) => (
                      <span
                        key={t.trackId}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[10px] text-slate-200"
                      >
                        {t.trackId}: {t.label} ({t.velocity.direction}, {Math.round(t.confidence * 100)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Voice Transcripts */}
              {perception.recentTranscripts.length > 0 && (
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <div className="text-[10px] font-mono text-rose-300">LIVE VOICE TRANSCRIPT</div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {perception.recentTranscripts.slice(-4).map((tr) => (
                      <div key={tr.id} className="text-[11px] text-slate-300">
                        <span className="font-mono text-[10px] uppercase text-slate-500 mr-1.5">
                          {tr.role}:
                        </span>
                        <span>{tr.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Motion / Scene Events */}
              {perception.recentEvents.length > 0 && (
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <div className="text-[10px] font-mono text-emerald-300">RECENT TEMPORAL EVENTS</div>
                  <ul className="space-y-0.5 text-[10px] font-mono text-slate-400">
                    {perception.recentEvents.slice(-4).reverse().map((evt) => (
                      <li key={evt.id} className="truncate">
                        • {evt.summary}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Truthful Capabilities & Robot Safety Notice */}
              <div className="p-2 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-[10px] text-amber-200/90 space-y-1">
                <div className="flex items-center gap-1 font-mono font-semibold text-amber-300">
                  <ShieldAlert className="w-3 h-3 shrink-0" />
                  <span>CAPABILITIES & SAFETY NOTICE</span>
                </div>
                <p className="leading-snug text-slate-300">{perception.robotSafetyDisclaimer}</p>
                {capabilities.limitations.slice(0, 2).map((lim, i) => (
                  <p key={i} className="leading-snug text-slate-400">
                    • {lim}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);

VisionSensor.displayName = 'VisionSensor';

export default VisionSensor;

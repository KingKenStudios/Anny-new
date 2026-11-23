import React, { useEffect, useRef } from 'react';
import {
  Mic,
  Pause,
  Play,
  Square,
  Trash2,
  RefreshCw,
  Volume2,
  FileText,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

export function formatVoiceDuration(seconds?: number | null): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export interface VoiceNoteBarProps {
  isRecording: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  elapsedSec: number;
  analyser: AnalyserNode | null;
  error?: string | null;
  theme?: 'dark' | 'light';
  onPauseResume: () => void;
  onStopAndAttach: () => void;
  onCancel: () => void;
  onDismissError?: () => void;
}

export const VoiceNoteRecorderBar: React.FC<VoiceNoteBarProps> = ({
  isRecording,
  isPaused,
  isProcessing,
  elapsedSec,
  analyser,
  error,
  theme = 'dark',
  onPauseResume,
  onStopAndAttach,
  onCancel,
  onDismissError,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isLight = theme === 'light';

  useEffect(() => {
    if (!isRecording) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number | null = null;
    const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barCount = 28;
      const step = width / barCount;

      if (analyser && freqData && !isPaused) {
        analyser.getByteFrequencyData(freqData);
      }

      for (let i = 0; i < barCount; i++) {
        let norm = 0.08;
        if (freqData && !isPaused) {
          const binIdx = Math.min(freqData.length - 1, Math.floor((i / barCount) * (freqData.length * 0.65)));
          norm = Math.max(0.1, freqData[binIdx] / 255);
        }
        const barH = Math.max(3, Math.round(height * 0.85 * norm));
        const x = Math.round(i * step + step * 0.2);
        const y = Math.round((height - barH) / 2);
        const w = Math.max(2, Math.floor(step * 0.6));

        ctx.fillStyle = isPaused ? (isLight ? '#94a3b8' : '#64748b') : isLight ? '#dc2626' : '#f43f5e';
        ctx.fillRect(x, y, w, barH);
      }

      if (!isPaused) {
        rafId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isRecording, isPaused, analyser, isLight]);

  if (!isRecording && !isProcessing && !error) return null;

  if (error && !isRecording && !isProcessing) {
    return (
      <div
        data-testid="voice-note-error-banner"
        className={`mb-2 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${
          isLight
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-rose-950/75 border-rose-500/40 text-rose-100'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
        {onDismissError && (
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Dismiss voice note error"
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="voice-note-recorder-bar"
      className={`mb-2 flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 rounded-xl border text-xs ${
        isLight
          ? 'bg-slate-100 border-slate-300 text-slate-900'
          : 'bg-[#090d26] border-rose-500/40 text-slate-100'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
            <span className="font-medium truncate">Saving &amp; transcribing voice note locally...</span>
          </>
        ) : (
          <>
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-lg shrink-0 ${
                isPaused ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
            </span>
            <span className="font-medium whitespace-nowrap">
              {isPaused ? 'Paused' : 'Recording voice note'}
            </span>
            <span
              data-testid="voice-note-timer"
              className={`font-mono tabular-nums text-xs font-semibold px-1.5 py-0.5 rounded ${
                isLight ? 'bg-white text-slate-800 border border-slate-200' : 'bg-white/5 text-rose-200 border border-white/10'
              }`}
            >
              {formatVoiceDuration(elapsedSec)}
            </span>
            <canvas
              ref={canvasRef}
              width={140}
              height={24}
              aria-label="Live microphone input level"
              className="hidden sm:block h-6 w-[140px] rounded bg-black/15 shrink-0"
            />
          </>
        )}
      </div>

      {!isProcessing && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onPauseResume}
            aria-label={isPaused ? 'Resume voice note recording' : 'Pause voice note recording'}
            className={`min-h-[34px] px-2.5 py-1 rounded-lg border flex items-center gap-1 text-[11px] font-medium whitespace-nowrap cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-200 border-slate-300 text-slate-800'
                : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            type="button"
            onClick={onStopAndAttach}
            aria-label="Stop and transcribe voice note"
            className="min-h-[34px] px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop &amp; Transcribe</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Discard voice note recording"
            className={`min-h-[34px] px-2 py-1 rounded-lg border flex items-center gap-1 text-[11px] whitespace-nowrap cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-200 border-slate-300 text-slate-600'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Trash2 className="w-3 h-3" />
            <span>Discard</span>
          </button>
        </div>
      )}
    </div>
  );
};

export interface VoiceNoteAttachmentCardProps {
  name: string;
  audioUrl?: string;
  durationSec?: number | null;
  transcript?: string;
  transcriptionEngine?: string;
  transcribed?: boolean;
  guidance?: string | null;
  theme?: 'dark' | 'light';
  editable?: boolean;
  onRemove?: () => void;
  onRetryStt?: () => void;
  onInsertTranscript?: (text: string) => void;
  isRetryingStt?: boolean;
}

export const VoiceNoteAttachmentCard: React.FC<VoiceNoteAttachmentCardProps> = ({
  name,
  audioUrl,
  durationSec,
  transcript,
  transcriptionEngine,
  transcribed,
  guidance,
  theme = 'dark',
  editable = false,
  onRemove,
  onRetryStt,
  onInsertTranscript,
  isRetryingStt = false,
}) => {
  const isLight = theme === 'light';
  const durationLabel = formatVoiceDuration(durationSec);
  const engineLabel =
    transcribed && transcriptionEngine && transcriptionEngine !== 'unavailable'
      ? `Local STT (${transcriptionEngine})`
      : 'Audio Note';

  return (
    <div
      data-testid="voice-note-attachment-card"
      className={`w-full rounded-xl border p-2.5 text-xs space-y-2 ${
        isLight
          ? 'bg-white border-slate-300 text-slate-900'
          : 'bg-[#080d25] border-cyan-500/35 text-slate-100'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Volume2 className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-indigo-600' : 'text-cyan-400'}`} />
          <span className="font-medium truncate">{name || 'Voice Note'}</span>
          <span className="text-[11px] opacity-60" aria-hidden="true">
            ·
          </span>
          <span className="font-mono tabular-nums text-[11px] opacity-80 whitespace-nowrap">{durationLabel}</span>
          <span className="text-[11px] opacity-60 hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <span className={`text-[11px] truncate hidden sm:inline ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {engineLabel}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {editable && !transcribed && onRetryStt && (
            <button
              type="button"
              onClick={onRetryStt}
              disabled={isRetryingStt}
              className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-50 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200'
              }`}
              title="Retry local speech-to-text transcription"
            >
              <RefreshCw className={`w-3 h-3 ${isRetryingStt ? 'animate-spin' : ''}`} />
              <span>{isRetryingStt ? 'Transcribing...' : 'Retry STT'}</span>
            </button>
          )}
          {editable && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove voice note ${name}`}
              className="p-1 rounded-md hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {audioUrl && (
        <audio
          controls
          preload="metadata"
          src={audioUrl}
          className="w-full h-8"
          aria-label={`Play voice note ${name}`}
        />
      )}

      {transcript ? (
        <p
          className={`text-[11px] leading-relaxed whitespace-pre-wrap rounded-lg px-2.5 py-1.5 border ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-800'
              : 'bg-black/25 border-white/10 text-slate-200'
          }`}
        >
          {transcript}
        </p>
      ) : guidance ? (
        <p className={`text-[11px] ${isLight ? 'text-amber-700' : 'text-amber-300/90'}`}>
          {guidance}
        </p>
      ) : null}
    </div>
  );
};

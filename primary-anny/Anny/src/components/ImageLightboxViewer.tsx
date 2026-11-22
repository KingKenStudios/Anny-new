import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Copy,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Pencil,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { downloadVerifiedImage, type PreparedImageDownload } from '../creative/imageDownloadService';
import { fetchWithAuth } from '../lib/apiUtils';

export interface LightboxImageItem {
  id: string;
  label?: string;
  url: string;
  downloadUrl?: string;
  mimeType?: string;
  format?: string;
  width?: number;
  height?: number;
  provider?: string;
  model?: string;
  prompt: string;
  category?: string;
  createdAt?: string;
  revisionNumber?: number;
  originalImageUrl?: string;
}

export interface ViewerState {
  isOpen: boolean;
  currentIndex: number;
  zoom: number;
  fitMode: 'fit' | 'actual';
  compareMode: boolean;
}

export type ViewerAction =
  | { type: 'OPEN'; index: number; total: number }
  | { type: 'CLOSE' }
  | { type: 'NEXT'; total: number }
  | { type: 'PREV'; total: number }
  | { type: 'ZOOM_IN' }
  | { type: 'ZOOM_OUT' }
  | { type: 'RESET_ZOOM' }
  | { type: 'TOGGLE_FIT' }
  | { type: 'TOGGLE_COMPARE' };

export const VIEWER_MIN_ZOOM = 0.5;
export const VIEWER_MAX_ZOOM = 4;
export const VIEWER_ZOOM_STEP = 0.25;

export function createViewerState(initialIndex = 0, isOpen = true): ViewerState {
  return {
    isOpen,
    currentIndex: Math.max(0, initialIndex),
    zoom: 1,
    fitMode: 'fit',
    compareMode: false,
  };
}

export function reduceViewerState(state: ViewerState, action: ViewerAction): ViewerState {
  switch (action.type) {
    case 'OPEN': {
      const safeTotal = Math.max(1, action.total);
      const bounded = ((action.index % safeTotal) + safeTotal) % safeTotal;
      return {
        isOpen: true,
        currentIndex: bounded,
        zoom: 1,
        fitMode: 'fit',
        compareMode: false,
      };
    }
    case 'CLOSE':
      return { ...state, isOpen: false, compareMode: false };
    case 'NEXT': {
      if (action.total <= 1) return state;
      return {
        ...state,
        currentIndex: (state.currentIndex + 1) % action.total,
        zoom: 1,
        fitMode: 'fit',
      };
    }
    case 'PREV': {
      if (action.total <= 1) return state;
      return {
        ...state,
        currentIndex: (state.currentIndex - 1 + action.total) % action.total,
        zoom: 1,
        fitMode: 'fit',
      };
    }
    case 'ZOOM_IN':
      return {
        ...state,
        fitMode: 'actual',
        zoom: Math.min(VIEWER_MAX_ZOOM, Number((state.zoom + VIEWER_ZOOM_STEP).toFixed(2))),
      };
    case 'ZOOM_OUT':
      return {
        ...state,
        zoom: Math.max(VIEWER_MIN_ZOOM, Number((state.zoom - VIEWER_ZOOM_STEP).toFixed(2))),
      };
    case 'RESET_ZOOM':
      return { ...state, zoom: 1, fitMode: 'fit' };
    case 'TOGGLE_FIT':
      return {
        ...state,
        fitMode: state.fitMode === 'fit' ? 'actual' : 'fit',
        zoom: 1,
      };
    case 'TOGGLE_COMPARE':
      return { ...state, compareMode: !state.compareMode };
    default:
      return state;
  }
}

export function mapViewerKeyToAction(key: string, total: number): ViewerAction | null {
  if (key === 'Escape') return { type: 'CLOSE' };
  if (key === 'ArrowRight') return { type: 'NEXT', total };
  if (key === 'ArrowLeft') return { type: 'PREV', total };
  if (key === '+' || key === '=') return { type: 'ZOOM_IN' };
  if (key === '-' || key === '_') return { type: 'ZOOM_OUT' };
  if (key === '0') return { type: 'RESET_ZOOM' };
  return null;
}

interface ImageLightboxViewerProps {
  images: LightboxImageItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectForEdit?: (image: LightboxImageItem) => void;
}

export const ImageLightboxViewer: React.FC<ImageLightboxViewerProps> = ({
  images,
  initialIndex,
  isOpen,
  onClose,
  onSelectForEdit,
}) => {
  const [viewerState, setViewerState] = useState<ViewerState>(() =>
    createViewerState(initialIndex, isOpen)
  );
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<PreparedImageDownload | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setViewerState(
        reduceViewerState(createViewerState(initialIndex, true), {
          type: 'OPEN',
          index: initialIndex,
          total: images.length,
        })
      );
      setDownloadFeedback(null);
      setNaturalSize(null);
    }
  }, [isOpen, initialIndex, images.length]);

  const current = images[viewerState.currentIndex] || images[0];

  const handleClose = useCallback(() => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const action = mapViewerKeyToAction(e.key, images.length);
      if (!action) return;
      e.preventDefault();
      if (action.type === 'CLOSE') {
        handleClose();
      } else {
        setViewerState((prev) => reduceViewerState(prev, action));
        setDownloadFeedback(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, images.length, handleClose]);

  useEffect(() => {
    const onFsChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  if (!isOpen || !current) return null;

  const displayWidth = naturalSize?.width || current.width || 0;
  const displayHeight = naturalSize?.height || current.height || 0;
  const displayExt = (
    current.format ||
    (current.mimeType === 'image/svg+xml'
      ? 'svg'
      : current.mimeType === 'image/jpeg'
        ? 'jpg'
        : current.mimeType === 'image/webp'
          ? 'webp'
          : 'png')
  ).toUpperCase();

  const toggleNativeFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen API unavailable in restricted iframe; modal already fills viewport cleanly
    }
  };

  const handleDownload = async (overrideUrl?: string, suffix?: string) => {
    setDownloading(true);
    setDownloadFeedback(null);
    try {
      const result = await downloadVerifiedImage(
        {
          url: overrideUrl || current.url,
          fallbackUrl: overrideUrl ? undefined : current.downloadUrl,
          fallbackDataUrl: overrideUrl ? undefined : current.url.startsWith('data:') ? current.url : undefined,
          declaredMimeType: current.mimeType,
          title: `${current.label || current.category || current.prompt || 'ANNY_Image'}${suffix ? `_${suffix}` : ''}`,
          index: viewerState.currentIndex + 1,
        },
        { fetcher: (url, init) => fetchWithAuth(url, init) }
      );
      setDownloadFeedback(result);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard?.writeText(current.prompt || '').catch(() => {});
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1800);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || images.length <= 1) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const delta = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(delta) > 50) {
      setViewerState((prev) =>
        reduceViewerState(prev, { type: delta < 0 ? 'NEXT' : 'PREV', total: images.length })
      );
      setDownloadFeedback(null);
    }
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Image Lightbox Viewer"
      className="fixed inset-0 z-[300] flex flex-col bg-black/95 backdrop-blur-md text-slate-100 select-none"
      onClick={handleClose}
    >
      {/* Top Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-3 border-b border-white/10 bg-[#050816]/95 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 font-mono text-xs font-bold text-white shrink-0">
            {viewerState.currentIndex + 1} of {images.length}
          </span>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md">
              {current.label || current.prompt}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
              <span>{displayExt}</span>
              {displayWidth > 0 && displayHeight > 0 && (
                <span>
                  {displayWidth} × {displayHeight}
                </span>
              )}
              {current.provider && <span>{current.provider}</span>}
              {current.revisionNumber && current.revisionNumber > 1 && (
                <span className="text-cyan-300">Rev {current.revisionNumber}</span>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setViewerState((s) => reduceViewerState(s, { type: 'ZOOM_OUT' }))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer"
              title="Zoom out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-[11px] font-mono text-slate-200 min-w-[46px] text-center">
              {Math.round(viewerState.zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setViewerState((s) => reduceViewerState(s, { type: 'ZOOM_IN' }))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer"
              title="Zoom in (+)"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewerState((s) => reduceViewerState(s, { type: 'RESET_ZOOM' }))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer"
              title="Fit to screen / Reset zoom (0)"
              aria-label="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {current.originalImageUrl && (
            <button
              type="button"
              onClick={() => setViewerState((s) => reduceViewerState(s, { type: 'TOGGLE_COMPARE' }))}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                viewerState.compareMode
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
              }`}
              title="Compare Original vs Revised"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compare</span>
            </button>
          )}

          {onSelectForEdit && (
            <button
              type="button"
              onClick={() => {
                onSelectForEdit(current);
                handleClose();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
              title="Select this image for follow-up editing"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}

          <button
            type="button"
            disabled={downloading}
            onClick={() => handleDownload()}
            className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-lg"
            title={`Download original ${displayExt}`}
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Download {displayExt}</span>
          </button>

          <button
            type="button"
            onClick={toggleNativeFullscreen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 cursor-pointer"
            title={isNativeFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isNativeFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 border border-white/15 text-white cursor-pointer transition"
            title="Close (Esc)"
            aria-label="Close Viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Centered Stage */}
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center overflow-auto p-3 sm:p-8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setViewerState((s) => reduceViewerState(s, { type: 'PREV', total: images.length }));
              setDownloadFeedback(null);
            }}
            className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-black/75 hover:bg-cyan-500/80 border border-white/20 text-white shadow-2xl cursor-pointer transition"
            title="Previous image (Left Arrow)"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setViewerState((s) => reduceViewerState(s, { type: 'NEXT', total: images.length }));
              setDownloadFeedback(null);
            }}
            className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-black/75 hover:bg-cyan-500/80 border border-white/20 text-white shadow-2xl cursor-pointer transition"
            title="Next image (Right Arrow)"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Image Surface (clicking image NEVER closes lightbox) */}
        {viewerState.compareMode && current.originalImageUrl ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-6xl items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl border border-white/15 bg-[#070b1a] p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Original Image</span>
                <button
                  type="button"
                  onClick={() => handleDownload(current.originalImageUrl, 'original')}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Download Original
                </button>
              </div>
              <div className="flex items-center justify-center bg-black rounded-xl overflow-hidden min-h-[260px] max-h-[68vh]">
                <img
                  src={current.originalImageUrl}
                  alt="Original image"
                  className="max-w-full max-h-[68vh] object-contain"
                />
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-400/35 bg-[#070b1a] p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-cyan-300">
                  Revised (Rev {current.revisionNumber || 2})
                </span>
                <button
                  type="button"
                  onClick={() => handleDownload(current.url, `rev${current.revisionNumber || 2}`)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Download Revised
                </button>
              </div>
              <div className="flex items-center justify-center bg-black rounded-xl overflow-hidden min-h-[260px] max-h-[68vh]">
                <img
                  src={current.url}
                  alt={current.prompt}
                  className="max-w-full max-h-[68vh] object-contain"
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-center max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={current.url}
              alt={current.prompt}
              onLoad={(e) => {
                const el = e.currentTarget;
                if (el.naturalWidth && el.naturalHeight) {
                  setNaturalSize({ width: el.naturalWidth, height: el.naturalHeight });
                }
              }}
              style={{
                transform: `scale(${viewerState.zoom})`,
                transformOrigin: 'center center',
              }}
              className={`rounded-xl shadow-2xl transition-transform duration-150 object-contain ${
                viewerState.fitMode === 'fit'
                  ? 'max-w-[92vw] max-h-[74vh]'
                  : 'max-w-none max-h-none'
              }`}
            />
          </div>
        )}
      </div>

      {/* Bottom Prompt & Verified Download Status Bar */}
      <div
        className="px-3 sm:px-5 py-2.5 border-t border-white/10 bg-[#050816]/95 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <p className="text-slate-300 truncate max-w-2xl" title={current.prompt}>
            {current.prompt}
          </p>
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
          >
            {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {downloadFeedback && (
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-medium ${
              downloadFeedback.ok
                ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-200'
                : 'bg-rose-500/15 border border-rose-500/35 text-rose-200'
            }`}
          >
            {downloadFeedback.ok ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Saved {downloadFeedback.filename} ({Math.max(1, Math.round(downloadFeedback.byteLength / 1024))} KB)
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{downloadFeedback.error || 'Download failed.'}</span>
                {downloadFeedback.fallbackUrl && (
                  <a
                    href={downloadFeedback.fallbackUrl}
                    download={downloadFeedback.filename}
                    className="underline font-bold text-white ml-1"
                  >
                    Direct Save
                  </a>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageLightboxViewer;

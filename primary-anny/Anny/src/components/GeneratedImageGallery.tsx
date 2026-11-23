import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Columns2,
  Download,
  Loader2,
  Maximize2,
  Pencil,
  RotateCw,
} from 'lucide-react';
import { downloadVerifiedImage } from '../creative/imageDownloadService';
import { normalizeImageSource } from '../creative/mediaNormalization';
import { fetchWithAuth } from '../lib/apiUtils';
import { ImageLightboxViewer, type LightboxImageItem } from './ImageLightboxViewer';

interface GeneratedImageGalleryProps {
  images: LightboxImageItem[];
  selectedImageId?: string;
  onSelectForEdit?: (image: LightboxImageItem) => void;
  onRegenerate?: (prompt: string) => void;
  compact?: boolean;
}

export const GeneratedImageGallery: React.FC<GeneratedImageGalleryProps> = ({
  images,
  selectedImageId,
  onSelectForEdit,
  onRegenerate,
  compact = false,
}) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [cardStatus, setCardStatus] = useState<
    Record<string, { ok: boolean; message: string; fallbackUrl?: string; filename?: string }>
  >({});
  const [loadStates, setLoadStates] = useState<Record<string, 'loading' | 'loaded' | 'error'>>({});

  if (!images || images.length === 0) return null;

  const gridClass =
    images.length === 1
      ? 'grid-cols-1'
      : images.length === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2';

  const handleOpenViewer = (idx: number) => {
    setViewerIndex(idx);
    setViewerOpen(true);
  };

  const handleDownloadSingle = async (item: LightboxImageItem, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(item.id);
    try {
      const result = await downloadVerifiedImage(
        {
          url: item.url,
          fallbackUrl: item.downloadUrl,
          fallbackDataUrl: item.url.startsWith('data:') ? item.url : undefined,
          declaredMimeType: item.mimeType,
          title: item.label || item.category || item.prompt || 'ANNY_Image',
          index: idx + 1,
        },
        { fetcher: (url, init) => fetchWithAuth(url, init) }
      );
      setCardStatus((prev) => ({
        ...prev,
        [item.id]: {
          ok: result.ok,
          message: result.ok
            ? `Saved ${result.filename}`
            : result.error || 'Download failed',
          fallbackUrl: result.fallbackUrl,
          filename: result.filename,
        },
      }));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="w-full space-y-3">
      {images.length > 1 && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
          <span className="font-semibold text-slate-200">
            Generated Gallery ({images.length} independent options)
          </span>
          <span>Click any image to open full viewer</span>
        </div>
      )}

      <div className={`grid ${gridClass} gap-3`}>
        {images.map((item, idx) => {
          const itemKey = item.id || `img_${idx}`;
          const normalized = normalizeImageSource({ url: item.url, mimeType: item.mimeType });
          const resolvedUrl = normalized.valid ? normalized.src : item.url;
          const loadState = loadStates[itemKey] || (normalized.valid ? 'loading' : 'error');
          const ext = (
            item.format ||
            (item.mimeType === 'image/svg+xml'
              ? 'svg'
              : item.mimeType === 'image/jpeg'
                ? 'jpg'
                : item.mimeType === 'image/webp'
                  ? 'webp'
                  : 'png')
          ).toUpperCase();
          const dimLabel =
            item.width && item.height ? `${item.width} × ${item.height}` : 'Verified';
          const isSelected = Boolean(selectedImageId && selectedImageId === item.id);
          const status = cardStatus[item.id];

          return (
            <div
              key={itemKey}
              className={`group rounded-2xl overflow-hidden border bg-[#06091e] transition-all flex flex-col ${
                isSelected
                  ? 'border-cyan-400 ring-1 ring-cyan-400/40'
                  : 'border-white/12 hover:border-cyan-400/50'
              }`}
            >
              {/* Clickable Image Preview Area */}
              <button
                type="button"
                onClick={() => handleOpenViewer(idx)}
                className={`relative w-full bg-[#040610] flex items-center justify-center overflow-hidden cursor-zoom-in ${
                  images.length === 1
                    ? compact
                      ? 'min-h-[240px] max-h-[380px]'
                      : 'min-h-[280px] max-h-[460px]'
                    : 'h-56 sm:h-64'
                }`}
                title="Click to open large lightbox viewer"
              >
                {loadState === 'error' ? (
                  <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-rose-300">
                    <AlertCircle className="w-6 h-6 text-rose-400" />
                    <span className="text-xs font-semibold">Image failed to load in browser</span>
                    <span className="text-[10px] text-slate-400 max-w-xs">
                      The image payload could not be decoded cleanly. Try regenerating or opening raw source.
                    </span>
                  </div>
                ) : (
                  <img
                    src={resolvedUrl}
                    alt={item.label || item.prompt}
                    loading="lazy"
                    onLoad={() =>
                      setLoadStates((prev) => ({ ...prev, [itemKey]: 'loaded' }))
                    }
                    onError={() =>
                      setLoadStates((prev) => ({ ...prev, [itemKey]: 'error' }))
                    }
                    className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                )}
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/80 border border-white/15 text-[10px] font-mono font-bold text-cyan-200 backdrop-blur-sm">
                  {item.label || `Option ${idx + 1}`}
                </span>
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/80 border border-white/15 text-[10px] font-mono text-slate-300 backdrop-blur-sm">
                  {ext} · {dimLabel}
                </span>
                {item.originalImageUrl && (
                  <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-[10px] font-semibold text-amber-200 flex items-center gap-1 backdrop-blur-sm">
                    <Columns2 className="w-3 h-3" /> Rev {item.revisionNumber || 2}
                  </span>
                )}
              </button>

              {/* Card Action Footer */}
              <div className="p-2.5 sm:p-3 border-t border-white/10 bg-[#080c24] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenViewer(idx)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 text-slate-100 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                      title="Open Large Viewer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Open</span>
                    </button>

                    <button
                      type="button"
                      disabled={downloadingId === item.id || (loadState === 'error' && !item.downloadUrl)}
                      onClick={(e) => handleDownloadSingle({ ...item, url: resolvedUrl }, idx, e)}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 text-slate-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                      title={`Download ${ext}`}
                    >
                      {downloadingId === item.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      <span>Download</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onSelectForEdit && (
                      <button
                        type="button"
                        onClick={() => onSelectForEdit(item)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-white/5 hover:bg-indigo-600/30 border-white/10 text-slate-200'
                        }`}
                        title="Select this image for non-destructive follow-up edits"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>{isSelected ? 'Editing' : 'Edit'}</span>
                      </button>
                    )}

                    {onRegenerate && images.length === 1 && (
                      <button
                        type="button"
                        onClick={() => onRegenerate(item.prompt)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 cursor-pointer"
                        title="Regenerate"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {status && (
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] ${
                      status.ok
                        ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-200 border border-rose-500/30'
                    }`}
                  >
                    {status.ok ? (
                      <Check className="w-3 h-3 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3 h-3 shrink-0 text-rose-400" />
                    )}
                    <span className="truncate">{status.message}</span>
                    {!status.ok && status.fallbackUrl && (
                      <a
                        href={status.fallbackUrl}
                        download={status.filename || 'image.png'}
                        className="underline font-bold text-white ml-auto shrink-0"
                      >
                        Save
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ImageLightboxViewer
        images={images}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onSelectForEdit={onSelectForEdit}
      />
    </div>
  );
};

export default GeneratedImageGallery;

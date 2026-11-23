import React, { useState } from 'react';
import {
  Eye,
  Edit3,
  Code,
  Maximize2,
  Share2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ShieldCheck,
  Check,
  Sparkles,
} from 'lucide-react';
import type { ProjectBuildMetadata } from '../../services/projectPreviewController';

export interface ChatProjectBuildCardProps {
  build: ProjectBuildMetadata;
  isActiveProject: boolean;
  onOpenPreview: (build: ProjectBuildMetadata) => void;
  onOpenEditor: (build: ProjectBuildMetadata) => void;
  onViewCode: (build: ProjectBuildMetadata) => void;
  onOpenFullscreen: (build: ProjectBuildMetadata) => void;
  onShareProject: (build: ProjectBuildMetadata) => Promise<string | undefined>;
  onRetryBuild?: (build: ProjectBuildMetadata) => void;
}

export const ChatProjectBuildCard: React.FC<ChatProjectBuildCardProps> = ({
  build,
  isActiveProject,
  onOpenPreview,
  onOpenEditor,
  onViewCode,
  onOpenFullscreen,
  onShareProject,
  onRetryBuild,
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleShareClick = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const url = await onShareProject(build);
      if (url) {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 3000);
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (build.status === 'failed') {
    return (
      <div
        data-testid="chat-project-build-card-failed"
        className="mt-3 pt-3 border-t border-rose-500/30 rounded-xl bg-rose-950/35 border p-3.5 space-y-2.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-rose-200">
                Build Incomplete — {build.name || 'Website Application'}
              </div>
              <div className="text-[11px] text-rose-300/90 mt-0.5">
                {build.error || 'Project verification or compilation failed before a runnable preview could start.'}
              </div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-[10px] font-mono font-bold text-rose-300 uppercase shrink-0">
            Failed
          </span>
        </div>

        {onRetryBuild && (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onRetryBuild(build)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry &amp; Repair Build</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="chat-project-build-card"
      data-project-id={build.projectId}
      className="mt-3 pt-3 border-t border-white/10"
    >
      <div className="rounded-xl bg-[#070b22]/90 border border-cyan-500/30 p-3.5 space-y-3 shadow-lg">
        {/* Card Header: Project Name, Version, Verification Status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white truncate">
                  {build.name || 'Generated Website'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300 tabular-nums shrink-0">
                  v{build.version || 1}
                </span>
                {build.isIncrementalEdit && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-[10px] font-semibold text-purple-300 shrink-0">
                    Updated
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 tabular-nums">
                <span className="uppercase">{build.projectType || 'website'}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-purple-400" />
                  {build.fileCount || 0} files
                </span>
                {typeof build.verificationScore === 'number' && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      Quality {build.verificationScore}/100
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {build.status === 'ready' ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>{isActiveProject ? 'Live Preview Active' : 'Verified Build'}</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-semibold text-amber-300 flex items-center gap-1">
                <span>Generated Project</span>
              </span>
            )}
          </div>
        </div>

        {/* 5 Permanent Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {/* 1. Open Preview */}
          <button
            type="button"
            data-testid="build-action-open-preview"
            onClick={() => onOpenPreview(build)}
            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 text-white text-[11px] font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open Preview</span>
          </button>

          {/* 2. Open Editor */}
          <button
            type="button"
            data-testid="build-action-open-editor"
            onClick={() => onOpenEditor(build)}
            className="px-2.5 py-1.5 rounded-lg bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-purple-300" />
            <span>Open Editor</span>
          </button>

          {/* 3. View Code */}
          <button
            type="button"
            data-testid="build-action-view-code"
            onClick={() => onViewCode(build)}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Code className="w-3.5 h-3.5 text-cyan-400" />
            <span>View Code</span>
          </button>

          {/* 4. Open Fullscreen */}
          <button
            type="button"
            data-testid="build-action-open-fullscreen"
            onClick={() => onOpenFullscreen(build)}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open Fullscreen</span>
          </button>

          {/* 5. Share Project */}
          <button
            type="button"
            data-testid="build-action-share-project"
            onClick={() => void handleShareClick()}
            disabled={isSharing}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {shareCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Share Link Opened</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isSharing ? 'Preparing Share...' : 'Share Project'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Code2,
  Cpu,
  Loader2,
  RotateCw,
  Sparkles,
  Terminal,
  XCircle,
} from 'lucide-react';

export interface BuildStageItem {
  stage:
    | 'understanding'
    | 'planning'
    | 'generating'
    | 'validating'
    | 'installing'
    | 'starting_preview'
    | 'testing'
    | 'completed'
    | 'failed';
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail?: string;
}

const DEFAULT_STAGES: Array<{ id: BuildStageItem['stage']; label: string }> = [
  { id: 'understanding', label: '1. Understanding request' },
  { id: 'planning', label: '2. Planning' },
  { id: 'generating', label: '3. Generating files' },
  { id: 'validating', label: '4. Validating' },
  { id: 'installing', label: '5. Installing dependencies' },
  { id: 'starting_preview', label: '6. Starting preview' },
  { id: 'testing', label: '7. Testing' },
  { id: 'completed', label: '8. Completed' },
];

function mapStageToIndex(currentStageText: string): number {
  const lower = (currentStageText || '').toLowerCase();
  if (lower.includes('complete') || lower.includes('ready')) return 7;
  if (lower.includes('test') || lower.includes('smoke')) return 6;
  if (lower.includes('preview') || lower.includes('runtime') || lower.includes('opening')) return 5;
  if (lower.includes('install') || lower.includes('dependenc') || lower.includes('packag')) return 4;
  if (lower.includes('validat') || lower.includes('verif') || lower.includes('repair')) return 3;
  if (lower.includes('generat') || lower.includes('writ') || lower.includes('synthesiz') || lower.includes('file')) return 2;
  if (lower.includes('plan') || lower.includes('architect')) return 1;
  return 0;
}

interface AnnyBuildPreviewOverlayProps {
  isBuilding: boolean;
  buildState?: 'in_progress' | 'completed' | 'failed';
  projectName?: string;
  userPrompt?: string;
  currentStage?: string;
  progressPct?: number;
  stages?: BuildStageItem[];
  generatedFiles?: string[];
  errorMessage?: string;
  diagnostics?: string[];
  onViewCode?: () => void;
  onViewLogs?: () => void;
  onRetryBuild?: () => void;
}

export const AnnyBuildPreviewOverlay: React.FC<AnnyBuildPreviewOverlayProps> = ({
  isBuilding,
  buildState,
  projectName,
  userPrompt,
  currentStage = 'Understanding request…',
  progressPct,
  stages,
  generatedFiles,
  errorMessage,
  diagnostics,
  onViewCode,
  onViewLogs,
  onRetryBuild,
}) => {
  const effectiveState = buildState || (isBuilding ? 'in_progress' : 'completed');
  if (effectiveState === 'completed' && !isBuilding) return null;
  const cleanProjectName = projectName && projectName.trim() ? projectName.trim() : '';

  const isFailed = effectiveState === 'failed';
  const activeIndex = mapStageToIndex(currentStage);

  const displayStages: BuildStageItem[] =
    stages && stages.length > 0
      ? DEFAULT_STAGES.map((def, idx) => {
          const matched = stages.find((s) => s.stage === def.id);
          if (matched) return { ...matched, label: def.label };
          if (isFailed && idx === activeIndex) {
            return { stage: def.id, label: def.label, status: 'failed' };
          }
          if (idx < activeIndex) return { stage: def.id, label: def.label, status: 'completed' };
          if (idx === activeIndex && !isFailed) return { stage: def.id, label: def.label, status: 'in_progress' };
          return { stage: def.id, label: def.label, status: 'pending' };
        })
      : DEFAULT_STAGES.map((def, idx) => ({
          stage: def.id,
          label: def.label,
          status: isFailed
            ? idx < activeIndex
              ? 'completed'
              : idx === activeIndex
                ? 'failed'
                : 'pending'
            : idx < activeIndex
              ? 'completed'
              : idx === activeIndex
                ? 'in_progress'
                : 'pending',
        }));

  const completedCount = displayStages.filter((s) => s.status === 'completed').length;
  const computedProgress =
    typeof progressPct === 'number'
      ? Math.max(0, Math.min(100, progressPct))
      : Math.round((completedCount / displayStages.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/94 p-4 sm:p-6 backdrop-blur-2xl"
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 opacity-60 pointer-events-none bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,.16),transparent_42%),radial-gradient(circle_at_75%_70%,rgba(34,211,238,.09),transparent_35%)]" />
      <div
        className={`relative w-full max-w-2xl rounded-[28px] border p-5 sm:p-6 shadow-2xl ring-1 ring-white/5 ${
          isFailed
            ? 'border-rose-500/35 bg-[#120711]/95'
            : 'border-white/10 bg-white/[0.045]'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border ${
              isFailed
                ? 'border-rose-400/30 bg-rose-500/15'
                : 'border-cyan-300/20 bg-cyan-300/10'
            }`}
          >
            {isFailed ? (
              <AlertTriangle className="h-6 w-6 text-rose-300" />
            ) : (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-1 rounded-xl border border-transparent border-t-cyan-300 border-r-indigo-400"
                />
                <Cpu className="h-6 w-6 text-cyan-200" />
              </>
            )}
          </div>
          <div className="min-w-0">
            <div
              className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                isFailed ? 'text-rose-300' : 'text-cyan-300'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> ANNY Build Runtime
            </div>
            <h2 className="mt-1 text-lg sm:text-xl font-semibold text-white truncate">
              {isFailed
                ? (cleanProjectName ? `${cleanProjectName} — Generation Failed` : 'Project generation failed')
                : (cleanProjectName ? `Building ${cleanProjectName}` : 'Building your project')}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {isFailed
                ? 'Review the diagnostic details below, inspect logs, or retry generation.'
                : 'Real-time build pipeline active — live preview opens automatically once files pass validation.'}
            </p>
          </div>
        </div>

        {userPrompt && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3.5">
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <Code2 className="h-3.5 w-3.5" /> Request
            </div>
            <p className="line-clamp-3 text-sm leading-relaxed text-slate-200">{userPrompt}</p>
          </div>
        )}

        {/* Active stage + 8-step honest status grid */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-slate-200">
              {isFailed ? (
                <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
              ) : (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-300" />
              )}
              <span className="truncate font-medium">{currentStage}</span>
            </span>
            {!isFailed && <span className="font-mono text-cyan-300">{computedProgress}%</span>}
          </div>

          {!isFailed && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                animate={{ width: `${computedProgress}%` }}
                transition={{ duration: 0.35 }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-300"
              />
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {displayStages.map((item) => (
              <div
                key={item.stage}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 border ${
                  item.status === 'completed'
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                    : item.status === 'in_progress'
                      ? 'border-cyan-400/35 bg-cyan-500/10 text-cyan-100'
                      : item.status === 'failed'
                        ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                        : 'border-white/5 bg-white/[0.025] text-slate-500'
                }`}
              >
                {item.status === 'completed' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : item.status === 'in_progress' ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-300" />
                ) : item.status === 'failed' ? (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                )}
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
          {generatedFiles && generatedFiles.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Live Workspace Files ({generatedFiles.length})
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {generatedFiles.slice(0, 14).map((f) => (
                  <span
                    key={f}
                    className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-200 truncate max-w-[180px]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Failure reason & diagnostics */}
        {isFailed && (errorMessage || (diagnostics && diagnostics.length > 0)) && (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-950/35 p-4 space-y-2">
            {errorMessage && (
              <p className="text-xs font-mono text-rose-200 whitespace-pre-wrap break-words">
                {errorMessage}
              </p>
            )}
            {diagnostics && diagnostics.length > 0 && (
              <ul className="space-y-1 pt-1 border-t border-rose-500/20 text-[11px] font-mono text-rose-300/90 max-h-32 overflow-y-auto">
                {diagnostics.slice(0, 8).map((diag, idx) => (
                  <li key={idx}>• {diag}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isFailed && onRetryBuild && (
            <button
              type="button"
              onClick={onRetryBuild}
              className="flex-1 min-w-[140px] rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Retry Generation
            </button>
          )}
          {onViewCode && (
            <button
              type="button"
              onClick={onViewCode}
              className="flex-1 min-w-[140px] rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08] hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Code2 className="h-3.5 w-3.5" />
              {isFailed ? 'Inspect Code & Files' : 'Open Code while building'}
            </button>
          )}
          {onViewLogs && (
            <button
              type="button"
              onClick={onViewLogs}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Terminal className="h-3.5 w-3.5" />
              Logs &amp; Tests
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AnnyBuildPreviewOverlay;

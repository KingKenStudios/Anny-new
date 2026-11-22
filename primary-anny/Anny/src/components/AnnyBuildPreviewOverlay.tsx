import React from 'react';
import { motion } from 'motion/react';
import { Activity, Check, Code2, Cpu, Loader2, Sparkles } from 'lucide-react';

interface AnnyBuildPreviewOverlayProps {
  isBuilding: boolean;
  userPrompt?: string;
  currentStage?: string;
  progressPct?: number;
  onViewCode?: () => void;
}

export const AnnyBuildPreviewOverlay: React.FC<AnnyBuildPreviewOverlayProps> = ({
  isBuilding,
  userPrompt,
  currentStage = 'Preparing the project…',
  progressPct,
  onViewCode,
}) => {
  if (!isBuilding) return null;
  const progress = typeof progressPct === 'number' ? Math.max(0, Math.min(100, progressPct)) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center overflow-hidden bg-slate-950/92 p-6 backdrop-blur-2xl"
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_50%_35%,rgba(99,102,241,.18),transparent_42%),radial-gradient(circle_at_75%_70%,rgba(34,211,238,.10),transparent_35%)]" />
      <div className="relative w-full max-w-xl rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl ring-1 ring-white/5">
        <div className="flex items-center gap-4">
          <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }} className="absolute inset-1 rounded-xl border border-transparent border-t-cyan-300 border-r-indigo-400" />
            <Cpu className="h-6 w-6 text-cyan-200" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" /> ANNY Build Runtime
            </div>
            <h2 className="mt-1 text-xl font-semibold text-white">Building the project</h2>
            <p className="mt-1 text-xs text-slate-400">The preview will open from the generated project files when the runtime is ready.</p>
          </div>
        </div>

        {userPrompt && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <Code2 className="h-3.5 w-3.5" /> Request
            </div>
            <p className="line-clamp-3 text-sm leading-relaxed text-slate-200">{userPrompt}</p>
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-slate-200">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-300" />
              <span className="truncate">{currentStage}</span>
            </span>
            {progress !== null && <span className="font-mono text-cyan-300">{progress}%</span>}
          </div>
          {progress !== null && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-300" />
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5 rounded-xl bg-white/[0.035] px-2 py-2"><Activity className="h-3 w-3" /> Analyze</span>
            <span className="flex items-center gap-1.5 rounded-xl bg-white/[0.035] px-2 py-2"><Code2 className="h-3 w-3" /> Generate</span>
            <span className="flex items-center gap-1.5 rounded-xl bg-white/[0.035] px-2 py-2"><Check className="h-3 w-3" /> Verify</span>
          </div>
        </div>

        {onViewCode && (
          <button onClick={onViewCode} className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white">
            Open Code while the build continues
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default AnnyBuildPreviewOverlay;

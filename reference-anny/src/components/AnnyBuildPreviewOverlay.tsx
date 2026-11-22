import React from 'react';
import { motion } from 'motion/react';
import { Bot, Sparkles, Cpu, Loader2, CheckCircle2, Code2, Zap, Layout, Terminal } from 'lucide-react';

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
  currentStage = 'Synthesizing source code & UI components...',
  progressPct = 45,
  onViewCode
}) => {
  const displayPrompt = userPrompt || (typeof localStorage !== 'undefined' ? localStorage.getItem('anny_current_build_prompt') : '') || 'Generating custom application...';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.03, transition: { duration: 0.4 } }}
      className="absolute inset-0 z-40 bg-[#050713]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-slate-100 font-sans select-none overflow-hidden"
    >
      {/* Background Animated Neural Energy Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.12)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-600/10 via-cyan-500/10 to-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Main Animated Central Card */}
      <div className="relative z-10 max-w-lg w-full flex flex-col items-center text-center space-y-6">
        
        {/* ==================== ANIMATED ANNY LOGO INSIDE NEON CIRCLING LOADING ==================== */}
        <div className="relative flex items-center justify-center w-40 h-40">
          {/* Outer Rotating Neon Circling Ring 1 */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-purple-500 shadow-[0_0_30px_rgba(34,211,238,0.6)]"
          />

          {/* Outer Rotating Neon Counter-Ring 2 */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2 rounded-full border-2 border-transparent border-b-purple-400 border-l-cyan-300 shadow-[0_0_25px_rgba(168,85,247,0.6)]"
          />

          {/* Glowing Pulse Ring 3 */}
          <motion.div
            animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-4 rounded-full border border-cyan-400/40 bg-gradient-to-tr from-purple-600/20 via-cyan-500/20 to-indigo-600/20 blur-sm"
          />

          {/* Core ANNY Logo Container (Centered inside Neon Circles) */}
          <div className="relative z-10 w-24 h-24 rounded-full bg-[#080a1c] border-2 border-cyan-400/80 shadow-[0_0_35px_rgba(34,211,238,0.7)] flex flex-col items-center justify-center overflow-hidden">
            <motion.div
              animate={{ scale: [0.96, 1.04, 0.96] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="flex flex-col items-center justify-center"
            >
              <img 
                src="/logo.png" 
                alt="ANNY Logo" 
                className="w-12 h-12 object-contain drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]"
                onError={(e) => {
                  // Fallback to stylized icon if image not available
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent && !parent.querySelector('.fallback-bot')) {
                    const botEl = document.createElement('div');
                    botEl.className = 'fallback-bot text-cyan-300 font-bold font-mono text-xs text-center flex flex-col items-center';
                    botEl.innerHTML = '<span style="font-size: 20px;">🤖</span><span>ANNY</span>';
                    parent.appendChild(botEl);
                  }
                }}
              />
              <span className="text-[10px] font-mono font-black tracking-widest mt-0.5 animate-aios-shift drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">ANNY</span>
            </motion.div>
          </div>
        </div>

        {/* ==================== TITLE & STATUS MESSAGE ==================== */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
            <span>ANNY Intelligence Engine</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            Building Your Request
          </h2>

          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Synthesizing code, components, and interactive runtime in real-time...
          </p>
        </div>

        {/* ==================== USER REQUEST MENTION CARD ==================== */}
        <div className="w-full bg-[#0a0d24]/90 border border-purple-500/30 rounded-2xl p-4 shadow-xl text-left space-y-2 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 via-cyan-400 to-emerald-400" />
          <div className="flex items-center justify-between text-[11px] font-mono text-purple-300 font-bold">
            <span className="flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              USER REQUEST
            </span>
            <span className="text-[10px] text-slate-500 uppercase">Target Architecture</span>
          </div>

          <p className="text-xs font-medium text-slate-200 line-clamp-3 italic leading-relaxed bg-[#060818]/60 p-2.5 rounded-xl border border-white/5 font-sans">
            "{displayPrompt}"
          </p>
        </div>

        {/* ==================== LIVE STAGE & PROGRESS BAR ==================== */}
        <div className="w-full space-y-3 font-mono text-xs">
          {/* Stage Status Indicator */}
          <div className="flex items-center justify-between px-1 text-[11px]">
            <span className="text-cyan-300 font-bold flex items-center gap-2 truncate">
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
              <span className="truncate">{currentStage}</span>
            </span>
            <span className="text-purple-300 font-bold shrink-0 ml-2">{progressPct}%</span>
          </div>

          {/* Animated Gradient Progress Bar */}
          <div className="w-full h-2.5 bg-[#0b0e24] rounded-full overflow-hidden border border-white/10 p-0.5 relative shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-600 via-cyan-400 to-emerald-400 rounded-full"
              initial={{ width: '5%' }}
              animate={{ width: `${Math.max(10, Math.min(100, progressPct))}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {/* Execution Checklist Steps */}
          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 text-slate-400 text-left">
            <div className="flex items-center gap-1.5 bg-white/5 p-2 rounded-lg border border-white/5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">VFS Project Storage</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 p-2 rounded-lg border border-white/5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Dependencies Resolved</span>
            </div>
            <div className="flex items-center gap-1.5 bg-cyan-950/40 p-2 rounded-lg border border-cyan-500/30 text-cyan-200">
              <Loader2 className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />
              <span className="truncate">Babel AST Transpiling</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 p-2 rounded-lg border border-white/5">
              <Zap className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Port 3000 Preview</span>
            </div>
          </div>
        </div>

        {onViewCode && (
          <button
            onClick={onViewCode}
            className="text-xs text-slate-400 hover:text-white underline font-mono pt-2 transition-colors"
          >
            Switch to Code Editor while building
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default AnnyBuildPreviewOverlay;

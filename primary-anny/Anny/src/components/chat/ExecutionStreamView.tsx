import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { executionStreamManager, ExecutionStreamState, AnnyFileState } from '../../core/executionStreamManager';

export interface ExecutionStreamViewProps {
  className?: string;
  onClose?: () => void;
}

export const ExecutionStreamView: React.FC<ExecutionStreamViewProps> = ({ className = '' }) => {
  const [streamState, setStreamState] = useState<ExecutionStreamState>(() => executionStreamManager.getState());

  useEffect(() => {
    const unsubscribe = executionStreamManager.subscribe(state => {
      setStreamState(state);
    });
    return () => unsubscribe();
  }, []);

  if (!streamState.isRunning && streamState.currentStatus !== 'completed' && streamState.currentStatus !== 'failed' && streamState.completedMessages.length === 0 && streamState.fileHistory.length === 0) {
    return null;
  }

  const { elapsedSec, currentMessage, currentStatus, fileHistory, completedMessages, error } = streamState;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className={`w-full rounded-2xl border border-cyan-500/20 bg-slate-950/85 p-4 backdrop-blur-md shadow-2xl font-sans select-none my-2 text-slate-200 ${className}`}
    >
      {/* Line 1: Timer & Status Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-5 h-5">
            <img
              src="/logo.png"
              alt="Anny"
              className={`w-4 h-4 object-contain ${streamState.isRunning ? 'animate-spin-slow drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]' : ''}`}
            />
            {streamState.isRunning && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            )}
          </div>
          <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-bold text-sm tracking-tight">
            Anny
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs text-slate-300 font-mono font-medium">
            {streamState.isRunning
              ? `Running for ${elapsedSec}s`
              : streamState.currentStatus === 'completed'
              ? `Completed in ${elapsedSec}s`
              : `Failed after ${elapsedSec}s`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
          {streamState.isRunning ? (
            <>
              <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
              <span>Live Execution</span>
            </>
          ) : streamState.currentStatus === 'completed' ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300">Complete</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span className="text-rose-300">Failed</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1.5 mb-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
        {/* Error State Banner */}
        {currentStatus === 'failed' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs font-semibold text-rose-300 bg-rose-950/40 p-2 rounded-lg border border-rose-500/40 my-1"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Operation failed{error ? `: ${error}` : ''}</span>
          </motion.div>
        )}

        {/* Touch File List - ONLY started/completed operations are in fileHistory */}
        {fileHistory.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
              <span>Touched Files ({fileHistory.length})</span>
            </div>
            {fileHistory.map((file: AnnyFileState) => {
              const isCurrentActive = file.status === 'active';
              const isCreate = file.operation === 'create';
              const opLabel = isCurrentActive
                ? (isCreate ? 'Creating...' : 'Updating...')
                : file.status === 'completed'
                ? (isCreate ? 'Created' : 'Updated')
                : 'Failed';

              return (
                <div
                  key={file.filePath}
                  className={`flex items-center justify-between text-[11px] font-mono px-2 py-1.5 rounded transition-colors ${
                    isCurrentActive
                      ? 'bg-cyan-950/60 border border-cyan-500/50 text-cyan-200 font-medium'
                      : file.status === 'failed'
                      ? 'bg-rose-950/30 border border-rose-500/30 text-rose-300'
                      : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 pr-2">
                    {file.status === 'active' ? (
                      <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                    ) : file.status === 'completed' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 font-bold" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-rose-400 shrink-0 font-bold" />
                    )}
                    <span className="truncate">{file.filePath}</span>
                  </div>
                  <span className={`text-[10px] font-sans font-medium ${
                    isCurrentActive
                      ? 'text-cyan-300 animate-pulse'
                      : file.status === 'completed'
                      ? 'text-emerald-400/90'
                      : 'text-rose-400'
                  }`}>
                    {opLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

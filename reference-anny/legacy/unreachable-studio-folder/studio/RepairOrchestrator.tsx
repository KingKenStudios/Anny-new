import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Cpu, Terminal, ShieldAlert, Sparkles, Activity } from 'lucide-react';
import { repairOrchestrator, RepairLogRecord } from '../../core/repairOrchestrator';
import { useExecutionStateStore } from '../../core/executionStateStore';

export const RepairOrchestratorComponent: React.FC = () => {
  const [logs, setLogs] = useState<RepairLogRecord[]>([]);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const { anny } = useExecutionStateStore();
  const activeProject = anny.activeProject;

  useEffect(() => {
    const update = () => {
      setLogs(repairOrchestrator.getRepairLogs());
      setIsRepairing(repairOrchestrator.getIsRepairing());
    };
    update();
    const unsubscribe = repairOrchestrator.subscribe(update);
    return () => {
      unsubscribe();
    };
  }, []);

  const handleManualRepair = async () => {
    const errorMsg = activeProject?.errors[0] || 'Manual triggered build diagnostic & remediation requested by operator.';
    await repairOrchestrator.triggerRepairRoutine('ManualUserTrigger', errorMsg);
  };

  const activeLog = logs[0];

  return (
    <div className="p-4 bg-[#090d18] border border-cyan-900/40 rounded-xl font-mono text-slate-200 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
            <Wrench className={`w-5 h-5 ${isRepairing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Autonomous Repair Orchestrator
              {isRepairing && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                  REPAIR ACTIVE
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Auto-subscribes to Terminal & Compiler crash events to trigger automated code remediation
            </p>
          </div>
        </div>

        <button
          onClick={handleManualRepair}
          disabled={isRepairing}
          className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
        >
          {isRepairing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
          Trigger Repair Routine
        </button>
      </div>

      {/* Active Repair Card */}
      {activeLog && (
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Latest Repair ID: {activeLog.id}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
              activeLog.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
              activeLog.status === 'FAILED' ? 'bg-rose-950 text-rose-400 border-rose-800' :
              'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
            }`}>
              {activeLog.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
              <span className="text-slate-400 block mb-0.5">Error Signal:</span>
              <span className="text-rose-300 truncate block font-semibold">{activeLog.errorSignal}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
              <span className="text-slate-400 block mb-0.5">Diagnosis:</span>
              <span className="text-cyan-300 truncate block font-semibold">{activeLog.diagnosis}</span>
            </div>
          </div>

          <div className="bg-slate-900/40 p-2 rounded border border-slate-850 text-[11px]">
            <span className="text-slate-400 block mb-0.5">Remediation Action:</span>
            <span className="text-emerald-400">{activeLog.remediationApplied}</span>
          </div>
        </div>
      )}

      {/* Repair History Log List */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Remediation Logs History ({logs.length})
        </h4>

        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
          {logs.map(log => (
            <div key={log.id} className="p-2 rounded bg-slate-950/70 border border-slate-850 text-[11px] flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                {log.status === 'SUCCESS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                {log.status === 'FAILED' && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                {(log.status === 'ANALYZING' || log.status === 'REPAIRING' || log.status === 'REBUILDING') && (
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                )}
                <div className="truncate">
                  <span className="font-semibold text-slate-200">{log.diagnosis}</span>
                  <span className="text-slate-500 ml-2">({log.source})</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">{log.timestamp}</span>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="p-4 rounded border border-dashed border-slate-800 text-center text-slate-500 italic text-xs">
              No crash or build failure events intercepted yet. System operating nominally.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

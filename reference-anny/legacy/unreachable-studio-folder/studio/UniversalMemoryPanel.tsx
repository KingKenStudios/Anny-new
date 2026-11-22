import React, { useState, useEffect } from 'react';
import { 
  Database, ShieldCheck, CheckCircle2, Bookmark, Layers, FileText, 
  Clock, Cpu, Zap, Activity, HardDrive
} from 'lucide-react';
import { persistentEngineeringMemory, ProjectEngineeringMemoryState } from '../../core/persistentEngineeringMemory';

export const UniversalMemoryPanel: React.FC = () => {
  const [memoryState, setMemoryState] = useState<ProjectEngineeringMemoryState>(persistentEngineeringMemory.getMemoryState());

  useEffect(() => {
    const unsubscribe = persistentEngineeringMemory.subscribe(() => {
      setMemoryState(persistentEngineeringMemory.getMemoryState());
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="h-full w-full bg-[#03040d] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Top Bar */}
      <div className="p-3 border-b border-white/10 bg-[#080a1e] flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">Persistent Engineering Memory & Digital Twin (PEM v1.0)</h3>
        </div>

        <div className="text-slate-400 text-[11px]">
          Last Memory Sync: <strong className="text-purple-300">{memoryState.lastUpdated}</strong>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-4 bg-[#02030a] overflow-y-auto space-y-4 font-mono text-xs custom-scrollbar">
        {/* Project Header Card */}
        <div className="p-4 bg-[#07091a] border border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-purple-400 font-bold block uppercase tracking-wider">ACTIVE PROJECT MEMORY</span>
            <h3 className="text-lg font-bold text-white mt-0.5">{memoryState.projectName}</h3>
            <p className="text-slate-400 text-xs mt-1">Project ID: {memoryState.projectId} • Version: {memoryState.version}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 block font-bold">AUDIT SCORE</span>
              <span className="text-emerald-400 text-base font-extrabold">{memoryState.auditScore}%</span>
            </div>
          </div>
        </div>

        {/* Requirements Summary */}
        <div className="p-4 bg-[#07091a] border border-white/10 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <Bookmark className="w-4 h-4 text-cyan-400" />
            <span>Active Project Requirements Summary</span>
          </div>

          <div className="space-y-2">
            {memoryState.requirementsSummary.map((req, i) => (
              <div key={i} className="p-2.5 bg-[#03040e] border border-white/5 rounded-xl flex items-center gap-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-200">{req}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Architectural Decision Records (ADRs) */}
        <div className="p-4 bg-[#07091a] border border-white/10 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Architectural Decision Records (ADRs)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {memoryState.architecturalDecisions.map((adr) => (
              <div key={adr.id} className="p-3 bg-[#03040e] border border-white/5 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{adr.title}</span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[9px] uppercase font-bold">
                    {adr.status}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{adr.decision}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

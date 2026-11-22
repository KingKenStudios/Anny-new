import React, { useState, useEffect } from 'react';
import { annyTelemetry, AnnyTelemetryRecord } from '../core/annyTelemetry';
import {
  Activity,
  Cpu,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Terminal,
  Database,
  X,
  RefreshCw,
  Trash2,
  ChevronRight
} from 'lucide-react';

interface AnnyDebugIntelligencePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnnyDebugIntelligencePanel: React.FC<AnnyDebugIntelligencePanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [records, setRecords] = useState<AnnyTelemetryRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AnnyTelemetryRecord | null>(null);

  useEffect(() => {
    setRecords(annyTelemetry.getRecords());
    const unsubscribe = annyTelemetry.subscribe(() => {
      setRecords(annyTelemetry.getRecords());
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-[#070a1a]/95 border-l border-cyan-500/30 backdrop-blur-xl z-50 flex flex-col shadow-2xl text-slate-200 text-xs">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-cyan-950/60">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          <div>
            <h2 className="font-extrabold text-sm text-white tracking-wide">ANNY CORE Intelligence Observability</h2>
            <p className="text-[10px] text-cyan-300/80">Real-time model routing, telemetry & multi-model audit</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => annyTelemetry.clear()}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-colors cursor-pointer"
            title="Clear Telemetry Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Request List */}
        <div className="w-full md:w-1/2 border-r border-white/10 overflow-y-auto p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2 px-1">
            <span>Recent Requests ({records.length})</span>
            <span className="text-cyan-400 text-[10px]">Auto-Updating</span>
          </div>

          {records.length === 0 ? (
            <div className="p-6 text-center text-slate-500 italic">
              No intelligence requests logged yet. Send a message or request a build to inspect routing telemetry.
            </div>
          ) : (
            records.map((rec) => {
              const isSelected = selectedRecord?.requestId === rec.requestId;
              return (
                <div
                  key={rec.requestId}
                  onClick={() => setSelectedRecord(rec)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/50 border-cyan-400/60 shadow-[0_0_15px_rgba(0,229,255,0.15)]'
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {rec.requestType}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      {rec.latencyMs}ms
                    </span>
                  </div>

                  <p className="text-white font-medium line-clamp-1 mb-1.5">{rec.userIntent}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-cyan-300">
                      <Cpu className="w-3 h-3" />
                      {rec.selectedModel}
                    </span>
                    {rec.finalStatus === 'SUCCESS' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Request Detail Panel */}
        <div className="w-full md:w-1/2 overflow-y-auto p-4 bg-[#050714]/80 space-y-4">
          {selectedRecord ? (
            <div className="space-y-3">
              <div className="border-b border-white/10 pb-2">
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Request Telemetry Detail</span>
                <h3 className="text-sm font-bold text-white mt-1">{selectedRecord.userIntent}</h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">{selectedRecord.timestamp} • ID: {selectedRecord.requestId}</span>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Model Route Decision</span>
                  <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
                    <span>Provider: {selectedRecord.selectedProvider}</span>
                    <span>Model: {selectedRecord.selectedModel}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 italic pt-1">{selectedRecord.reasonForSelection}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Execution Status</span>
                  <div className="flex items-center gap-2">
                    {selectedRecord.finalStatus === 'SUCCESS' ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> SUCCESS
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> {selectedRecord.finalStatus} ({selectedRecord.failureReason || 'Unknown error'})
                      </span>
                    )}
                    <span className="text-slate-400">({selectedRecord.latencyMs} ms)</span>
                  </div>
                </div>

                {selectedRecord.executionStages && selectedRecord.executionStages.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">EXECUTION TRACE PROTOCOL</span>
                    <ul className="space-y-1.5 mt-1">
                      {selectedRecord.executionStages.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-slate-300 text-[11px] bg-slate-900/60 p-2 rounded-md border border-slate-800/60">
                          <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span className="font-mono text-[9px] uppercase tracking-tighter">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Layers className="w-8 h-8 text-slate-600 mb-2" />
              <p>Select any request from the left list to view detailed model routing decisions, reasoning steps, and performance telemetry.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Play, Cpu, ShieldCheck, CheckCircle2, Clock, AlertTriangle, 
  Activity, Layers, FileCode, Server, Terminal, Wrench, ChevronRight, 
  FileText, History, BarChart3, ArrowRight, Zap, RefreshCw
} from 'lucide-react';
import { autonomousExecutionPlatform, EAEPExecutionRecord, PipelineStageSpec } from '../../core/autonomousExecutionPlatform';
import { engineeringAuditEngine } from '../../core/engineeringAuditEngine';

export const EAEPDashboard: React.FC = () => {
  const [stages, setStages] = useState<PipelineStageSpec[]>(autonomousExecutionPlatform.getStages());
  const [lifecycleState, setLifecycleState] = useState(autonomousExecutionPlatform.getCurrentState());
  const [confidence, setConfidence] = useState(autonomousExecutionPlatform.getConfidence());
  const [repairCount, setRepairCount] = useState(autonomousExecutionPlatform.getRepairCount());
  const [history, setHistory] = useState<EAEPExecutionRecord[]>(autonomousExecutionPlatform.getHistory());
  const [activeTab, setActiveTab] = useState<'pipeline' | 'confidence' | 'report' | 'history'>('pipeline');
  const [selectedRecord, setSelectedRecord] = useState<EAEPExecutionRecord | null>(history[0] || null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    const unsubscribe = autonomousExecutionPlatform.subscribe(() => {
      setStages(autonomousExecutionPlatform.getStages());
      setLifecycleState(autonomousExecutionPlatform.getCurrentState());
      setConfidence(autonomousExecutionPlatform.getConfidence());
      setRepairCount(autonomousExecutionPlatform.getRepairCount());
      const updatedHistory = autonomousExecutionPlatform.getHistory();
      setHistory(updatedHistory);
      if (!selectedRecord && updatedHistory.length > 0) {
        setSelectedRecord(updatedHistory[0]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRunPipeline = async () => {
    if (!customPrompt.trim()) return;
    setIsExecuting(true);
    try {
      const rec = await autonomousExecutionPlatform.executePipeline(customPrompt);
      setSelectedRecord(rec);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExecuting(false);
    }
  };

  const getStageColor = (status: PipelineStageSpec['status']) => {
    switch (status) {
      case 'completed': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
      case 'in_progress': return 'border-cyan-500/50 bg-cyan-500/20 text-cyan-200 animate-pulse';
      case 'warning': return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
      case 'failed': return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
      default: return 'border-white/5 bg-[#0a0c1a] text-slate-500';
    }
  };

  const currentReport = selectedRecord ? autonomousExecutionPlatform.generateEngineeringReportMarkdown(selectedRecord) : null;

  return (
    <div className="h-full w-full bg-[#080a18] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <div className="p-3 border-b border-white/10 bg-[#0d0f22] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">Enterprise Autonomous Execution Platform (EAEP v1.0)</h3>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter directive to trigger 25-stage pipeline..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunPipeline()}
            className="w-64 px-3 py-1.5 bg-[#050610] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500 transition"
          />
          <button
            onClick={handleRunPipeline}
            disabled={isExecuting || !customPrompt.trim()}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-lg transition text-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isExecuting ? 'Executing...' : 'Run Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Lifecycle Status & Metrics Strip */}
      <div className="p-4 bg-[#0a0c1a] border-b border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        <div className="p-2.5 bg-[#101228] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">LIFECYCLE STATE</span>
          <span className="text-sm font-black text-cyan-400 mt-1 block tracking-wider">{lifecycleState}</span>
        </div>

        <div className="p-2.5 bg-[#101228] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">OVERALL CONFIDENCE</span>
          <span className="text-sm font-black text-emerald-400 mt-1 block">{confidence.overall}%</span>
        </div>

        <div className="p-2.5 bg-[#101228] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">AUTONOMOUS REPAIRS</span>
          <span className="text-sm font-black text-purple-400 mt-1 block">{repairCount} Cycles</span>
        </div>

        <div className="p-2.5 bg-[#101228] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">DEV SERVER INGRESS</span>
          <span className="text-sm font-black text-indigo-400 mt-1 block">PORT 3000 (HTTP)</span>
        </div>

        <div className="p-2.5 bg-[#101228] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">PIPELINE STAGES</span>
          <span className="text-sm font-black text-white mt-1 block">25 STAGES</span>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="px-4 pt-2 bg-[#090b1c] border-b border-white/10 flex items-center gap-2 font-mono text-xs">
        {[
          { id: 'pipeline', label: '25-Stage Pipeline', icon: Layers },
          { id: 'confidence', label: 'Confidence Engine', icon: BarChart3 },
          { id: 'report', label: 'Engineering Report', icon: FileText },
          { id: 'history', label: 'Execution History', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition ${
                activeTab === tab.id ? 'border-cyan-400 text-cyan-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 bg-[#070814] overflow-y-auto custom-scrollbar">
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono text-xs">
            {stages.map((stage) => (
              <div key={stage.id} className={`p-3 rounded-xl border ${getStageColor(stage.status)} flex flex-col justify-between h-24 transition`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] opacity-70">STAGE {stage.id}/25</span>
                  {stage.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {stage.status === 'in_progress' && <Activity className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
                  {stage.status === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs leading-snug">{stage.name}</h4>
                  {stage.message && <p className="text-[10px] opacity-80 mt-1 truncate">{stage.message}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'confidence' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {Object.entries(confidence).map(([key, val]) => (
              <div key={key} className="p-4 bg-[#0a0c1a] border border-white/10 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase text-white tracking-wider">{key}</span>
                  <span className={`font-black text-sm ${val >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{val}%</span>
                </div>
                <div className="w-full bg-[#050610] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${val >= 90 ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-amber-400'}`}
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'report' && (
          <div className="p-5 bg-[#0a0c1a] border border-white/10 rounded-2xl font-mono text-xs text-slate-300 space-y-4 max-w-4xl mx-auto">
            {currentReport ? (
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-200">
                {currentReport}
              </pre>
            ) : (
              <div className="p-8 text-center text-slate-400">No execution report generated yet. Run pipeline above.</div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3 font-mono text-xs">
            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No execution history recorded.</div>
            ) : (
              history.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecord(rec)}
                  className={`p-4 bg-[#0a0c1a] border rounded-2xl cursor-pointer transition flex items-center justify-between ${
                    selectedRecord?.id === rec.id ? 'border-cyan-500 bg-cyan-950/20' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-white text-sm">{rec.prompt}</h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {rec.timestamp} • Duration: {(rec.durationMs / 1000).toFixed(2)}s • Files: {rec.filesGeneratedCount} • Audit Score: {rec.auditScore}/100
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded-lg text-xs">
                      {rec.confidence.overall}% Confidence
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

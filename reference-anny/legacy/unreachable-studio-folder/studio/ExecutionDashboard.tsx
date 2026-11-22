import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Play, CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw, 
  Terminal, ShieldCheck, Cpu, HardDrive, Globe, Rocket, Eye, 
  Layers, CheckSquare, Wrench, ChevronRight, Activity, FileText, Database, Code
} from 'lucide-react';
import { projectQueueManager, ALL_STAGES, StageName } from '../../core/projectQueueManager';
import { useExecutionStateStore } from '../../core/executionStateStore';
import { RepairOrchestratorComponent } from './RepairOrchestrator';

export const ExecutionDashboard: React.FC = () => {
  const { diagnostics, terminal, anny } = useExecutionStateStore();
  const queue = anny.queue;
  const activeProject = anny.activeProject;
  const [activeTab, setActiveTab] = useState<'console' | 'queue' | 'artifacts' | 'terminal' | 'diagnostics' | 'repair'>('console');

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}.${Math.floor((ms % 1000) / 100)}s`;
  };

  if (!activeProject) {
    return (
      <div className="flex-1 h-full bg-[#080b14] text-slate-300 p-6 flex flex-col items-center justify-center font-mono">
        <Activity className="w-12 h-12 text-cyan-500/40 animate-pulse mb-3" />
        <h3 className="text-lg font-bold text-slate-200">Execution Console Ready</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md text-center">
          No project actively executing in queue. Submit a prompt or select a build from the queue to inspect execution telemetry.
        </p>
      </div>
    );
  }

  const getStageStatus = (stage: StageName) => {
    const stageIndex = ALL_STAGES.indexOf(stage);
    const currentIndex = ALL_STAGES.indexOf(activeProject.currentStage);

    if (activeProject.status === 'failed' && stage === activeProject.currentStage) {
      return 'failed';
    }
    if (activeProject.status === 'repairing' && stage === 'Repair') {
      return 'repairing';
    }
    if (currentIndex > stageIndex || activeProject.status === 'completed') {
      return 'completed';
    }
    if (currentIndex === stageIndex && activeProject.status === 'running') {
      return 'active';
    }
    return 'pending';
  };

  return (
    <div className="flex-1 h-full bg-[#080b14] text-slate-200 flex flex-col font-sans overflow-hidden border border-cyan-900/30 rounded-lg">
      {/* Header Bar */}
      <div className="bg-[#0c101d] px-4 py-3 border-b border-cyan-950/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                {activeProject.id}
              </span>
              <h2 className="text-sm font-bold text-slate-100 truncate max-w-md">
                {activeProject.projectName}
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-xl">
              Prompt: "{activeProject.prompt}"
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300">Elapsed: {formatDuration(activeProject.durationMs)}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800">
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300">Repairs: {activeProject.repairAttempts}</span>
          </div>

          <div className={`px-2.5 py-1 rounded font-bold uppercase tracking-wider text-[10px] border flex items-center gap-1.5 ${
            activeProject.status === 'completed'
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
              : activeProject.status === 'failed'
              ? 'bg-rose-950/80 text-rose-400 border-rose-800/50'
              : activeProject.status === 'repairing'
              ? 'bg-amber-950/80 text-amber-400 border-amber-800/50 animate-pulse'
              : 'bg-cyan-950/80 text-cyan-400 border-cyan-800/50 animate-pulse'
          }`}>
            {activeProject.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            {activeProject.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
            {(activeProject.status === 'running' || activeProject.status === 'repairing') && (
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            )}
            {activeProject.status}
          </div>
        </div>
      </div>

      {/* Progress & Live Stages Header */}
      <div className="bg-[#0b0e1a] p-4 border-b border-slate-800/50 space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> Current Stage:
              <strong className="text-cyan-300 font-semibold">{activeProject.currentStage}</strong>
            </span>
            <span className="text-cyan-400 font-bold">{activeProject.progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
            <motion.div 
              className={`h-full ${
                activeProject.status === 'failed'
                  ? 'bg-rose-500'
                  : activeProject.status === 'completed'
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${activeProject.progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* 11 Live Execution Pipeline Stages */}
        <div className="grid grid-cols-11 gap-1 pt-1">
          {ALL_STAGES.map((stage, idx) => {
            const status = getStageStatus(stage);
            return (
              <div 
                key={stage}
                className={`p-1.5 rounded text-[10px] font-mono flex flex-col items-center justify-center text-center transition-all ${
                  status === 'completed'
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                    : status === 'active'
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/80 shadow-[0_0_8px_rgba(6,182,212,0.3)] animate-pulse'
                    : status === 'repairing'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-500/80 animate-pulse'
                    : status === 'failed'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500/80'
                    : 'bg-slate-900/40 text-slate-500 border border-slate-850'
                }`}
              >
                <span className="text-[9px] opacity-60 mb-0.5">{idx + 1}</span>
                <span className="font-semibold truncate w-full">{stage}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Console & Telemetry (8 cols) */}
        <div className="col-span-8 border-r border-slate-800/50 flex flex-col overflow-hidden bg-[#070912]">
          {/* Sub-tab selection */}
          <div className="flex items-center gap-1 bg-[#090d18] px-3 py-1.5 border-b border-slate-800/60 text-xs font-mono overflow-x-auto">
            <button
              onClick={() => setActiveTab('console')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'console' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> Structured Logs ({activeProject.logs.length})
            </button>
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'terminal' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> CLI Commands ({terminal.commandLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'diagnostics' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" /> Telemetry Hardware
            </button>
            <button
              onClick={() => setActiveTab('artifacts')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'artifacts' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Artifacts ({activeProject.artifacts.length})
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'queue' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Queue ({queue.length})
            </button>
            <button
              onClick={() => setActiveTab('repair')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'repair' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" /> Repair Studio
            </button>
          </div>

          {/* Console & Subtab Views */}
          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
            {activeTab === 'repair' && (
              <RepairOrchestratorComponent />
            )}
            {activeTab === 'console' && (
              <>
                {activeProject.logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 leading-relaxed hover:bg-slate-900/30 p-1 rounded">
                    <span className="text-slate-500 text-[10px] whitespace-nowrap pt-0.5">[{log.timestamp}]</span>
                    <span className="text-cyan-400/70 font-semibold text-[10px] w-28 truncate pt-0.5">[{log.stage}]</span>
                    <span className={`flex-1 ${
                      log.type === 'error' ? 'text-rose-400 font-bold bg-rose-950/30 px-1.5 rounded' :
                      log.type === 'warn' ? 'text-amber-300 bg-amber-950/20 px-1.5 rounded' : 'text-slate-300'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
                {activeProject.logs.length === 0 && (
                  <p className="text-slate-500 italic p-4 text-center">Initializing structured log stream...</p>
                )}
              </>
            )}

            {activeTab === 'terminal' && (
              <div className="space-y-2 p-2">
                <div className="text-slate-400 text-[11px] font-mono mb-2">Zustand Store Aggregated Terminal Execution Logs:</div>
                {terminal.commandLogs.map((cmd) => (
                  <div key={cmd.id} className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-bold">$ {cmd.command}</span>
                      <span className="text-[10px] text-slate-500">{cmd.timestamp}</span>
                    </div>
                    <pre className="text-[11px] text-slate-300 whitespace-pre-wrap font-mono bg-black/40 p-1.5 rounded border border-slate-900">
                      {cmd.output}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'diagnostics' && (
              <div className="grid grid-cols-2 gap-3 p-2">
                <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px]">System Health</div>
                  <div className="text-emerald-400 font-bold text-sm uppercase">{diagnostics.systemHealth}</div>
                </div>
                <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px]">CPU Utilization</div>
                  <div className="text-cyan-400 font-bold text-sm">{diagnostics.cpuUsagePct}%</div>
                </div>
                <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px]">RAM Footprint</div>
                  <div className="text-purple-400 font-bold text-sm">{diagnostics.memoryMb} MB</div>
                </div>
                <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px]">Active Sensors</div>
                  <div className="text-amber-400 font-bold text-sm">{diagnostics.activeSensorsCount} Active Nodes</div>
                </div>
              </div>
            )}

            {activeTab === 'artifacts' && (
              <div className="grid grid-cols-2 gap-2 p-2">
                {activeProject.artifacts.map((art, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-slate-200 text-xs truncate">{art.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{art.path}</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                      {art.type}
                    </span>
                  </div>
                ))}
                {activeProject.artifacts.length === 0 && (
                  <p className="text-slate-500 italic p-4 text-center col-span-2">No generated artifacts registered yet.</p>
                )}
              </div>
            )}

            {activeTab === 'queue' && (
              <div className="space-y-2 p-2">
                {queue.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => projectQueueManager.setActiveProject(item.id)}
                    className={`p-3 rounded border cursor-pointer transition-all flex items-center justify-between ${
                      item.id === activeProject.id 
                        ? 'bg-cyan-950/50 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-xs">{item.projectName}</span>
                        <span className="text-[10px] font-mono px-1.5 rounded bg-slate-800 text-slate-400">{item.id}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.currentStage} • {item.progressPct}%</div>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-400">{formatDuration(item.durationMs)}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        item.status === 'completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        item.status === 'failed' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                        'bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Execution Health & Preview Status (4 cols) */}
        <div className="col-span-4 p-4 flex flex-col space-y-4 bg-[#090c16] font-mono text-xs overflow-y-auto">
          {/* Preview Panel Box */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5 text-xs text-cyan-400">
                <Globe className="w-3.5 h-3.5" /> Preview Status
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                activeProject.preview.status === 'ready' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                activeProject.preview.status === 'error' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                'bg-slate-800 text-slate-400'
              }`}>
                {activeProject.preview.status}
              </span>
            </div>

            {activeProject.preview.url ? (
              <div className="space-y-1 pt-1">
                <p className="text-[11px] text-slate-300 truncate font-mono bg-slate-950 p-1.5 rounded border border-slate-800">
                  {activeProject.preview.url}
                </p>
                <a 
                  href={activeProject.preview.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-1 px-2 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-center block text-xs font-semibold transition-colors"
                >
                  Open Live Preview ↗
                </a>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">
                {activeProject.preview.errorReason || 'Preview route offline until compilation completes.'}
              </p>
            )}

            {/* Preview Health Report */}
            {anny.previewHealth && (
              <div className="mt-2 p-2 rounded bg-cyan-950/40 border border-cyan-800/40 text-[10px] space-y-1">
                <div className="flex justify-between items-center text-cyan-300 font-bold">
                  <span>Preview Health:</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-900 text-cyan-200 uppercase">{anny.previewHealth.status}</span>
                </div>
                <div className="text-slate-400">Category: <strong className="text-slate-200">{anny.previewHealth.renderingCategory}</strong></div>
                <div className="text-slate-400 truncate">Details: {anny.previewHealth.details}</div>
              </div>
            )}
          </div>

          {/* Verification & Health */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Pipeline Verification Health
            </h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Health Status:</span>
                <span className={`font-bold ${
                  activeProject.health === 'healthy' ? 'text-emerald-400' :
                  activeProject.health === 'warning' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {activeProject.health.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Warnings Logged:</span>
                <span className="text-slate-200">{activeProject.warnings.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Errors Logged:</span>
                <span className="text-slate-200">{activeProject.errors.length}</span>
              </div>
            </div>

            {activeProject.errors.length > 0 && (
              <div className="p-2 rounded bg-rose-950/40 border border-rose-900/50 text-rose-300 text-[10px] space-y-1">
                <strong className="block text-rose-400">Reported Errors:</strong>
                {activeProject.errors.map((err, idx) => (
                  <div key={idx} className="truncate">• {err}</div>
                ))}
              </div>
            )}
          </div>

          {/* Deployment Status */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5 text-blue-400" /> Deployment Status
            </h4>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Target Container:</span>
              <span className="text-slate-200 font-bold">Cloud Run / Port 3000</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Deployment State:</span>
              <span className="text-cyan-400 font-bold uppercase">{activeProject.deploymentStatus}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

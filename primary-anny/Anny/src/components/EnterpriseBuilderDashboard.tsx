/**
 * ANNY — ENTERPRISE AUTONOMOUS BUILDER DASHBOARD & PROMPT EXECUTION GRAPH
 * Displays System Subsystem Health, 19-Stage Pipeline Progress,
 * Interactive Execution Graph, Tech Stack Matrix, and System Diagnostics.
 */

import React, { useState, useEffect } from 'react';
import { enterpriseAutonomousBuilder, SystemHealthReport, ExecutionGraphNode } from '../core/enterpriseAutonomousBuilder';
import { Activity, ShieldCheck, Cpu, HardDrive, Server, Layers, GitBranch, CheckCircle2, AlertTriangle, ArrowRight, Play, Terminal, Database, Wrench } from 'lucide-react';

export const EnterpriseBuilderDashboard: React.FC = () => {
  const [reports, setReports] = useState<SystemHealthReport[]>([]);
  const [graph, setGraph] = useState<ExecutionGraphNode[]>([]);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'health' | 'graph'>('pipeline');
  const [testPrompt, setTestPrompt] = useState<string>('Create an Enterprise Banking Platform');
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const update = () => {
      setReports(enterpriseAutonomousBuilder.getSubsystemHealthReports());
      setGraph(enterpriseAutonomousBuilder.getCurrentGraph());
    };

    update();
    const unsubscribe = enterpriseAutonomousBuilder.subscribe(update);
    return () => unsubscribe();
  }, []);

  const handleTriggerPipeline = async () => {
    if (!testPrompt.trim()) return;
    setIsBuilding(true);
    setLogs([]);

    try {
      await enterpriseAutonomousBuilder.executePipeline(testPrompt, (stage, log) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [${stage}] ${log}`]);
      });
    } catch (err: any) {
      setLogs(prev => [...prev, `[ERROR] Pipeline failed: ${err.message}`]);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans p-4 gap-4 overflow-y-auto">
      {/* Header & Subsystem Navigation */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Layers className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">Enterprise Autonomous Builder Platform (EABP)</h2>
            <p className="text-xs text-slate-400">Software Engineering OS • 19-Stage Pipeline • Prompt Execution Graph • Self-Healing</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 font-bold text-xs">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1.5 rounded transition ${activeTab === 'pipeline' ? 'bg-cyan-500 text-black font-extrabold' : 'text-slate-400 hover:text-white'}`}
          >
            Builder Pipeline
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 rounded transition ${activeTab === 'graph' ? 'bg-cyan-500 text-black font-extrabold' : 'text-slate-400 hover:text-white'}`}
          >
            Execution Graph ({graph.length})
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-3 py-1.5 rounded transition ${activeTab === 'health' ? 'bg-cyan-500 text-black font-extrabold' : 'text-slate-400 hover:text-white'}`}
          >
            System Health ({reports.length})
          </button>
        </div>
      </div>

      {/* PIPELINE TAB */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
          {/* Prompt Trigger Control */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" /> Execute Autonomous Builder
            </h3>

            <div>
              <label className="text-xs text-slate-400 font-medium mb-1 block">Project Prompt Directive</label>
              <textarea
                value={testPrompt}
                onChange={e => setTestPrompt(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none"
                placeholder="Describe enterprise application..."
              />
            </div>

            <button
              onClick={handleTriggerPipeline}
              disabled={isBuilding}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              {isBuilding ? 'Running Enterprise Pipeline...' : 'Build Project Architecture'}
            </button>

            <div className="mt-auto bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5">
              <span className="font-bold text-cyan-400 block mb-1">Guaranteed OS Standards:</span>
              <p className="text-slate-400">• Zero chat code dumps (Direct VFS Registration)</p>
              <p className="text-slate-400">• Dockerfile & Docker Compose auto-generated</p>
              <p className="text-slate-400">• Live AST syntax validation & self-repair</p>
            </div>
          </div>

          {/* Pipeline Streaming Logs */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-sans">
                <Terminal className="w-4 h-4 text-emerald-400" /> Live Progress Streaming Logs
              </h3>
              <span className="text-xs text-cyan-400">{logs.length} pipeline events</span>
            </div>

            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-y-auto text-xs space-y-2 min-h-[300px] max-h-[450px]">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic py-8 text-center font-sans">
                  No active build. Click 'Build Project Architecture' to execute the enterprise pipeline.
                </div>
              ) : (
                logs.map((l, idx) => (
                  <div key={idx} className="text-slate-300 leading-relaxed border-b border-slate-900/60 pb-1">
                    {l}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROMPT EXECUTION GRAPH TAB */}
      {activeTab === 'graph' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-400" /> Prompt Execution Node Graph
            </h3>
            <span className="text-xs text-slate-400">Stage Nodes: {graph.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {graph.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-500 font-sans italic">
                Execution graph empty. Run the pipeline to populate execution stage nodes.
              </div>
            ) : (
              graph.map((node, idx) => (
                <div key={node.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col gap-2 relative">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cyan-400 font-bold">Node #{idx + 1}</span>
                    <span className="text-slate-500">{node.timestamp}</span>
                  </div>

                  <h4 className="font-bold text-sm text-white">{node.title}</h4>
                  <p className="text-xs text-slate-400 leading-normal">{node.details}</p>

                  <div className="mt-auto pt-2 border-t border-slate-900 flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                      node.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {node.status}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SYSTEM HEALTH TAB */}
      {activeTab === 'health' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(rep => (
            <div key={rep.subsystemName} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-sm text-white">{rep.subsystemName}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  v{rep.version}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                  <span className="text-slate-500 block">Health</span>
                  <span className="text-emerald-400 font-bold capitalize">{rep.health}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                  <span className="text-slate-500 block">Memory</span>
                  <span className="text-cyan-400 font-bold">{rep.memoryMb} MB</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Capabilities:</span>
                <ul className="text-xs text-slate-300 space-y-0.5 list-disc list-inside">
                  {rep.capabilities.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between font-mono">
                <span>Last Test: {rep.lastTestTime}</span>
                <span>Repairs: {rep.repairCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

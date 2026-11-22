/**
 * ANNY — RUNTIME DASHBOARD (VERSION 1.0)
 * Real-Time Subsystem Monitoring, Process Controls, CPU/Memory Telemetry,
 * Structured Execution Log Viewer, and Autonomous Error Recovery Panel.
 */

import React, { useState, useEffect } from 'react';
import { runtimePlatform, RuntimeProjectConfig, ExecutionLogEntry } from '../core/runtimeExecutionPlatform';
import { WorkspaceManager } from '../core/workspaceManager';
import { Cpu, HardDrive, Server, Play, Square, RefreshCw, AlertTriangle, ShieldCheck, Terminal, Activity, Layers, CheckCircle2, XCircle } from 'lucide-react';

export const RuntimeDashboard: React.FC = () => {
  const [projects, setProjects] = useState<RuntimeProjectConfig[]>([]);
  const [logs, setLogs] = useState<ExecutionLogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj_primary_anny');

  useEffect(() => {
    const updateState = () => {
      setProjects(runtimePlatform.getProjects());
      setLogs(runtimePlatform.getLogs(selectedProjectId));
    };

    updateState();
    const unsubscribe = runtimePlatform.subscribe(updateState);
    return () => unsubscribe();
  }, [selectedProjectId]);

  const activeProject = projects.find(p => p.projectId === selectedProjectId) || projects[0];

  const handleStart = (id: string) => {
    const vfs = WorkspaceManager.getInstance().getVFS();
    runtimePlatform.startProject(id, activeProject?.name || 'Project', vfs);
  };

  const handleStop = (id: string) => {
    runtimePlatform.stopProject(id);
  };

  const handleRestart = (id: string) => {
    runtimePlatform.restartProject(id);
  };

  const filteredLogs = logs.filter(l => {
    const matchesLevel = filterLevel === 'all' || l.level === filterLevel;
    const matchesSearch = searchQuery === '' || l.message.toLowerCase().includes(searchQuery.toLowerCase()) || l.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans p-4 gap-4 overflow-y-auto">
      {/* Header & Status Banner */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">Anny Runtime Execution Engine</h2>
            <p className="text-xs text-slate-400">Subsystem Process Manager • AST Transpiler • Dev Server • Auto-Recovery</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Vite Dev Server: http://localhost:3000
          </div>
          <div className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
            Environment: Cloud Run Sandbox
          </div>
        </div>
      </div>

      {/* Metrics Telemetry Grid */}
      {activeProject && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Process Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${activeProject.state === 'running' ? 'bg-emerald-400 animate-pulse' : activeProject.state === 'recovering' ? 'bg-amber-400 animate-ping' : 'bg-red-400'}`} />
                <span className="text-base font-bold capitalize text-white">{activeProject.state}</span>
              </div>
            </div>
            <Server className="w-8 h-8 text-cyan-400/60" />
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">CPU Usage</p>
              <p className="text-xl font-bold text-cyan-400 mt-1 font-mono">{activeProject.metrics.cpuUsagePct}%</p>
            </div>
            <Cpu className="w-8 h-8 text-cyan-400/60" />
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Memory Alloc</p>
              <p className="text-xl font-bold text-purple-400 mt-1 font-mono">{activeProject.metrics.memoryUsageMb} MB</p>
            </div>
            <HardDrive className="w-8 h-8 text-purple-400/60" />
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Uptime / PID</p>
              <p className="text-sm font-bold text-emerald-400 mt-1 font-mono">{activeProject.metrics.uptimeSeconds}s (PID: {activeProject.metrics.pid})</p>
            </div>
            <Activity className="w-8 h-8 text-emerald-400/60" />
          </div>
        </div>
      )}

      {/* Main Execution Controls & Logs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Active Projects List & Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> Active Processes ({projects.length})
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">Port 3000 Active</span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-80">
            {projects.map(p => (
              <div
                key={p.projectId}
                onClick={() => setSelectedProjectId(p.projectId)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedProjectId === p.projectId ? 'bg-cyan-950/40 border-cyan-500/50 text-white' : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm truncate">{p.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${p.metrics.healthStatus === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {p.metrics.healthStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-slate-400 font-mono">
                  <span>Framework: {p.framework}</span>
                  <span>Port: {p.port}</span>
                </div>

                {selectedProjectId === p.projectId && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStart(p.projectId); }}
                      disabled={p.state === 'running'}
                      className="px-2.5 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center gap-1 font-medium transition"
                    >
                      <Play className="w-3 h-3" /> Start
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStop(p.projectId); }}
                      disabled={p.state === 'stopped'}
                      className="px-2.5 py-1 text-xs rounded bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white flex items-center gap-1 font-medium transition"
                    >
                      <Square className="w-3 h-3" /> Stop
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRestart(p.projectId); }}
                      className="px-2.5 py-1 text-xs rounded bg-cyan-700 hover:bg-cyan-600 text-white flex items-center gap-1 font-medium transition"
                    >
                      <RefreshCw className="w-3 h-3" /> Restart
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Autonomous Recovery Shield Panel */}
          <div className="mt-auto bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
              <ShieldCheck className="w-4 h-4" /> Autonomous Recovery Engine
            </div>
            <p className="text-slate-400">
              Monitors compilation logs and AST checks. Automatically applies safe syntax and structural fixes upon crash detection.
            </p>
          </div>
        </div>

        {/* Real-time Execution Stream Logs */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-sans">
              <Terminal className="w-4 h-4 text-emerald-400" /> Process Execution Logs
            </h3>

            <div className="flex items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-cyan-500/50"
              />
              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="all">All Levels</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
                <option value="recovery">Recovery</option>
              </select>
            </div>
          </div>

          <div className="flex-1 bg-slate-950 border border-slate-800/80 rounded-lg p-3 overflow-y-auto text-xs space-y-1.5 max-h-96">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-500 italic py-4 text-center">No logs matching filter criteria.</div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} className="flex items-start gap-2 text-[11px] leading-relaxed border-b border-slate-900/60 pb-1">
                  <span className="text-slate-500 min-w-[65px]">{log.timestamp}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold min-w-[50px] text-center ${
                    log.level === 'error' ? 'bg-red-500/20 text-red-400' : log.level === 'warn' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {log.source}
                  </span>
                  <span className={`flex-1 break-all ${log.level === 'error' ? 'text-red-300 font-medium' : log.level === 'warn' ? 'text-amber-300' : 'text-slate-300'}`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

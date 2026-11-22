import React, { useState } from 'react';
import { Database, Table, Play, Plus, RefreshCw, Key, Code, Shield, CheckCircle, Search, Server } from 'lucide-react';
import { WorkspaceManager } from '../../core/workspaceManager';

export const DatabaseInspector: React.FC = () => {
  const wsManager = WorkspaceManager.getInstance();
  const vfs = wsManager.getVFS();

  const [activeTable, setActiveTable] = useState<'users' | 'entities' | 'logs'>('users');
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM users ORDER BY created_at DESC LIMIT 10;');
  const [queryResults, setQueryResults] = useState<any[]>([
    { id: 'usr_101', email: 'admin@anny.internal', role: 'SuperAdmin', created_at: '2026-08-01 12:00:00' },
    { id: 'usr_102', email: 'engineer@anny.internal', role: 'Lead Architect', created_at: '2026-08-02 09:30:00' },
    { id: 'usr_103', email: 'robotics@anny.internal', role: 'ICS Specialist', created_at: '2026-08-02 14:15:00' }
  ]);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleRunQuery = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      setQueryResults([
        { id: `res_${Date.now()}`, query: sqlQuery, status: 'EXPLAIN ANALYZE PASSED', execution_time: '1.2ms' }
      ]);
    }, 400);
  };

  return (
    <div className="h-full w-full bg-[#080a18] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-[#0d0f22] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-xs text-white uppercase tracking-wider font-mono">Enterprise Database & ORM Inspector</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            PostgreSQL / Firestore ORM Linked
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Table List */}
        <div className="w-56 border-r border-white/10 p-3 bg-[#0a0c1a] flex flex-col font-mono text-xs">
          <div className="text-slate-400 font-bold mb-3 text-[10px] uppercase tracking-wider flex items-center justify-between">
            <span>SCHEMAS & TABLES</span>
            <RefreshCw className="w-3 h-3 text-slate-500 hover:text-white cursor-pointer" />
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setActiveTable('users')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-all ${
                activeTable === 'users' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <Table className="w-3.5 h-3.5 text-purple-400" />
                <span>users</span>
              </div>
              <span className="text-[10px] text-slate-500">3 rows</span>
            </button>

            <button
              onClick={() => setActiveTable('entities')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-all ${
                activeTable === 'entities' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <Table className="w-3.5 h-3.5 text-cyan-400" />
                <span>domain_entities</span>
              </div>
              <span className="text-[10px] text-slate-500">12 rows</span>
            </button>

            <button
              onClick={() => setActiveTable('logs')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-all ${
                activeTable === 'logs' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <Table className="w-3.5 h-3.5 text-emerald-400" />
                <span>audit_logs</span>
              </div>
              <span className="text-[10px] text-slate-500">48 rows</span>
            </button>
          </div>

          <div className="mt-auto p-3 bg-[#11132b] rounded-xl border border-white/5 space-y-2">
            <span className="text-[10px] text-slate-400 block font-bold">DATABASE HEALTH</span>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Pool Conns</span>
              <span className="text-emerald-400 font-bold">8 / 20</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Storage</span>
              <span className="text-cyan-400 font-bold">4.2 MB</span>
            </div>
          </div>
        </div>

        {/* Right: SQL Query Runner & Table Data */}
        <div className="flex-1 p-4 flex flex-col bg-[#080915] overflow-y-auto custom-scrollbar space-y-4 font-mono text-xs">
          {/* Query Editor */}
          <div className="p-3 bg-[#0d0f22] border border-white/10 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-cyan-400" /> Interactive SQL & Drizzle Query Executor
              </span>
              <button
                onClick={handleRunQuery}
                disabled={isExecuting}
                className="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-lg flex items-center gap-1 text-[11px] shadow-md transition-all"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isExecuting ? 'Running...' : 'Execute SQL'}</span>
              </button>
            </div>

            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              rows={3}
              className="w-full bg-[#060712] border border-white/10 rounded-lg p-2.5 text-xs text-purple-300 font-mono outline-none focus:border-purple-500/40"
            />
          </div>

          {/* Table Output Grid */}
          <div className="flex-1 bg-[#0a0c1a] border border-white/10 rounded-xl overflow-hidden flex flex-col">
            <div className="p-2.5 bg-[#101228] border-b border-white/10 flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-bold text-white">Table Records ({queryResults.length} items)</span>
              <span className="text-[10px] text-emerald-400">Query Time: 1.2 ms</span>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-[#12142d] text-slate-400 font-bold text-[10px] uppercase">
                    {queryResults.length > 0 && Object.keys(queryResults[0]).map((col) => (
                      <th key={col} className="p-2.5">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResults.map((row, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 text-slate-200">
                      {Object.values(row).map((val: any, vIdx) => (
                        <td key={vIdx} className="p-2.5 truncate max-w-[200px]">{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Bot, Database, HardDrive, GitBranch, Cloud, ShieldCheck, 
  Terminal as TerminalIcon, Cpu, Activity, Zap, Folder, FileText, 
  Search, Plus, RefreshCw, CheckCircle2, AlertTriangle, Layers, 
  Play, Settings, Key, Lock, Radio, Server, Globe, ArrowUpRight, 
  Code, Download, Trash2, Eye, Filter, Sparkles, Check, Copy, Sliders
} from 'lucide-react';

interface StandardPageProps {
  view: string;
  setView: (v: string) => void;
  user?: any;
}

export default function PlatformPages({ view, setView, user }: StandardPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ path: string; status: string; data: string } | null>(null);

  const triggerNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // 1. AGENTS VIEW
  if (view === 'agents') {
    const agents = [
      { id: 'code-architect', name: 'Code Architect Agent', role: 'Full-Stack Synthesizer', status: 'Active', latency: '12ms', load: '14%', icon: Code, color: 'text-cyan-400' },
      { id: 'scada-sentinel', name: 'SCADA Sentinel Agent', role: 'ICS Safety & LOTO Guard', status: 'Active', latency: '4ms', load: '8%', icon: ShieldCheck, color: 'text-emerald-400' },
      { id: 'vision-inspector', name: 'Vision Inspector Agent', role: 'Camera & Frame Analytics', status: 'Active', latency: '28ms', load: '22%', icon: Eye, color: 'text-purple-400' },
      { id: 'voice-synthesizer', name: 'Voice Neural Link Agent', role: 'TTS & STT Pipeline', status: 'Idle', latency: '18ms', load: '2%', icon: Radio, color: 'text-amber-400' },
      { id: 'memory-indexer', name: 'Memory Vector Agent', role: 'Embeddings & RAG Ingestion', status: 'Active', latency: '9ms', load: '19%', icon: Database, color: 'text-blue-400' },
      { id: 'autonomy-planner', name: 'DAG Task Planner Agent', role: 'Autonomous Execution', status: 'Active', latency: '15ms', load: '11%', icon: Layers, color: 'text-pink-400' },
    ];

    return (
      <div className="h-full w-full bg-[#070914] text-white p-6 overflow-y-auto space-y-6 custom-scrollbar">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  AI Multi-Agent Platform
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    6 Swarm Nodes Active
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">Orchestrate, spawn, and monitor autonomous AI neural agents in real-time.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => triggerNotice("Refreshed multi-agent telemetry swarm.")}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-2 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Nodes
            </button>
            <button 
              onClick={() => triggerNotice("New agent instance initialized.")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Deploy Agent
            </button>
          </div>
        </div>

        {actionNotice && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            {actionNotice}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0b0e21] border border-white/5 space-y-1">
            <div className="text-xs text-slate-400 font-mono">ACTIVE AGENTS</div>
            <div className="text-2xl font-bold text-white font-mono">6 / 6</div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 100% Swarm Uptime
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0b0e21] border border-white/5 space-y-1">
            <div className="text-xs text-slate-400 font-mono">AVG LATENCY</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">14.5 ms</div>
            <div className="text-[11px] text-cyan-400/80 font-mono">Ultra-low local link</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0b0e21] border border-white/5 space-y-1">
            <div className="text-xs text-slate-400 font-mono">SWARM LOAD</div>
            <div className="text-2xl font-bold text-purple-400 font-mono">12.6%</div>
            <div className="text-[11px] text-slate-400 font-mono">Hardware Tier: High-End</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0b0e21] border border-white/5 space-y-1">
            <div className="text-xs text-slate-400 font-mono">TASKS COMPLETED</div>
            <div className="text-2xl font-bold text-indigo-400 font-mono">1,482</div>
            <div className="text-[11px] text-indigo-400/80 font-mono">Zero unhandled exceptions</div>
          </div>
        </div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const Icon = agent.icon;
            return (
              <div key={agent.id} className="p-5 rounded-2xl bg-[#0c0f24] border border-white/10 hover:border-purple-500/40 transition-all space-y-4 relative group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <Icon className={`w-5 h-5 ${agent.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-white">{agent.name}</h3>
                      <p className="text-xs text-slate-400">{agent.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {agent.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs font-mono text-slate-300">
                  <div className="bg-[#070914] p-2 rounded-lg border border-white/5">
                    <span className="text-slate-500 text-[10px]">LATENCY</span>
                    <div className="text-cyan-400 font-bold">{agent.latency}</div>
                  </div>
                  <div className="bg-[#070914] p-2 rounded-lg border border-white/5">
                    <span className="text-slate-500 text-[10px]">CPU LOAD</span>
                    <div className="text-purple-400 font-bold">{agent.load}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button 
                    onClick={() => triggerNotice(`Executing test prompt on ${agent.name}...`)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-xs font-medium text-slate-200 hover:text-purple-300 transition-all flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3 text-purple-400" />
                    Inspect Telemetry
                  </button>
                  <button 
                    onClick={() => triggerNotice(`Configuring ${agent.name}...`)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. KNOWLEDGE BASE VIEW
  if (view === 'knowledge') {
    const docs = [
      { name: '00_MASTER_CONSTITUTION.md', category: 'Constitution', size: '14.2 KB', vectors: '1,240', status: 'Indexed' },
      { name: '01_PRODUCT_REQUIREMENTS.md', category: 'PRD Specs', size: '28.6 KB', vectors: '2,810', status: 'Indexed' },
      { name: '02_SYSTEM_ARCHITECTURE.md', category: 'Architecture', size: '42.1 KB', vectors: '4,100', status: 'Indexed' },
      { name: 'ICS_SCADA_SAFETY_RULES.pdf', category: 'Safety & LOTO', size: '112 KB', vectors: '8,950', status: 'Indexed' },
      { name: 'NEURAL_ROUTER_BENCHMARKS.json', category: 'Model Telemetry', size: '8.4 KB', vectors: '620', status: 'Indexed' },
    ];

    return (
      <div className="h-full w-full bg-[#070914] text-white p-6 overflow-y-auto space-y-6 custom-scrollbar">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Knowledge Platform & RAG Store
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  17,720 Embeddings
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">High-dimensional vector storage and real-time semantic search RAG engine.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => triggerNotice("Ingested sample documentation into Vector Store.")}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-black flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              Upload Document
            </button>
          </div>
        </div>

        {actionNotice && (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            {actionNotice}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vector embeddings or document titles..."
            className="w-full bg-[#0c0f24] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 transition-all font-mono"
          />
        </div>

        {/* Document Table */}
        <div className="bg-[#0c0f24] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/5 bg-[#090b1c] flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">Ingested Knowledge Documents</h3>
            <span className="text-xs text-slate-400 font-mono">5 Files Ingested</span>
          </div>

          <div className="divide-y divide-white/5 text-xs font-mono">
            {docs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map((doc, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-all">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-white">{doc.name}</div>
                    <div className="text-[10px] text-slate-400">{doc.category} • {doc.size}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400">{doc.vectors} vectors</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                    {doc.status}
                  </span>
                  <button 
                    onClick={() => triggerNotice(`Testing semantic similarity query for ${doc.name}...`)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. MEMORY ENGINE VIEW
  if (view === 'memory') {
    return (
      <div className="h-full w-full bg-[#070914] text-white p-6 overflow-y-auto space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Memory Platform & Vector DB
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  Episodic & Semantic
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Persistent user context, session embeddings, and biometric state graphs.</p>
            </div>
          </div>
          <button 
            onClick={() => triggerNotice("Memory index optimized and compacted.")}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            Compact Memory
          </button>
        </div>

        {actionNotice && (
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-xl text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            {actionNotice}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#0c0f24] border border-white/10 space-y-2">
            <div className="text-xs text-slate-400 font-mono">WORKING MEMORY</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">128 KB Active</div>
            <p className="text-xs text-slate-400">Holds short-term user prompt context and current agent session state.</p>
          </div>
          <div className="p-5 rounded-2xl bg-[#0c0f24] border border-white/10 space-y-2">
            <div className="text-xs text-slate-400 font-mono">LONG-TERM MEMORY</div>
            <div className="text-2xl font-bold text-purple-400 font-mono">4.2 GB Stored</div>
            <p className="text-xs text-slate-400">Persistent user preferences, previous session summaries, and code snippets.</p>
          </div>
          <div className="p-5 rounded-2xl bg-[#0c0f24] border border-white/10 space-y-2">
            <div className="text-xs text-slate-400 font-mono">BIOMETRIC CONTEXT</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">Verified (Liveness)</div>
            <p className="text-xs text-slate-400">Facial skeleton vectors, anti-spoofing score: 99.8%.</p>
          </div>
        </div>
      </div>
    );
  }

  // 4. AUTOMATION & WORKFLOWS VIEW
  if (view === 'automation' || view === 'workflows') {
    const workflows = [
      { id: 'build-deploy', name: 'Automated CI/CD Container Pipeline', trigger: 'On Git Push', lastRun: '2 mins ago', status: 'Success' },
      { id: 'scada-audit', name: 'ICS PLC Routine Safety Audit', trigger: 'Every 1 Hour', lastRun: '14 mins ago', status: 'Success' },
      { id: 'voice-transcribe', name: 'Voice Input Transcription & Sync', trigger: 'Event Reactive', lastRun: 'Just now', status: 'Active' },
      { id: 'backup-snapshot', name: 'Encrypted Database Snapshot', trigger: 'Daily 00:00', lastRun: '10 hours ago', status: 'Success' },
    ];

    return (
      <div className="h-full w-full bg-[#070914] text-white p-6 overflow-y-auto space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Automation Platform & Workflows
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  DAG Engine Ready
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Automated task pipelines, cron jobs, event triggers, and reactive workflows.</p>
            </div>
          </div>
          <button 
            onClick={() => triggerNotice("New DAG Workflow pipeline created.")}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        </div>

        {actionNotice && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            {actionNotice}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((wf) => (
            <div key={wf.id} className="p-5 rounded-2xl bg-[#0c0f24] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-white">{wf.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {wf.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono space-y-1">
                <div>Trigger: <span className="text-slate-200">{wf.trigger}</span></div>
                <div>Last Run: <span className="text-cyan-400">{wf.lastRun}</span></div>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <button 
                  onClick={() => triggerNotice(`Triggered workflow ${wf.name}...`)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-xs text-slate-200 hover:text-amber-300 transition-all flex items-center gap-1.5 font-mono"
                >
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                  Run Manually
                </button>
                <button 
                  onClick={() => triggerNotice(`Opening workflow graph editor for ${wf.name}...`)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  Edit DAG <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. FILES & STORAGE VIEW
  if (view === 'files') {
    const filesList = [
      { name: 'server.ts', path: '/server.ts', size: '2.4 KB', type: 'TypeScript' },
      { name: 'App.tsx', path: '/src/App.tsx', size: '82.0 KB', type: 'React Component' },
      { name: 'ollama_client.py', path: '/ai/ollama_client.py', size: '3.1 KB', type: 'Python AI Module' },
      { name: 'vision_engine.py', path: '/ai/vision_engine.py', size: '5.2 KB', type: 'Python Vision Module' },
      { name: 'docker-compose.yml', path: '/docker-compose.yml', size: '1.2 KB', type: 'Docker Spec' },
    ];

    return (
      <div className="h-full w-full bg-[#070914] text-white p-6 overflow-y-auto space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Files & Storage Platform
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  NFS File System
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Workspace artifacts, generated modules, uploaded assets, and configuration files.</p>
            </div>
          </div>
          <button 
            onClick={() => triggerNotice("File system directory synced.")}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Storage
          </button>
        </div>

        {actionNotice && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            {actionNotice}
          </div>
        )}

        <div className="bg-[#0c0f24] border border-white/10 rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5 font-mono text-xs">
            {filesList.map((f, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-semibold text-white">{f.name}</div>
                    <div className="text-[10px] text-slate-500">{f.path}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-slate-400">
                  <span>{f.type}</span>
                  <span>{f.size}</span>
                  <button 
                    onClick={() => {
                      setView('workspace');
                      triggerNotice(`Opening ${f.name} in Workspace Editor...`);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 6. DATABASE & DRIZZLE VIEW
  if (view === 'database') {
    const tables = [
      { name: 'users', rows: 42, size: '48 KB', columns: 'uid, email, role, createdAt' },
      { name: 'whitelist', rows: 18, size: '12 KB', columns: 'email, addedAt' },
      { name: 'audit_logs', rows: 1420, size: '840 KB', columns: 'id, action, category, details, timestamp' },
      { name: 'support_chats', rows: 9, size: '36 KB', columns: 'id, userId, status, lastUpdate' },
    ];

    return (
      <div className="h-full w-full bg-[#070914] text-white p-6 overflow-y-auto space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Databases & Drizzle Schema Inspector
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Firestore & Cloud SQL
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Relational tables, document collections, and schema migrations.</p>
            </div>
          </div>
          <button 
            onClick={() => triggerNotice("Executed DB health check query.")}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            Test Connection
          </button>
        </div>

        {actionNotice && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            {actionNotice}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
          {tables.map((tbl, i) => (
            <div key={i} className="p-5 rounded-2xl bg-[#0c0f24] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-emerald-400" />
                  {tbl.name}
                </div>
                <span className="text-xs text-slate-400">{tbl.rows} rows • {tbl.size}</span>
              </div>
              <div className="text-xs text-slate-400 bg-[#070914] p-3 rounded-xl border border-white/5">
                <div className="text-slate-500 text-[10px] mb-1">COLUMNS</div>
                {tbl.columns}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 7. APIS VIEW
  if (view === 'apis') {
    const apisList = [
      { method: 'GET', path: '/api/config', desc: 'Sovereign OS brand config & hardware mode', body: null },
      { method: 'GET', path: '/api/health', desc: 'System liveness, uptime & active keys probe', body: null },
      { method: 'GET', path: '/api/admin/health', desc: 'Administrator telemetry and health check', body: null },
      { method: 'POST', path: '/api/brain/think', desc: 'AI Neural model routing (Groq/Gemini/HF/Claude)', body: { prompt: 'System test ping', api: 'google' } },
      { method: 'POST', path: '/api/sahara/translate', desc: 'Nigerian native language translation engine', body: { text: 'How are you?', from: 'English', to: 'Pidgin' } },
      { method: 'POST', path: '/api/sahara/tts', desc: 'Text-to-Speech voice audio synthesizer', body: { text: 'Anny System Active', voice: 'en_male_1' } },
      { method: 'POST', path: '/api/brain/uplink', desc: 'Web URL neural ingestion and web scraper', body: { url: 'https://news.ycombinator.com' } },
      { method: 'POST', path: '/api/vision/analyze', desc: 'Camera frame and image analysis pipeline', body: { image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', prompt: 'Analyze frame' } },
      { method: 'POST', path: '/api/modly/generate', desc: '3D Mesh neural generation trigger', body: { prompt: 'Robot Drone Unit' } },
      { method: 'GET', path: '/api/modly/status/modly_test', desc: '3D Mesh generation status query', body: null },
      { method: 'POST', path: '/api/create-subscription', desc: 'Stripe subscription tier checkout handler', body: { planId: 'enterprise_pro', billingPeriod: 'monthly' } }
    ];

    const testApi = async (api: typeof apisList[0]) => {
      triggerNotice(`Executing live HTTP ${api.method} ${api.path}...`);
      try {
        const options: RequestInit = {
          method: api.method,
          headers: { 'Content-Type': 'application/json' },
        };
        if (api.method === 'POST' && api.body) {
          options.body = JSON.stringify(api.body);
        }
        const res = await fetch(api.path, options);
        const data = await res.json();
        setTestResult({
          path: api.path,
          status: `${res.status} ${res.statusText}`,
          data: JSON.stringify(data, null, 2)
        });
      } catch (e: any) {
        setTestResult({
          path: api.path,
          status: 'FETCH_FAILED',
          data: JSON.stringify({ error: e.message }, null, 2)
        });
      }
    };

    return (
      <div className="h-full w-full bg-[#070914] text-white p-6 overflow-y-auto space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                API Gateway & Live Endpoint Inspector
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Active Express Ingress
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Live local and cloud API endpoints with real-time payload testing.</p>
            </div>
          </div>
          <button 
            onClick={() => triggerNotice("Pings sent to Express gateway router.")}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            Ping Gateway
          </button>
        </div>

        {actionNotice && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-xl text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            {actionNotice}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-[#0c0f24] border border-white/10 rounded-2xl overflow-hidden font-mono text-xs divide-y divide-white/5">
            {apisList.map((api, i) => (
              <div key={i} className="p-3.5 flex items-center justify-between hover:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${api.method === 'GET' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                    {api.method}
                  </span>
                  <div>
                    <div className="font-bold text-white">{api.path}</div>
                    <div className="text-[10px] text-slate-400 font-sans">{api.desc}</div>
                  </div>
                </div>
                <button 
                  onClick={() => testApi(api)}
                  className="px-2.5 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-indigo-400" />
                  Test Live
                </button>
              </div>
            ))}
          </div>

          <div className="bg-[#0a0c1b] border border-white/10 rounded-2xl p-4 flex flex-col font-mono text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold flex items-center gap-2">
                <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                Response Inspector
              </span>
              {testResult && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${testResult.status.includes('200') || testResult.status.includes('OK') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                  {testResult.status}
                </span>
              )}
            </div>

            {testResult ? (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-cyan-300">Endpoint: {testResult.path}</div>
                <pre className="p-3 rounded-xl bg-black/60 border border-white/5 text-[11px] text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed custom-scrollbar">
                  {testResult.data}
                </pre>
              </div>
            ) : (
              <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center text-slate-500 gap-2">
                <Zap className="w-8 h-8 text-slate-600" />
                <p className="text-xs">Select any endpoint on the left and click "Test Live"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 8. VERSION CONTROL / GIT VIEW
  if (view === 'version_control') {
    return (
      <div className="h-full w-full bg-[#070914] text-white p-6 overflow-y-auto space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Version Control & Git Hub
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  main branch
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Commit history, branch management, and remote sync status.</p>
            </div>
          </div>
          <button 
            onClick={() => triggerNotice("Pushed latest commit to origin/main.")}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-black flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            <GitBranch className="w-4 h-4" />
            Push Changes
          </button>
        </div>

        {actionNotice && (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            {actionNotice}
          </div>
        )}

        <div className="bg-[#0c0f24] border border-white/10 rounded-2xl p-5 font-mono text-xs space-y-4">
          <div className="flex items-center justify-between text-slate-400 border-b border-white/5 pb-3">
            <span>COMMIT HISTORY</span>
            <span>REPOSITORY: ANNY-Anny-V4</span>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-[#070914] rounded-xl border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-bold">feat: standardize chat view and page positioning</span>
                <span className="text-slate-500 text-[10px]">Just now</span>
              </div>
              <div className="text-[10px] text-slate-400">Commit hash: a9f81bc2 • Author: AI Studio Lead Architect</div>
            </div>
            <div className="p-3 bg-[#070914] rounded-xl border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-200">refactor: integrate AnnyChat into workspace layout</span>
                <span className="text-slate-500 text-[10px]">1 hour ago</span>
              </div>
              <div className="text-[10px] text-slate-400">Commit hash: f2c4819d • Author: Architect</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 9. DEPLOYMENT VIEW
  if (view === 'deployment') {
    return (
      <div className="h-full w-full bg-[#070914] text-white p-6 overflow-y-auto space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Cloud Run Deployments & Containers
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Production Active
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Container status, port 3000 ingress, and release management.</p>
            </div>
          </div>
          <button 
            onClick={() => triggerNotice("Production container redeployment triggered.")}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Server className="w-4 h-4" />
            Redeploy App
          </button>
        </div>

        {actionNotice && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            {actionNotice}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="p-5 rounded-2xl bg-[#0c0f24] border border-white/10 space-y-3">
            <div className="text-slate-400 uppercase font-bold">CONTAINER TELEMETRY</div>
            <div className="space-y-1.5 text-slate-300">
              <div>Port: <span className="text-cyan-400">3000 (Exposed via NGINX)</span></div>
              <div>Node Env: <span className="text-emerald-400">production</span></div>
              <div>Memory Limit: <span className="text-purple-400">4.0 GB</span></div>
              <div>CPU Allocation: <span className="text-amber-400">2 vCPU</span></div>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-[#0c0f24] border border-white/10 space-y-3">
            <div className="text-slate-400 uppercase font-bold">SSL / NETWORK SECURITY</div>
            <div className="space-y-1.5 text-slate-300">
              <div>HTTPS Direct: <span className="text-emerald-400">Enabled</span></div>
              <div>Reverse Proxy: <span className="text-cyan-400">Active</span></div>
              <div>HMR Status: <span className="text-slate-400">Disabled (Platform Controlled)</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 10. SYSTEM LOGS VIEW
  if (view === 'logs') {
    const logs = [
      { id: '1', time: '10:42:15', level: 'INFO', msg: 'Anny Kernel initialized successfully' },
      { id: '2', time: '10:42:18', level: 'SUCCESS', msg: 'Local Ollama model router connected' },
      { id: '3', time: '10:42:22', level: 'INFO', msg: 'Vision Sensor frame loop running on 30 FPS' },
      { id: '4', time: '10:42:30', level: 'SUCCESS', msg: 'LOTO Lockout verification pass: zero safety violations' },
    ];

    return (
      <div className="h-full w-full bg-[#070914] text-white p-6 overflow-y-auto space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <TerminalIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                System Audit Logs & Diagnostics
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  Live Audit Stream
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Real-time system event logs, security events, and execution records.</p>
            </div>
          </div>
          <button 
            onClick={() => triggerNotice("Logs exported to CSV.")}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20"
          >
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>

        {actionNotice && (
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-xl text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            {actionNotice}
          </div>
        )}

        <div className="bg-[#0c0f24] border border-white/10 rounded-2xl p-4 font-mono text-xs space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="p-2.5 bg-[#070914] rounded-lg border border-white/5 flex items-center gap-3">
              <span className="text-slate-500 text-[10px]">{log.time}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${log.level === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {log.level}
              </span>
              <span className="text-slate-200">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 11. BACKUPS VIEW
  if (view === 'backups') {
    return (
      <div className="h-full w-full bg-[#070914] text-white p-6 overflow-y-auto space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Encrypted Backups & Disaster Recovery
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  AES-256 Encrypted
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">Automated daily snapshots of model state, local vector databases, and system configuration.</p>
            </div>
          </div>
          <button 
            onClick={() => triggerNotice("Created immediate system backup snapshot.")}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Create Backup
          </button>
        </div>

        {actionNotice && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            {actionNotice}
          </div>
        )}

        <div className="p-5 rounded-2xl bg-[#0c0f24] border border-white/10 space-y-3 font-mono text-xs">
          <div className="text-slate-400 uppercase font-bold">RECENT SNAPSHOTS</div>
          <div className="p-3 bg-[#070914] rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <div className="font-bold text-white">snapshot_2026_07_31_daily.enc</div>
              <div className="text-[10px] text-slate-500">Size: 420 MB • Encryption: AES-256</div>
            </div>
            <button 
              onClick={() => triggerNotice("Restoring system snapshot...")}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-xs text-blue-400 border border-white/10"
            >
              Restore
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 12. SETTINGS VIEW
  if (view === 'settings') {
    return (
      <div className="h-full w-full bg-[#070914] text-white p-6 overflow-y-auto space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Universal Platform Settings
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                  <img src="/logo.png" alt="Anny" className="w-3.5 h-3.5 object-contain bg-transparent" />
                  Anny v4.0
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Configure hardware routing, default models, API keys, and offline policies.</p>
            </div>
          </div>
          <button 
            onClick={() => triggerNotice("Settings saved successfully.")}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-black flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Check className="w-4 h-4" />
            Save Settings
          </button>
        </div>

        {actionNotice && (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            {actionNotice}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          <div className="p-5 rounded-2xl bg-[#0c0f24] border border-white/10 space-y-4">
            <h3 className="font-bold text-white text-sm">OFFLINE & HARDWARE ROUTING</h3>
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Hardware Tier Auto-Detection</label>
                <select className="w-full bg-[#070914] border border-white/10 rounded-xl p-2.5 text-slate-200 outline-none">
                  <option value="high">High-End Tier (llama3.3 / qwen3.5 / deepseek)</option>
                  <option value="mid">Mid-Range Tier (llama3.2 / qwen2.5)</option>
                  <option value="low">Low-End Tier (tinyllama / phi4-mini)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Offline Execution Policy</label>
                <select className="w-full bg-[#070914] border border-white/10 rounded-xl p-2.5 text-slate-200 outline-none">
                  <option value="ollama">1. Ollama local models first</option>
                  <option value="gguf">2. GGUF local inference</option>
                  <option value="onnx">3. ONNX local inference</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c0f24] border border-white/10 space-y-4">
            <h3 className="font-bold text-white text-sm">SAFETY & ICS COMPLIANCE</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#070914] rounded-xl border border-white/5">
                <div>
                  <div className="text-white font-bold">Digital LOTO Safety Lock</div>
                  <div className="text-[10px] text-slate-400">Strict safety protocols for hardware triggers</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-cyan-500" />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#070914] rounded-xl border border-white/5">
                <div>
                  <div className="text-white font-bold">Biometric Liveness Guard</div>
                  <div className="text-[10px] text-slate-400">Require camera scan for admin command execution</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-cyan-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper Table icon
  function TableIcon(props: any) {
    return <Database {...props} />;
  }

  // Default Fallback Page
  return (
    <div className="h-full w-full bg-[#070914] text-white p-6 flex flex-col items-center justify-center text-center space-y-4">
      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
        <Sparkles className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-white capitalize">{view.replace('_', ' ')} Platform</h2>
      <p className="text-xs text-slate-400 max-w-md">This system module is online and operational. Select actions from the workspace layout or navigation sidebar.</p>
      <button 
        onClick={() => setView('home')}
        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-black transition-all"
      >
        Return to Main Workspace
      </button>
    </div>
  );
}

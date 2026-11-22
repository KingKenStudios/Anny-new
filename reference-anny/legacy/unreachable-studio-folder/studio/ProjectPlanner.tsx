import React from 'react';
import { Layers, Cpu, Server, Database, ShieldCheck, ArrowRight, CheckCircle2, FileText, Code2, Globe, Box } from 'lucide-react';
import { MasterDevelopmentOrchestrator } from '../../core/masterDevelopmentOrchestrator';
import { WorkspaceManager } from '../../core/workspaceManager';

export const ProjectPlanner: React.FC = () => {
  const orchestrator = MasterDevelopmentOrchestrator.getInstance();
  const activePlan = orchestrator.getActivePlan();
  const wsManager = WorkspaceManager.getInstance();
  const activeWs = wsManager.getCurrentWorkspace();

  const pattern = activePlan?.pattern || 'Microservices & Full-Stack React';
  const techStack = activePlan?.techStack || { frontend: 'React + Vite', backend: 'Express / Node.js', database: 'PostgreSQL ORM', containerization: 'Docker Container' };

  return (
    <div className="h-full w-full bg-[#080a18] text-slate-200 flex flex-col font-sans overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* Blueprint Header Banner */}
      <div className="p-5 bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono text-[10px] uppercase font-bold tracking-wider">
            ARCHITECTURE BLUEPRINT
          </span>
          <h2 className="text-xl font-black text-white tracking-tight mt-2">{activeWs?.name || 'Anny Super Application'}</h2>
          <p className="text-xs text-slate-300 mt-1 font-mono">
            Pattern: {pattern} • Stack: {techStack.frontend} + {techStack.backend} + {techStack.database}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            VFS AST Verified
          </span>
        </div>
      </div>

      {/* Tech Stack Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0a0c1a] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs font-mono uppercase">
            <Globe className="w-4 h-4" /> Frontend Tier
          </div>
          <p className="text-sm font-bold text-white">{techStack.frontend}</p>
          <p className="text-[11px] text-slate-400">Single Page Application layout powered by Vite HMR and Tailwind CSS styling.</p>
        </div>

        <div className="p-4 bg-[#0a0c1a] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs font-mono uppercase">
            <Cpu className="w-4 h-4" /> Backend API Tier
          </div>
          <p className="text-sm font-bold text-white">{techStack.backend}</p>
          <p className="text-[11px] text-slate-400">Express Node.js HTTP router on port 3000 mapped to Anny system bus.</p>
        </div>

        <div className="p-4 bg-[#0a0c1a] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono uppercase">
            <Database className="w-4 h-4" /> Persistence Tier
          </div>
          <p className="text-sm font-bold text-white">{techStack.database}</p>
          <p className="text-[11px] text-slate-400">Offline-first local storage fallback with Cloud Firestore / Postgres ORM sync.</p>
        </div>

        <div className="p-4 bg-[#0a0c1a] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono uppercase">
            <Box className="w-4 h-4" /> Container Tier
          </div>
          <p className="text-sm font-bold text-white">{techStack.containerization}</p>
          <p className="text-[11px] text-slate-400">Dockerized container listening on port 3000 behind Nginx reverse proxy.</p>
        </div>
      </div>

      {/* Visual System Flow Topology */}
      <div className="p-5 bg-[#0a0c1a] border border-white/10 rounded-2xl space-y-4">
        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" /> Subsystem Data Flow Topology
        </h3>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-[#050610] border border-white/5 rounded-xl font-mono text-xs">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-center w-full md:w-1/4">
            <span className="text-cyan-400 font-bold block">User Interface</span>
            <span className="text-[10px] text-slate-400">React + Vite SPA</span>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-500 hidden md:block shrink-0" />

          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-center w-full md:w-1/4">
            <span className="text-purple-300 font-bold block">API Router Gateway</span>
            <span className="text-[10px] text-slate-400">Express (Port 3000)</span>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-500 hidden md:block shrink-0" />

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center w-full md:w-1/4">
            <span className="text-amber-300 font-bold block">ORM Database</span>
            <span className="text-[10px] text-slate-400">{techStack.database}</span>
          </div>
        </div>
      </div>

      {/* Target Directory & Endpoints Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 bg-[#0a0c1a] border border-white/10 rounded-2xl space-y-3 font-mono text-xs">
          <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" /> Folder & File Hierarchy
          </h4>
          <ul className="space-y-1.5 text-slate-300 text-[11px]">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>/src/App.tsx - Primary Layout Component</span></li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>/src/api/routes.ts - Express Route Router</span></li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>/src/db/schema.ts - Database Schema Definitions</span></li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>/Dockerfile & docker-compose.yml - Container Manifests</span></li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>/ARCH_PLAN.md - Architectural Specification</span></li>
          </ul>
        </div>

        <div className="p-5 bg-[#0a0c1a] border border-white/10 rounded-2xl space-y-3 font-mono text-xs">
          <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" /> Designed API Endpoints
          </h4>
          <ul className="space-y-1.5 text-slate-300 text-[11px]">
            <li className="p-2 bg-[#050610] rounded-lg border border-white/5 flex justify-between">
              <span className="text-emerald-400 font-bold">GET /api/health</span>
              <span className="text-slate-400">Server Health Check</span>
            </li>
            <li className="p-2 bg-[#050610] rounded-lg border border-white/5 flex justify-between">
              <span className="text-emerald-400 font-bold">GET /api/system</span>
              <span className="text-slate-400">Telemetry Metrics</span>
            </li>
            <li className="p-2 bg-[#050610] rounded-lg border border-white/5 flex justify-between">
              <span className="text-purple-300 font-bold">POST /api/action</span>
              <span className="text-slate-400">Domain Operation</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

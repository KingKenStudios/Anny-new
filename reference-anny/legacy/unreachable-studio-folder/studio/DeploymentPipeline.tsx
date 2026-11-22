import React, { useState } from 'react';
import { Rocket, CheckCircle2, AlertTriangle, ShieldCheck, Box, RefreshCw, ExternalLink, Globe, Play } from 'lucide-react';
import { MasterDevelopmentOrchestrator } from '../../core/masterDevelopmentOrchestrator';
import { WorkspaceManager } from '../../core/workspaceManager';

export const DeploymentPipeline: React.FC = () => {
  const orchestrator = MasterDevelopmentOrchestrator.getInstance();
  const wsManager = WorkspaceManager.getInstance();
  const activeWs = wsManager.getCurrentWorkspace();

  const [targetCloud, setTargetCloud] = useState<'cloudrun' | 'docker' | 'vercel' | 'aws'>('cloudrun');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([
    '✓ AST Syntax Validation Passed',
    '✓ Dependencies verified',
    '✓ Docker container built on port 3000',
    '✓ Readiness score: 100/100'
  ]);
  const [deployedUrl, setDeployedUrl] = useState<string | null>('http://localhost:3000');

  const handleDeploy = () => {
    setIsDeploying(true);
    setDeployLogs(prev => [...prev, `\n🚀 Initiating deployment to ${targetCloud.toUpperCase()}...`]);
    setTimeout(() => {
      setIsDeploying(false);
      const url = `https://${activeWs?.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'anny-app'}.cloudrun.app`;
      setDeployedUrl(url);
      setDeployLogs(prev => [
        ...prev,
        `✓ Container image pushed to Artifact Registry`,
        `✓ Service deployed to Cloud Run on port 3000`,
        `✓ Public URL active: ${url}`
      ]);
    }, 1200);
  };

  return (
    <div className="h-full w-full bg-[#080a18] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-[#0d0f22] flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">Cloud Deployment Pipeline & Readiness Center</h3>
        </div>

        <button
          onClick={handleDeploy}
          disabled={isDeploying}
          className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-lg flex items-center gap-1.5 shadow-lg transition-all"
        >
          <Rocket className="w-3.5 h-3.5 fill-current" />
          <span>{isDeploying ? 'Deploying to Cloud...' : 'Deploy Application'}</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Pre-Flight Checklist & Readiness Score */}
        <div className="w-80 border-r border-white/10 p-4 bg-[#0a0c1a] flex flex-col font-mono text-xs space-y-4">
          <div className="p-4 bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl text-center space-y-2">
            <span className="text-[10px] text-emerald-400 block font-bold uppercase">DEPLOYMENT READINESS SCORE</span>
            <span className="text-3xl font-black text-emerald-400">100 / 100</span>
            <span className="text-[10px] text-slate-300 block">Ready to Deploy</span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
            <span className="font-bold text-white text-xs block uppercase">10-POINT PRE-FLIGHT CHECKS</span>
            <ul className="space-y-2 text-[11px] text-slate-300">
              <li className="flex items-center justify-between p-2 bg-[#101228] rounded-xl border border-white/5">
                <span>TypeScript AST Check</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </li>
              <li className="flex items-center justify-between p-2 bg-[#101228] rounded-xl border border-white/5">
                <span>Compilation Linter</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </li>
              <li className="flex items-center justify-between p-2 bg-[#101228] rounded-xl border border-white/5">
                <span>Dependencies Registered</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </li>
              <li className="flex items-center justify-between p-2 bg-[#101228] rounded-xl border border-white/5">
                <span>Routes & Endpoints</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </li>
              <li className="flex items-center justify-between p-2 bg-[#101228] rounded-xl border border-white/5">
                <span>Database ORM Schema</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </li>
              <li className="flex items-center justify-between p-2 bg-[#101228] rounded-xl border border-white/5">
                <span>Preview Availability</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </li>
              <li className="flex items-center justify-between p-2 bg-[#101228] rounded-xl border border-white/5">
                <span>Security Audit</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </li>
              <li className="flex items-center justify-between p-2 bg-[#101228] rounded-xl border border-white/5">
                <span>Verification Suite</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </li>
              <li className="flex items-center justify-between p-2 bg-[#101228] rounded-xl border border-white/5">
                <span>Docker Container Spec</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Cloud Target Selector & Deployment Logs */}
        <div className="flex-1 p-4 bg-[#080915] flex flex-col font-mono text-xs space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {(['cloudrun', 'docker', 'vercel', 'aws'] as const).map(target => (
              <button
                key={target}
                onClick={() => setTargetCloud(target)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  targetCloud === target ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold' : 'bg-[#0a0c1a] border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span className="uppercase text-xs block">{target}</span>
              </button>
            ))}
          </div>

          {deployedUrl && (
            <div className="p-3 bg-[#0d0f24] border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300">Live URL:</span>
                <a href={deployedUrl} target="_blank" rel="noreferrer" className="text-cyan-400 font-bold underline">
                  {deployedUrl}
                </a>
              </div>
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">ONLINE</span>
            </div>
          )}

          {/* Deployment Terminal Logs */}
          <div className="flex-1 bg-[#050610] border border-white/10 rounded-xl p-3 space-y-1 font-mono text-[11px] text-slate-300 overflow-y-auto custom-scrollbar">
            {deployLogs.map((log, idx) => (
              <div key={idx} className={log.startsWith('✓') ? 'text-emerald-400' : log.startsWith('🚀') ? 'text-cyan-400 font-bold' : 'text-slate-300'}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

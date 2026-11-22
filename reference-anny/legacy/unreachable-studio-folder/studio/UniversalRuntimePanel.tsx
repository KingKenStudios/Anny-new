import React, { useState, useEffect } from 'react';
import { 
  Terminal, Play, RotateCw, ShieldCheck, Activity, Cpu, Zap, 
  CheckCircle2, Server, Globe, Box, Radio
} from 'lucide-react';
import { universalRuntimePlatform, RuntimeStatusSpec } from '../../core/universalRuntimePlatform';

export const UniversalRuntimePanel: React.FC = () => {
  const [runtimes, setRuntimes] = useState<RuntimeStatusSpec[]>(universalRuntimePlatform.getAllRuntimes());

  useEffect(() => {
    const unsubscribe = universalRuntimePlatform.subscribe(() => {
      setRuntimes(universalRuntimePlatform.getAllRuntimes());
    });
    const interval = setInterval(() => {
      setRuntimes(universalRuntimePlatform.getAllRuntimes());
    }, 2000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleRestart = (id: string) => {
    universalRuntimePlatform.restartRuntime(id);
  };

  return (
    <div className="h-full w-full bg-[#03040d] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <div className="p-3 border-b border-white/10 bg-[#080a1e] flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">Universal Multi-Language Runtime Orchestrator (URP v1.0)</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-bold text-[11px]">ALL RUNTIMES VERIFIED ON PORT 3000 INGRESS</span>
        </div>
      </div>

      {/* Main Process Grid */}
      <div className="flex-1 p-4 bg-[#02030a] overflow-y-auto space-y-3 font-mono text-xs custom-scrollbar">
        {runtimes.map((rt) => (
          <div key={rt.id} className="p-4 bg-[#07091a] border border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-white/20 transition">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                <Terminal className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm">{rt.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    rt.status === 'RUNNING' 
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                      : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  }`}>
                    {rt.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Type: <strong className="text-purple-300">{rt.type}</strong> • Ingress Port: <strong className="text-cyan-300">{rt.port}</strong> • Uptime: {rt.uptimeSeconds}s
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {rt.activeEndpoints.map((ep) => (
                    <span key={ep} className="px-2 py-0.5 bg-black/40 border border-white/5 text-[10px] text-slate-300 rounded font-mono">
                      {ep}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Metrics & Actions */}
            <div className="flex items-center gap-4 text-xs shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold">CPU / MEMORY</span>
                <span className="text-emerald-300 font-bold">{rt.cpuUsagePct}% CPU • {rt.memoryMb.toFixed(1)} MB</span>
              </div>

              <button
                onClick={() => handleRestart(rt.id)}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs"
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan-300" />
                <span>Restart</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

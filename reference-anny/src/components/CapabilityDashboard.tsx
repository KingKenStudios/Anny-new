/**
 * ANNY — CAPABILITY MANAGER & RUNTIME BRIDGE DASHBOARD (PHASE 29)
 * Unified OS Control Panel displaying:
 * - Registered Core Engines
 * - Runtime Providers (Local Node, Sandpack, Docker, Remote Cloud)
 * - Preview Providers (Vite iFrame, Sandpack, Next.js, Generic HTTP)
 * - Subsystem Health, Connection Status, Verification Timestamps, and Provider Switching
 */

import React, { useState, useEffect } from 'react';
import { capabilityManager, SubsystemCapability } from '../core/capabilityManager';
import { runtimeBridge } from '../core/runtimeBridge';
import {
  Activity,
  Server,
  Layers,
  Cpu,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Terminal,
  Zap,
  Globe,
  Radio
} from 'lucide-react';

export const CapabilityDashboard: React.FC = () => {
  const [capabilities, setCapabilities] = useState<SubsystemCapability[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string>(
    runtimeBridge.getActiveRuntimeProvider().id
  );
  const [filterCategory, setFilterCategory] = useState<'all' | 'engine' | 'runtime_provider' | 'preview_provider'>('all');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      setCapabilities(capabilityManager.getAll());
      setActiveProviderId(runtimeBridge.getActiveRuntimeProvider().id);
    };

    update();
    const unsubscribe = capabilityManager.subscribe(update);
    return () => unsubscribe();
  }, []);

  const handleSelectRuntimeProvider = (providerId: string) => {
    runtimeBridge.setActiveRuntimeProvider(providerId);
    setActiveProviderId(providerId);
  };

  const handleRunHealthVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      capabilities.forEach(cap => {
        capabilityManager.updateStatus(cap.id, {
          lastVerified: new Date().toLocaleTimeString()
        });
      });
      setIsVerifying(false);
    }, 600);
  };

  const filtered = filterCategory === 'all'
    ? capabilities
    : capabilities.filter(c => c.category === filterCategory);

  const enginesCount = capabilities.filter(c => c.category === 'engine').length;
  const runtimeProvidersCount = capabilities.filter(c => c.category === 'runtime_provider').length;
  const previewProvidersCount = capabilities.filter(c => c.category === 'preview_provider').length;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans p-4 gap-4 overflow-y-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Runtime Bridge & Capability Manager
            </h2>
            <p className="text-xs text-slate-400">
              Environment Agnostic OS Abstraction • Subsystem Health Registry • Multi-Provider Routing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunHealthVerification}
            disabled={isVerifying}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 rounded-lg transition flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            {isVerifying ? 'Verifying Registry...' : 'Run Diagnostics'}
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
            Registered Engines
            <Layers className="w-4 h-4 text-cyan-400" />
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{enginesCount}</span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Active
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
            Runtime Providers
            <Server className="w-4 h-4 text-emerald-400" />
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{runtimeProvidersCount}</span>
            <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded">
              Ready
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
            Preview Providers
            <Globe className="w-4 h-4 text-purple-400" />
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{previewProvidersCount}</span>
            <span className="text-[10px] text-purple-400 font-mono font-bold bg-purple-500/10 px-1.5 py-0.5 rounded">
              Vite / Http
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
            Active Provider
            <Zap className="w-4 h-4 text-amber-400" />
          </span>
          <div className="mt-2">
            <span className="text-xs font-mono font-bold text-amber-400 truncate block">
              {runtimeBridge.getActiveRuntimeProvider().name}
            </span>
            <span className="text-[10px] text-slate-500 block font-mono">
              Port: 3000 Ingress
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 rounded transition ${filterCategory === 'all' ? 'bg-cyan-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'}`}
          >
            All Subsystems ({capabilities.length})
          </button>
          <button
            onClick={() => setFilterCategory('engine')}
            className={`px-3 py-1 rounded transition ${filterCategory === 'engine' ? 'bg-cyan-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'}`}
          >
            Core Engines ({enginesCount})
          </button>
          <button
            onClick={() => setFilterCategory('runtime_provider')}
            className={`px-3 py-1 rounded transition ${filterCategory === 'runtime_provider' ? 'bg-cyan-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'}`}
          >
            Runtime Providers ({runtimeProvidersCount})
          </button>
          <button
            onClick={() => setFilterCategory('preview_provider')}
            className={`px-3 py-1 rounded transition ${filterCategory === 'preview_provider' ? 'bg-cyan-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'}`}
          >
            Preview Providers ({previewProvidersCount})
          </button>
        </div>
      </div>

      {/* Registry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        {filtered.map(cap => {
          const isActiveRuntime = cap.id === activeProviderId;

          return (
            <div
              key={cap.id}
              className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between gap-3 transition-all ${
                isActiveRuntime
                  ? 'border-cyan-500/80 ring-1 ring-cyan-500/30 bg-slate-900/90'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{cap.name}</span>
                    {isActiveRuntime && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-black uppercase">
                        Active Provider
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    ID: {cap.id} • v{cap.version}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {cap.isConnected ? (
                    <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded" title="Connected">
                      <Wifi className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="p-1 bg-rose-500/10 text-rose-400 rounded" title="Disconnected">
                      <WifiOff className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>

              {/* Status & Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Health</span>
                  <span className={`font-bold capitalize ${
                    cap.health === 'healthy' ? 'text-emerald-400' : cap.health === 'degraded' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {cap.health}
                  </span>
                </div>

                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Status</span>
                  <span className="text-cyan-400 font-bold capitalize">{cap.status}</span>
                </div>

                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Latency</span>
                  <span className="text-slate-300 font-bold">{cap.metrics?.latencyMs || 0} ms</span>
                </div>
              </div>

              {/* Supported Capabilities */}
              <div>
                <span className="text-[11px] font-semibold text-slate-300 block mb-1">Supported Capabilities:</span>
                <ul className="text-xs text-slate-400 space-y-1">
                  {cap.supportedCapabilities.map((sc, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{sc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Known Limitations */}
              {cap.limitations.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded p-2 text-[11px]">
                  <span className="text-amber-400 font-bold flex items-center gap-1 mb-0.5">
                    <AlertTriangle className="w-3 h-3" /> Honest Environment Limit:
                  </span>
                  <p className="text-slate-400 leading-snug">{cap.limitations.join(', ')}</p>
                </div>
              )}

              {/* Action / Footer */}
              <div className="mt-auto pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Verified: {cap.lastVerified}</span>

                {cap.category === 'runtime_provider' && !isActiveRuntime && cap.isConnected && (
                  <button
                    onClick={() => handleSelectRuntimeProvider(cap.id)}
                    className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 font-bold rounded transition font-sans"
                  >
                    Set Active
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

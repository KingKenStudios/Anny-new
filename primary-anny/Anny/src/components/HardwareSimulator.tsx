import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Cpu,
  Database,
  Zap,
  ArrowLeft,
  Terminal,
  Server,
  Info,
  RefreshCw,
} from 'lucide-react';
import { safeFetchJson } from '../lib/apiUtils';
import { hardwareIntelligenceEngine, HardwareProfile } from '../core/annyHardwareIntelligence';

interface SimulatorProfile {
  id: string;
  name: string;
  tier: string;
  details: string;
  specs: {
    cpu: string;
    ram: string;
    gpu: string;
  };
}

const REFERENCE_TIERS: SimulatorProfile[] = [
  {
    id: 'low',
    name: 'Compact Laptop Reference',
    tier: 'LOW',
    details: '4 cores, 8GB RAM — lightweight GGUF Q4_K_M models only (1B–3B)',
    specs: { cpu: '4 Cores', ram: '8GB RAM', gpu: 'Integrated (CPU offload)' },
  },
  {
    id: 'medium',
    name: 'Mid-Range Workstation Reference',
    tier: 'MEDIUM',
    details: '6+ cores, 16GB RAM, 6GB VRAM — balanced 7B–8B Q4 models',
    specs: { cpu: '6+ Cores', ram: '16GB RAM', gpu: '6GB VRAM class' },
  },
  {
    id: 'ultra',
    name: 'High-VRAM Rig Reference',
    tier: 'ULTRA',
    details: '16+ cores, 32GB+ RAM, 24GB VRAM — 14B–32B+ local models',
    specs: { cpu: '16+ Cores', ram: '32GB+ RAM', gpu: '24GB VRAM class' },
  },
];

export default function HardwareSimulator({ onExit }: { onExit?: () => void }) {
  const [selectedProfile, setSelectedProfile] = useState<SimulatorProfile | null>(null);
  const [serverMetrics, setServerMetrics] = useState<any>(null);
  const [ollamaInfo, setOllamaInfo] = useState<any>(null);
  const [browserHw, setBrowserHw] = useState<HardwareProfile | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);

  const loadRealTelemetry = async () => {
    setLoadingTelemetry(true);
    const [metricsRes, ollamaRes, hw] = await Promise.all([
      safeFetchJson('/api/system/metrics'),
      safeFetchJson('/api/system/ollama'),
      hardwareIntelligenceEngine.inspectHardware().catch(() => null),
    ]);
    if (metricsRes.data) setServerMetrics(metricsRes.data);
    if (ollamaRes.data) setOllamaInfo(ollamaRes.data);
    if (hw) setBrowserHw(hw);
    setLoadingTelemetry(false);
  };

  useEffect(() => {
    void loadRealTelemetry();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-black text-white p-4 md:p-10 font-mono flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-xl md:text-2xl font-black text-cyan-400 tracking-tight">
              HOST HARDWARE PROFILER & TIER PLANNER
            </h1>
            <p className="text-[11px] text-white/50">
              Combines live host runtime telemetry with reference tier sizing (no fake verification promises)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadRealTelemetry()}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 hover:bg-white/10 text-xs text-cyan-300 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTelemetry ? 'animate-spin' : ''}`} />
            <span>Refresh Host</span>
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all text-xs uppercase text-white/70 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Exit
            </button>
          )}
        </div>
      </div>

      {/* Real Host Runtime Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/40 uppercase">Server Host CPUs</p>
          <p className="text-lg font-bold text-white mt-1">
            {serverMetrics ? `${serverMetrics.cpuCount} cores (${serverMetrics.cpu}% load)` : 'Unavailable'}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/40 uppercase">Server Host RAM</p>
          <p className="text-lg font-bold text-cyan-300 mt-1">
            {serverMetrics
              ? `${serverMetrics.ramUsedMB} / ${serverMetrics.ramTotalMB} MB (${serverMetrics.ram}%)`
              : 'Unavailable'}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/40 uppercase">Browser GPU Renderer</p>
          <p className="text-xs font-bold text-white mt-1 line-clamp-2">
            {browserHw?.gpuModel && browserHw.gpuModel !== 'UNKNOWN'
              ? browserHw.gpuModel
              : 'Not exposed by browser'}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/40 uppercase">Local Ollama Runtime</p>
          <p className={`text-sm font-bold mt-1 ${ollamaInfo?.reachable ? 'text-emerald-400' : 'text-amber-300'}`}>
            {ollamaInfo?.reachable
              ? `Connected (${ollamaInfo.discoveredModels?.length || 0} models)`
              : 'Not Reachable on Host'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Reference Tier Sizing */}
        <div className="space-y-4">
          <h2 className="text-[11px] uppercase tracking-widest text-white/50 font-bold">
            Reference Hardware Tiers (Simulation Planning Only)
          </h2>
          <div className="grid gap-3">
            {REFERENCE_TIERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProfile(p)}
                className={`p-5 text-left rounded-2xl border transition-all relative cursor-pointer ${
                  selectedProfile?.id === p.id
                    ? 'bg-cyan-500/10 border-cyan-500/50'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-bold text-white">{p.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded border bg-white/5 border-white/15 text-cyan-300">
                    {p.tier}_TIER
                  </span>
                </div>
                <p className="text-xs text-white/50 mb-3">{p.details}</p>
                <div className="space-y-1 text-[11px] text-white/60">
                  <p className="flex items-center gap-2">
                    <Cpu className="w-3 h-3 text-cyan-400" /> {p.specs.cpu}
                  </p>
                  <p className="flex items-center gap-2">
                    <Database className="w-3 h-3 text-cyan-400" /> {p.specs.ram}
                  </p>
                  <p className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-cyan-400" /> {p.specs.gpu}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Honest Sizing Output */}
        <div className="space-y-4">
          <h2 className="text-[11px] uppercase tracking-widest text-white/50 font-bold">
            Compatibility & Model Footprint Assessment
          </h2>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            {selectedProfile ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <Server className="w-4 h-4" />
                  <span>{selectedProfile.name} ({selectedProfile.tier})</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">{selectedProfile.details}</p>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Selecting a reference tier does NOT benchmark or certify target physical hardware. Run a direct local Ollama inference test on the target machine before deploying workloads.
                  </span>
                </div>
              </motion.div>
            ) : (
              <p className="text-xs text-white/40 italic">
                Select a reference tier on the left to inspect recommended local model footprints alongside your live host metrics above.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

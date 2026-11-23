import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Cpu,
  HardDrive,
  Fingerprint,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Globe,
  ShieldCheck,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import { annyRuntimeBridge } from '../runtime/AnnyRuntimeBridge';

interface AnnyPortableRuntimeViewProps {
  onToggleMobileMenu?: () => void;
}

export const AnnyPortableRuntimeView: React.FC<AnnyPortableRuntimeViewProps> = ({
  onToggleMobileMenu,
}) => {
  const [statusData, setStatusData] = useState<any>(null);
  const [hardware, setHardware] = useState<any>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [identityData, setIdentityData] = useState<any>(null);
  const [portableData, setPortableData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRuntime = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [status, hw, caps, prov, id, portable] = await Promise.all([
        annyRuntimeBridge.getRuntimeStatus(),
        annyRuntimeBridge.getHardware(),
        annyRuntimeBridge.getCapabilities(),
        annyRuntimeBridge.getProviders(),
        annyRuntimeBridge.getIdentity(),
        annyRuntimeBridge.getPortableStatus(),
      ]);
      setStatusData(status);
      setHardware(hw?.hardware || null);
      setCapabilities(caps?.capabilities || null);
      setProviders(prov?.providers || []);
      setIdentityData(id || null);
      setPortableData(portable || null);
    } catch (err: any) {
      setError(err?.message || 'Failed to inspect live sovereign runtime host.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRuntime();
  }, [loadRuntime]);

  const ramUsedGb =
    hardware && typeof hardware.totalMemoryGb === 'number' && typeof hardware.freeMemoryGb === 'number'
      ? Number((hardware.totalMemoryGb - hardware.freeMemoryGb).toFixed(2))
      : 0;
  const ramPct =
    hardware?.totalMemoryGb > 0 ? Math.min(100, Math.round((ramUsedGb / hardware.totalMemoryGb) * 100)) : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040612] text-slate-100 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
                <Server className="w-7 h-7 text-cyan-400 shrink-0" />
                Sovereign Portable Runtime
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Live host hardware telemetry, AI provider readiness, sovereign instance fingerprint, and portable runtime profiles.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadRuntime()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            Probe Host
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Sovereign Instance Identity Banner */}
        {identityData?.identity && (
          <div className="bg-[#080b22] border border-cyan-500/30 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
                <Fingerprint className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                  Sovereign Instance Identity
                </div>
                <div className="text-lg font-black text-white mt-0.5">
                  {identityData.identity.name || 'ANNY'} · Owner: {identityData.identity.owner}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-1 break-all">
                  Instance ID: {identityData.identity.instanceId} · Runtime: {identityData.identity.runtime}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl shrink-0">
              <ShieldCheck className="w-4 h-4" />
              {statusData?.status || 'ONLINE'}
            </div>
          </div>
        )}

        {/* Hardware Telemetry Cards */}
        {hardware && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#080b22] border border-white/10 rounded-2xl p-4 space-y-1">
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" /> Host Platform
              </div>
              <div className="text-lg font-black text-white">
                {hardware.platform} / {hardware.arch}
              </div>
              <div className="text-xs text-slate-400 truncate" title={hardware.cpuModel}>
                {hardware.cpuCores} Cores · {hardware.cpuModel}
              </div>
            </div>

            <div className="bg-[#080b22] border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-cyan-400" /> Memory Allocation
              </div>
              <div className="text-lg font-black text-white">
                {ramUsedGb} / {hardware.totalMemoryGb} GB
              </div>
              <progress
                value={ramPct}
                max={100}
                aria-label="Memory allocation percentage"
                className="w-full h-1.5 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-slate-900 [&::-webkit-progress-value]:bg-cyan-400 [&::-moz-progress-bar]:bg-cyan-400"
              />
            </div>

            <div className="bg-[#080b22] border border-white/10 rounded-2xl p-4 space-y-1">
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-cyan-400" /> Node Runtime
              </div>
              <div className="text-lg font-black text-white">{hardware.nodeVersion}</div>
              <div className="text-xs text-slate-400">
                Uptime: {Math.floor((hardware.uptimeSeconds || 0) / 3600)}h{' '}
                {Math.floor(((hardware.uptimeSeconds || 0) % 3600) / 60)}m
              </div>
            </div>

            <div className="bg-[#080b22] border border-white/10 rounded-2xl p-4 space-y-1">
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" /> Active Languages
              </div>
              <div className="text-lg font-black text-white">
                {statusData?.languages?.totalLanguages ?? 70} Supported
              </div>
              <div className="text-xs text-slate-400">
                Activated: {(statusData?.activatedLanguages || []).join(', ') || 'en'}
              </div>
            </div>
          </div>
        )}

        {/* Providers & Capability Truth */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#080b22] border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-white">Live AI &amp; Speech Providers</h2>
            <div className="space-y-2.5">
              {providers.map((p: any) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{p.name}</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-white/10">
                        {p.mode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{p.role}</p>
                  </div>
                  <div className="shrink-0">
                    {p.available ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                        <XCircle className="w-3.5 h-3.5" /> Not Configured
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            {/* Modality Capabilities */}
            <div className="bg-[#080b22] border border-white/10 rounded-2xl p-5 space-y-3">
              <h2 className="text-base font-bold text-white">Runtime Modality Truth</h2>
              {capabilities ? (
                <div className="space-y-2">
                  {Object.entries(capabilities).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs"
                    >
                      <span className="font-bold text-slate-300">{key}</span>
                      <span className="font-mono text-cyan-300">{String(val)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400">Loading modality status...</div>
              )}
            </div>

            {/* Portable Host Profiles */}
            <div className="bg-[#080b22] border border-white/10 rounded-2xl p-5 space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Portable Runtime Profiles
              </h2>
              <div className="space-y-2.5">
                {(portableData?.allProfiles || []).map((prof: any) => (
                  <div
                    key={prof.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-white">{prof.id}</span>
                      <span className="text-[10px] font-mono text-cyan-300">
                        {prof.platform}/{prof.arch}
                      </span>
                    </div>
                    {prof.description && <p className="text-slate-400">{prof.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

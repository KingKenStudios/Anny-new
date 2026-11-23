import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Activity,
  Fingerprint,
  Cpu,
  Globe,
  Terminal,
  Zap,
  Lock,
  Database,
  BarChart3,
  Server,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  Music,
  Video,
  Layers,
} from 'lucide-react';
import { annyCapabilityTruthRegistry, CapabilityStatus } from '../core/annyCapabilityTruthRegistry';
import { annyPhase24RealitySuite, RealityProof } from '../core/AnnyPhase24RealitySuite';

export const AnnyPhase24RealityAuditReport: React.FC = () => {
  const [proofs, setProofs] = useState<RealityProof[]>([]);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'REAL' | 'PARTIAL' | 'BLOCKED' | 'UNAVAILABLE'>('ALL');
  const [activeTab, setActiveTab] = useState<'TESTS' | 'CAPABILITIES'>('TESTS');

  useEffect(() => {
    if (proofs.length === 0) {
      void runAudit();
    }
  }, []);

  const runAudit = async () => {
    setIsRunningAudit(true);
    try {
      const results = await annyPhase24RealitySuite.executeFullAudit();
      setProofs(results);
    } catch (e) {
      console.error('Reality audit error:', e);
    } finally {
      setIsRunningAudit(false);
    }
  };

  const scoreData = annyCapabilityTruthRegistry.getStats();
  const truthEntries = annyCapabilityTruthRegistry.getAll();

  const filteredProofs = proofs.filter((p) => {
    if (selectedFilter === 'ALL') return true;
    return p.status === selectedFilter;
  });

  const filteredCaps = truthEntries.filter((c) => {
    if (selectedFilter === 'ALL') return true;
    return c.status === selectedFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 font-sans text-slate-100">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 bg-[#060a1c] border border-[#00eeff]/20 p-6 rounded-2xl relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <ShieldCheck className="w-48 h-48 text-[#00eeff]" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-[#00eeff]/10 text-[#00eeff] border border-[#00eeff]/20">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight uppercase">ANNY — Phase 24 Execution Audit</h2>
                  <p className="text-[#00eeff] text-[10px] font-mono tracking-widest uppercase">
                    40-Point Forensic Reality Verification Protocol (P2401–P2440)
                  </p>
                </div>
              </div>
              <p className="text-slate-400 text-xs max-w-xl leading-relaxed">
                Evidence-backed capability execution audit. <span className="text-white font-bold">Truth over appearance:</span> code existence and passing mocks do not equal real execution.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className={`text-5xl font-black ${scoreData.overallPercentage >= 70 ? 'text-emerald-400' : 'text-[#00eeff]'} tracking-tighter`}>
                  {scoreData.overallPercentage}<span className="text-sm ml-1 opacity-50">%</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Reality Score</div>
              </div>

              <button
                type="button"
                id="btn_execute_phase24_audit"
                onClick={() => void runAudit()}
                disabled={isRunningAudit}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#00eeff]/10 border border-[#00eeff]/30 hover:bg-[#00eeff]/20 transition-all group disabled:opacity-50 cursor-pointer"
              >
                {isRunningAudit ? (
                  <RefreshCw className="w-6 h-6 text-[#00eeff] animate-spin" />
                ) : (
                  <Zap className="w-6 h-6 text-[#00eeff] group-hover:scale-110 transition-transform" />
                )}
                <span className="text-[8px] font-mono mt-2 text-[#00eeff] uppercase font-bold tracking-widest">
                  {isRunningAudit ? 'Auditing...' : 'Run Audit'}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            {[
              { label: 'Real Verified', value: scoreData.realCount, color: 'text-emerald-400', icon: CheckCircle2 },
              { label: 'Partial Path', value: scoreData.partialCount, color: 'text-amber-400', icon: AlertCircle },
              { label: 'Blocked (Keys)', value: scoreData.blockedCount, color: 'text-rose-400', icon: XCircle },
              { label: 'Unavailable', value: scoreData.unavailableCount, color: 'text-slate-400', icon: Activity },
            ].map((stat, i) => (
              <div key={i} className="bg-black/40 border border-white/5 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  <div className={`text-xl font-black font-mono ${stat.color}`}>{stat.value}</div>
                </div>
                <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#060a1c] border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center text-center relative shadow-xl"
        >
          <Server className="w-14 h-14 text-[#00eeff] mb-3 opacity-80" />
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Audit Standard</div>
          <div className="text-white font-black text-sm uppercase tracking-wider">ZERO SIMULATION</div>
          <div className="mt-4 flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
            <Lock className="w-3.5 h-3.5" />
            Sovereign Grounded
          </div>
          <div className="text-[9px] text-slate-400 mt-3 font-mono">
            {proofs.length} / 40 Tests Executed
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#060a1c] p-3 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('TESTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'TESTS'
                ? 'bg-[#00eeff]/20 text-[#00eeff] border border-[#00eeff]/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            40 Forensic Tests (P2401–P2440)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CAPABILITIES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'CAPABILITIES'
                ? 'bg-[#00eeff]/20 text-[#00eeff] border border-[#00eeff]/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Capability Truth Matrix ({truthEntries.length})
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'REAL', 'PARTIAL', 'BLOCKED', 'UNAVAILABLE'] as const).map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setSelectedFilter(filterKey)}
              className={`px-3 py-1 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all cursor-pointer ${
                selectedFilter === filterKey
                  ? 'bg-white text-black font-bold shadow'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {filterKey}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#060a1c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeTab === 'TESTS' ? <Layers className="w-4 h-4 text-[#00eeff]" /> : <BarChart3 className="w-4 h-4 text-[#00eeff]" />}
            <span className="text-xs font-black text-white uppercase tracking-widest">
              {activeTab === 'TESTS' ? 'Phase 24 Forensic Suite Execution Log' : 'Authoritative Capability Truth Registry'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Scan: {new Date().toLocaleTimeString()}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          {activeTab === 'TESTS' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/30 border-b border-white/5">
                  <th className="px-6 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest w-24">Test ID</th>
                  <th className="px-6 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Verification Focus</th>
                  <th className="px-6 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center w-32">Status</th>
                  <th className="px-6 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Forensic Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProofs.map((proof) => (
                  <tr key={proof.testId} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs font-bold text-[#00eeff]">{proof.testId}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-xs font-bold text-white tracking-tight">{proof.name}</div>
                      {proof.notes && <div className="text-[10px] font-mono text-slate-400 mt-1">{proof.notes}</div>}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(proof.status)}`}>
                          {proof.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {proof.error ? (
                        <div className="text-[10px] font-mono text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20 max-w-md">
                          {proof.error}
                        </div>
                      ) : proof.evidence ? (
                        <div className="text-[10px] font-mono text-slate-300 bg-black/40 p-2 rounded border border-white/5 max-w-md overflow-x-auto">
                          {JSON.stringify(proof.evidence, null, 1)}
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-600 italic">No trace</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/30 border-b border-white/5">
                  <th className="px-6 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Capability</th>
                  <th className="px-6 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Runtime Entry Point</th>
                  <th className="px-6 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCaps.map((cap) => (
                  <tr key={cap.capabilityId} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded bg-white/5 text-slate-400">{getIconForCap(cap.capabilityId)}</div>
                        <div>
                          <div className="text-xs font-bold text-white tracking-tight uppercase">{cap.name}</div>
                          <div className="text-[9px] font-mono text-slate-500">{cap.capabilityId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-1 rounded">{cap.category}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(cap.status)}`}>
                          {cap.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 font-mono text-[10px] text-slate-400">{cap.runtimeEntryPoint}</td>
                    <td className="px-6 py-3 font-mono text-[10px] text-slate-300">{cap.evidence?.verificationMethod || 'PHASE24_AUDIT'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const getStatusStyles = (status: CapabilityStatus) => {
  switch (status) {
    case 'REAL': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'PARTIAL': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'BLOCKED': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'UNAVAILABLE': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    default: return 'bg-white/5 text-slate-400 border-white/10';
  }
};

const getIconForCap = (id: string) => {
  if (id.includes('TEXT')) return <Terminal className="w-3.5 h-3.5" />;
  if (id.includes('IMAGE')) return <Eye className="w-3.5 h-3.5" />;
  if (id.includes('VIDEO')) return <Video className="w-3.5 h-3.5" />;
  if (id.includes('MUSIC')) return <Music className="w-3.5 h-3.5" />;
  if (id.includes('URL')) return <Globe className="w-3.5 h-3.5" />;
  if (id.includes('MEMORY')) return <Database className="w-3.5 h-3.5" />;
  return <Cpu className="w-3.5 h-3.5" />;
};

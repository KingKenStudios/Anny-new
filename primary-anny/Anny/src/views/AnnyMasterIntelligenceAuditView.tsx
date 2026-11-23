import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Activity,
  FileCheck,
  Layers,
} from 'lucide-react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import { annyRuntimeBridge } from '../runtime/AnnyRuntimeBridge';
import { AnnyPhase24RealityAuditReport } from '../components/AnnyPhase24RealityAuditReport';
import { AnnyRealityReport } from '../components/AnnyRealityReport';

interface AnnyMasterIntelligenceAuditViewProps {
  onToggleMobileMenu?: () => void;
}

export const AnnyMasterIntelligenceAuditView: React.FC<AnnyMasterIntelligenceAuditViewProps> = ({
  onToggleMobileMenu,
}) => {
  const [activeTab, setActiveTab] = useState<'master' | 'phase24' | 'phase20'>('master');
  const [masterReport, setMasterReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runMasterSuite = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await annyRuntimeBridge.getMasterRealitySuite();
      setMasterReport(res?.report || res);
    } catch (err: any) {
      setError(err?.message || 'Failed to execute Master Reality Suite.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runMasterSuite();
  }, [runMasterSuite]);

  const acceptanceResults = masterReport?.acceptanceSuite?.results || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040612] text-slate-100 overflow-hidden">
      {/* Top Bar */}
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-4 border-b border-white/10 bg-[#050818] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 truncate">
              <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
              Master Reality &amp; Forensic Audit Hub
            </h1>
            <p className="text-xs text-slate-400 truncate">
              Live server verification, Phase 24 40-point execution proof, and Phase 20 claim-vs-reality diagnostics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('master')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              activeTab === 'master'
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            Live Master Suite
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('phase24')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              activeTab === 'phase24'
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            Phase 24 Execution Audit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('phase20')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              activeTab === 'phase20'
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            Phase 20 Claim vs Reality
          </button>
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {activeTab === 'master' && (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white">Live Server Master Reality Suite</h2>
                <p className="text-xs text-slate-400">
                  Owner: {masterReport?.owner || 'Akinwumi Kehinde / Akinwumi Group'} · Last verified:{' '}
                  {masterReport?.timestamp ? new Date(masterReport.timestamp).toLocaleString() : 'Running...'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void runMasterSuite()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Re-Run Live Verification
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {masterReport && (
              <>
                {/* Top Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#080b22] border border-white/10 rounded-2xl p-4">
                    <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-cyan-400" /> Host Runtime
                    </div>
                    <div className="text-lg font-black text-white mt-2">
                      {masterReport.runtime?.platform}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {masterReport.runtime?.cpuCores} Cores · {masterReport.runtime?.totalRamGb} GB RAM
                    </div>
                  </div>

                  <div className="bg-[#080b22] border border-white/10 rounded-2xl p-4">
                    <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-400" /> Phase 38 Language Audit
                    </div>
                    <div className="text-lg font-black text-emerald-400 mt-2">
                      {masterReport.languageCertification?.passed ?? 0} /{' '}
                      {masterReport.languageCertification?.total ?? 40} PASS
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Failed: {masterReport.languageCertification?.failed ?? 0}
                    </div>
                  </div>

                  <div className="bg-[#080b22] border border-white/10 rounded-2xl p-4">
                    <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-400" /> Organization Governance
                    </div>
                    <div className="text-lg font-black text-white mt-2">
                      {masterReport.organizationGovernance?.canonicalOrganizations ?? 0} Entities
                    </div>
                    <div className="text-xs text-emerald-400 mt-0.5">
                      Merge Guard: {masterReport.organizationGovernance?.forbiddenMergeProtection || 'ENFORCED'}
                    </div>
                  </div>

                  <div className="bg-[#080b22] border border-white/10 rounded-2xl p-4">
                    <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" /> Online Providers
                    </div>
                    <div className="text-lg font-black text-cyan-300 mt-2">
                      {(masterReport.runtime?.providersOnline || []).length} Active
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                      {(masterReport.runtime?.providersOnline || []).join(', ') || 'Local Host Only'}
                    </div>
                  </div>
                </div>

                {/* Acceptance Test Results */}
                <div className="bg-[#080b22] border border-white/10 rounded-2xl p-5 space-y-4">
                  <h3 className="text-base font-bold text-white">
                    Backend Acceptance Suite Results ({acceptanceResults.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {acceptanceResults.map((item: any, idx: number) => (
                      <div
                        key={item.id || item.name || idx}
                        className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-white">{item.name || item.id}</div>
                          {item.details && <p className="text-slate-400 mt-1">{item.details}</p>}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold shrink-0 ${
                            item.passed || item.status === 'PASS' || item.status === 'REAL'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {item.status || (item.passed ? 'PASS' : 'CHECK')}
                        </span>
                      </div>
                    ))}
                    {acceptanceResults.length === 0 && (
                      <div className="text-xs text-slate-400 col-span-2">
                        Acceptance suite completed. View Phase 24 or Phase 20 tabs for full client-side forensic checks.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'phase24' && (
          <div className="p-4 sm:p-6">
            <AnnyPhase24RealityAuditReport />
          </div>
        )}

        {activeTab === 'phase20' && (
          <div className="p-4 sm:p-6">
            <AnnyRealityReport />
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Database,
  ShieldCheck,
  Terminal,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import { annyRuntimeBridge } from '../runtime/AnnyRuntimeBridge';

interface AnnyAiosControlViewProps {
  onToggleMobileMenu?: () => void;
  onSelectTab?: (tabKey: string) => void;
}

export const AnnyAiosControlView: React.FC<AnnyAiosControlViewProps> = ({
  onToggleMobileMenu,
  onSelectTab,
}) => {
  const [capabilitiesData, setCapabilitiesData] = useState<any>(null);
  const [appsData, setAppsData] = useState<any[]>([]);
  const [learningData, setLearningData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [domain, setDomain] = useState('cybersecurity');
  const [action, setAction] = useState('scan_workspace');
  const [prompt, setPrompt] = useState('Run a security audit on Keda production endpoints');
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [execLoading, setExecLoading] = useState(false);
  const [execResult, setExecResult] = useState<any>(null);

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [caps, apps, knowledge] = await Promise.all([
        annyRuntimeBridge.getAiosCapabilities(),
        annyRuntimeBridge.getAiosApps(),
        annyRuntimeBridge.getLearningKnowledge(),
      ]);
      setCapabilitiesData(caps);
      setAppsData(apps?.apps || []);
      setLearningData(knowledge);
    } catch (err: any) {
      setError(err?.message || 'Failed to load AIOS Control Plane state.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setExecLoading(true);
    setExecResult(null);
    try {
      const result = await annyRuntimeBridge.executeAiosCapability({
        domain,
        action,
        parameters: { prompt },
        userConfirmed,
      });
      setExecResult(result);
      await loadAll();
    } catch (err: any) {
      setExecResult({ success: false, error: err?.message || 'Execution failed' });
    } finally {
      setExecLoading(false);
    }
  };

  const handleSyncLearning = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const res = await annyRuntimeBridge.syncLearning();
      setSyncMessage(
        `Synchronized ${res?.syncResult?.syncedRecords ?? 0} memory records at ${new Date(
          res?.syncResult?.timestamp || Date.now()
        ).toLocaleTimeString()}.`
      );
      await loadAll();
    } catch (err: any) {
      setSyncMessage(err?.message || 'Memory sync failed.');
    } finally {
      setSyncLoading(false);
    }
  };

  const capabilities = capabilitiesData?.capabilities || [];
  const auditTrail = capabilitiesData?.auditTrail || [];
  const stats = capabilitiesData?.stats || { totalCapabilities: 0, activeCapabilities: 0, totalExecutions: 0 };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040612] text-slate-100 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
                <Cpu className="w-7 h-7 text-cyan-400 shrink-0" />
                AIOS Control Plane
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Live capability execution governance, registered workspace applications, and collective memory synchronization.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadAll()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#080b22] border border-white/10 rounded-2xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Capabilities</div>
            <div className="mt-2 text-2xl font-black text-emerald-400">
              {stats.activeCapabilities} / {stats.totalCapabilities}
            </div>
          </div>
          <div className="bg-[#080b22] border border-white/10 rounded-2xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Registered Tools</div>
            <div className="mt-2 text-2xl font-black text-cyan-400">
              {capabilitiesData?.registeredToolsCount ?? 0}
            </div>
          </div>
          <div className="bg-[#080b22] border border-white/10 rounded-2xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Registered Apps</div>
            <div className="mt-2 text-2xl font-black text-white">{appsData.length}</div>
          </div>
          <div className="bg-[#080b22] border border-white/10 rounded-2xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Collective Memory</div>
            <div className="mt-2 text-2xl font-black text-indigo-400">
              {learningData?.stats?.totalRecords ?? 0}
            </div>
          </div>
        </div>

        {/* Capabilities Grid + Live Executor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Capabilities List */}
          <div className="lg:col-span-7 bg-[#080b22] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                Live AIOS Capabilities
              </h2>
              <span className="text-xs font-mono text-slate-400">
                Truth Registry: {capabilitiesData?.truthEntriesCount ?? 0} entries
              </span>
            </div>

            <div className="space-y-3">
              {capabilities.map((cap: any) => (
                <div
                  key={cap.id}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">{cap.name}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-300">
                        {cap.domain}.{cap.action}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{cap.provider}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                        cap.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {cap.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDomain(cap.domain);
                        setAction(cap.action);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold cursor-pointer"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
              {!loading && capabilities.length === 0 && (
                <div className="text-sm text-slate-400 py-6 text-center">No AIOS capabilities reported.</div>
              )}
            </div>
          </div>

          {/* Interactive Governed Executor */}
          <div className="lg:col-span-5 bg-[#080b22] border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                Governed Capability Executor
              </h2>

              <form onSubmit={handleExecute} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Domain</label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Action</label>
                    <input
                      type="text"
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Execution Prompt / Context</label>
                  <textarea
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={userConfirmed}
                    onChange={(e) => setUserConfirmed(e.target.checked)}
                    className="rounded border-white/20 bg-slate-950 accent-cyan-500"
                  />
                  Explicit user authorization for cross-organization actions
                </label>

                <button
                  type="submit"
                  disabled={execLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  {execLoading ? 'Executing...' : 'Execute Governed Action'}
                </button>
              </form>

              {execResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    execResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {execResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    {execResult.execution?.status || (execResult.success ? 'COMPLETED' : 'BLOCKED / PENDING')}
                  </div>
                  <p className="text-slate-200">{execResult.output || execResult.error}</p>
                  {execResult.organizationContext && (
                    <div className="font-mono text-[11px] text-slate-300 pt-1 border-t border-white/10">
                      Executing Org: {execResult.organizationContext.executingOrganization || 'default'} · Target:{' '}
                      {execResult.organizationContext.targetOrganization || 'none'} · Write Scope:{' '}
                      {(execResult.organizationContext.memoryWriteScopes || []).join(', ') || 'isolated'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Collective Memory Sync Box */}
            <div className="pt-4 border-t border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-400" />
                  Collective Learning &amp; Memory Sync
                </div>
                <button
                  type="button"
                  onClick={() => void handleSyncLearning()}
                  disabled={syncLoading}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {syncLoading ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
              {syncMessage && <p className="text-xs text-cyan-300">{syncMessage}</p>}
            </div>
          </div>
        </div>

        {/* Registered Applications + Live Audit Trail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#080b22] border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              AIOS Application Registry ({appsData.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {appsData.map((app: any) => (
                <div
                  key={app.id}
                  className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-white truncate">{app.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0">
                        {app.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {app.publisher} · {app.category}
                    </div>
                  </div>
                  {app.route && onSelectTab && (
                    <button
                      type="button"
                      onClick={() => onSelectTab(app.route)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                    >
                      Open Module <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#080b22] border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Live Execution Audit Trail ({auditTrail.length})
            </h2>
            <div className="space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {auditTrail.map((item: any) => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-950/70 border border-white/10 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-cyan-300">
                      {item.domain}.{item.action}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-300">{item.summary}</p>
                  <div className="text-[10px] font-mono text-slate-500">Status: {item.status}</div>
                </div>
              ))}
              {auditTrail.length === 0 && (
                <div className="text-xs text-slate-400 py-8 text-center">
                  No AIOS executions recorded in this server session yet. Use the executor above to run a governed action.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

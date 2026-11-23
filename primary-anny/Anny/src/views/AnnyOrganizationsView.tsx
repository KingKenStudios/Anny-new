import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  GitBranch,
  PlusCircle,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import { annyRuntimeBridge } from '../runtime/AnnyRuntimeBridge';

interface AnnyOrganizationsViewProps {
  onToggleMobileMenu?: () => void;
}

export const AnnyOrganizationsView: React.FC<AnnyOrganizationsViewProps> = ({
  onToggleMobileMenu,
}) => {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Register Organization form state
  const [orgId, setOrgId] = useState('');
  const [canonicalName, setCanonicalName] = useState('');
  const [identityRole, setIdentityRole] = useState('Registered Tenant Organization');
  const [primaryIndustry, setPrimaryIndustry] = useState('Technology');
  const [domainsInput, setDomainsInput] = useState('software, analytics');
  const [aliasesInput, setAliasesInput] = useState('');
  const [registerStatus, setRegisterStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [registering, setRegistering] = useState(false);

  // 12-stage Operational Context Resolver state
  const [testPrompt, setTestPrompt] = useState('Cybersecurity team run a penetration audit on Keda commerce APIs');
  const [userAuthorized, setUserAuthorized] = useState(true);
  const [contextResult, setContextResult] = useState<any>(null);
  const [resolving, setResolving] = useState(false);

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await annyRuntimeBridge.listOrganizations();
      setOrganizations(data?.organizations || []);
      setRelationships(data?.relationships || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch organization registry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setRegisterStatus(null);
    try {
      const domains = domainsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const aliases = aliasesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await annyRuntimeBridge.registerOrganization({
        orgId,
        canonicalName,
        identityRole,
        primaryIndustry,
        domains,
        aliases,
      });
      setOrganizations(res?.organizations || organizations);
      setRegisterStatus({
        ok: true,
        message: `Registered organization "${res?.organization?.canonicalName || canonicalName}" cleanly.`,
      });
      setOrgId('');
      setCanonicalName('');
      setAliasesInput('');
    } catch (err: any) {
      setRegisterStatus({
        ok: false,
        message: err?.message || 'Registration rejected by governance guard.',
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleResolveContext = async (e: React.FormEvent) => {
    e.preventDefault();
    setResolving(true);
    setContextResult(null);
    try {
      const res = await annyRuntimeBridge.resolveOrganizationContext(testPrompt, userAuthorized);
      setContextResult(res?.execution || res);
    } catch (err: any) {
      setContextResult({ success: false, actionOutput: err?.message || 'Context resolution failed' });
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040612] text-slate-100 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
                <Building2 className="w-7 h-7 text-cyan-400 shrink-0" />
                Multi-Organization Governance
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Canonical entity registry for Akinwumi Group, strict forbidden-merge protection, and 12-stage execution context isolation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadOrganizations()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            Refresh Registry
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Canonical Organization Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {organizations.map((org: any) => (
            <div
              key={org.orgId}
              className="bg-[#080b22] border border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-white">{org.canonicalName}</h3>
                    <div className="text-xs font-mono text-cyan-400">{org.orgId}</div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {org.primaryIndustry}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{org.identityRole}</p>
                {Array.isArray(org.domains) && org.domains.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {org.domains.map((dom: string) => (
                      <span
                        key={dom}
                        className="text-[11px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300"
                      >
                        {dom}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Source: {org.provenance?.identitySource || 'CANONICAL'}</span>
                <span>Confidence: {Math.round((org.provenance?.identityConfidence ?? 1) * 100)}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Relationship Graph */}
        <div className="bg-[#080b22] border border-white/10 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-cyan-400" />
            Cross-Organization Relationship Graph ({relationships.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {relationships.map((rel: any, idx: number) => (
              <div
                key={rel.id || `${rel.sourceOrganizationId}-${rel.targetOrganizationId}-${idx}`}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs space-y-1"
              >
                <div className="flex items-center gap-2 font-mono font-bold text-white flex-wrap">
                  <span className="text-cyan-300">{rel.sourceOrganizationId}</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[10px]">
                    {rel.relationshipType}
                  </span>
                  <span className="text-emerald-300">{rel.targetOrganizationId}</span>
                </div>
                {rel.provenance?.origin && (
                  <p className="text-slate-400">
                    Origin: {rel.provenance.origin} · Authorized by {rel.provenance.authorizedBy}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Operational Context Resolver + Register New Organization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 12-Stage Context Resolver */}
          <div className="bg-[#080b22] border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              12-Stage Operational Context Resolver
            </h2>
            <p className="text-xs text-slate-400">
              Test how ANNY resolves executing vs. target organization, memory write/read scope isolation, and cross-org authorization policy.
            </p>
            <form onSubmit={handleResolveContext} className="space-y-3">
              <textarea
                rows={3}
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Enter an operational prompt referencing one or more organizations..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={userAuthorized}
                  onChange={(e) => setUserAuthorized(e.target.checked)}
                  className="accent-cyan-500"
                />
                User authorized cross-org execution
              </label>
              <button
                type="submit"
                disabled={resolving}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {resolving ? 'Resolving...' : 'Resolve Operational Context'}
              </button>
            </form>

            {contextResult && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold">
                  {contextResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className={contextResult.success ? 'text-emerald-300' : 'text-amber-300'}>
                    {contextResult.success ? 'Execution Authorized' : 'Authorization Required / Blocked'}
                  </span>
                </div>
                <p className="text-slate-200">{contextResult.actionOutput}</p>
                {contextResult.context && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 font-mono text-[11px] text-slate-300">
                    <div>Executing: {contextResult.context.executingOrganization || 'none'}</div>
                    <div>Target: {contextResult.context.targetOrganization || 'none'}</div>
                    <div>
                      Write Scopes:{' '}
                      {Array.isArray(contextResult.context.memoryWriteScopes)
                        ? contextResult.context.memoryWriteScopes.join(', ')
                        : 'isolated'}
                    </div>
                    <div>
                      Read Scopes:{' '}
                      {Array.isArray(contextResult.context.memoryReadScopes)
                        ? contextResult.context.memoryReadScopes.join(', ')
                        : 'none'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Register Organization Form */}
          <div className="bg-[#080b22] border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-cyan-400" />
              Register Canonical Organization
            </h2>
            <p className="text-xs text-slate-400">
              Protected by forbidden-merge identity guard (e.g., merged identities like <code className="text-cyan-300">keda_mechatronics</code> are automatically rejected).
            </p>
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Organization ID</label>
                  <input
                    type="text"
                    required
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    placeholder="e.g. akinwumi_energy"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Canonical Name</label>
                  <input
                    type="text"
                    required
                    value={canonicalName}
                    onChange={(e) => setCanonicalName(e.target.value)}
                    placeholder="e.g. Akinwumi Energy"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Primary Industry</label>
                  <input
                    type="text"
                    value={primaryIndustry}
                    onChange={(e) => setPrimaryIndustry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Domains (comma-separated)</label>
                  <input
                    type="text"
                    value={domainsInput}
                    onChange={(e) => setDomainsInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Identity Role</label>
                <input
                  type="text"
                  value={identityRole}
                  onChange={(e) => setIdentityRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Aliases (optional, comma-separated)</label>
                <input
                  type="text"
                  value={aliasesInput}
                  onChange={(e) => setAliasesInput(e.target.value)}
                  placeholder="e.g. AE Grid, Solar Ops"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={registering}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {registering ? 'Validating...' : 'Register Organization'}
              </button>
            </form>

            {registerStatus && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  registerStatus.ok
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-red-500/10 border-red-500/30 text-red-200'
                }`}
              >
                {registerStatus.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                )}
                <span>{registerStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

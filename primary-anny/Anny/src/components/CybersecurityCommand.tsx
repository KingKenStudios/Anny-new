import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Lock,
  Terminal,
  AlertTriangle,
  Link2,
  Activity,
  Search,
  CheckCircle2,
  RefreshCw,
  Info,
  EyeOff
} from 'lucide-react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import { fetchWithAuth, safeFetchJson } from '../lib/apiUtils';
import {
  scanFilesWithWatchdog,
  analyzeUrlWithWatchdog,
  WatchdogScanReport,
  UrlInspectionResult,
} from '../services/watchdogSecurityService';

interface CybersecurityCommandProps {
  onToggleMobileMenu?: () => void;
}

const SAMPLE_ARTIFACT = `// Paste source code, config, or package.json to inspect with Watchdog
export function fetchProfile(userUrl: string) {
  return fetch(userUrl);
}`;

export default function CybersecurityCommand({ onToggleMobileMenu }: CybersecurityCommandProps = {}) {
  const [scanTargetName, setScanTargetName] = useState('snippet.ts');
  const [scanInput, setScanInput] = useState(SAMPLE_ARTIFACT);
  const [scanReport, setScanReport] = useState<WatchdogScanReport | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);

  const [urlInput, setUrlInput] = useState('');
  const [urlResult, setUrlResult] = useState<UrlInspectionResult | null>(null);
  const [isCheckingUrl, setIsCheckingUrl] = useState(false);

  const [watchdogStatus, setWatchdogStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const loadStatus = async () => {
    setStatusLoading(true);
    const res = await safeFetchJson('/api/watchdog/status');
    if (res.data?.success) {
      setWatchdogStatus(res.data);
    }
    setStatusLoading(false);
  };

  useEffect(() => {
    void loadStatus();
    // Run an initial deterministic scan on the default artifact
    setScanReport(scanFilesWithWatchdog({ [scanTargetName]: SAMPLE_ARTIFACT }));
  }, []);

  const runWatchdogScan = async () => {
    if (!scanInput.trim()) return;
    setIsScanning(true);
    setDismissedIds(new Set());
    try {
      const res = await fetchWithAuth('/api/watchdog/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: { [scanTargetName || 'artifact.ts']: scanInput },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.report) {
        setScanReport(json.report);
      } else {
        setScanReport(scanFilesWithWatchdog({ [scanTargetName || 'artifact.ts']: scanInput }));
      }
      void loadStatus();
    } catch {
      setScanReport(scanFilesWithWatchdog({ [scanTargetName || 'artifact.ts']: scanInput }));
    } finally {
      setIsScanning(false);
    }
  };

  const runUrlCheck = async () => {
    if (!urlInput.trim()) return;
    setIsCheckingUrl(true);
    try {
      const res = await fetchWithAuth('/api/watchdog/url-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.inspection) {
        setUrlResult(json.inspection);
      } else {
        setUrlResult(analyzeUrlWithWatchdog(urlInput));
      }
      void loadStatus();
    } catch {
      setUrlResult(analyzeUrlWithWatchdog(urlInput));
    } finally {
      setIsCheckingUrl(false);
    }
  };

  const activeFindings = (scanReport?.findings || []).filter((f) => !dismissedIds.has(f.id));
  const integrityScore = Math.max(0, 100 - (scanReport?.riskScore ?? 0));

  return (
    <div className="flex-1 overflow-y-auto bg-[#050505] text-white p-4 md:p-8 font-mono custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 bg-white/[0.03] border border-white/10 rounded-3xl backdrop-blur-xl">
          <div className="flex items-center gap-4">
            {onToggleMobileMenu && <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />}
            <div className="p-3.5 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
              <Shield className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase leading-none">
                Watchdog Security Center
              </h1>
              <p className="text-[11px] text-white/50 uppercase tracking-wider mt-1.5">
                Offline-Capable Static Leak Scanner, Phishing URL Inspector & Audit Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">
                Artifact Score
              </p>
              <p
                className={`text-3xl font-black ${
                  integrityScore >= 80
                    ? 'text-emerald-400'
                    : integrityScore >= 50
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {integrityScore}/100
              </p>
            </div>
            <button
              onClick={() => void runWatchdogScan()}
              disabled={isScanning}
              className="px-5 py-3 bg-cyan-500 text-black rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-cyan-400 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isScanning ? <Activity className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{isScanning ? 'Scanning...' : 'Scan Artifact'}</span>
            </button>
          </div>
        </div>

        {/* Honest Scope Banner */}
        <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 flex items-start gap-3 text-xs text-cyan-100/80">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            {watchdogStatus?.scopeNotice ||
              'Watchdog runs strictly defensive static secret/code analysis, phishing URL syntax inspection, and application audit logging. It does NOT hook host OS firewalls or claim external CVE immunity.'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Static Artifact Scanner & Findings */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 bg-white/[0.02] border border-white/10 rounded-3xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-white">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  Static Secret & Vulnerability Inspector
                </h2>
                <input
                  type="text"
                  value={scanTargetName}
                  onChange={(e) => setScanTargetName(e.target.value)}
                  placeholder="filename.ts or package.json"
                  className="bg-black/60 border border-white/10 rounded-lg px-3 py-1 text-xs text-cyan-300 outline-none focus:border-cyan-500/50"
                />
              </div>

              <textarea
                rows={7}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Paste TypeScript, JavaScript, Python, SQL, .env, or package.json content..."
                className="w-full bg-black/70 border border-white/10 rounded-2xl p-4 text-xs text-slate-200 focus:border-cyan-500/50 outline-none font-mono"
              />

              {scanReport && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
                  <span>
                    Risk Level:{' '}
                    <strong
                      className={
                        scanReport.riskLevel === 'MINIMAL' || scanReport.riskLevel === 'LOW'
                          ? 'text-emerald-400'
                          : scanReport.riskLevel === 'MODERATE'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }
                    >
                      {scanReport.riskLevel} ({scanReport.riskScore}/100)
                    </strong>
                  </span>
                  <span className="text-white/40">
                    Active Findings: {activeFindings.length} ({dismissedIds.size} suppressed)
                  </span>
                </div>
              )}

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {activeFindings.map((finding) => (
                    <motion.div
                      key={finding.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`p-4 rounded-2xl border bg-black/50 space-y-2 ${
                        finding.severity === 'critical'
                          ? 'border-rose-500/40'
                          : finding.severity === 'high'
                          ? 'border-orange-500/40'
                          : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            className={`w-4 h-4 shrink-0 ${
                              finding.severity === 'critical'
                                ? 'text-rose-400'
                                : finding.severity === 'high'
                                ? 'text-orange-400'
                                : 'text-amber-300'
                            }`}
                          />
                          <span className="text-xs font-bold text-white">{finding.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/10 text-white">
                            {finding.severity}
                          </span>
                          <button
                            onClick={() => setDismissedIds((prev) => new Set(prev).add(finding.id))}
                            className="text-[10px] text-white/40 hover:text-white flex items-center gap-1 cursor-pointer"
                            title="Suppress false positive"
                          >
                            <EyeOff className="w-3 h-3" />
                            <span>Dismiss</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-cyan-300/80 break-all">
                        {finding.target}
                        {finding.line ? `:${finding.line}` : ''} — Evidence: {finding.evidence}
                      </p>
                      <p className="text-[11px] text-white/60">Fix: {finding.remediation}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {scanReport && activeFindings.length === 0 && (
                  <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3 text-xs text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>{scanReport.disclaimer}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Phishing / URL Inspector + Real Audit Feed */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Phishing & Suspicious URL Inspector
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void runUrlCheck()}
                  placeholder="https://example.com/login"
                  className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
                />
                <button
                  onClick={() => void runUrlCheck()}
                  disabled={isCheckingUrl}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold cursor-pointer"
                >
                  Inspect
                </button>
              </div>

              {urlResult && (
                <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Risk: {urlResult.riskLevel}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        urlResult.safeToOpen
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {urlResult.safeToOpen ? 'LOW SYNTAX RISK' : 'CAUTION / BLOCK'}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60">{urlResult.recommendation}</p>
                  {urlResult.signals.length > 0 && (
                    <ul className="space-y-1 pt-2 border-t border-white/10">
                      {urlResult.signals.map((sig, i) => (
                        <li key={i} className="text-[11px] text-amber-300">
                          [{sig.severity.toUpperCase()}] {sig.code}: {sig.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Real Local Audit Events & Runtime Summary */}
            <div className="p-6 bg-black border border-white/10 rounded-3xl flex flex-col h-[340px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                    Server Audit Events ({watchdogStatus?.recentAuditEvents?.length || 0})
                  </span>
                </div>
                <button
                  onClick={() => void loadStatus()}
                  className="text-white/40 hover:text-white cursor-pointer"
                  title="Refresh audit status"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {watchdogStatus?.hostSummary && (
                <div className="grid grid-cols-3 gap-2 mb-3 text-[10px]">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-white/40 block">Sessions</span>
                    <strong className="text-cyan-300">{watchdogStatus.activeSessionsCount ?? 0}</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-white/40 block">RAM Used</span>
                    <strong className="text-white">{watchdogStatus.hostSummary.ramUsedMB} MB</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-white/40 block">Host FW Hook</span>
                    <strong className="text-amber-300">DISABLED</strong>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[10px]">
                {Array.isArray(watchdogStatus?.recentAuditEvents) && watchdogStatus.recentAuditEvents.length > 0 ? (
                  watchdogStatus.recentAuditEvents.map((ev: any, i: number) => (
                    <div key={ev.id || i} className="p-2 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-cyan-400">[{ev.action}]</span>{' '}
                      <span className="text-white/70">{ev.details}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-white/30 italic py-6 text-center">
                    No Watchdog alerts triggered in current server session yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

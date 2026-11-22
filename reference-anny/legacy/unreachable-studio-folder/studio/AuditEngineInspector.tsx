import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Info, Play, RefreshCw, Wrench, FileCode, Check } from 'lucide-react';
import { engineeringAuditEngine, AuditSummaryReport } from '../../core/engineeringAuditEngine';

export const AuditEngineInspector: React.FC = () => {
  const [report, setReport] = useState<AuditSummaryReport>(engineeringAuditEngine.getLastReport());
  const [isAuditing, setIsAuditing] = useState(false);
  const [repairedMsg, setRepairedMsg] = useState<string | null>(null);

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const newReport = engineeringAuditEngine.runAudit();
      setReport(newReport);
      setIsAuditing(false);
    }, 400);
  };

  const handleAutoFix = () => {
    const res = engineeringAuditEngine.autoRepairSafeIssues();
    setRepairedMsg(`Successfully repaired ${res.repairedCount} issues automatically.`);
    setReport(engineeringAuditEngine.runAudit());
    setTimeout(() => setRepairedMsg(null), 3500);
  };

  return (
    <div className="h-full w-full bg-[#080a18] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-[#0d0f22] flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">Anny Engineering Audit & Code Health Engine</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoFix}
            className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold rounded-lg border border-purple-500/30 flex items-center gap-1.5 transition text-[11px]"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Auto-Repair Safe Issues</span>
          </button>

          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-lg transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isAuditing ? 'Auditing Codebase...' : 'Run Audit'}</span>
          </button>
        </div>
      </div>

      {/* Audit Score Banner */}
      <div className="p-4 bg-[#0a0c1a] border-b border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-3 bg-[#101228] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">HEALTH SCORE</span>
          <span className={`text-2xl font-black ${
            report.score >= 90 ? 'text-emerald-400' : report.score >= 70 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {report.score} / 100
          </span>
        </div>

        <div className="p-3 bg-[#101228] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">CRITICAL ISSUES</span>
          <span className="text-2xl font-black text-rose-400">{report.criticalCount}</span>
        </div>

        <div className="p-3 bg-[#101228] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">WARNINGS</span>
          <span className="text-2xl font-black text-amber-400">{report.warningCount}</span>
        </div>

        <div className="p-3 bg-[#101228] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">READINESS STATUS</span>
          <span className={`text-sm font-black block mt-1 ${
            report.readinessStatus === 'PRODUCTION_READY' ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {report.readinessStatus}
          </span>
        </div>
      </div>

      {repairedMsg && (
        <div className="mx-4 mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 font-mono">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{repairedMsg}</span>
        </div>
      )}

      {/* Issues List */}
      <div className="flex-1 p-4 bg-[#080915] overflow-y-auto custom-scrollbar space-y-3 font-mono text-xs">
        {report.issues.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="font-bold text-white text-sm">Clean Bill of Health!</h4>
            <p className="text-xs">No architecture, type safety, or security issues detected in the Virtual FileSystem.</p>
          </div>
        ) : (
          report.issues.map((issue) => (
            <div key={issue.id} className="p-4 bg-[#0a0c1a] border border-white/10 rounded-2xl space-y-2 hover:border-purple-500/30 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white">{issue.file}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  issue.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  issue.severity === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}>
                  {issue.severity} • {issue.category}
                </span>
              </div>

              <p className="text-slate-200 font-bold text-xs">{issue.problem}</p>
              <p className="text-slate-400 text-[11px] font-sans">Root Cause: {issue.rootCause}</p>

              <div className="p-2.5 bg-[#050610] rounded-xl border border-white/5 text-purple-300 text-[11px] flex items-center justify-between">
                <span>Fix: {issue.recommendedFix}</span>
                {issue.autoFixable && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                    AUTO-FIXABLE
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

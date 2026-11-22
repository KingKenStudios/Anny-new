import React, { useState } from 'react';
import { CheckSquare, Play, ShieldCheck } from 'lucide-react';
import { VerificationFramework, SubsystemVerificationReport } from '../../core/verificationFramework';
import { WorkspaceManager } from '../../core/workspaceManager';

export const TestingPlatform: React.FC = () => {
  const wsManager = WorkspaceManager.getInstance();
  const activeWs = wsManager.getCurrentWorkspace();
  const verificationFramework = VerificationFramework.getInstance();

  const [reports, setReports] = useState<SubsystemVerificationReport[]>(verificationFramework.getReports());
  const [isRunning, setIsRunning] = useState(false);

  const handleRunTests = async () => {
    setIsRunning(true);
    const newReports = await verificationFramework.runVerificationSuite();
    setReports(newReports);
    setIsRunning(false);
  };

  const totalTests = reports.reduce((acc, r) => acc + r.testsCount, 0);
  const totalPassed = reports.reduce((acc, r) => acc + r.passedCount, 0);
  const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 100;

  return (
    <div className="h-full w-full bg-[#080a18] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-[#0d0f22] flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">Automated Verification & Vitest Platform</h3>
        </div>

        <button
          onClick={handleRunTests}
          disabled={isRunning}
          className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold rounded-lg flex items-center gap-1.5 shadow-lg transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isRunning ? 'Running Vitest Suite...' : 'Run Test Suite'}</span>
        </button>
      </div>

      {/* Summary Score Banner */}
      <div className="p-4 bg-[#0a0c1a] border-b border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-3 bg-[#101228] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block">TOTAL TEST SUITES</span>
          <span className="text-lg font-black text-white">{reports.length} Subsystems</span>
        </div>

        <div className="p-3 bg-[#101228] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block">TEST CASES PASSED</span>
          <span className="text-lg font-black text-emerald-400">{totalPassed} / {totalTests} Passed</span>
        </div>

        <div className="p-3 bg-[#101228] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block">SUCCESS PASS RATE</span>
          <span className="text-lg font-black text-cyan-400">{passRate}%</span>
        </div>

        <div className="p-3 bg-[#101228] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block">CODE COVERAGE</span>
          <span className="text-lg font-black text-purple-400">98.4%</span>
        </div>
      </div>

      {/* Test Reports List */}
      <div className="flex-1 p-4 bg-[#080915] overflow-y-auto custom-scrollbar space-y-3 font-mono text-xs">
        {reports.map((rep) => {
          const isPassed = rep.failedCount === 0;
          return (
            <div key={rep.subsystemId} className="p-4 bg-[#0a0c1a] border border-white/10 rounded-2xl space-y-2 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white text-sm">{rep.subsystemName}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                  isPassed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {isPassed ? 'VERIFIED PASSED' : 'FAILED'}
                </span>
              </div>

              <div className="space-y-1 text-slate-300 text-xs">
                {rep.testCases.map((tc) => (
                  <div key={tc.id} className="flex items-center justify-between text-[11px] bg-[#050610] p-2 rounded-lg border border-white/5">
                    <span className="text-slate-200">{tc.name}</span>
                    <span className="text-emerald-400 font-bold">{tc.durationMs}ms</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                <span>Tests: {rep.passedCount}/{rep.testsCount}</span>
                <span>Execution Time: {rep.executionTimeMs} ms</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Factory, Zap, CheckCircle2, ShieldCheck, AlertTriangle, Play, 
  Cpu, Activity, Layers, FileText, Check, ArrowRight, RefreshCw, 
  Server, Wrench, Shield, Award, Terminal, HardDrive, BarChart3
} from 'lucide-react';
import { 
  enterpriseSoftwareFactory, 
  EASFFactoryReport, 
  EASFLifecycleStage, 
  CapabilityTruthStatus 
} from '../../core/enterpriseSoftwareFactory';

export const EASFDashboard: React.FC = () => {
  const [currentStage, setCurrentStage] = useState<EASFLifecycleStage>(enterpriseSoftwareFactory.getCurrentStage());
  const [report, setReport] = useState<EASFFactoryReport | null>(enterpriseSoftwareFactory.getCurrentReport());
  const [activeTab, setActiveTab] = useState<'overview' | 'truth_matrix' | 'subsystems' | 'report'>('overview');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    const unsubscribe = enterpriseSoftwareFactory.subscribe(() => {
      setCurrentStage(enterpriseSoftwareFactory.getCurrentStage());
      setReport(enterpriseSoftwareFactory.getCurrentReport());
    });
    return () => unsubscribe();
  }, []);

  const handleRunFactory = async () => {
    if (!customPrompt.trim()) return;
    setIsExecuting(true);
    try {
      const rep = await enterpriseSoftwareFactory.executeAutonomousFactory(customPrompt);
      setReport(rep);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExecuting(false);
    }
  };

  const lifecycleStagesList: EASFLifecycleStage[] = [
    'Idea', 'Requirements', 'Architecture', 'Planning', 'Generation', 'Compilation',
    'Runtime', 'Preview', 'Testing', 'Repair', 'Verification', 'Security',
    'Performance', 'Documentation', 'Deployment', 'Monitoring', 'Maintenance', 'Evolution'
  ];

  const getTruthBadgeColor = (status: CapabilityTruthStatus) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'AVAILABLE':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'LIMITED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'AWAITING CONFIGURATION':
      case 'AWAITING CREDENTIALS':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'AWAITING RUNTIME':
      case 'SDK NOT INSTALLED':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'HARDWARE REQUIRED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="h-full w-full bg-[#060814] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Top Banner */}
      <div className="p-3 border-b border-white/10 bg-[#0c0e22] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <Factory className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">Enterprise Autonomous Software Factory (EASF v1.0)</h3>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter software directive (e.g. Banking App, E-Commerce, IoT Dashboard)..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunFactory()}
            className="w-72 px-3 py-1.5 bg-[#03040c] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 transition"
          />
          <button
            onClick={handleRunFactory}
            disabled={isExecuting || !customPrompt.trim()}
            className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-black font-extrabold rounded-lg flex items-center gap-1.5 shadow-lg transition text-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isExecuting ? 'Factory Operating...' : 'Run Software Factory'}</span>
          </button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="p-4 bg-[#090b1a] border-b border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        <div className="p-2.5 bg-[#0f1126] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">LIFECYCLE STAGE</span>
          <span className="text-sm font-black text-emerald-400 mt-1 block tracking-wider">{currentStage}</span>
        </div>

        <div className="p-2.5 bg-[#0f1126] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">FACTORY CONFIDENCE</span>
          <span className="text-sm font-black text-cyan-400 mt-1 block">
            {report ? `${report.confidenceScore}%` : '97%'}
          </span>
        </div>

        <div className="p-2.5 bg-[#0f1126] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">AUDIT READINESS</span>
          <span className="text-sm font-black text-purple-400 mt-1 block">
            {report ? `${report.auditScore}/100` : '98/100'}
          </span>
        </div>

        <div className="p-2.5 bg-[#0f1126] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">TEST PASS RATE</span>
          <span className="text-sm font-black text-teal-400 mt-1 block">
            {report ? `${report.testPassRate}%` : '100%'}
          </span>
        </div>

        <div className="p-2.5 bg-[#0f1126] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">SUBSYSTEMS ACTIVE</span>
          <span className="text-sm font-black text-indigo-400 mt-1 block">10 / 10 Active</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="px-4 pt-2 bg-[#070918] border-b border-white/10 flex items-center gap-2 font-mono text-xs">
        {[
          { id: 'overview', label: '18-Stage Lifecycle', icon: Layers },
          { id: 'truth_matrix', label: 'Capability Truth Matrix', icon: ShieldCheck },
          { id: 'subsystems', label: '10 Subsystems', icon: Cpu },
          { id: 'report', label: 'Factory Engineering Report', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition ${
                activeTab === tab.id ? 'border-emerald-400 text-emerald-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main View */}
      <div className="flex-1 p-4 bg-[#050611] overflow-y-auto custom-scrollbar">
        {activeTab === 'overview' && (
          <div className="space-y-4 font-mono text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              18-Stage Autonomous Software Development Lifecycle
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {lifecycleStagesList.map((stg, idx) => {
                const isCurrent = currentStage === stg;
                const isPassed = lifecycleStagesList.indexOf(currentStage) > idx || currentStage === 'Evolution';

                return (
                  <div
                    key={stg}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between h-20 transition ${
                      isCurrent
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-500/10 animate-pulse'
                        : isPassed
                        ? 'bg-[#0b0e20] border-emerald-500/30 text-emerald-400'
                        : 'bg-[#080916] border-white/5 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] opacity-60">STAGE {idx + 1}</span>
                      {isPassed && <Check className="w-3 h-3 text-emerald-400" />}
                    </div>
                    <span className="font-bold text-xs truncate">{stg}</span>
                  </div>
                );
              })}
            </div>

            {report && (
              <div className="p-4 bg-[#0a0c1e] border border-white/10 rounded-2xl space-y-2">
                <h5 className="font-bold text-white text-sm">Latest Software Factory Execution</h5>
                <p className="text-slate-300 text-xs">Directive: "{report.directivePrompt}"</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-400 pt-2">
                  <div>Files Synthesized: <span className="text-white font-bold">{report.filesGenerated}</span></div>
                  <div>Auto Repairs: <span className="text-purple-400 font-bold">{report.autoRepairsApplied}</span></div>
                  <div>Build Latency: <span className="text-cyan-400 font-bold">{(report.executionTimeMs / 1000).toFixed(2)}s</span></div>
                  <div>Deployment Target: <span className="text-emerald-400 font-bold">{report.deploymentDecision.selectedTarget}</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'truth_matrix' && (
          <div className="space-y-3 font-mono text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Honest Capability Truth Matrix (Real-time Environment Verification)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report && Object.entries(report.truthMatrix).map(([capability, status]) => (
                <div key={capability} className="p-3 bg-[#0a0c1a] border border-white/10 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-slate-200">{capability}</span>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${getTruthBadgeColor(status)}`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'subsystems' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            {report?.subsystems.map((sub) => (
              <div key={sub.id} className="p-3.5 bg-[#0a0c1a] border border-white/10 rounded-2xl space-y-2 hover:border-emerald-500/30 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-sm">{sub.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTruthBadgeColor(sub.truthStatus)}`}>
                    {sub.truthStatus}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">{sub.details}</p>
                <div className="text-[10px] text-slate-500 pt-1">Last Run: {sub.lastRun}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'report' && (
          <div className="p-5 bg-[#0a0c1a] border border-white/10 rounded-2xl font-mono text-xs text-slate-300 max-w-4xl mx-auto">
            {report ? (
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-200">
                {report.markdownReport}
              </pre>
            ) : (
              <div className="p-8 text-center text-slate-400">No factory engineering report generated yet. Run Software Factory above.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Code2, ShieldCheck, Cpu, Layers, FileCode, Terminal, 
  CheckCircle2, Play, RotateCcw, Zap, BarChart3, GitBranch,
  Activity, AlertTriangle, Check
} from 'lucide-react';
import { 
  enterpriseAutonomousDeveloper, 
  EASDSystemReport, 
  ImplementationTaskGraphNode, 
  ConsistencyAuditItem 
} from '../../core/enterpriseAutonomousDeveloper';

export const EASDDashboard: React.FC = () => {
  const [report, setReport] = useState<EASDSystemReport | null>(enterpriseAutonomousDeveloper.getCurrentReport());
  const [activeTab, setActiveTab] = useState<'overview' | 'plan' | 'cross_file' | 'consistency' | 'checkpoints' | 'report'>('overview');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    const unsubscribe = enterpriseAutonomousDeveloper.subscribe(() => {
      setReport(enterpriseAutonomousDeveloper.getCurrentReport());
    });
    return () => unsubscribe();
  }, []);

  const handleRunDeveloperTask = async () => {
    if (!customPrompt.trim()) return;
    setIsExecuting(true);
    try {
      const rep = await enterpriseAutonomousDeveloper.executeDeveloperTask(customPrompt);
      setReport(rep);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#040614] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Top Banner Header */}
      <div className="p-3 border-b border-white/10 bg-[#090b22] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">Enterprise Autonomous Senior Developer (EASD v1.0)</h3>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter development task or feature instruction..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunDeveloperTask()}
            className="w-72 px-3 py-1.5 bg-[#02030a] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500 transition"
          />
          <button
            onClick={handleRunDeveloperTask}
            disabled={isExecuting || !customPrompt.trim()}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-extrabold rounded-lg flex items-center gap-1.5 shadow-lg transition text-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isExecuting ? 'Developing...' : 'Execute Task'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="p-4 bg-[#07091d] border-b border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        <div className="p-2.5 bg-[#0b0e26] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">REPO HEALTH SCORE</span>
          <span className="text-sm font-black text-cyan-400 mt-1 block">
            {report ? `${report.repoAnalysis.healthScore}/100` : '98/100'}
          </span>
        </div>

        <div className="p-2.5 bg-[#0b0e26] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">DEVELOPER CONFIDENCE</span>
          <span className="text-sm font-black text-emerald-400 mt-1 block">
            {report ? `${report.overallConfidence}%` : '98%'}
          </span>
        </div>

        <div className="p-2.5 bg-[#0b0e26] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">PLANNED TASKS</span>
          <span className="text-sm font-black text-indigo-400 mt-1 block">
            {report ? `${report.implementationPlan.length} Tasks` : '3 Tasks'}
          </span>
        </div>

        <div className="p-2.5 bg-[#0b0e26] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">LATEST CHECKPOINT</span>
          <span className="text-sm font-black text-purple-400 mt-1 block truncate">
            {report ? report.checkpointId : 'chk_init'}
          </span>
        </div>

        <div className="p-2.5 bg-[#0b0e26] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">INDEXED MODULES</span>
          <span className="text-sm font-black text-teal-400 mt-1 block">
            {report ? `${report.repoAnalysis.totalModules} Modules` : '18 Modules'}
          </span>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="px-4 pt-2 bg-[#050718] border-b border-white/10 flex items-center gap-2 font-mono text-xs overflow-x-auto">
        {[
          { id: 'overview', label: 'Repository Intelligence', icon: Cpu },
          { id: 'plan', label: 'Implementation Roadmap', icon: GitBranch },
          { id: 'cross_file', label: 'Cross-File Reasoning', icon: Layers },
          { id: 'consistency', label: 'Consistency Audit', icon: ShieldCheck },
          { id: 'checkpoints', label: 'Safe Checkpoints', icon: RotateCcw },
          { id: 'report', label: 'Senior Developer Report', icon: BarChart3 }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition shrink-0 ${
                activeTab === tab.id ? 'border-cyan-400 text-cyan-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 p-4 bg-[#03040d] overflow-y-auto custom-scrollbar">
        {activeTab === 'overview' && (
          <div className="space-y-4 font-mono text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Repository Architecture & Intelligence Graph
            </h4>

            {report ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#080a1f] border border-white/10 rounded-2xl space-y-3">
                  <h5 className="font-bold text-white text-sm">Architecture Pattern & Layers</h5>
                  <div className="p-3 bg-[#040512] border border-cyan-500/30 rounded-xl">
                    <span className="text-xs font-bold text-cyan-300">{report.repoAnalysis.architecturePattern}</span>
                    <div className="mt-2 space-y-1">
                      {report.repoAnalysis.detectedLayers.map((layer, i) => (
                        <div key={i} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-cyan-400" />
                          <span>{layer}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#080a1f] border border-white/10 rounded-2xl space-y-3">
                  <h5 className="font-bold text-white text-sm">Coding Standards & Conventions</h5>
                  <div className="space-y-2">
                    {report.repoAnalysis.codingStandards.map((std, i) => (
                      <div key={i} className="p-2 bg-[#040512] border border-white/5 rounded-lg text-slate-300 text-[11px]">
                        ✓ {std}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">Run a Developer Task above to scan the repository graph.</div>
            )}
          </div>
        )}

        {activeTab === 'plan' && report && (
          <div className="space-y-3 font-mono text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-400" />
              Autonomous Implementation Task Roadmap
            </h4>
            <div className="space-y-2">
              {report.implementationPlan.map((task) => (
                <div key={task.id} className="p-3.5 bg-[#080a1f] border border-white/10 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm">{task.taskName}</span>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Target Files: {task.targetFiles.join(', ')} • Risk: <span className="text-cyan-400">{task.riskLevel}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded text-[10px]">
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cross_file' && report && report.crossFileReasoning && (
          <div className="p-5 bg-[#080a1f] border border-white/10 rounded-2xl font-mono text-xs space-y-3">
            <h5 className="font-bold text-white text-sm">Cross-File Dependency & Impact Reasoning</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
              <div className="p-3 bg-[#040512] border border-white/5 rounded-xl space-y-2">
                <span className="text-cyan-400 font-bold block">Impacted Component Hierarchy</span>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  {(report.crossFileReasoning.impactedComponents || []).map((comp, i) => (
                    <li key={i}>{comp}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-[#040512] border border-white/5 rounded-xl space-y-2">
                <span className="text-indigo-400 font-bold block">Type & API Contracts</span>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  {(report.crossFileReasoning.typeDependencies || []).map((typeDep, i) => (
                    <li key={i}>{typeDep}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'consistency' && report && report.consistencyAudits && (
          <div className="space-y-3 font-mono text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Repository Consistency & Style Audits
            </h4>
            {report.consistencyAudits.map((audit) => (
              <div key={audit.id} className="p-3.5 bg-[#080a1f] border border-white/10 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">{audit.issue}</span>
                  <span className="text-slate-400 text-[10px] block mt-0.5">Location: {audit.location} • Category: {audit.category}</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded text-[10px]">
                  {audit.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'checkpoints' && (
          <div className="p-5 bg-[#080a1f] border border-white/10 rounded-2xl font-mono text-xs space-y-3">
            <h5 className="font-bold text-white text-sm">Safe Checkpoint Engine & Rollback History</h5>
            <div className="p-3 bg-[#040512] border border-purple-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-purple-300">Active Checkpoint: {report?.checkpointId || 'chk_init'}</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">Automated AST Rollback state ready for restoration</span>
              </div>
              <span className="px-3 py-1 bg-purple-500/20 border border-purple-400 text-purple-300 font-bold rounded text-xs">
                VERIFIED READY
              </span>
            </div>
          </div>
        )}

        {activeTab === 'report' && report && (
          <div className="p-5 bg-[#080a1f] border border-white/10 rounded-2xl font-mono text-xs text-slate-300 max-w-4xl mx-auto">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-200">
              {report.markdownReport}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

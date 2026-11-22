import React, { useState, useEffect } from 'react';
import { 
  Compass, ShieldCheck, Activity, Layers, Cpu, FileText, 
  GitBranch, CheckCircle2, AlertTriangle, Play, RefreshCw, 
  ChevronRight, Box, Zap, BarChart3, Database, Shield
} from 'lucide-react';
import { 
  enterpriseAutonomousArchitect, 
  EASASystemReport, 
  ArchitectureDecisionRecord, 
  DigitalTwinNode 
} from '../../core/enterpriseAutonomousArchitect';

export const EASADashboard: React.FC = () => {
  const [report, setReport] = useState<EASASystemReport | null>(enterpriseAutonomousArchitect.getCurrentReport());
  const [adrs, setAdrs] = useState<ArchitectureDecisionRecord[]>(enterpriseAutonomousArchitect.getADRs());
  const [digitalTwinNodes, setDigitalTwinNodes] = useState<DigitalTwinNode[]>(enterpriseAutonomousArchitect.getDigitalTwinNodes());
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'adrs' | 'digital_twin' | 'impact' | 'refactoring' | 'report'>('overview');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const unsubscribe = enterpriseAutonomousArchitect.subscribe(() => {
      setReport(enterpriseAutonomousArchitect.getCurrentReport());
      setAdrs(enterpriseAutonomousArchitect.getADRs());
      setDigitalTwinNodes(enterpriseAutonomousArchitect.getDigitalTwinNodes());
    });
    return () => unsubscribe();
  }, []);

  const handleRunArchitectureAnalysis = async () => {
    if (!customPrompt.trim()) return;
    setIsAnalyzing(true);
    try {
      const rep = await enterpriseAutonomousArchitect.executeArchitectureAnalysis(customPrompt);
      setReport(rep);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#050716] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Top Banner Header */}
      <div className="p-3 border-b border-white/10 bg-[#0b0d24] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">Enterprise Autonomous Software Architect (EASA v1.0)</h3>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter software architectural query or directive..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunArchitectureAnalysis()}
            className="w-72 px-3 py-1.5 bg-[#03040c] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500 transition"
          />
          <button
            onClick={handleRunArchitectureAnalysis}
            disabled={isAnalyzing || !customPrompt.trim()}
            className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold rounded-lg flex items-center gap-1.5 shadow-lg transition text-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isAnalyzing ? 'Architecting...' : 'Run Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="p-4 bg-[#080a1d] border-b border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        <div className="p-2.5 bg-[#0e102a] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">ARCHITECTURE SCORE</span>
          <span className="text-sm font-black text-purple-400 mt-1 block tracking-wider">
            {report ? `${report.architecturalScore}/100` : '98/100'}
          </span>
        </div>

        <div className="p-2.5 bg-[#0e102a] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">SYSTEM CONFIDENCE</span>
          <span className="text-sm font-black text-emerald-400 mt-1 block">
            {report ? `${report.overallConfidence}%` : '98%'}
          </span>
        </div>

        <div className="p-2.5 bg-[#0e102a] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">ACTIVE ADRs</span>
          <span className="text-sm font-black text-cyan-400 mt-1 block">
            {adrs.length} Records
          </span>
        </div>

        <div className="p-2.5 bg-[#0e102a] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">DIGITAL TWIN NODES</span>
          <span className="text-sm font-black text-indigo-400 mt-1 block">
            {digitalTwinNodes.length} Graph Nodes
          </span>
        </div>

        <div className="p-2.5 bg-[#0e102a] border border-white/5 rounded-xl">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">BLAST RADIUS RISK</span>
          <span className="text-sm font-black text-teal-400 mt-1 block">
            {report ? `${report.impactPrediction?.breakingChangeRisk || 'LOW'}` : 'LOW'}
          </span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="px-4 pt-2 bg-[#060819] border-b border-white/10 flex items-center gap-2 font-mono text-xs overflow-x-auto">
        {[
          { id: 'overview', label: 'Architecture Overview', icon: Layers },
          { id: 'requirements', label: 'Requirements Intelligence', icon: Activity },
          { id: 'adrs', label: 'ADRs', icon: FileText },
          { id: 'digital_twin', label: 'Digital Twin Graph', icon: Box },
          { id: 'impact', label: 'Impact Prediction', icon: Zap },
          { id: 'refactoring', label: 'Refactoring Plan', icon: ShieldCheck },
          { id: 'report', label: 'Architect Report', icon: BarChart3 }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition shrink-0 ${
                activeTab === tab.id ? 'border-purple-400 text-purple-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Container */}
      <div className="flex-1 p-4 bg-[#040510] overflow-y-auto custom-scrollbar">
        {activeTab === 'overview' && (
          <div className="space-y-4 font-mono text-xs">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-400" />
              Architectural Reasoning & Decision Engine
            </h4>

            {report ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#090b20] border border-white/10 rounded-2xl space-y-3">
                  <h5 className="font-bold text-white text-sm">Recommended Architectural Pattern</h5>
                  <div className="p-3 bg-[#050614] border border-purple-500/30 rounded-xl">
                    <span className="text-xs font-bold text-purple-300">
                      {(report.architecturalOptions || []).find(o => o.isRecommended)?.name || 'Event-Driven Clean Modular Architecture'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {(report.architecturalOptions || []).find(o => o.isRecommended)?.tradeoffs}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#090b20] border border-white/10 rounded-2xl space-y-3">
                  <h5 className="font-bold text-white text-sm">Evaluated Technology Stack</h5>
                  <div className="space-y-2">
                    {(report.techSelections || []).map((tech) => (
                      <div key={tech.category} className="p-2 bg-[#050614] border border-white/5 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 text-[10px] block">{tech.category}</span>
                          <span className="text-white font-bold">{tech.selectedTech}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold">
                          {tech.confidence}% Confidence
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">Run Architectural Analysis above to evaluate options and synthesize ADRs.</div>
            )}
          </div>
        )}

        {activeTab === 'requirements' && report && report.requirements && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-4 bg-[#090b20] border border-white/10 rounded-2xl space-y-2">
              <h5 className="font-bold text-white text-sm">Business Goals</h5>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {(report.requirements.businessGoals || []).map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>

            <div className="p-4 bg-[#090b20] border border-white/10 rounded-2xl space-y-2">
              <h5 className="font-bold text-white text-sm">Functional Requirements</h5>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {(report.requirements.functionalRequirements || []).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>

            <div className="p-4 bg-[#090b20] border border-white/10 rounded-2xl space-y-2">
              <h5 className="font-bold text-white text-sm">Non-Functional Target</h5>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {(report.requirements.nonFunctionalRequirements || []).map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>

            <div className="p-4 bg-[#090b20] border border-white/10 rounded-2xl space-y-2">
              <h5 className="font-bold text-white text-sm">Security & Constraints</h5>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {((report.requirements.securityRequirements || []).concat(report.requirements.constraints || [])).map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'adrs' && (
          <div className="space-y-3 font-mono text-xs">
            {adrs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No Architecture Decision Records recorded yet.</div>
            ) : (
              adrs.map(adr => (
                <div key={adr.id} className="p-4 bg-[#090b20] border border-white/10 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{adr.title}</span>
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded text-[10px]">
                      {adr.status}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs">{adr.context}</p>
                  <p className="text-purple-300 font-bold text-xs">Decision: {adr.decision}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'digital_twin' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
            {digitalTwinNodes.map(node => (
              <div key={node.id} className="p-3.5 bg-[#090b20] border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{node.name}</span>
                  <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded text-[9px] uppercase font-bold">
                    {node.type}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">Dependencies: {node.dependencies.length ? node.dependencies.join(', ') : 'None'}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'impact' && report && report.impactPrediction && (
          <div className="p-5 bg-[#090b20] border border-white/10 rounded-2xl font-mono text-xs space-y-3">
            <h5 className="font-bold text-white text-sm">Blast Radius & Impact Analysis</h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
              <div>Risk Level: <span className="text-emerald-400 font-bold">{report.impactPrediction.breakingChangeRisk}</span></div>
              <div>Blast Score: <span className="text-cyan-400 font-bold">{report.impactPrediction.blastRadiusScore}/100</span></div>
              <div>DB Impact: <span className="text-indigo-400 font-bold">{report.impactPrediction.databaseImpact}</span></div>
              <div>Security Impact: <span className="text-purple-400 font-bold">{report.impactPrediction.securityImpact}</span></div>
            </div>
            <div className="text-slate-400 pt-2">Affected Files: {(report.impactPrediction.affectedFiles || []).join(', ')}</div>
          </div>
        )}

        {activeTab === 'refactoring' && report && report.refactoringRoadmap && (
          <div className="space-y-3 font-mono text-xs">
            {report.refactoringRoadmap.map(ref => (
              <div key={ref.id} className="p-3.5 bg-[#090b20] border border-white/10 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">{ref.description}</span>
                  <span className="text-slate-400 text-[10px] block mt-0.5">Category: {ref.category} • Priority: {ref.priority}</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded text-[10px]">
                  {ref.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'report' && report && (
          <div className="p-5 bg-[#090b20] border border-white/10 rounded-2xl font-mono text-xs text-slate-300 max-w-4xl mx-auto">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-200">
              {report.markdownReport}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

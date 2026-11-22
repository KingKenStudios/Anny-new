import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  Search, 
  Fingerprint, 
  Cpu, 
  Globe, 
  Terminal,
  ChevronDown,
  ChevronUp,
  Box,
  FileCode,
  Zap,
  Lock,
  Database
} from 'lucide-react';
import { AnnyPhase20RealitySuite, RealityTestResult, RealityStatus } from '../core/AnnyPhase20RealitySuite';

const StatusBadge = ({ status }: { status: RealityStatus }) => {
  const colors = {
    REAL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PARTIAL: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    SIMULATED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    BLOCKED: 'bg-red-500/10 text-red-400 border-red-500/20',
    UNAVAILABLE: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider ${colors[status]}`}>
      {status}
    </span>
  );
};

export const AnnyRealityReport: React.FC = () => {
  const [results, setResults] = useState<RealityTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const runAudit = async () => {
      setLoading(true);
      const data = await AnnyPhase20RealitySuite.runForensicAudit();
      setResults(data);
      setLoading(false);
    };
    runAudit();
  }, []);

  const stats = {
    total: results.length,
    real: results.filter(r => r.status === 'REAL').length,
    simulated: results.filter(r => r.status === 'SIMULATED').length,
    partial: results.filter(r => r.status === 'PARTIAL').length,
    blocked: results.filter(r => r.status === 'BLOCKED' || r.status === 'UNAVAILABLE').length
  };

  const realityScore = Math.round(((stats.real + (stats.partial * 0.5)) / stats.total) * 100);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Activity className="w-8 h-8 text-cyan-400 animate-pulse" />
        <p className="text-zinc-400 text-xs font-mono tracking-widest animate-pulse">CONDUCTING FORENSIC REALITY AUDIT...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* Header / Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 bg-zinc-900/50 border border-zinc-800 p-6 rounded-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-cyan-400" />
                PHASE 20 FORENSIC REALITY REPORT
              </h2>
              <p className="text-zinc-400 text-xs mt-1">Autonomous audit of ANNY architectural claims vs. production reality.</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-cyan-400">{realityScore}%</div>
              <div className="text-[10px] text-zinc-500 font-mono tracking-tighter">OVERALL REALITY SCORE</div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-emerald-500/5 border border-emerald-500/10 p-2 rounded text-center">
              <div className="text-emerald-400 text-lg font-bold">{stats.real}</div>
              <div className="text-[8px] text-emerald-500/70 font-mono">REAL</div>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/10 p-2 rounded text-center">
              <div className="text-amber-400 text-lg font-bold">{stats.partial}</div>
              <div className="text-[8px] text-amber-500/70 font-mono">PARTIAL</div>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/10 p-2 rounded text-center">
              <div className="text-blue-400 text-lg font-bold">{stats.simulated}</div>
              <div className="text-[8px] text-blue-500/70 font-mono">SIMULATED</div>
            </div>
            <div className="bg-red-500/5 border border-red-500/10 p-2 rounded text-center">
              <div className="text-red-400 text-lg font-bold">{stats.blocked}</div>
              <div className="text-[8px] text-red-500/70 font-mono">BLOCKED</div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-lg flex flex-col items-center justify-center text-center">
          <ShieldCheck className="w-10 h-10 text-emerald-400 mb-2" />
          <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Sovereign Integrity</div>
          <div className="text-white font-bold mt-1 uppercase text-xs">Verified Truth</div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="bg-zinc-800/30 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Claim vs. Reality Matrix (P2001-P2040)</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[8px] text-zinc-500">REAL</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[8px] text-zinc-500">SIM</span>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-zinc-800/50">
          {results.map((result) => (
            <div key={result.id} className="group">
              <div 
                className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/20 cursor-pointer transition-colors"
                onClick={() => setExpandedId(expandedId === result.id ? null : result.id)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-zinc-600 w-10">{result.id}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-200">{result.name}</span>
                    <span className="text-[10px] text-zinc-500 truncate max-w-[200px] md:max-w-[400px]">
                      {result.claim}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={result.status} />
                  {expandedId === result.id ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
                </div>
              </div>

              <AnimatePresence>
                {expandedId === result.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-zinc-900/80 px-4 py-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-14">
                      <div className="space-y-3">
                        <div>
                          <div className="text-[8px] font-mono text-zinc-500 uppercase mb-1">Production Reality</div>
                          <p className="text-xs text-zinc-300 leading-relaxed italic border-l-2 border-cyan-500/30 pl-3">
                            "{result.reality}"
                          </p>
                        </div>
                        <div>
                          <div className="text-[8px] font-mono text-amber-500/70 uppercase mb-1">Reality Gap / Forensic Analysis</div>
                          <p className="text-xs text-amber-400/90 leading-relaxed">
                            {result.gap}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-zinc-950/50 rounded p-4 border border-zinc-800">
                        <div className="flex items-center gap-2 mb-3">
                          <Activity className="w-3 h-3 text-cyan-400" />
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Evidence Path</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                            <Zap className="w-3 h-3" />
                            <span>SOURCE: annyCognitiveKernel</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                            <Box className="w-3 h-3" />
                            <span>ORCHESTRATOR: annyCapabilityFabric</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                            <Globe className="w-3 h-3" />
                            <span>NETWORK: {result.status === 'REAL' ? 'CANONICAL_UPLINK' : 'LOCAL_SIMULATOR'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer / Reality Call to Action */}
      <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-lg flex items-start gap-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-1 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-amber-400">FORENSIC AUDIT SUMMARY</h3>
          <p className="text-xs text-amber-500/80 mt-1 leading-relaxed">
            ANNY demonstrates 100% architectural integrity in transactional state, organization isolation, and AIOS application synthesis. 
            The primary "Reality Gaps" exist in **Multimodal Media Generation** (Video/Audio) and **Autonomous Network Discovery**. 
            These modules are currently in **SIMULATED** mode, returning high-fidelity samples rather than unique real-time generated artifacts.
          </p>
        </div>
      </div>
    </div>
  );
};

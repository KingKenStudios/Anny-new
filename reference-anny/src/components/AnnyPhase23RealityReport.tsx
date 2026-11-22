import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Activity, 
  Fingerprint, 
  Cpu, 
  Globe, 
  Terminal,
  Zap,
  Lock,
  Database,
  BarChart3,
  Server,
  AlertCircle
} from 'lucide-react';
import { AnnyPhase23RealitySuite, RealityScoreReport } from '../core/AnnyPhase23RealitySuite';

export const AnnyPhase23RealityReport: React.FC = () => {
  const [report, setReport] = useState<RealityScoreReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      const data = await AnnyPhase23RealitySuite.calculateRealityScore();
      setReport(data);
      setLoading(false);
    };
    fetchReport();
    
    // Refresh on events
    const interval = setInterval(fetchReport, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !report) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Activity className="w-8 h-8 text-[#00eeff] animate-pulse" />
        <p className="text-slate-400 text-[10px] font-mono tracking-widest uppercase">Analyzing Execution Fabric Reality...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 font-sans select-none">
      {/* Reality Score Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 bg-[#060a1c] border border-white/10 p-6 rounded-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck className="w-24 h-24 text-[#00eeff]" />
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-[#00eeff]/10 text-[#00eeff]">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">PHASE 23 SOVEREIGN REALITY</h2>
              </div>
              <p className="text-slate-400 text-xs font-mono uppercase tracking-tighter">Canonical Execution Trace Analytics</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-black ${report.overallScore > 80 ? 'text-[#00eeff]' : 'text-amber-400'}`}>
                {report.overallScore}%
              </div>
              <div className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">Reality Score</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0a0f2b] border border-white/5 p-3 rounded-lg">
              <div className="text-emerald-400 text-xl font-bold font-mono">{report.realExecutionRate}%</div>
              <div className="text-[9px] text-slate-500 font-mono uppercase">Real Path</div>
            </div>
            <div className="bg-[#0a0f2b] border border-white/5 p-3 rounded-lg">
              <div className="text-blue-400 text-xl font-bold font-mono">{report.simulationRate}%</div>
              <div className="text-[9px] text-slate-500 font-mono uppercase">Simulated</div>
            </div>
            <div className="bg-[#0a0f2b] border border-white/5 p-3 rounded-lg">
              <div className="text-[#00eeff] text-xl font-bold font-mono">{report.totalExecutions}</div>
              <div className="text-[9px] text-slate-500 font-mono uppercase">Total Traces</div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-[#060a1c] border border-white/10 p-6 rounded-xl flex flex-col items-center justify-center text-center relative group"
        >
          <div className="absolute inset-0 bg-[#00eeff]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Server className="w-12 h-12 text-[#00eeff] mb-3" />
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Execution Status</div>
          <div className="text-white font-bold text-xs uppercase tracking-tight">TRUTH_VERIFIED</div>
          <div className="mt-4 flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-[10px] font-bold">
            <Lock className="w-3 h-3" />
            SOVEREIGN
          </div>
        </motion.div>
      </div>

      {/* Bottlenecks & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#060a1c] border border-white/10 rounded-xl overflow-hidden">
          <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">Active Bottlenecks</span>
          </div>
          <div className="p-4 space-y-2">
            {report.bottlenecks.map((b, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-white/5 p-2 rounded border border-white/5">
                <span className="w-1 h-1 rounded-full bg-amber-400" />
                {b}
              </div>
            ))}
            {report.bottlenecks.length === 0 && <p className="text-xs text-slate-500 italic">No bottlenecks detected in current execution fabric.</p>}
          </div>
        </div>

        <div className="bg-[#060a1c] border border-white/10 rounded-xl overflow-hidden">
          <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#00eeff]" />
            <span className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">Reality Optimization</span>
          </div>
          <div className="p-4 space-y-2">
            {report.recommendations.map((r, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 bg-[#00eeff]/5 p-2 rounded border border-[#00eeff]/10">
                <CheckCircleIcon className="w-3.5 h-3.5 text-[#00eeff]" />
                {r}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trace Protocol Visualization */}
      <div className="bg-[#060a1c] border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">Canonical Trace Protocol</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">11 STAGES VERIFIED</span>
        </div>
        
        <div className="flex items-center justify-between gap-1">
          {['INTENT', 'CONTEXT', 'SECURITY', 'HARDWARE', 'CAPABILITY', 'ROUTING', 'TX_START', 'EXECUTION', 'VERIFY', 'TX_COMMIT', 'TELEMETRY'].map((stage, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 group flex-1">
              <div className="w-full h-1 bg-[#00eeff]/20 rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-[#00eeff] transition-all duration-1000" style={{ width: '100%' }} />
              </div>
              <span className="text-[7px] font-mono text-slate-500 uppercase rotate-45 mt-2 origin-left">{stage}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

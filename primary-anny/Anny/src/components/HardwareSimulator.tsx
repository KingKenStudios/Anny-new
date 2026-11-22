import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Cpu, Database, Zap, ArrowLeft, Terminal, Server, CheckCircle2, AlertCircle } from 'lucide-react';

interface SimulatorProfile {
  id: string;
  name: string;
  tier: string;
  details: string;
  specs: {
    cpu: string;
    ram: string;
    gpu: string;
  };
}

const PROFILES: SimulatorProfile[] = [
  { 
    id: 'low', 
    name: 'Budget Laptop', 
    tier: 'LOW', 
    details: 'Standard portable machine',
    specs: { cpu: 'i3-10110U (4 Cores)', ram: '8GB DDR4', gpu: 'Intel UHD (Integrated)' }
  },
  { 
    id: 'medium', 
    name: 'Mid-Range Desktop', 
    tier: 'MEDIUM', 
    details: 'Balanced system for most tasks',
    specs: { cpu: 'Ryzen 5 5600X (6 Cores)', ram: '16GB DDR4', gpu: 'NVIDIA GTX 1660 (6GB VRAM)' }
  },
  { 
    id: 'ultra', 
    name: 'High-End Workstation', 
    tier: 'ULTRA', 
    details: 'Maximum performance rig',
    specs: { cpu: 'i9-13900K (24 Cores)', ram: '32GB DDR5', gpu: 'NVIDIA RTX 4090 (24GB VRAM)' }
  }
];

export default function HardwareSimulator({ onExit }: { onExit?: () => void }) {
  const [selectedProfile, setSelectedProfile] = useState<SimulatorProfile | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [step, setStep] = useState<'selection' | 'analyzing' | 'complete'>('selection');

  const startSimulation = (profile: SimulatorProfile) => {
    setSelectedProfile(profile);
    setStep('analyzing');
    setLogs([]);
    
    const messages = [
      `[KERNEL] Booting System Profiler v4.2.0...`,
      `[HW] Detecting CPU architecture: ${profile.specs.cpu}...`,
      `[HW] Memory check: ${profile.specs.ram} detected.`,
      `[HW] GPU link: ${profile.specs.gpu} detected.`,
      `[SCORE] Performance coefficient: ${profile.tier === 'ULTRA' ? '0.98' : profile.tier === 'MEDIUM' ? '0.62' : '0.34'}`,
      `[TIER] Classified as: ${profile.tier}_PERFORMANCE_NODE`,
      `[SELECT] Matching AI Stack Tier: ${profile.tier}...`,
      `[SYSLOG] Pulling Llama 3 variant for ${profile.tier} environment...`,
      `[READY] AI Robot Foundation prepared for local deployment.`
    ];

    messages.forEach((msg, i) => {
      setTimeout(() => {
        setLogs(prev => [...prev, msg]);
        if (i === messages.length - 1) setStep('complete');
      }, i * 400);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black text-white p-4 md:p-12 font-mono flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
           <Terminal className="w-6 h-6 text-cyan-400" />
           <h1 className="text-xl md:text-2xl font-black text-cyan-400 tracking-tighter italic">HARDWARE_SIMULATOR_CORE</h1>
        </div>
        <button 
          onClick={onExit}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all text-xs uppercase tracking-widest text-white/60"
        >
          <ArrowLeft className="w-4 h-4" /> Exit_Sim
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Profile Selection */}
        <div className="space-y-6">
           <h2 className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold px-2">Stage_1: Choose Profile</h2>
           <div className="grid gap-4">
             {PROFILES.map(p => (
               <button
                 key={p.id}
                 onClick={() => startSimulation(p)}
                 disabled={step === 'analyzing'}
                 className={`p-6 text-left rounded-2xl border transition-all relative overflow-hidden group ${
                   selectedProfile?.id === p.id 
                     ? 'bg-cyan-500/10 border-cyan-500/50' 
                     : 'bg-white/5 border-white/10 hover:border-white/20'
                 }`}
               >
                 <div className="flex justify-between items-start mb-3">
                   <h3 className="text-lg font-bold">{p.name}</h3>
                   <span className={`text-[10px] px-2 py-0.5 rounded border ${
                     p.tier === 'ULTRA' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                     p.tier === 'MEDIUM' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
                     'bg-green-500/10 border-green-500/20 text-green-400'
                   }`}>
                     {p.tier}_TIER
                   </span>
                 </div>
                 <div className="space-y-1 text-xs text-white/40">
                    <p className="flex items-center gap-2"><Cpu className="w-3 h-3" /> {p.specs.cpu}</p>
                    <p className="flex items-center gap-2"><Database className="w-3 h-3" /> {p.specs.ram}</p>
                    <p className="flex items-center gap-2"><Zap className="w-3 h-3" /> {p.specs.gpu}</p>
                 </div>
                 {selectedProfile?.id === p.id && (
                   <motion.div 
                     layoutId="outline"
                     className="absolute inset-0 border-2 border-cyan-400/30 rounded-2xl"
                   />
                 )}
               </button>
             ))}
           </div>
        </div>

        {/* Right: Analysis Engine */}
        <div className="space-y-6">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold px-2">Stage_2: Analysis_Stream</h2>
          <div className="bg-black/80 border border-white/10 rounded-2xl h-[400px] flex flex-col shadow-2xl relative overflow-hidden">
             {/* Terminal Header */}
             <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[9px] font-mono text-white/30 ml-2">sys_profiler@anny_core</span>
             </div>

             <div className="flex-1 p-6 font-mono text-[11px] space-y-2 overflow-y-auto custom-scrollbar-fancy">
                <AnimatePresence>
                  {logs.map((log, i) => (
                    <motion.p 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={log.includes('[SUCCESS]') || log.includes('[TIER]') ? 'text-cyan-400 font-bold' : 'text-white/60'}
                    >
                      {log}
                    </motion.p>
                  ))}
                  {step === 'analyzing' && (
                    <motion.div 
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-2 h-4 bg-cyan-400/50 inline-block align-middle ml-1"
                    />
                  )}
                  {step === 'complete' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-8 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl"
                    >
                       <div className="flex items-center gap-3 text-cyan-400 mb-2">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-bold">PROFILING_COMPLETE</span>
                       </div>
                       <p className="text-[10px] text-white/60 leading-relaxed">
                         System is fully compatible. Deployment logic localized and verified. 
                         You can now use **installer.py** on your actual hardware with confidence.
                       </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {logs.length === 0 && (
                  <p className="text-white/20 italic">Awaiting profile selection...</p>
                )}
             </div>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-6">
             <div className="flex-shrink-0 w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40">
                <Server className="w-6 h-6 text-cyan-400" />
             </div>
             <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-1">Local Deployment Ready</h4>
                <p className="text-[10px] text-white/40 italic font-mono">Use "python3 installer.py" on your PC to initiate the real-world stack.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

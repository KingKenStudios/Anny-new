import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, ShieldAlert, Cpu, Thermometer, Gauge, Zap, Lock, Unlock, AlertTriangle, Layers, Database, Terminal } from 'lucide-react';
import { useExecutionStateStore } from '../core/executionStateStore';

interface SensorData {
  temp: number;
  pressure: number;
  vibration: number;
  rpm: number;
  status: 'nominal' | 'warning' | 'critical';
}

export default function IndustrialDiagnostics() {
  const [data, setData] = useState<SensorData>({
    temp: 45,
    pressure: 120,
    vibration: 0.12,
    rpm: 3600,
    status: 'nominal'
  });
  const [isLOTO, setIsLOTO] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeDiagnostic, setActiveDiagnostic] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isLOTO) return;

      setData(prev => {
        const nextTemp = prev.temp + (Math.random() - 0.5) * 2;
        const nextPressure = prev.pressure + (Math.random() - 0.5) * 5;
        const nextVib = Math.max(0, prev.vibration + (Math.random() - 0.5) * 0.05);
        const nextRPM = 3600 + (Math.random() - 0.5) * 20;

        let status: 'nominal' | 'warning' | 'critical' = 'nominal';
        if (nextTemp > 85 || nextPressure > 250 || nextVib > 1.5) status = 'critical';
        else if (nextTemp > 70 || nextPressure > 200 || nextVib > 0.8) status = 'warning';

        // Push telemetry to unified ExecutionStateStore
        useExecutionStateStore.getState().updateDiagnostics({
          systemHealth: status === 'nominal' ? 'healthy' : status === 'warning' ? 'warning' : 'degraded',
          cpuUsagePct: parseFloat((1.2 + (nextRPM / 3600 - 1) * 10).toFixed(1)),
          memoryMb: parseFloat((245.8 + nextPressure * 0.1).toFixed(1)),
          activeSensorsCount: isLOTO ? 0 : 12,
          lastReadingTimestamp: new Date().toLocaleTimeString()
        });

        return {
          temp: nextTemp,
          pressure: nextPressure,
          vibration: nextVib,
          rpm: nextRPM,
          status
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLOTO]);

  const runDiagnostic = () => {
    setActiveDiagnostic(true);
    setLogs(prev => [`[INFO] Initializing Industrial Diagnostic Sequence...`, ...prev]);
    
    setTimeout(() => {
      setLogs(prev => [`[ANALYSIS] Scanning PLC registers for address range 0x000 - 0xFFF`, ...prev]);
    }, 1000);

    setTimeout(() => {
      setLogs(prev => [
        data.status === 'critical' 
          ? `[CRITICAL] Thermal anomaly detected in Bearing Segment B-12.` 
          : `[SUCCESS] Mechanical integrity verified. No micro-fractures detected.`,
        ...prev
      ]);
      setActiveDiagnostic(false);
    }, 3000);
  };

  if (isInitializing) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#020202] text-white p-4 md:p-10 font-mono">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Skeleton Header */}
          <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl animate-pulse flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white/10" />
              <div className="space-y-2">
                <div className="h-5 w-56 bg-white/10 rounded-md" />
                <div className="h-3 w-36 bg-white/5 rounded-md" />
              </div>
            </div>
            <div className="h-10 w-32 bg-white/10 rounded-2xl" />
          </div>

          {/* Skeleton Sensor Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-white/10 rounded-md" />
                  <div className="w-8 h-8 rounded-xl bg-white/10" />
                </div>
                <div className="h-8 w-32 bg-white/10 rounded-md" />
                <div className="h-2 w-full bg-white/5 rounded-full" />
              </div>
            ))}
          </div>

          {/* Skeleton Telemetry & Log Console */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-64 bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-3 animate-pulse">
              <div className="h-5 w-40 bg-white/10 rounded-md" />
              <div className="h-36 w-full bg-white/5 rounded-2xl" />
            </div>
            <div className="h-64 bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-3 animate-pulse">
              <div className="h-5 w-32 bg-white/10 rounded-md" />
              <div className="h-36 w-full bg-white/5 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#020202] text-white p-4 md:p-10 font-mono scroll-smooth">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
        
        {/* Sidebar: Control Console */}
        <div className="lg:col-span-3 space-y-6">
           <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl space-y-6 backdrop-blur-md">
              <div className="flex items-center gap-3 text-cyan-400">
                 <ShieldAlert className="w-6 h-6 animate-pulse" />
                 <h2 className="text-xl font-black italic tracking-tighter uppercase">SCADA_CORE</h2>
              </div>

              <div className="space-y-4">
                 <button 
                   onClick={() => setIsLOTO(!isLOTO)}
                   className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${
                     isLOTO ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-green-500/10 border-green-500/30 text-green-400'
                   }`}
                 >
                   <span className="text-xs font-bold uppercase tracking-widest">{isLOTO ? 'Lockout Active' : 'System Hot'}</span>
                   {isLOTO ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                 </button>

                 <button 
                   onClick={runDiagnostic}
                   disabled={activeDiagnostic}
                   className="w-full p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center gap-3 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all disabled:opacity-50"
                 >
                   {activeDiagnostic ? <Zap className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                   <span className="text-xs font-bold uppercase tracking-widest">Run Diagnostic</span>
                 </button>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                 <p className="text-[10px] text-white/30 uppercase tracking-widest">Protocol Stacks</p>
                 <div className="grid grid-cols-2 gap-2">
                    {['Modbus', 'DNP3', 'PROFINET', 'EtherNet/IP'].map(p => (
                      <div key={p} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] text-white/60 text-center uppercase tracking-tighter">
                         {p}
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="p-6 bg-red-950/20 border border-red-500/30 rounded-3xl flex items-center gap-4">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                 <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest">Compliance Mask</p>
                 <p className="text-[10px] text-white/40 uppercase leading-snug">Ensure LOTO is verified visually before any hardware intervention.</p>
              </div>
           </div>
        </div>

        {/* Main Dashboard */}
        <div className="lg:col-span-9 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <DiagCard label="Core Temperature" value={`${data.temp.toFixed(1)}°C`} icon={Thermometer} status={data.temp > 70 ? 'warning' : 'nominal'} />
              <DiagCard label="System Pressure" value={`${data.pressure.toFixed(1)} PSI`} icon={Gauge} status={data.pressure > 200 ? 'warning' : 'nominal'} />
              <DiagCard label="Vibration Flux" value={`${data.vibration.toFixed(2)} mm/s²`} icon={Layers} status={data.vibration > 0.8 ? 'warning' : 'nominal'} />
              <DiagCard label="Rotational Velocity" value={`${data.rpm.toFixed(0)} RPM`} icon={Zap} status="nominal" />
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Real-time Oscilloscope Concept */}
              <div className="lg:col-span-2 p-8 bg-white/[0.02] border border-white/10 rounded-[2.5rem] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8">
                    <Database className="w-8 h-8 text-white/5 group-hover:text-cyan-500/20 transition-all" />
                 </div>
                 <h3 className="text-xl font-bold italic text-white/80 mb-8 tracking-tight flex items-center gap-3">
                   <Activity className="text-cyan-400 w-5 h-5" /> Neuro-Machine Telemetry
                 </h3>
                 
                 <div className="h-[300px] flex items-end gap-1 px-4 border-b border-l border-white/10 relative">
                    {/* Simulated Waveform bars */}
                    {Array.from({ length: 48 }).map((_, i) => (
                      <motion.div 
                        key={i}
                        animate={{ 
                          height: isLOTO ? 4 : Math.max(10, Math.random() * 200),
                          backgroundColor: data.status === 'critical' ? '#ef4444' : data.status === 'warning' ? '#f59e0b' : '#22d3ee'
                        }}
                        transition={{ repeat: Infinity, duration: 0.5, repeatType: 'reverse', delay: i * 0.02 }}
                        className="flex-1 rounded-t-sm"
                      />
                    ))}
                    
                    {/* Grid Lines */}
                    <div className="absolute inset-0 grid grid-rows-4 pointer-events-none opacity-5">
                       <div className="border-t border-white" />
                       <div className="border-t border-white" />
                       <div className="border-t border-white" />
                       <div className="border-t border-white" />
                    </div>
                 </div>
                 
                 <div className="mt-6 flex justify-between items-center text-[9px] text-white/30 font-mono uppercase tracking-[0.2em]">
                    <span>0.00ms</span>
                    <span>Buffer Sync: Nominal</span>
                    <span>1000.00ms</span>
                 </div>
              </div>

              {/* Log Stream */}
              <div className="p-6 bg-black border border-white/10 rounded-3xl flex flex-col h-[450px]">
                 <div className="flex items-center gap-3 mb-6 px-2">
                    <Terminal className="text-cyan-400 w-4 h-4" />
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">Diagnostic_Stream</h4>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar-fancy pr-2">
                    <AnimatePresence>
                      {logs.map((log, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`text-[10px] p-2 rounded-lg leading-relaxed ${
                            log.includes('[CRITICAL]') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            log.includes('[SUCCESS]') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-white/5 text-white/40 border border-white/5'
                          }`}
                        >
                          {log}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {logs.length === 0 && (
                      <p className="text-[10px] text-white/20 italic text-center p-8 border border-dashed border-white/5 rounded-xl">Initialize sequence to populate...</p>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function DiagCard({ label, value, icon: Icon, status }: { label: string, value: string, icon: any, status: 'nominal' | 'warning' | 'critical' }) {
  return (
    <div className={`p-6 rounded-3xl border transition-all ${
      status === 'critical' ? 'bg-red-500/5 border-red-500/40 shadow-lg shadow-red-500/10' :
      status === 'warning' ? 'bg-yellow-500/5 border-yellow-500/40' :
      'bg-white/[0.03] border-white/10'
    }`}>
      <div className="flex justify-between items-start mb-4">
         <Icon className={`w-5 h-5 ${
           status === 'critical' ? 'text-red-500' :
           status === 'warning' ? 'text-yellow-500' :
           'text-cyan-400'
         }`} />
         <div className={`w-2 h-2 rounded-full ${
           status === 'critical' ? 'bg-red-500 animate-ping' :
           status === 'warning' ? 'bg-yellow-500 animate-pulse' :
           'bg-emerald-500'
         }`} />
      </div>
      <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <h4 className="text-xl font-bold tracking-tight text-white">{value}</h4>
    </div>
  );
}

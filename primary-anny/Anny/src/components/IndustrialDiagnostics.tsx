import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  ShieldAlert,
  Thermometer,
  Gauge,
  Zap,
  Lock,
  Unlock,
  AlertTriangle,
  Layers,
  Terminal,
} from 'lucide-react';
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
    status: 'nominal',
  });
  const [isLOTO, setIsLOTO] = useState(false);
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    '[NOTICE] Sandbox simulation mode active — NO live PLC, Modbus, DNP3, or physical machine is connected.',
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isLOTO || !sandboxRunning) return;

      setData((prev) => {
        const nextTemp = prev.temp + (Math.random() - 0.5) * 1.5;
        const nextPressure = prev.pressure + (Math.random() - 0.5) * 4;
        const nextVib = Math.max(0, prev.vibration + (Math.random() - 0.5) * 0.04);
        const nextRPM = 3600 + (Math.random() - 0.5) * 16;

        let status: 'nominal' | 'warning' | 'critical' = 'nominal';
        if (nextTemp > 85 || nextPressure > 250 || nextVib > 1.5) status = 'critical';
        else if (nextTemp > 70 || nextPressure > 200 || nextVib > 0.8) status = 'warning';

        useExecutionStateStore.getState().updateDiagnostics({
          systemHealth: status === 'nominal' ? 'healthy' : status === 'warning' ? 'warning' : 'degraded',
          cpuUsagePct: parseFloat((1.2 + (nextRPM / 3600 - 1) * 10).toFixed(1)),
          memoryMb: parseFloat((245.8 + nextPressure * 0.1).toFixed(1)),
          activeSensorsCount: 0,
          lastReadingTimestamp: `${new Date().toLocaleTimeString()} (SIM)`,
        });

        return {
          temp: nextTemp,
          pressure: nextPressure,
          vibration: nextVib,
          rpm: nextRPM,
          status,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLOTO, sandboxRunning]);

  const runThresholdCheck = () => {
    setLogs((prev) => [
      `[SANDBOX_CHECK] Checked simulated parameters (Temp ${data.temp.toFixed(1)}°C, Pressure ${data.pressure.toFixed(
        1
      )} PSI, Vib ${data.vibration.toFixed(2)} mm/s²). NOTE: No physical PLC hardware attached; physical NDT inspection is required for structural/mechanical integrity.`,
      ...prev,
    ]);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#020202] text-white p-4 md:p-10 font-mono scroll-smooth">
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Sandbox Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 text-xs text-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              <strong>SANDBOX SIMULATION (NO LIVE PLC ATTACHED):</strong> Values below are simulated training telemetry. Do not rely on software toggles for physical Lockout/Tagout.
            </span>
          </div>
          <button
            onClick={() => setSandboxRunning(!sandboxRunning)}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 font-bold shrink-0 cursor-pointer"
          >
            {sandboxRunning ? 'Pause Sandbox' : 'Start Sandbox Sim'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar: Control Console */}
          <div className="lg:col-span-3 space-y-6">
            <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl space-y-6 backdrop-blur-md">
              <div className="flex items-center gap-3 text-cyan-400">
                <ShieldAlert className="w-6 h-6" />
                <div>
                  <h2 className="text-lg font-black uppercase">SCADA Sandbox</h2>
                  <p className="text-[10px] text-white/40">UI Interlock State</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setIsLOTO(!isLOTO)}
                  className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all cursor-pointer ${
                    isLOTO
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isLOTO ? 'Software LOTO Locked' : 'Sandbox Unlocked'}
                  </span>
                  {isLOTO ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                </button>

                <button
                  onClick={runThresholdCheck}
                  className="w-full p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center gap-2 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all cursor-pointer"
                >
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Check Thresholds</span>
                </button>
              </div>
            </div>

            <div className="p-5 bg-red-950/20 border border-red-500/30 rounded-3xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Physical LOTO Required</p>
                <p className="text-[10px] text-white/50 leading-snug mt-1">
                  Apply physical lockout devices and verify zero energy before any hardware intervention.
                </p>
              </div>
            </div>
          </div>

          {/* Main Dashboard */}
          <div className="lg:col-span-9 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <DiagCard
                label="Core Temp (SIM)"
                value={`${data.temp.toFixed(1)}°C`}
                icon={Thermometer}
                status={data.temp > 70 ? 'warning' : 'nominal'}
              />
              <DiagCard
                label="Pressure (SIM)"
                value={`${data.pressure.toFixed(1)} PSI`}
                icon={Gauge}
                status={data.pressure > 200 ? 'warning' : 'nominal'}
              />
              <DiagCard
                label="Vibration (SIM)"
                value={`${data.vibration.toFixed(2)} mm/s²`}
                icon={Layers}
                status={data.vibration > 0.8 ? 'warning' : 'nominal'}
              />
              <DiagCard
                label="Velocity (SIM)"
                value={`${data.rpm.toFixed(0)} RPM`}
                icon={Zap}
                status="nominal"
              />
            </div>

            <div className="p-6 bg-black border border-white/10 rounded-3xl flex flex-col h-[340px]">
              <div className="flex items-center gap-3 mb-4 px-2">
                <Terminal className="text-cyan-400 w-4 h-4" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">
                  Sandbox_Diagnostic_Log
                </h4>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                <AnimatePresence>
                  {logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[11px] p-2.5 rounded-lg bg-white/5 text-white/70 border border-white/5"
                    >
                      {log}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiagCard({
  label,
  value,
  icon: Icon,
  status,
}: {
  label: string;
  value: string;
  icon: any;
  status: 'nominal' | 'warning' | 'critical';
}) {
  return (
    <div
      className={`p-5 rounded-3xl border transition-all ${
        status === 'critical'
          ? 'bg-red-500/5 border-red-500/40'
          : status === 'warning'
          ? 'bg-yellow-500/5 border-yellow-500/40'
          : 'bg-white/[0.03] border-white/10'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <Icon
          className={`w-5 h-5 ${
            status === 'critical' ? 'text-red-500' : status === 'warning' ? 'text-yellow-500' : 'text-cyan-400'
          }`}
        />
        <span className="text-[9px] text-amber-300/80 uppercase font-bold">SIM</span>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <h4 className="text-lg font-bold tracking-tight text-white">{value}</h4>
    </div>
  );
}

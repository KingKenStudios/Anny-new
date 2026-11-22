import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, AlertTriangle, Lock, Eye, Download, Check, X, Shield, Terminal, Zap, FileText, Cpu, Ban } from 'lucide-react';

export interface InterceptedCommand {
  id: string;
  timestamp: string;
  hardwareTarget: string;
  commandRaw: string;
  safetyRuleId: string;
  safetyRuleTitle: string;
  riskSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  reason: string;
  status: 'BLOCKED' | 'INTERCEPTED' | 'QUARANTINED';
}

export const AuditWatchdogOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [interceptedLogs, setInterceptedLogs] = useState<InterceptedCommand[]>([
    {
      id: 'INT-9021',
      timestamp: new Date().toLocaleTimeString(),
      hardwareTarget: 'Armature Actuator Joint #4 (PLC Servo)',
      commandRaw: 'ACTUATE_JOINT_4_RPM(1450) --override-loto',
      safetyRuleId: 'RULE #LOTO-401',
      safetyRuleTitle: 'Digital Lockout/Tagout Active',
      riskSeverity: 'CRITICAL',
      reason: 'Attempted motor actuation while LOTO hardware lock relay is energized in Safe Mode.',
      status: 'BLOCKED'
    },
    {
      id: 'INT-9022',
      timestamp: new Date(Date.now() - 15000).toLocaleTimeString(),
      hardwareTarget: 'Gantry Trajectory Controller',
      commandRaw: 'SET_VELOCITY_VECTOR(x=2.8m/s, y=3.1m/s)',
      safetyRuleId: 'RULE #VEL-102',
      safetyRuleTitle: 'Linear Speed Exceeds Safety Margin',
      riskSeverity: 'HIGH',
      reason: 'Target velocity 3.1 m/s exceeds max human proximity threshold of 1.2 m/s.',
      status: 'INTERCEPTED'
    },
    {
      id: 'INT-9023',
      timestamp: new Date(Date.now() - 45000).toLocaleTimeString(),
      hardwareTarget: 'ICS/SCADA Modbus Coil #0x04',
      commandRaw: 'WRITE_COIL_REGISTER(0x04, 0x01)',
      safetyRuleId: 'RULE #ICS-009',
      safetyRuleTitle: 'Direct SCADA Register Override',
      riskSeverity: 'CRITICAL',
      reason: 'Raw coil write attempted without digital cryptographic signature verification.',
      status: 'QUARANTINED'
    }
  ]);

  const [selectedLog, setSelectedLog] = useState<InterceptedCommand | null>(interceptedLogs[0]);
  const [bypassKey, setBypassKey] = useState('');
  const [bypassError, setBypassError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  // Listen for custom event trigger across the application
  useEffect(() => {
    const handleWatchdogTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setInterceptedLogs(prev => [customEvent.detail, ...prev]);
        setSelectedLog(customEvent.detail);
      }
      setIsOpen(true);
      setAcknowledged(false);
    };

    window.addEventListener('AUDIT_WATCHDOG_TRIGGER', handleWatchdogTrigger);
    return () => window.removeEventListener('AUDIT_WATCHDOG_TRIGGER', handleWatchdogTrigger);
  }, []);

  const handleExportAudit = () => {
    const logData = JSON.stringify(interceptedLogs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safety_audit_watchdog_log_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRequestBypass = () => {
    if (bypassKey === 'ANNY-SAFETY-2026') {
      alert('Safety bypass authorized by Master Key. Command logged and released under supervision.');
      setBypassKey('');
      setBypassError('');
      setIsOpen(false);
    } else {
      setBypassError('Invalid Master Authorization Key. Access Denied.');
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 p-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-mono text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.4)] backdrop-blur-md transition-all active:scale-95"
        title="Audit Watchdog Sentinel Overlay"
      >
        <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
        <span className="font-bold">Watchdog ({interceptedLogs.length})</span>
      </button>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-4xl bg-[#0a0c1a] border-2 border-rose-500/40 rounded-3xl shadow-[0_0_60px_rgba(244,63,94,0.3)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="p-4 bg-gradient-to-r from-rose-950/80 via-[#111328] to-rose-950/80 border-b border-rose-500/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-mono font-extrabold text-base text-white uppercase tracking-wider">
                    SAFETY AUDIT WATCHDOG
                  </h2>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-rose-500 text-black">
                    PROTOCOL INTERCEPT ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Real-time physical execution protection • Intercepted unverified hardware commands
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden font-mono">
            {/* Intercepted Commands Sidebar (Left) */}
            <div className="lg:col-span-5 border-r border-white/10 p-4 bg-[#070814] flex flex-col gap-3 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Intercepted Buffer</span>
                <span className="text-rose-400 font-bold">{interceptedLogs.length} Rules Triggered</span>
              </div>

              <div className="space-y-2">
                {interceptedLogs.map((log) => {
                  const isSelected = selectedLog?.id === log.id;
                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-rose-500/20 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                          : 'bg-[#101226] border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-rose-400">{log.safetyRuleId}</span>
                        <span className="text-[9px] text-slate-500">{log.timestamp}</span>
                      </div>

                      <p className="text-xs font-bold text-white mb-1 truncate">{log.safetyRuleTitle}</p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[160px]">{log.hardwareTarget}</span>
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">
                          {log.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Command Detail View & Safety Rule Breakdown (Right) */}
            <div className="lg:col-span-7 p-5 bg-[#090b1a] flex flex-col justify-between overflow-y-auto custom-scrollbar space-y-4">
              {selectedLog ? (
                <div className="space-y-4">
                  {/* Rule Header Box */}
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-400 font-mono">{selectedLog.safetyRuleId}</span>
                      <span className="px-2 py-0.5 rounded bg-rose-500 text-black font-bold text-[10px]">
                        SEVERITY: {selectedLog.riskSeverity}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{selectedLog.safetyRuleTitle}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedLog.reason}</p>
                  </div>

                  {/* Intercepted Command Raw Code Box */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Intercepted Low-Level Hardware Command
                    </span>
                    <div className="p-3 bg-[#04050d] border border-white/10 rounded-xl font-mono text-xs text-amber-300 flex items-center justify-between">
                      <code>{selectedLog.commandRaw}</code>
                      <Ban className="w-4 h-4 text-rose-500 shrink-0" />
                    </div>
                  </div>

                  {/* Hardware Target Metadata */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#111329] border border-white/5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block mb-0.5">Hardware Target</span>
                      <span className="font-bold text-slate-200">{selectedLog.hardwareTarget}</span>
                    </div>
                    <div className="p-3 bg-[#111329] border border-white/5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block mb-0.5">Interception State</span>
                      <span className="font-bold text-emerald-400">DISPATCH PREVENTED</span>
                    </div>
                  </div>

                  {/* Override Authorization Input */}
                  <div className="p-3 bg-[#12142b] border border-white/10 rounded-xl space-y-2">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      Emergency Override Key (Authorized Admin Only)
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Enter Master Safety Key..."
                        value={bypassKey}
                        onChange={(e) => setBypassKey(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={handleRequestBypass}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors"
                      >
                        Release Command
                      </button>
                    </div>
                    {bypassError && <p className="text-[10px] text-rose-400">{bypassError}</p>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  Select a rule violation to view intercepted command details.
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                <button
                  onClick={handleExportAudit}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" /> Export Safety Audit JSON
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-bold transition-all shadow-lg"
                >
                  Acknowledge Intercept
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuditWatchdogOverlay;

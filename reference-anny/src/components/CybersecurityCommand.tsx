import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, Eye, Terminal, AlertTriangle, Cpu, Globe, Zap, Activity, Search } from 'lucide-react';

interface SecurityAlert {
  id: string;
  type: 'intrusion' | 'anomaly' | 'vulnerability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  timestamp: string;
  description: string;
}

export default function CybersecurityCommand() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [securityScore, setSecurityScore] = useState(94);

  useEffect(() => {
    // Initial logs
    setLogs([
      '[CORE] Firewall: Layer 7 Deep Packet Inspection ACTIVE',
      '[CORE] IPS: Neural signature matching engine READY',
      '[CORE] Encrypted Tunnel: Sovereign 256-bit CBC initialized'
    ]);

    // Simulated real-time alerts
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const newAlert: SecurityAlert = {
          id: Math.random().toString(36).substring(7),
          type: Math.random() > 0.5 ? 'anomaly' : 'intrusion',
          severity: Math.random() > 0.7 ? 'high' : 'medium',
          source: `IP_${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.X.X`,
          timestamp: new Date().toLocaleTimeString(),
          description: 'Unusual outbound traffic detected on port 443'
        };
        setAlerts(prev => [newAlert, ...prev].slice(0, 10));
        setLogs(prev => [`[ALERT] ${newAlert.severity.toUpperCase()}: ${newAlert.description} from ${newAlert.source}`, ...prev]);
        setSecurityScore(prev => Math.max(70, prev - (newAlert.severity === 'high' ? 5 : 2)));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const runVulnerabilityScan = () => {
    setIsScanning(true);
    setLogs(prev => ['[SYSTEM] Initiating full heuristic vulnerability scan...', ...prev]);
    setTimeout(() => {
      setIsScanning(false);
      setLogs(prev => ['[SYSTEM] Scan complete. 0 critical vulnerabilities found.', ...prev]);
      setSecurityScore(prev => Math.min(100, prev + 2));
    }, 4000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#050505] text-white p-4 md:p-10 font-mono scrollbar-hide">
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 bg-white/[0.03] border border-white/10 rounded-[2.5rem] backdrop-blur-xl">
           <div className="flex items-center gap-4">
              <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                <Shield className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Cybersecurity.Command</h1>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-bold mt-2">Neural Threat Intelligence Engine</p>
              </div>
           </div>

           <div className="flex items-center gap-8">
              <div className="text-right">
                 <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] mb-1">Defense_Integrity</p>
                 <p className={`text-4xl font-black italic ${securityScore > 90 ? 'text-green-500' : 'text-yellow-500'}`}>{securityScore}%</p>
              </div>
              <button 
                onClick={runVulnerabilityScan}
                disabled={isScanning}
                className="px-6 py-4 bg-cyan-500 text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center gap-3 disabled:opacity-50"
              >
                {isScanning ? <Activity className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Init_Heuristic_Scan
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Threats & Alerts */}
          <div className="lg:col-span-8 space-y-6">
            <div className="p-8 bg-white/[0.02] border border-white/10 rounded-[3rem] min-h-[500px] flex flex-col">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-lg font-black italic uppercase tracking-widest flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Threat_Vector_Monitor
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-red-500 uppercase font-bold tracking-widest">Live Uplink</span>
                  </div>
               </div>

               <div className="flex-1 space-y-3">
                  <AnimatePresence initial={false}>
                    {alerts.map(alert => (
                      <motion.div 
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 rounded-2xl border bg-black/40 flex items-center justify-between group hover:border-white/20 transition-all ${
                          alert.severity === 'critical' ? 'border-red-500/30' : 'border-white/5'
                        }`}
                      >
                         <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${
                              alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 
                              alert.severity === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'
                            }`}>
                               {alert.type === 'intrusion' ? <Lock className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </div>
                            <div>
                               <p className="text-xs font-bold uppercase tracking-wide">{alert.description}</p>
                               <p className="text-[9px] text-white/30 uppercase mt-1">Source: {alert.source} • {alert.timestamp}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <span className={`text-[8px] px-2 py-1 rounded-full uppercase font-black tracking-widest ${
                              alert.severity === 'critical' ? 'bg-red-500 text-black' :
                              alert.severity === 'high' ? 'bg-orange-500 text-black' : 'bg-white/10 text-white/40'
                            }`}>
                               {alert.severity}
                            </span>
                         </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {alerts.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-white/10 py-20">
                       <Shield className="w-16 h-16 mb-4 opacity-10" />
                       <p className="text-[10px] uppercase tracking-[0.4em]">Perimeter_Stable</p>
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* Side Panels */}
          <div className="lg:col-span-4 space-y-6">
             {/* Security Nodes */}
             <div className="p-8 bg-white/[0.03] border border-white/10 rounded-[2.5rem] space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Distributed_Nodes
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   {[
                     { label: 'LAG_CORE_01', status: 'Online', color: 'text-green-500' },
                     { label: 'ABJ_UPLINK', status: 'Online', color: 'text-green-500' },
                     { label: 'LON_PROXY', status: 'Standby', color: 'text-cyan-500' },
                     { label: 'NYC_VAULT', status: 'Online', color: 'text-green-500' },
                   ].map((node, i) => (
                     <div key={i} className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                        <p className="text-[9px] text-white/30 uppercase mb-1">{node.label}</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${node.color}`}>{node.status}</p>
                     </div>
                   ))}
                </div>
             </div>

             {/* Live Terminal Logs */}
             <div className="p-6 bg-black border border-white/10 rounded-[2.5rem] flex flex-col h-[400px]">
                <div className="flex items-center gap-2 mb-4 px-2">
                   <Terminal className="w-3 h-3 text-cyan-400" />
                   <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Secure_Event_Stream</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar-fancy pr-2 text-left">
                   {logs.map((log, i) => (
                     <p key={i} className={`text-[9px] font-mono leading-relaxed ${log.includes('[ALERT]') ? 'text-orange-400' : 'text-white/30'}`}>
                        <span className="text-cyan-400/20 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {log}
                     </p>
                   ))}
                </div>
             </div>
          </div>

        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <SecurityStat label="Encryption_Load" value="14.4 Gbps" icon={Lock} />
           <SecurityStat label="Active_Identities" value="2,842" icon={Cpu} />
           <SecurityStat label="Neural_Filtering" value="99.98%" icon={Zap} />
           <SecurityStat label="Threat_Level" value="MINIMAL" icon={Shield} color="text-green-400" />
        </div>

      </div>
    </div>
  );
}

function SecurityStat({ label, value, icon: Icon, color = "text-white" }: { label: string, value: string, icon: any, color?: string }) {
  return (
    <div className="p-6 bg-white/[0.02] border border-white/10 rounded-3xl flex items-center gap-4">
       <div className="p-3 bg-white/5 rounded-xl">
          <Icon className="w-5 h-5 text-cyan-400" />
       </div>
       <div>
          <p className="text-[8px] text-white/20 uppercase tracking-widest font-bold">{label}</p>
          <p className={`text-sm font-black italic uppercase tracking-tighter ${color}`}>{value}</p>
       </div>
    </div>
  );
}

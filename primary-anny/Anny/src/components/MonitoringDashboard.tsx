import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Shield, AlertTriangle, Clock, Server, Cpu, Database } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';

interface AuditLog {
  id: string;
  action: string;
  category: string;
  severity: string;
  timestamp: any;
  userEmail: string;
}

export default function MonitoringDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    // Fetch latest audit logs
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubLogs = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AuditLog[]);
    }, (error) => {
      console.warn("Audit logs listener error:", error);
    });

    // Simulate real-time metrics (since we can't get Host OS stats easily)
    const interval = setInterval(() => {
      setMetrics(prev => {
        const newMetric = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cpu: Math.floor(Math.random() * 30) + 10,
          memory: Math.floor(Math.random() * 20) + 40,
          latency: Math.floor(Math.random() * 100) + 50,
        };
        const updated = [...prev, newMetric].slice(-20);
        return updated;
      });
    }, 3000);

    return () => {
      unsubLogs();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'System Load', value: '12%', icon: Cpu, color: 'text-cyan-400' },
          { label: 'Network Inbound', value: '1.2 GB/s', icon: Activity, color: 'text-emerald-400' },
          { label: 'Security Guard', value: 'Active', icon: Shield, color: 'text-blue-400' },
          { label: 'Uptime', value: '142h 12m', icon: Clock, color: 'text-purple-400' },
        ].map((stat, i) => (
          <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2 transition-all duration-300 backdrop-blur-md hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:border-white/20">
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <span className="text-white/40 text-[9px] uppercase tracking-widest font-mono">{stat.label}</span>
            <span className="text-lg font-bold font-display italic tracking-tighter">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Main Metrics Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-black/40 border border-white/10 rounded-[2rem] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
             <h3 className="font-bold flex items-center gap-3 italic">
               <Activity className="w-5 h-5 text-cyan-400" /> Neural Performance
             </h3>
             <span className="text-[10px] text-cyan-400 font-mono animate-pulse">LIVE TELMETRY</span>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff20', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#22d3ee" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-black/40 border border-white/10 rounded-[2rem] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
             <h3 className="font-bold flex items-center gap-3 italic">
               <Server className="w-5 h-5 text-purple-400" /> Signal Latency
             </h3>
             <span className="text-[10px] text-purple-400 font-mono tracking-widest">MS / PKT</span>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff20', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
                />
                <Line type="stepAfter" dataKey="latency" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold flex items-center gap-3 italic">
            <Database className="w-6 h-6 text-cyan-400" /> Audit Ledger
          </h3>
          <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-[9px] text-cyan-400 font-mono uppercase tracking-[0.2em]">
            IMMUTABLE STORAGE ACTIVE
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 text-white/40 uppercase tracking-widest font-normal">Event</th>
                <th className="pb-4 text-white/40 uppercase tracking-widest font-normal">Operator</th>
                <th className="pb-4 text-white/40 uppercase tracking-widest font-normal">Severity</th>
                <th className="pb-4 text-white/40 uppercase tracking-widest font-normal text-right">Moment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="group hover:bg-white/[0.02]">
                  <td className="py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-white group-hover:text-cyan-400 transition-colors uppercase">{log.action}</span>
                      <span className="text-[10px] text-white/30 lowercase italic">{log.category}</span>
                    </div>
                  </td>
                  <td className="py-4 text-white/60">{log.userEmail}</td>
                  <td className="py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black ${
                      log.severity === 'critical' ? 'bg-red-500 text-black' : 
                      log.severity === 'warning' ? 'bg-yellow-500 text-black' : 
                      'bg-white/10 text-white/80'
                    }`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="py-4 text-right text-white/30 text-[10px]">
                    {log.timestamp instanceof Timestamp ? log.timestamp.toDate().toLocaleString() : 'Recent'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-white/20 uppercase tracking-widest italic">
                    NO ENTRIES DISCOVERED IN NEURAL LEDGER
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

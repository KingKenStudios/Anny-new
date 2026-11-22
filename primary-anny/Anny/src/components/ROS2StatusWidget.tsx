import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Activity, ShieldCheck, AlertTriangle, RefreshCw, Server, ChevronDown, CheckCircle2, XCircle, Zap } from 'lucide-react';

export interface ROS2NodeInfo {
  name: string;
  status: 'active' | 'warn' | 'error';
  rateHz: number;
  type: string;
}

export const ROS2StatusWidget: React.FC = () => {
  const [status, setStatus] = useState<'CONNECTED' | 'DEGRADED' | 'DISCONNECTED'>('CONNECTED');
  const [ping, setPing] = useState(14);
  const [msgRate, setMsgRate] = useState(52);
  const [isOpen, setIsOpen] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<string>(new Date().toLocaleTimeString());

  const [nodes, setNodes] = useState<ROS2NodeInfo[]>([
    { name: '/cmd_vel_watchdog', status: 'active', rateHz: 50, type: 'geometry_msgs/Twist' },
    { name: '/robot_state_publisher', status: 'active', rateHz: 30, type: 'sensor_msgs/JointState' },
    { name: '/slam_toolbox', status: 'active', rateHz: 20, type: 'nav_msgs/OccupancyGrid' },
    { name: '/lidar_driver_node', status: 'active', rateHz: 40, type: 'sensor_msgs/PointCloud2' },
    { name: '/camera_vision_node', status: 'active', rateHz: 60, type: 'sensor_msgs/Image' },
    { name: '/safety_loto_sentinel', status: 'active', rateHz: 100, type: 'std_msgs/Header' },
  ]);

  // Simulate ROS 2 pulse heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      // Small latency fluctuation
      const newPing = Math.floor(12 + Math.random() * 8);
      const newRate = Math.floor(48 + Math.random() * 8);
      setPing(newPing);
      setMsgRate(newRate);
      setLastHeartbeat(new Date().toLocaleTimeString());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleConnection = () => {
    if (status === 'CONNECTED') {
      setStatus('DISCONNECTED');
    } else {
      setStatus('CONNECTED');
    }
  };

  return (
    <div className="relative font-mono">
      {/* Compact Header Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs transition-all shadow-sm ${
          status === 'CONNECTED'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:border-emerald-400'
            : status === 'DEGRADED'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:border-amber-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:border-rose-400'
        }`}
        title="ROS 2 Robot Heartbeat & Connectivity"
      >
        <div className="relative flex items-center justify-center">
          <Radio className={`w-3.5 h-3.5 ${status === 'CONNECTED' ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
          {status === 'CONNECTED' && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="font-bold tracking-wide">ROS 2</span>
          <span className="opacity-40">|</span>
          <span className="text-[10px]">{status === 'CONNECTED' ? `${ping}ms` : 'OFFLINE'}</span>
        </div>

        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Node Health Diagnostics */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute right-0 mt-2 w-80 bg-[#0d0e1f] border border-cyan-500/30 rounded-2xl shadow-2xl z-50 p-3 space-y-3 font-sans"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-xs text-white">ROS 2 Master Node Status</span>
              </div>
              <span className="text-[9px] font-mono bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
                DDS Active
              </span>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
              <div className="p-2 bg-[#13152c] rounded-xl border border-white/5 space-y-0.5">
                <span className="text-slate-400 text-[9px]">Latency</span>
                <p className="font-bold text-emerald-400">{ping} ms</p>
              </div>
              <div className="p-2 bg-[#13152c] rounded-xl border border-white/5 space-y-0.5">
                <span className="text-slate-400 text-[9px]">Throughput</span>
                <p className="font-bold text-cyan-400">{msgRate} Hz</p>
              </div>
              <div className="p-2 bg-[#13152c] rounded-xl border border-white/5 space-y-0.5">
                <span className="text-slate-400 text-[9px]">Nodes</span>
                <p className="font-bold text-purple-400">{nodes.length} Active</p>
              </div>
            </div>

            {/* Active Nodes List */}
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                Monitored Topics & Drivers
              </p>
              {nodes.map((node, i) => (
                <div
                  key={i}
                  className="p-2 bg-[#14162e] rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <div className="truncate">
                      <p className="text-[11px] font-bold text-slate-200 truncate">{node.name}</p>
                      <p className="text-[9px] text-slate-500 truncate">{node.type}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-300 shrink-0">{node.rateHz} Hz</span>
                </div>
              ))}
            </div>

            {/* Heartbeat Footer & Actions */}
            <div className="border-t border-white/10 pt-2 flex items-center justify-between font-mono text-[10px]">
              <span className="text-slate-500 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                Pulse: {lastHeartbeat}
              </span>
              <button
                type="button"
                onClick={toggleConnection}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                {status === 'CONNECTED' ? 'Simulate Cut' : 'Reconnect'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ROS2StatusWidget;

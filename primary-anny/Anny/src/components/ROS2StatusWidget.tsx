import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, RefreshCw, Server, ChevronDown, AlertTriangle } from 'lucide-react';
import { safeFetchJson } from '../lib/apiUtils';

export interface ROS2NodeInfo {
  name: string;
  status: 'simulated' | 'disconnected';
  rateHz: number;
  type: string;
}

const SANDBOX_NODES: ROS2NodeInfo[] = [
  { name: '/cmd_vel_watchdog (SIM)', status: 'simulated', rateHz: 50, type: 'geometry_msgs/Twist' },
  { name: '/robot_state_publisher (SIM)', status: 'simulated', rateHz: 30, type: 'sensor_msgs/JointState' },
  { name: '/safety_loto_sentinel (SIM)', status: 'simulated', rateHz: 100, type: 'std_msgs/Header' },
];

export const ROS2StatusWidget: React.FC = () => {
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState('DISCONNECTED_NO_LIVE_BRIDGE');
  const [bridgeMessage, setBridgeMessage] = useState(
    'No physical ROS 2 rosbridge or DDS hardware endpoint connected.'
  );
  const [sandboxActive, setSandboxActive] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>(new Date().toLocaleTimeString());
  const [nodes, setNodes] = useState<ROS2NodeInfo[]>([]);

  const checkBridgeStatus = async () => {
    const res = await safeFetchJson('/api/robotics/status');
    setLastChecked(new Date().toLocaleTimeString());
    if (res.data?.success) {
      setBridgeConnected(Boolean(res.data.connected));
      setBridgeStatus(res.data.status || 'DISCONNECTED_NO_LIVE_BRIDGE');
      setBridgeMessage(res.data.message || bridgeMessage);
      if (Array.isArray(res.data.nodes) && res.data.nodes.length > 0 && res.data.connected) {
        setNodes(res.data.nodes);
      }
    }
  };

  useEffect(() => {
    void checkBridgeStatus();
  }, []);

  const toggleSandboxSimulation = () => {
    if (sandboxActive) {
      setSandboxActive(false);
      setNodes([]);
    } else {
      setSandboxActive(true);
      setNodes(SANDBOX_NODES);
    }
  };

  return (
    <div className="relative font-mono">
      {/* Compact Header Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs transition-all shadow-sm ${
          bridgeConnected
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:border-emerald-400'
            : sandboxActive
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:border-amber-400'
            : 'bg-slate-800/80 border-white/15 text-slate-300 hover:border-cyan-400/50'
        }`}
        title="ROS 2 Robotics Bridge Status"
      >
        <Radio
          className={`w-3.5 h-3.5 ${
            bridgeConnected ? 'text-emerald-400' : sandboxActive ? 'text-amber-400' : 'text-slate-400'
          }`}
        />

        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="font-bold tracking-wide">ROS 2</span>
          <span className="opacity-40">|</span>
          <span className="text-[10px]">
            {bridgeConnected ? 'LIVE BRIDGE' : sandboxActive ? 'SIM ONLY' : 'NO BRIDGE'}
          </span>
        </div>

        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Diagnostics */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute right-0 mt-2 w-80 bg-[#0d0e1f] border border-white/15 rounded-2xl shadow-2xl z-50 p-3.5 space-y-3 font-sans"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-xs text-white">ROS 2 Robotics Bridge</span>
              </div>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase ${
                  bridgeConnected
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : sandboxActive
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                {bridgeConnected ? 'CONNECTED' : sandboxActive ? 'SANDBOX' : 'OFFLINE'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-[11px] text-amber-200/90">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{bridgeMessage}</span>
            </div>

            {nodes.length > 0 ? (
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                <p className="text-[10px] font-mono text-amber-300 uppercase tracking-wider mb-1">
                  Simulation Topics (No Physical Robot)
                </p>
                {nodes.map((node, i) => (
                  <div
                    key={i}
                    className="p-2 bg-[#14162e] rounded-xl border border-amber-500/20 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="truncate">
                      <p className="text-[11px] font-bold text-slate-200 truncate">{node.name}</p>
                      <p className="text-[9px] text-slate-500 truncate">{node.type}</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-300 shrink-0">{node.rateHz} Hz</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#13152c] border border-white/5 text-[11px] font-mono text-slate-400 text-center">
                Status: {bridgeStatus} (0 active physical nodes)
              </div>
            )}

            <div className="border-t border-white/10 pt-2 flex items-center justify-between font-mono text-[10px]">
              <button
                type="button"
                onClick={() => void checkBridgeStatus()}
                className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Checked {lastChecked}</span>
              </button>
              <button
                type="button"
                onClick={toggleSandboxSimulation}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {sandboxActive ? 'Stop Sandbox' : 'Try Sandbox Sim'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ROS2StatusWidget;

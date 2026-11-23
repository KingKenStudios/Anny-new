import React, { useState, useEffect, useRef } from 'react';
import { Activity, Server, Wifi, WifiOff, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface HealthStatus {
  status: 'CHECKING' | 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latencyMs: number | null;
  uptimeSeconds: number | null;
  lastChecked: string;
}

export default function SystemHealthMonitor() {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'CHECKING',
    latencyMs: null,
    uptimeSeconds: null,
    lastChecked: 'Not checked yet'
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const checkInProgress = useRef(false);

  const checkHealth = async () => {
    if (checkInProgress.current) return;
    checkInProgress.current = true;
    setIsPinging(true);
    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch('/api/health', { method: 'GET', cache: 'no-store', signal: controller.signal });
      const latency = Math.round(performance.now() - startTime);
      if (response.ok) {
        const data = await response.json();
        const uptime = typeof data?.uptime === 'number' && Number.isFinite(data.uptime) && data.uptime >= 0
          ? data.uptime
          : null;
        setHealth({
          status: data?.status === 'ONLINE' ? 'ONLINE' : 'DEGRADED',
          latencyMs: latency,
          uptimeSeconds: uptime,
          lastChecked: new Date().toLocaleTimeString()
        });
      } else {
        setHealth({
          status: 'DEGRADED',
          latencyMs: latency,
          uptimeSeconds: null,
          lastChecked: new Date().toLocaleTimeString()
        });
      }
    } catch {
      setHealth({
        status: 'OFFLINE',
        latencyMs: Math.round(performance.now() - startTime),
        uptimeSeconds: null,
        lastChecked: new Date().toLocaleTimeString()
      });
    } finally {
      window.clearTimeout(timeoutId);
      checkInProgress.current = false;
      setIsPinging(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 12000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number | null) => {
    if (seconds === null) return 'Not available';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const statusColor = 
    health.status === 'ONLINE' ? 'bg-emerald-500 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
    health.status === 'DEGRADED' || health.status === 'CHECKING' ? 'bg-amber-500 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
    'bg-rose-500 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.3)]';

  const dotColor = 
    health.status === 'ONLINE' ? 'bg-emerald-400' :
    health.status === 'DEGRADED' || health.status === 'CHECKING' ? 'bg-amber-400' :
    'bg-rose-400';

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={checkHealth}
        className={`flex items-center gap-2 px-2.5 py-1.2 rounded-xl border bg-white/5 border-white/10 hover:border-white/20 transition-all font-mono text-xs text-slate-300 ${statusColor}`}
        title="API liveness probe (Click to check)"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor} ${isPinging ? 'animate-ping' : ''}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider">{health.status}</span>
        <span className="text-[10px] text-slate-400 hidden lg:inline">({health.latencyMs === null ? '—' : `${health.latencyMs}ms`})</span>
      </button>

      {/* Hover Info Tooltip */}
      {isHovered && (
        <div className="absolute top-full mt-2 right-0 z-50 w-52 p-3 rounded-2xl bg-[#0e1022]/95 backdrop-blur-md border border-white/10 shadow-2xl text-xs font-mono space-y-2 pointer-events-none animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-slate-300">
            <span className="flex items-center gap-1.5 font-bold text-white">
              <Server className="w-3.5 h-3.5 text-cyan-400" /> API Liveness
            </span>
            <RefreshCw className={`w-3 h-3 text-slate-400 ${isPinging ? 'animate-spin' : ''}`} />
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>Status:</span>
              <span className={`font-bold ${health.status === 'ONLINE' ? 'text-emerald-400' : health.status === 'CHECKING' || health.status === 'DEGRADED' ? 'text-amber-400' : 'text-rose-400'}`}>
                {health.status}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Latency:</span>
              <span className="text-white font-medium">{health.latencyMs === null ? 'Not measured' : `${health.latencyMs} ms`}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Backend Uptime:</span>
              <span className="text-cyan-300 font-medium">{formatUptime(health.uptimeSeconds)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[10px] pt-1">
              <span>Checked:</span>
              <span>{health.lastChecked}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

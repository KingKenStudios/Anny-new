import React, { useEffect, useState } from 'react';
import { Activity, Server, Cpu, Brain, Network, Shield, HardDrive, Zap, CheckCircle, Database } from 'lucide-react';
import { systemBus } from '../../core/systemBus';
import { hardwareIntelligenceEngine } from '../../core/annyHardwareIntelligence';
import { annyWorkerRegistry } from '../../core/annyWorkerRegistry';

export const AnnyIntelligenceWorkspacePanel: React.FC = () => {
  const [telemetry, setTelemetry] = useState<any>({});
  const [hardware, setHardware] = useState<any>(null);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [remoteWorkers, setRemoteWorkers] = useState<any[]>([]);

  useEffect(() => {
    // Initial fetch
    hardwareIntelligenceEngine.detectHardware().then(hw => setHardware(hw));
    setRemoteWorkers(annyWorkerRegistry.listWorkers());

    const unsubscribe = systemBus.subscribe('*', (payload) => {
      if (payload.type === 'BuildStarted') {
        setActiveTask(payload.payload);
      }
      if (payload.type === 'BuildCompleted') {
        setActiveTask(null);
      }
      setTelemetry((prev: any) => ({ ...prev, lastEvent: payload }));
      setRemoteWorkers(annyWorkerRegistry.listWorkers());
    });

    const interval = setInterval(() => {
      setRemoteWorkers(annyWorkerRegistry.listWorkers());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full h-full bg-[#05081c] border border-indigo-500/20 rounded-xl overflow-hidden flex flex-col font-mono text-xs text-indigo-300">
      <div className="bg-indigo-950/40 p-3 border-b border-indigo-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-white tracking-widest uppercase">Live Intelligence Fabric</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="text-[10px] text-indigo-400">ACTIVE</span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* ACTIVE TASK */}
        <div className="col-span-2 bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/10">
          <div className="text-[10px] uppercase text-indigo-500 font-bold mb-2 flex items-center gap-1.5"><Activity className="w-3 h-3"/> Active Task</div>
          <div className="text-white text-sm truncate">
            {activeTask ? (activeTask.prompt || activeTask.taskType || 'Processing...') : 'IDLE'}
          </div>
          {activeTask?.organizationId && (
            <div className="mt-2 text-xs text-indigo-400">Org: <span className="text-cyan-400 font-bold">{activeTask.organizationId}</span></div>
          )}
        </div>

        {/* COGNITIVE MODEL */}
        <div className="bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/10">
          <div className="text-[10px] uppercase text-indigo-500 font-bold mb-2 flex items-center gap-1.5"><Brain className="w-3 h-3"/> Model</div>
          <div className="text-white truncate">{telemetry?.lastEvent?.data?.model || 'Auto-Routing'}</div>
          <div className="mt-1 text-[10px] text-emerald-400">Dynamic Bound</div>
        </div>

        {/* CAPABILITY */}
        <div className="bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/10">
          <div className="text-[10px] uppercase text-indigo-500 font-bold mb-2 flex items-center gap-1.5"><Zap className="w-3 h-3"/> Capability</div>
          <div className="text-white truncate">{telemetry?.lastEvent?.data?.capability || 'Multi-Agent Resolution'}</div>
        </div>

        {/* LOCAL HARDWARE */}
        <div className="col-span-2 bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/10">
          <div className="text-[10px] uppercase text-indigo-500 font-bold mb-2 flex items-center gap-1.5"><Cpu className="w-3 h-3"/> Local Hardware Context</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] text-indigo-400">CPU</div>
              <div className="text-white">{hardware?.cpuModel || 'Detecting...'}</div>
            </div>
            <div>
              <div className="text-[10px] text-indigo-400">RAM</div>
              <div className="text-white">{hardware ? `${(hardware.totalMemoryMb / 1024).toFixed(1)} GB` : '...'}</div>
            </div>
            <div>
              <div className="text-[10px] text-indigo-400">GPU</div>
              <div className="text-white">{hardware?.gpuModel !== 'Unknown' ? 'Detected' : 'Offline'}</div>
            </div>
          </div>
        </div>

        {/* REMOTE WORKERS */}
        <div className="col-span-2 bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/10">
          <div className="text-[10px] uppercase text-indigo-500 font-bold mb-2 flex items-center gap-1.5"><Server className="w-3 h-3"/> Remote Compute Fabric</div>
          {remoteWorkers.length === 0 ? (
            <div className="text-indigo-400 text-xs">No remote workers registered.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {remoteWorkers.map(w => (
                <div key={w.id} className="flex items-center justify-between bg-black/20 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <Network className="w-3 h-3 text-cyan-500" />
                    <span className="text-cyan-100">{w.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-indigo-400">Q: {w.workloadQueueDepth}/{w.maxQueueDepth}</span>
                    <span className={w.status === 'TRUSTED' ? 'text-emerald-400' : 'text-amber-400'}>{w.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TRANSACTION & SECURITY */}
        <div className="bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/10">
          <div className="text-[10px] uppercase text-indigo-500 font-bold mb-2 flex items-center gap-1.5"><Database className="w-3 h-3"/> Transaction</div>
          <div className="text-emerald-400 flex items-center gap-1.5"><CheckCircle className="w-3 h-3"/> {activeTask?.transactionId ? 'Active Lock' : 'Canonical Sync'}</div>
        </div>

        <div className="bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/10">
          <div className="text-[10px] uppercase text-indigo-500 font-bold mb-2 flex items-center gap-1.5"><Shield className="w-3 h-3"/> Verification</div>
          <div className="text-emerald-400 flex items-center gap-1.5"><CheckCircle className="w-3 h-3"/> Security Validated</div>
        </div>

      </div>
    </div>
  );
};

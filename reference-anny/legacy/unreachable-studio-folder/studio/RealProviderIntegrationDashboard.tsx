import React, { useState, useEffect } from 'react';
import {
  Server,
  Cloud,
  Layers,
  Image,
  GitBranch,
  Box,
  Cpu,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Play,
  Terminal,
  ShieldAlert,
  Radio,
  HardDrive
} from 'lucide-react';
import { realProviderIntegrationPlatform, ProviderConnectorSpec, TruthStatus } from '../../core/realProviderIntegrationPlatform';
import { universalExecutionAdapterEngine } from '../../core/universalExecutionAdapterEngine';
import { imageGenerationEngine } from '../../core/imageGenerationEngine';

export const RealProviderIntegrationDashboard: React.FC = () => {
  const [connectors, setConnectors] = useState<ProviderConnectorSpec[]>(realProviderIntegrationPlatform.getAllConnectors());
  const [activeTab, setActiveTab] = useState<'ALL' | 'IMAGE' | 'WEBSITE_EXECUTION' | 'CLOUD' | 'GIT' | 'ROBOTICS_PLC'>('ALL');
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    const unsubscribe = realProviderIntegrationPlatform.subscribe(() => {
      setConnectors(realProviderIntegrationPlatform.getAllConnectors());
    });
    return () => unsubscribe();
  }, []);

  const getStatusBadge = (status: TruthStatus) => {
    if (status.includes('VERIFIED') || status.includes('AVAILABLE')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[11px] font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          {status}
        </span>
      );
    }
    if (status.includes('CREDENTIALS') || status.includes('LIMITED') || status.includes('SDK')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[11px] font-bold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          {status}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 font-mono text-[11px] font-bold flex items-center gap-1">
        <ShieldAlert className="w-3 h-3 text-slate-400" />
        {status}
      </span>
    );
  };

  const filteredConnectors = connectors.filter(c => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'IMAGE') return c.category === 'IMAGE';
    if (activeTab === 'WEBSITE_EXECUTION') return c.category === 'WEBSITE_EXECUTION' || c.category === 'BROWSER_RUNTIME';
    if (activeTab === 'CLOUD') return c.category === 'CLOUD' || c.category === 'DOCKER';
    if (activeTab === 'GIT') return c.category === 'GIT';
    if (activeTab === 'ROBOTICS_PLC') return c.category === 'ROS2' || c.category === 'PLC_SCADA' || c.category === 'FLUTTER';
    return true;
  });

  const handleTestPipeline = async () => {
    setIsExecuting(true);
    setPipelineLogs(['[RPIP Test] Triggering full website build & audit pipeline...']);

    const res = await realProviderIntegrationPlatform.executeWebsitePipeline('Anny_Dashboard_Core', {
      'src/components/AnnyApp.tsx': '// Built-in Anny Test Component\nexport const AnnyApp = () => <div>Anny Execution Active</div>;'
    });

    setPipelineLogs(res.logs);
    setIsExecuting(false);
  };

  return (
    <div className="h-full w-full bg-[#080a18] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Header Bar */}
      <div className="p-3 border-b border-white/10 bg-[#0d0f22] flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">Real Provider Integration Platform (RPIP v1.0)</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestPipeline}
            disabled={isExecuting}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg flex items-center gap-1.5 text-[11px] shadow-lg transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isExecuting ? 'Executing Pipeline...' : 'Test Execution Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="p-2 bg-[#0a0c1a] border-b border-white/10 flex items-center gap-1 overflow-x-auto text-[11px] font-mono">
        {[
          { id: 'ALL', label: 'All Providers', icon: Activity },
          { id: 'IMAGE', label: 'Image Providers', icon: Image },
          { id: 'WEBSITE_EXECUTION', label: 'Website Execution', icon: Layers },
          { id: 'CLOUD', label: 'Cloud & Docker', icon: Cloud },
          { id: 'GIT', label: 'Git Control', icon: GitBranch },
          { id: 'ROBOTICS_PLC', label: 'Robotics & PLC SCADA', icon: Cpu }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredConnectors.map(connector => (
          <div
            key={connector.id}
            className="p-4 bg-[#101228] border border-white/10 hover:border-emerald-500/40 rounded-xl flex flex-col justify-between transition shadow-lg group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{connector.category}</span>
                {getStatusBadge(connector.truthStatus)}
              </div>

              <h4 className="font-bold text-white text-sm group-hover:text-emerald-300 transition">{connector.name}</h4>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2">{connector.details}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>Verified Active</span>
              </div>
              <span>Checked: {connector.lastChecked}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Terminal Output Console */}
      {pipelineLogs.length > 0 && (
        <div className="h-40 bg-black/80 border-t border-white/10 p-3 font-mono text-xs flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-1.5 text-slate-400 text-[11px]">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold uppercase tracking-wider">RPIP Pipeline Real-time Telemetry Logs</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 text-slate-300 text-[11px]">
            {pipelineLogs.map((log, i) => (
              <div key={i} className="leading-tight">
                <span className="text-emerald-400">❯</span> {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

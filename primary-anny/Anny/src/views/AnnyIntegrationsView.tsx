import React, { useState, useEffect } from 'react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  Puzzle,
  Search,
  CheckCircle2,
  Database,
  Server,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Info
} from 'lucide-react';
import { safeFetchJson } from '../lib/apiUtils';

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'connected' | 'unconfigured' | 'offline_ready';
  statusLabel: string;
  envHint: string;
  iconColor: string;
  badge: string;
}

interface AnnyIntegrationsViewProps {
  onToggleMobileMenu?: () => void;
}

export const AnnyIntegrationsView: React.FC<AnnyIntegrationsViewProps> = ({
  onToggleMobileMenu,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<IntegrationItem | null>(null);

  const probeServerIntegrations = async () => {
    setLoading(true);
    const [matrixRes, healthRes, capRes, kedaRes] = await Promise.all([
      safeFetchJson('/api/v1/anny/offline-matrix'),
      safeFetchJson('/api/router/health'),
      safeFetchJson('/api/system/capabilities'),
      safeFetchJson('/api/v1/anny/integrations/keda/status'),
    ]);

    const matrix = matrixRes.data || {};
    const fallbacks = matrix.onlineFallbacks || {};
    const localCores = matrix.localCores || {};
    const capProviders = capRes.data?.providers || {};
    const healthProviders: Array<{ provider: string; status: string }> = Array.isArray(healthRes.data?.providers)
      ? healthRes.data.providers
      : [];

    const hasHealthyProvider = (name: string, fallbackBool?: boolean) => {
      const hp = healthProviders.find((p) => p.provider?.toLowerCase() === name.toLowerCase());
      if (hp) return hp.status === 'HEALTHY' || hp.status === 'CONFIGURED';
      return Boolean(fallbackBool);
    };

    const items: IntegrationItem[] = [
      {
        id: 'gemini',
        name: 'Google Gemini API',
        description: 'Cloud reasoning, multimodal understanding, and SVG/code synthesis via server-side @google/genai SDK.',
        category: 'AI Models',
        status: hasHealthyProvider('gemini', fallbacks.gemini) ? 'connected' : 'unconfigured',
        statusLabel: hasHealthyProvider('gemini', fallbacks.gemini) ? 'Server Configured' : 'Unconfigured',
        envHint: 'GEMINI_API_KEY / GOOGLE_AI_STUDIO_KEY',
        iconColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
        badge: 'Cloud AI',
      },
      {
        id: 'ollama',
        name: 'Ollama Local GGUF Runtime',
        description: 'Offline sovereign LLM inference for air-gapped code generation, chat, and local embeddings.',
        category: 'AI Models',
        status: localCores.ollamaReachable ? 'connected' : 'offline_ready',
        statusLabel: localCores.ollamaReachable ? 'Local Connected' : 'Standby (Not Running)',
        envHint: 'OLLAMA_BASE_URL (default http://127.0.0.1:11434)',
        iconColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        badge: 'Offline Core',
      },
      {
        id: 'openai',
        name: 'OpenAI API',
        description: 'Optional GPT completion failover route managed through ANNY server Model Router.',
        category: 'AI Models',
        status: hasHealthyProvider('openai', fallbacks.openai) ? 'connected' : 'unconfigured',
        statusLabel: hasHealthyProvider('openai', fallbacks.openai) ? 'Server Configured' : 'Not Configured',
        envHint: 'OPENAI_API_KEY',
        iconColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        badge: 'LLM Failover',
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude API',
        description: 'Optional Claude completion route via server-side model failover pool.',
        category: 'AI Models',
        status: hasHealthyProvider('anthropic', fallbacks.claude) ? 'connected' : 'unconfigured',
        statusLabel: hasHealthyProvider('anthropic', fallbacks.claude) ? 'Server Configured' : 'Not Configured',
        envHint: 'ANTHROPIC_API_KEY',
        iconColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
        badge: 'LLM Failover',
      },
      {
        id: 'huggingface',
        name: 'HuggingFace Inference Hub',
        description: 'Open-weights cloud fallback route configured on the server router.',
        category: 'AI Models',
        status: hasHealthyProvider('huggingface', fallbacks.huggingface) ? 'connected' : 'unconfigured',
        statusLabel: hasHealthyProvider('huggingface', fallbacks.huggingface) ? 'Server Configured' : 'Not Configured',
        envHint: 'HUGGINGFACE_API_KEY',
        iconColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        badge: 'Open Weights',
      },
      {
        id: 'postgres',
        name: 'PostgreSQL / Cloud Persistence',
        description: 'Durable relational persistence for conversations, learning memory, projects, and enterprise registry.',
        category: 'Databases',
        status: localCores.localDatabase === 'POSTGRES_CONNECTED' ? 'connected' : 'offline_ready',
        statusLabel:
          localCores.localDatabase === 'POSTGRES_CONNECTED' ? 'Postgres Connected' : 'Local Memory Fallback',
        envHint: 'DATABASE_URL / POSTGRES_URL',
        iconColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
        badge: 'Database',
      },
      {
        id: 'minio',
        name: 'MinIO / SeaweedFS S3 Storage',
        description: 'S3-compatible object storage for generated artifacts, snapshots, and uploaded workspaces.',
        category: 'Storage',
        status: capProviders.storage?.configured ? 'connected' : 'unconfigured',
        statusLabel: capProviders.storage?.configured ? 'Bucket Configured' : 'Not Configured',
        envHint: 'MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY',
        iconColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
        badge: 'S3 Storage',
      },
      {
        id: 'keda',
        name: 'KEDA Social & Commerce Bridge',
        description: 'Official bridge linking ANNY intelligence to KEDA creator feeds, moderation, and storefront tooling.',
        category: 'Ecosystem',
        status: kedaRes.data?.connected ? 'connected' : 'unconfigured',
        statusLabel: kedaRes.data?.connected ? 'Bridge Connected' : 'Bridge Unconfigured',
        envHint: 'KEDA_API_URL, KEDA_SERVICE_TOKEN',
        iconColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
        badge: 'KEDA Ecosystem',
      },
      {
        id: 'ros2',
        name: 'ROS 2 Hardware Bridge',
        description: 'Physical robot / PLC bridge telemetry. Operates strictly in simulation sandbox unless hardware bridge URL is running.',
        category: 'Robotics',
        status: 'unconfigured',
        statusLabel: 'No Live Hardware Bridge',
        envHint: 'ROS2_BRIDGE_URL',
        iconColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
        badge: 'Robotics',
      },
    ];

    setIntegrations(items);
    setLoading(false);
  };

  useEffect(() => {
    void probeServerIntegrations();
  }, []);

  const categories = ['All', 'AI Models', 'Databases', 'Storage', 'Ecosystem', 'Robotics'];

  const filteredIntegrations = integrations.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040612] text-slate-100 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              Server Verified Status
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
            <Puzzle className="w-7 h-7 text-cyan-400" />
            Integrations & Infrastructure
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Live probe of connected AI models, offline runtimes, databases, storage, and Akinwumi Group bridges.
          </p>
        </div>

        <button
          onClick={probeServerIntegrations}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-cyan-300 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Probing Runtime...' : 'Refresh Live Status'}</span>
        </button>
      </div>

      {/* Policy Notice */}
      <div className="mb-6 p-3.5 rounded-2xl bg-[#080b22] border border-cyan-500/20 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <span>
          Status badges reflect live server checks from `/api/router/health`, `/api/system/capabilities`, `/api/v1/anny/offline-matrix`, and `/api/v1/anny/integrations/keda/status`. API keys and service tokens are never stored in browser forms.
        </span>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-[#090d26] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search integrations, providers, databases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#080c24] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Grid of Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredIntegrations.map((item) => {
          const isConnected = item.status === 'connected';
          const isOfflineReady = item.status === 'offline_ready';

          return (
            <div
              key={item.id}
              className={`bg-[#080c24] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 ${
                isConnected ? 'border-emerald-500/30' : 'border-white/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className={`p-2.5 rounded-xl border ${item.iconColor} flex items-center justify-center`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 text-[10px] font-semibold">
                      {item.badge}
                    </span>
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                        isConnected
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : isOfflineReady
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                          : 'bg-slate-800 border-white/10 text-slate-400'
                      }`}
                    >
                      {isConnected ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {item.statusLabel}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{item.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{item.description}</p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 font-medium">{item.category}</span>

                <button
                  onClick={() => setSelectedGuide(item)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Server Config</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Server Env Variable Configuration Guidance Drawer */}
      {selectedGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#090d28] border border-cyan-500/40 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">{selectedGuide.name}</h3>
              </div>
              <button
                onClick={() => setSelectedGuide(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/5"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{selectedGuide.description}</p>
            <div className="p-3.5 rounded-xl bg-[#050818] border border-white/10 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-cyan-400 block">Required Server Environment Variables</span>
              <code className="text-xs font-mono text-white break-all">{selectedGuide.envHint}</code>
            </div>
            <p className="text-[11px] text-slate-400">
              Set these variables in your server `.env` or container configuration and restart the ANNY backend to activate.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

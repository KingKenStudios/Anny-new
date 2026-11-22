import React, { useState } from 'react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  Puzzle,
  Search,
  Plus,
  CheckCircle2,
  ExternalLink,
  Zap,
  Database,
  Globe,
  Bot,
  Shield,
  Code2,
  MessageSquare,
  Key,
  Layers,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'connected' | 'available';
  iconColor: string;
  badge: string;
  apiKeySet?: boolean;
}

interface AnnyIntegrationsViewProps {
  onToggleMobileMenu?: () => void;
}

export const AnnyIntegrationsView: React.FC<AnnyIntegrationsViewProps> = ({
  onToggleMobileMenu,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(null);
  const [inputApiKey, setInputApiKey] = useState('');

  const [integrations, setIntegrations] = useState<IntegrationItem[]>([
    {
      id: 'openai',
      name: 'OpenAI API',
      description: 'GPT-4o, o1, and DALL-E models integration for high-speed multi-turn completion.',
      category: 'AI Models',
      status: 'connected',
      iconColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      badge: 'LLM Engine',
      apiKeySet: true,
    },
    {
      id: 'huggingface',
      name: 'HuggingFace Hub',
      description: 'Access 100,000+ open-source AI models, embeddings, and inference endpoints.',
      category: 'AI Models',
      status: 'connected',
      iconColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      badge: 'Open Weights',
      apiKeySet: true,
    },
    {
      id: 'supabase',
      name: 'Supabase Vector DB',
      description: 'PostgreSQL vector store with pgvector for real-time RAG embeddings and auth.',
      category: 'Databases',
      status: 'connected',
      iconColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      badge: 'Vector DB',
      apiKeySet: true,
    },
    {
      id: 'github',
      name: 'GitHub Repositories',
      description: 'Sync AI-generated code, commit pull requests, and manage issue trackers automatically.',
      category: 'Dev & CI/CD',
      status: 'connected',
      iconColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
      badge: 'Version Control',
      apiKeySet: true,
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude API',
      description: 'Claude 3.5 Sonnet and Haiku model access for complex code generation & analysis.',
      category: 'AI Models',
      status: 'available',
      iconColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      badge: 'LLM Engine',
    },
    {
      id: 'pinecone',
      name: 'Pinecone Vector Store',
      description: 'Ultra low-latency managed vector database for billion-scale similarity search.',
      category: 'Databases',
      status: 'available',
      iconColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
      badge: 'Vector Search',
    },
    {
      id: 'vercel',
      name: 'Vercel Deployment',
      description: 'One-click deployment pipeline for AI-generated frontend and serverless routes.',
      category: 'Dev & CI/CD',
      status: 'available',
      iconColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
      badge: 'Hosting',
    },
    {
      id: 'stripe',
      name: 'Stripe Payments',
      description: 'Incorporate checkout sessions, subscription plans, and webhook events into built apps.',
      category: 'Payments & Auth',
      status: 'available',
      iconColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      badge: 'Payments',
    },
    {
      id: 'resend',
      name: 'Resend Email API',
      description: 'Transactional email delivery for generated SaaS apps, auth links, and reports.',
      category: 'Messaging',
      status: 'available',
      iconColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      badge: 'Email API',
    },
    {
      id: 'firebase',
      name: 'Firebase & Firestore',
      description: 'Real-time NoSQL database, user authentication, and Cloud Storage integration.',
      category: 'Databases',
      status: 'available',
      iconColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      badge: 'Backend Service',
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleConnect = (item: IntegrationItem) => {
    if (item.status === 'connected') {
      setIntegrations((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'available', apiKeySet: false } : i))
      );
      showToast(`Disconnected ${item.name}`);
    } else {
      setSelectedIntegration(item);
    }
  };

  const handleSaveApiKey = () => {
    if (!selectedIntegration) return;
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === selectedIntegration.id ? { ...i, status: 'connected', apiKeySet: true } : i
      )
    );
    showToast(`Successfully connected ${selectedIntegration.name}`);
    setSelectedIntegration(null);
    setInputApiKey('');
  };

  const filteredIntegrations = integrations.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040612] text-slate-100 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#0c102b] border border-cyan-500/50 text-white px-4 py-3 rounded-2xl shadow-[0_0_30px_rgba(0,229,255,0.4)] flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              Anny Application
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
            <Puzzle className="w-7 h-7 text-cyan-400" />
            Integrations & APIs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Connect third-party AI models, vector stores, cloud databases, and deployment platforms to Anny.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedIntegration({
              id: 'custom-api',
              name: 'Custom Integration',
              description: 'Add a custom REST or GraphQL API endpoint credential',
              category: 'Custom',
              status: 'available',
              iconColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
              badge: 'Custom API',
            });
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-fuchsia-500 shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom API Key</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {['All', 'AI Models', 'Databases', 'Dev & CI/CD', 'Payments & Auth', 'Messaging'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
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
            placeholder="Search integrations, models, databases..."
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

          return (
            <div
              key={item.id}
              className={`bg-[#080c24] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_25px_rgba(0,229,255,0.15)] ${
                isConnected ? 'border-cyan-500/30' : 'border-white/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl border ${item.iconColor} flex items-center justify-center`}>
                    <Puzzle className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 text-[10px] font-semibold">
                      {item.badge}
                    </span>
                    {isConnected && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Connected
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{item.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{item.description}</p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  {item.category}
                </span>

                <button
                  onClick={() => toggleConnect(item)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isConnected
                      ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400'
                      : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300'
                  }`}
                >
                  {isConnected ? 'Disconnect' : 'Connect API'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect API Key Modal */}
      {selectedIntegration && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#090d28] border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,229,255,0.3)] relative">
            <button
              onClick={() => setSelectedIntegration(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Connect {selectedIntegration.name}</h3>
                <p className="text-xs text-slate-400">Enter your API key or bearer credential</p>
              </div>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  API Key / Access Token
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                  className="w-full bg-[#050818] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Your key is stored securely in your encrypted user session and never sent to third parties.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedIntegration(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-[0_0_15px_rgba(0,229,255,0.3)]"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

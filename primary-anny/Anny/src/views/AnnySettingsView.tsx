import React, { useState, useEffect } from 'react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  Settings,
  Cpu,
  Database,
  Shield,
  Save,
  CheckCircle2,
  Sparkles,
  Download,
  RefreshCw,
  Fingerprint,
  Server
} from 'lucide-react';
import { annyVoiceService } from '../services/annyVoiceService';
import { safeFetchJson } from '../lib/apiUtils';
import { safeStorage } from '../lib/storage';

const SETTINGS_STORAGE_KEY = 'anny_settings_v1';

const DEFAULT_SETTINGS = {
  defaultModel: 'gemini-3.1-flash-lite',
  temperature: 0.7,
  maxTokens: 8192,
  systemPrompt:
    'You are Anny, the flagship AI intelligence for the Akinwumi Group & AIOS ecosystem. You specialize in generating full-stack software, creative media, engineering analysis, and honest operational guidance.',
};

const VoiceSettingsSection: React.FC = () => {
  const [role, setRole] = useState<'female' | 'male'>(() => annyVoiceService.getSelectedRole());
  const selectRole = (next: 'female' | 'male') => {
    setRole(next);
    annyVoiceService.setSelectedRole(next);
  };

  return (
    <section className="bg-[#080b22] border border-white/10 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
        <Sparkles className="w-5 h-5 text-cyan-400" />
        <div>
          <h2 className="text-base font-bold text-white">ANNY Voice</h2>
          <p className="text-[11px] text-slate-500 mt-1">
            Your selected ANNY voice is used everywhere, including automatic responses and the speaker button. Female is the default.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(['female', 'male'] as const).map((item) => {
          const profile = annyVoiceService.getVoiceProfiles()[item];
          const active = role === item;
          return (
            <button
              key={item}
              onClick={() => selectRole(item)}
              className={`text-left rounded-2xl border p-4 transition-all ${
                active ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{profile.label}</span>
                {profile.primary && <span className="text-[9px] uppercase tracking-wider text-cyan-300">Primary</span>}
              </div>
              <p className="mt-2 text-xs text-slate-400">{profile.description}</p>
              <span
                className={`inline-flex mt-3 px-2 py-1 rounded-lg text-[10px] ${
                  active ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/5 text-slate-500'
                }`}
              >
                {active ? 'Selected' : 'Select voice'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

interface AnnySettingsViewProps {
  onToggleMobileMenu?: () => void;
}

export const AnnySettingsView: React.FC<AnnySettingsViewProps> = ({
  onToggleMobileMenu,
}) => {
  const loadInitialSettings = () => {
    try {
      const raw = safeStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // Fallback cleanly to defaults
    }
    return DEFAULT_SETTINGS;
  };

  const initial = loadInitialSettings();
  const [defaultModel, setDefaultModel] = useState<string>(initial.defaultModel);
  const [temperature, setTemperature] = useState<number>(Number(initial.temperature) || 0.7);
  const [maxTokens, setMaxTokens] = useState<number>(Number(initial.maxTokens) || 8192);
  const [systemPrompt, setSystemPrompt] = useState<string>(initial.systemPrompt);
  const [isSaved, setIsSaved] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Live server provider & offline status (read-only; secrets stay server-side)
  const [providerStatusLoading, setProviderStatusLoading] = useState(true);
  const [offlineMatrix, setOfflineMatrix] = useState<any>(null);
  const [routerHealth, setRouterHealth] = useState<any>(null);

  const fetchServerStatus = async () => {
    setProviderStatusLoading(true);
    const [matrixRes, healthRes] = await Promise.all([
      safeFetchJson('/api/v1/anny/offline-matrix'),
      safeFetchJson('/api/router/health'),
    ]);
    if (matrixRes.data) setOfflineMatrix(matrixRes.data);
    if (healthRes.data) setRouterHealth(healthRes.data);
    setProviderStatusLoading(false);
  };

  useEffect(() => {
    void fetchServerStatus();
  }, []);

  const handleSaveSettings = () => {
    const payload = {
      defaultModel,
      temperature,
      maxTokens,
      systemPrompt,
      updatedAt: new Date().toISOString(),
    };
    safeStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleExportBackup = () => {
    try {
      const collectByPrefix = (prefix: string) => {
        const out: Record<string, any> = {};
        if (typeof window !== 'undefined' && window.localStorage) {
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && key.startsWith(prefix)) {
              try {
                out[key] = JSON.parse(window.localStorage.getItem(key) || 'null');
              } catch {
                out[key] = window.localStorage.getItem(key);
              }
            }
          }
        }
        return out;
      };

      const backupPayload = {
        exportedAt: new Date().toISOString(),
        app: 'ANNY',
        settings: { defaultModel, temperature, maxTokens, systemPrompt },
        workspaceStorage: collectByPrefix('anny_'),
      };

      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anny-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus('Backup JSON downloaded successfully.');
      setTimeout(() => setExportStatus(null), 3500);
    } catch (err: any) {
      setExportStatus(`Export failed: ${err?.message || 'Unable to generate backup file.'}`);
    }
  };

  const fallbackProviders = offlineMatrix?.onlineFallbacks || {};
  const healthProviders: Array<{ provider: string; status: string; latencyMs?: number }> = Array.isArray(routerHealth?.providers)
    ? routerHealth.providers
    : [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040612] text-slate-100 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
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
            <Settings className="w-7 h-7 text-cyan-400" />
            Anny Settings
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure application defaults, voice preferences, server AI provider readiness, and local workspace backups.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-fuchsia-500 shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all cursor-pointer shrink-0"
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Saved to Workspace</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save AI Settings</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-8 max-w-4xl">
        {/* ANNY Voice */}
        <VoiceSettingsSection />

        {/* Section 1: AI Model & Intelligence Defaults */}
        <div className="bg-[#080b22] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Model & Intelligence Defaults</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Default AI Model Engine</label>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="w-full bg-[#090d28] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Default Routed)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Complex Reasoning)</option>
                <option value="ollama-local">Ollama Local GGUF (Offline Core)</option>
                <option value="auto-router">ANNY Adaptive Model Router</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Max Response Output Tokens</label>
              <select
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className="w-full bg-[#090d28] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer font-mono"
              >
                <option value={4096}>4,096 tokens (Fast)</option>
                <option value={8192}>8,192 tokens (Standard)</option>
                <option value={16384}>16,384 tokens (Deep Generation)</option>
                <option value={32768}>32,768 tokens (Max Full-Stack)</option>
              </select>
            </div>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">Temperature / Creativity Level:</span>
              <span className="text-cyan-400 font-mono">{temperature}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>0.0 (Strict Code & Math)</span>
              <span>0.7 (Balanced)</span>
              <span>1.0 (Creative Writing & Ideas)</span>
            </div>
          </div>

          {/* System Instructions */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Global Custom System Prompt</label>
            <textarea
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-[#090d28] border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 leading-relaxed font-mono"
            />
          </div>
        </div>

        {/* Section 2: Server AI Provider & Offline Status (Read-Only Security Boundary) */}
        <div className="bg-[#080b22] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-cyan-400" />
              <div>
                <h2 className="text-base font-bold text-white">Server AI Provider & Offline Status</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Provider credentials are managed exclusively on the server via environment variables and are never exposed in client storage.
                </p>
              </div>
            </div>
            <button
              onClick={fetchServerStatus}
              disabled={providerStatusLoading}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${providerStatusLoading ? 'animate-spin' : ''}`} />
              <span>Probe</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-[#090d28] border border-white/10 flex items-center justify-between">
              <span className="text-slate-400">Offline Architecture</span>
              <span className="text-emerald-400 font-bold">
                {offlineMatrix?.offlineStatus || (providerStatusLoading ? 'PROBING...' : 'DETERMINISTIC_LOCAL_READY')}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#090d28] border border-white/10 flex items-center justify-between">
              <span className="text-slate-400">Local Ollama Node</span>
              <span className={offlineMatrix?.localCores?.ollamaReachable ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                {offlineMatrix?.localCores?.ollama || (providerStatusLoading ? 'CHECKING...' : 'NOT_REACHABLE')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            {(healthProviders.length > 0
              ? healthProviders.map((hp) => ({
                  name: hp.provider,
                  configured: hp.status === 'HEALTHY' || hp.status === 'CONFIGURED',
                  detail: hp.status,
                }))
              : Object.entries(fallbackProviders).map(([name, configured]) => ({
                  name,
                  configured: Boolean(configured),
                  detail: configured ? 'CONFIGURED' : 'NOT_CONFIGURED',
                }))
            ).map((item) => (
              <div
                key={item.name}
                className="p-3 rounded-xl bg-[#050818] border border-white/10 flex items-center justify-between"
              >
                <span className="uppercase text-slate-300">{item.name}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.configured
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-white/10'
                  }`}
                >
                  {item.detail}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex items-start gap-2.5 text-[11px] text-slate-300">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              To add or rotate Gemini, OpenAI, Anthropic, Groq, HuggingFace, or Ollama keys safely, configure them in the server environment (`.env` / container secrets) and restart the server.
            </span>
          </div>
        </div>

        {/* Section 3: Data Management & Export */}
        <div className="bg-[#080b22] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <Database className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Data, Export & Local Storage</h2>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div>
              <h4 className="text-xs font-bold text-white">Export All Anny Workspace Data</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Download chat session history, saved prompts, memory rules, and workspace settings as a portable JSON file.
              </p>
              {exportStatus && <p className="text-[11px] text-cyan-300 mt-1.5 font-mono">{exportStatus}</p>}
            </div>
            <button
              onClick={handleExportBackup}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Export JSON Backup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

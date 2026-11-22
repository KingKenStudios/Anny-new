import React, { useState } from 'react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  Settings,
  Cpu,
  Key,
  Sliders,
  Database,
  Brain,
  Shield,
  Save,
  CheckCircle2,
  Lock,
  Sparkles,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Fingerprint
} from 'lucide-react';
import { annyVoiceService } from '../services/annyVoiceService';

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
          <p className="text-[11px] text-slate-500 mt-1">Your selected ANNY voice is used everywhere, including automatic responses and the speaker button. Female is the default.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(['female', 'male'] as const).map((item) => {
          const profile = annyVoiceService.getVoiceProfiles()[item];
          const active = role === item;
          return (
            <button key={item} onClick={() => selectRole(item)} className={`text-left rounded-2xl border p-4 transition-all ${active ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{profile.label}</span>
                {profile.primary && <span className="text-[9px] uppercase tracking-wider text-cyan-300">Primary</span>}
              </div>
              <p className="mt-2 text-xs text-slate-400">{profile.description}</p>
              <span className={`inline-flex mt-3 px-2 py-1 rounded-lg text-[10px] ${active ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/5 text-slate-500'}`}>{active ? 'Selected' : 'Select voice'}</span>
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
  const [defaultModel, setDefaultModel] = useState('Gemini 3.8 Flash');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(8192);
  const [systemPrompt, setSystemPrompt] = useState(
    'You are Anny, the flagship AI assistant for the AIOS ecosystem. You specialize in generating full-stack software, mobile apps, desktop apps, UI designs, deep research, and creative media.'
  );

  // API Keys state
  const [geminiKey, setGeminiKey] = useState('• • • • • • • • • • • • • • • •');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveSettings = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

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
            Configure application defaults, AI models, system instructions, and API keys for Anny.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-fuchsia-500 shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all cursor-pointer shrink-0"
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Saved Successfully</span>
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
            <h2 className="text-base font-bold text-white">
              Model & Intelligence Defaults
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Default AI Model Engine
              </label>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="w-full bg-[#090d28] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                <option value="G-Ai 3.6 Omni">G-Ai 3.6 Omni (Flagship)</option>
                <option value="Gemini 1.5 Pro">Gemini 1.5 Pro (2M Tokens)</option>
                <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                <option value="GPT-4o">GPT-4o</option>
                <option value="DeepSeek R1">DeepSeek R1</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Max Response Output Tokens
              </label>
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

          {/* System Instructions / System Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Global Custom System Prompt
            </label>
            <textarea
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-[#090d28] border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 leading-relaxed font-mono"
            />
          </div>
        </div>

        {/* Section 2: Reality & Truth Verification (Phase 24) */}
        <div className="bg-[#080b22] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <Fingerprint className="w-5 h-5 text-[#00eeff]" />
            <h2 className="text-base font-bold text-white uppercase tracking-tight">
              Sovereign Reality Audit
            </h2>
          </div>
        </div>

        {/* Section 3: API Keys Management */}
        <div className="bg-[#080b22] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <Key className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">
                API Keys & Provider Secrets
              </h2>
            </div>
            <button
              onClick={() => setShowKeys(!showKeys)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showKeys ? 'Hide Keys' : 'Reveal Keys'}</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Google Gemini API Key (Server Environment)
              </label>
              <input
                type={showKeys ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#090d28] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Automatically managed by cloud container environment
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                OpenAI API Key (Optional)
              </label>
              <input
                type={showKeys ? 'text' : 'password'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full bg-[#090d28] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Anthropic Claude API Key (Optional)
              </label>
              <input
                type={showKeys ? 'text' : 'password'}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-[#090d28] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Data Management & Reset */}
        <div className="bg-[#080b22] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <Database className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Data, Export & Local Storage
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div>
              <h4 className="text-xs font-bold text-white">Export All Anny Workspace Data</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Download chat session history, saved prompts, memory bank, and project settings.
              </p>
            </div>
            <button className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer">
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Export JSON Backup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

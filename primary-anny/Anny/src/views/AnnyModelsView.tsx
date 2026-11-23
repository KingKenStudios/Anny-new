import React, { useState } from 'react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  Cpu,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  Layers,
  BarChart3,
  Globe,
  Sliders,
  ShieldCheck,
  Check
} from 'lucide-react';

interface AnnyModelsViewProps {
  onToggleMobileMenu?: () => void;
  currentModel?: string;
  onSelectModel?: (modelName: string) => void;
}

export const AnnyModelsView: React.FC<AnnyModelsViewProps> = ({
  onToggleMobileMenu,
  currentModel = 'auto',
  onSelectModel,
}) => {
  const [activeModel, setActiveModel] = useState(currentModel);

  const modelsList = [
    {
      id: 'm-1',
      modelId: 'auto',
      name: 'ANNY Adaptive Router',
      provider: 'ANNY Neural Router',
      badge: 'Flagship Auto-Route',
      description: 'Intelligent routing across Gemini, Groq, OpenAI, and local Ollama GGUF for live split-screen coding, vision analysis, and multi-file builds.',
      contextWindow: 'Dynamic',
      speed: 'Adaptive',
      reasoning: 'High',
      status: 'Active / Default',
      color: 'from-cyan-500 via-indigo-500 to-fuchsia-600',
      recommendedFor: 'Full-stack Web & App Generation, Vision, Code',
    },
    {
      id: 'm-2',
      modelId: 'gemini-4-hydrogen',
      name: 'Gemini 4 Hydrogen',
      provider: 'Google AI Studio',
      badge: 'Reasoning & Multimodal Core',
      description: 'High-capability reasoning model optimized for complex software architecture, multimodal analysis, and structured builds.',
      contextWindow: '1,000,000 tokens',
      speed: 'Fast',
      reasoning: 'Ultra High',
      status: 'Server Key Optional',
      color: 'from-blue-500 to-cyan-500',
      recommendedFor: 'Repository Audits, Vision Analysis, Multi-File Apps',
    },
    {
      id: 'm-3',
      modelId: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash Lite',
      provider: 'Google AI Studio',
      badge: 'Low-Latency Engine',
      description: 'Fast, responsive multimodal engine tuned for interactive chat, code completion, and quick creative workflows.',
      contextWindow: '1,000,000 tokens',
      speed: 'Ultra Fast',
      reasoning: 'High',
      status: 'Server Key Optional',
      color: 'from-amber-500 to-orange-600',
      recommendedFor: 'Interactive Chat, Code Editing, Fast Iteration',
    },
    {
      id: 'm-4',
      modelId: 'ollama-local',
      name: 'Ollama Local GGUF',
      provider: 'Local Sovereign Node',
      badge: 'Offline & Sovereign',
      description: 'Runs locally via your Ollama daemon on 127.0.0.1:11434 with zero external cloud dependency.',
      contextWindow: 'Model Dependent',
      speed: 'Local Hardware',
      reasoning: 'Local Sovereign',
      status: 'Offline Capable',
      color: 'from-emerald-500 to-teal-600',
      recommendedFor: 'Offline Coding, Private Workloads, Air-Gapped Systems',
    },
    {
      id: 'm-5',
      modelId: 'deepseek-coder',
      name: 'DeepSeek Coder / R1',
      provider: 'DeepSeek AI',
      badge: 'Open Reasoning & Code',
      description: 'Dedicated reasoning and coding engine for algorithm synthesis, debugging, and backend logic.',
      contextWindow: '128,000 tokens',
      speed: 'Standard',
      reasoning: 'Extreme',
      status: 'Server Key Optional',
      color: 'from-purple-500 to-indigo-600',
      recommendedFor: 'Math Proofs, Deep Logic, Chain of Thought',
    },
    {
      id: 'm-6',
      modelId: 'creative-media-suite',
      name: 'ANNY Creative Media Engines',
      provider: 'Local SVG/WAV + Gemini Image/Veo/Lyria',
      badge: 'Image, Audio & Video',
      description: 'Unified media pipeline combining deterministic offline SVG/PCM-WAV synthesis with optional cloud image, TTS, and video engines.',
      contextWindow: 'Media Pipeline',
      speed: 'Fast',
      reasoning: 'Creative',
      status: 'Ready',
      color: 'from-pink-500 to-rose-600',
      recommendedFor: 'Logos, Raster Images, WAV Music/Beats/SFX, Storyboards',
    },
  ];

  const handleChoose = (modelId: string) => {
    setActiveModel(modelId);
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage?.getItem('anny_settings_v1') : null;
      const parsed = raw ? JSON.parse(raw) : {};
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('anny_settings_v1', JSON.stringify({ ...parsed, defaultModel: modelId }));
      }
    } catch {}
    if (onSelectModel) onSelectModel(modelId);
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
            <Cpu className="w-7 h-7 text-cyan-400" />
            AI Models & Engines
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure default model engines, context parameters, and reasoning parameters for Anny.
          </p>
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modelsList.map((model) => {
          const isSelected = activeModel === model.modelId || activeModel === model.name;
          return (
            <div
              key={model.id}
              className={`bg-[#080b22] border rounded-2xl p-6 flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-cyan-500/80 shadow-[0_0_30px_rgba(0,229,255,0.25)] bg-[#090d2e]'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 uppercase tracking-wider">
                      {model.badge}
                    </span>
                    <h3 className="text-lg font-black text-white mt-1.5 flex items-center gap-2">
                      {model.name}
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
                      )}
                    </h3>
                    <span className="text-xs text-slate-400">{model.provider}</span>
                  </div>

                  <button
                    onClick={() => handleChoose(model.modelId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,229,255,0.5)]'
                        : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {isSelected ? 'Active Default' : 'Select Model'}
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {model.description}
                </p>

                {/* Performance Stats */}
                <div className="grid grid-cols-3 gap-2 bg-[#050718] border border-white/5 rounded-xl p-3 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Context</span>
                    <span className="text-xs font-bold text-slate-200 font-mono">{model.contextWindow}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Speed</span>
                    <span className="text-xs font-bold text-cyan-400 font-mono">{model.speed}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Reasoning</span>
                    <span className="text-xs font-bold text-purple-400 font-mono">{model.reasoning}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                  <strong className="text-slate-300">Best for:</strong> {model.recommendedFor}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

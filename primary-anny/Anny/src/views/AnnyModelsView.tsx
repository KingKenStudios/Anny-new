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
  currentModel = 'G-Ai 3.6 Omni',
  onSelectModel,
}) => {
  const [activeModel, setActiveModel] = useState(currentModel);

  const modelsList = [
    {
      id: 'm-1',
      name: 'G-Ai 3.6 Omni',
      provider: 'Anny Native Engine',
      badge: 'Flagship Multimodal',
      description: 'Next-gen multimodal AI engine supporting live split-screen code editing, vision analysis, deep research, voice synthesis, and multi-file project generation.',
      contextWindow: '2,000,000 tokens',
      speed: '⚡ Lightning (120 t/s)',
      reasoning: 'Ultra High (99.4%)',
      status: 'Active / Default',
      color: 'from-cyan-500 via-indigo-500 to-fuchsia-600',
      recommendedFor: 'Full-stack Web & App Generation, Vision, Code',
    },
    {
      id: 'm-2',
      name: 'Gemini 1.5 Pro',
      provider: 'Google AI Studio',
      badge: 'Long-Context Powerhouse',
      description: 'Breakthrough 2M context window optimized for large codebase analysis, video processing, and document ingestion.',
      contextWindow: '2,000,000 tokens',
      speed: 'Fast (85 t/s)',
      reasoning: 'High (98.2%)',
      status: 'Ready',
      color: 'from-blue-500 to-cyan-500',
      recommendedFor: 'Repository Audits, Large Video Analysis, PDF Ingestion',
    },
    {
      id: 'm-3',
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic',
      badge: 'Coding Specialist',
      description: 'Industry-leading benchmark scores for complex logic, nuanced writing, refactoring, and code generation.',
      contextWindow: '200,000 tokens',
      speed: 'Fast (90 t/s)',
      reasoning: 'High (98.8%)',
      status: 'Ready',
      color: 'from-amber-500 to-orange-600',
      recommendedFor: 'Complex Refactoring, Algorithm Design, Technical Writing',
    },
    {
      id: 'm-4',
      name: 'GPT-4o',
      provider: 'OpenAI',
      badge: 'Omni Reasoning',
      description: 'Versatile omni model with high general reasoning, web search grounding, and creative problem solving.',
      contextWindow: '128,000 tokens',
      speed: 'Very Fast (105 t/s)',
      reasoning: 'High (97.9%)',
      status: 'Ready',
      color: 'from-emerald-500 to-teal-600',
      recommendedFor: 'General Purpose Chat, Logic Puzzles, Marketing',
    },
    {
      id: 'm-5',
      name: 'DeepSeek R1',
      provider: 'DeepSeek AI',
      badge: 'Open Reasoning Model',
      description: 'Advanced chain-of-thought mathematical reasoning model with step-by-step verification trees.',
      contextWindow: '128,000 tokens',
      speed: 'Standard (60 t/s)',
      reasoning: 'Extreme (99.1%)',
      status: 'Ready',
      color: 'from-purple-500 to-indigo-600',
      recommendedFor: 'Math Proofs, Deep Logic, Chain of Thought',
    },
    {
      id: 'm-6',
      name: 'FLUX.1 & Suno V3',
      provider: 'AKIN Media Engine',
      badge: 'Image & Audio Generation',
      description: 'Dedicated diffusion and audio synthesis model pipeline for photorealistic images, UI assets, and music.',
      contextWindow: 'N/A (Media Generation)',
      speed: 'Fast (3-5 sec)',
      reasoning: 'Creative',
      status: 'Ready',
      color: 'from-pink-500 to-rose-600',
      recommendedFor: 'Photorealistic Images, Vector Assets, Audio Tracks',
    },
  ];

  const handleChoose = (name: string) => {
    setActiveModel(name);
    if (onSelectModel) onSelectModel(name);
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
          const isSelected = activeModel === model.name;
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
                    onClick={() => handleChoose(model.name)}
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

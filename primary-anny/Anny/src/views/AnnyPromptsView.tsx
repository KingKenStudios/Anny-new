import React, { useState } from 'react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  Bookmark,
  Search,
  Plus,
  Copy,
  Check,
  Sparkles,
  Code2,
  Layout,
  Terminal,
  FileText,
  ArrowRight
} from 'lucide-react';

interface AnnyPromptsViewProps {
  onToggleMobileMenu?: () => void;
  onUsePrompt?: (promptText: string) => void;
}

export const AnnyPromptsView: React.FC<AnnyPromptsViewProps> = ({
  onToggleMobileMenu,
  onUsePrompt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Prompts' },
    { id: 'frontend', label: 'Frontend & UI' },
    { id: 'backend', label: 'Backend & APIs' },
    { id: 'research', label: 'Deep Research' },
    { id: 'writing', label: 'Copywriting' },
  ];

  const prompts = [
    {
      id: 'p-1',
      title: 'Full-Stack React App Architecture',
      category: 'frontend',
      categoryLabel: 'Frontend & UI',
      description: 'Generates a clean modular React application with TypeScript, Tailwind CSS, Lucide icons, and state management.',
      content: 'Build a production-ready single-screen React app using TypeScript and Tailwind CSS with high-contrast typography, interactive components, and local state.',
      tags: ['React', 'TypeScript', 'Tailwind'],
    },
    {
      id: 'p-2',
      title: 'Express REST API with CJS Bundle',
      category: 'backend',
      categoryLabel: 'Backend & APIs',
      description: 'Creates a robust Node/Express server setup with esbuild bundle compilation and error handling.',
      content: 'Create a full-stack Express server in server.ts listening on port 3000 with CORS, JSON body parser, and structured API endpoints.',
      tags: ['Express', 'Node', 'ESM/CJS'],
    },
    {
      id: 'p-3',
      title: 'Deep Research & Technical Synthesis',
      category: 'research',
      categoryLabel: 'Deep Research',
      description: 'Instructs Anny to perform multi-source research, synthesize key findings, and generate structured markdown.',
      content: 'Perform deep technical research on the following topic. Provide a comprehensive breakdown including core architecture, trade-offs, and actionable conclusions.',
      tags: ['Research', 'Analysis', 'Markdown'],
    },
    {
      id: 'p-4',
      title: 'Glassmorphic Dark Theme System',
      category: 'frontend',
      categoryLabel: 'Frontend & UI',
      description: 'Generates CSS variables and Tailwind classes for dark neon cyan/indigo glassmorphism.',
      content: 'Design a sleek dark theme UI with bg-[#040612] canvas, backdrop-blur borders, neon cyan highlights, and smooth motion transitions.',
      tags: ['UI/UX', 'Glassmorphism', 'Design System'],
    },
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPrompts = prompts.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
            <Bookmark className="w-7 h-7 text-cyan-400" />
            Prompt Library
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Curated prompt templates for software engineering, design systems, and autonomous research.
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-fuchsia-500 shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all cursor-pointer shrink-0">
          <Plus className="w-4 h-4" />
          <span>Save Custom Prompt</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompt templates..."
            className="w-full bg-[#090d28] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-[#0a0e2a] text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredPrompts.map((prompt) => (
          <div
            key={prompt.id}
            className="bg-[#080b22] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all hover:shadow-[0_0_25px_rgba(0,229,255,0.15)] group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40">
                  {prompt.categoryLabel}
                </span>
                <button
                  onClick={() => handleCopy(prompt.id, prompt.content)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
                  title="Copy Prompt"
                >
                  {copiedId === prompt.id ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                {prompt.title}
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed">
                {prompt.description}
              </p>

              <div className="bg-[#050718] border border-white/5 rounded-xl p-3 text-xs text-slate-300 font-mono italic leading-relaxed line-clamp-3">
                "{prompt.content}"
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 mt-5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {prompt.tags.map((tag) => (
                  <span key={tag} className="text-[10px] text-slate-400 font-mono">
                    #{tag}
                  </span>
                ))}
              </div>

              <button
                onClick={() => onUsePrompt && onUsePrompt(prompt.content)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md transition-all cursor-pointer"
              >
                <span>Use Prompt</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

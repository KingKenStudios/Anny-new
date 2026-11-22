import React, { useState } from 'react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  BookOpen,
  Upload,
  Search,
  FileText,
  Globe,
  Database,
  Trash2,
  CheckCircle2,
  Plus,
  Layers,
  Sparkles,
  Link,
  FileCode
} from 'lucide-react';

interface AnnyKnowledgeViewProps {
  onToggleMobileMenu?: () => void;
}

export const AnnyKnowledgeView: React.FC<AnnyKnowledgeViewProps> = ({
  onToggleMobileMenu,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [ragEnabled, setRagEnabled] = useState(true);

  const knowledgeItems = [
    {
      id: 'k-1',
      title: 'AKIN_AIOS_Master_Architecture.pdf',
      type: 'PDF Document',
      size: '2.4 MB',
      tokens: '124,500',
      uploaded: '2 hours ago',
      status: 'Indexed & Vectorized',
      icon: FileText,
      color: 'text-red-400',
    },
    {
      id: 'k-2',
      title: 'https://docs.aios.dev/api/v2/sdk-reference',
      type: 'Scraped Web Page',
      size: '850 KB',
      tokens: '48,200',
      uploaded: 'Yesterday',
      status: 'Indexed & Vectorized',
      icon: Globe,
      color: 'text-cyan-400',
    },
    {
      id: 'k-3',
      title: 'React18_State_Management_Best_Practices.md',
      type: 'Markdown Note',
      size: '120 KB',
      tokens: '14,800',
      uploaded: '3 days ago',
      status: 'Indexed & Vectorized',
      icon: FileCode,
      color: 'text-purple-400',
    },
    {
      id: 'k-4',
      title: 'Global_Product_Catalog_Schema.json',
      type: 'JSON Dataset',
      size: '1.1 MB',
      tokens: '82,000',
      uploaded: '5 days ago',
      status: 'Indexed & Vectorized',
      icon: Database,
      color: 'text-emerald-400',
    },
  ];

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
            <BookOpen className="w-7 h-7 text-cyan-400" />
            Knowledge Base
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload documents, PDFs, web links, and datasets for grounded AI context retrieval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* RAG Toggle */}
          <div className="flex items-center gap-2 bg-[#090d28] border border-white/10 rounded-xl px-3 py-2 text-xs">
            <span className="text-slate-300 font-medium">Auto-RAG Context:</span>
            <button
              onClick={() => setRagEnabled(!ragEnabled)}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                ragEnabled ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  ragEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-fuchsia-500 shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all cursor-pointer shrink-0">
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-8 bg-[#080b22]/80 text-center mb-8 transition-colors group cursor-pointer">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <Upload className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">
          Drop files here or click to browse
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Supports PDF, Markdown, TXT, CSV, JSON, and Web URLs up to 100MB per file
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#080b22] border border-white/10 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Total Documents</span>
          <span className="text-xl font-bold text-white mt-1 block">4 Files</span>
        </div>
        <div className="bg-[#080b22] border border-white/10 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Indexed Tokens</span>
          <span className="text-xl font-bold text-cyan-400 mt-1 block font-mono">269,500</span>
        </div>
        <div className="bg-[#080b22] border border-white/10 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Vector Embeddings</span>
          <span className="text-xl font-bold text-purple-400 mt-1 block font-mono">1,840 Chunks</span>
        </div>
        <div className="bg-[#080b22] border border-white/10 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Status</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Ready
          </span>
        </div>
      </div>

      {/* Documents Table / List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Indexed Documents
        </h3>
        <div className="space-y-2">
          {knowledgeItems.map((item) => {
            const IconComp = item.icon;
            return (
              <div
                key={item.id}
                className="bg-[#080b22] border border-white/10 hover:border-cyan-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${item.color} shrink-0`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>{item.type}</span>
                      <span>•</span>
                      <span>{item.size}</span>
                      <span>•</span>
                      <span className="font-mono text-cyan-400">{item.tokens} tokens</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {item.status}
                  </span>
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

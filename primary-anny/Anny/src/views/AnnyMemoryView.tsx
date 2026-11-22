import React, { useState } from 'react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  Brain,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  User,
  Code2,
  Globe,
  Lock
} from 'lucide-react';

interface AnnyMemoryViewProps {
  onToggleMobileMenu?: () => void;
}

export const AnnyMemoryView: React.FC<AnnyMemoryViewProps> = ({
  onToggleMobileMenu,
}) => {
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [newFact, setNewFact] = useState('');

  const [memoryEntries, setMemoryEntries] = useState([
    {
      id: 'm-1',
      category: 'Developer Preferences',
      fact: 'User prefers React with TypeScript and Tailwind CSS for all web applications.',
      dateAdded: 'Aug 5, 2026',
    },
    {
      id: 'm-2',
      category: 'Project Architecture',
      fact: 'Always structure server endpoints as full-stack Node.js/Express CJS bundles on port 3000.',
      dateAdded: 'Aug 6, 2026',
    },
    {
      id: 'm-3',
      category: 'Styling & Aesthetics',
      fact: 'Prefers dark glassmorphic themes with cyan/purple neon accents and high contrast text.',
      dateAdded: 'Aug 6, 2026',
    },
    {
      id: 'm-4',
      category: 'User Identity',
      fact: 'Name is Akin Kehinde, Primary developer and creator of AnnyOS.',
      dateAdded: 'Aug 7, 2026',
    },
  ]);

  const handleAddMemory = () => {
    if (!newFact.trim()) return;
    setMemoryEntries([
      ...memoryEntries,
      {
        id: `m-${Date.now()}`,
        category: 'Custom Rule',
        fact: newFact.trim(),
        dateAdded: 'Just now',
      },
    ]);
    setNewFact('');
  };

  const handleDeleteMemory = (id: string) => {
    setMemoryEntries(memoryEntries.filter((m) => m.id !== id));
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
            <Brain className="w-7 h-7 text-cyan-400" />
            Personal Memory & Context
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Anny remembers your developer preferences, coding style, and personal guidelines across all chats.
          </p>
        </div>

        {/* Global Memory Switch */}
        <div className="flex items-center gap-3 bg-[#080b22] border border-white/10 rounded-xl px-4 py-2.5">
          <span className="text-xs font-semibold text-white">Global AI Memory:</span>
          <button
            onClick={() => setMemoryEnabled(!memoryEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              memoryEnabled
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {memoryEnabled ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>
      </div>

      {/* Add New Memory Entry Card */}
      <div className="bg-[#080b22] border border-white/10 rounded-2xl p-6 mb-8 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-400" />
          Add Manual Memory Rule
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()}
            placeholder="e.g., 'Always use Lucide React icons' or 'Keep response tone concise'"
            className="flex-1 bg-[#090d28] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={handleAddMemory}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-cyan-500 hover:bg-cyan-400 transition-colors cursor-pointer shrink-0"
          >
            Save Memory
          </button>
        </div>
      </div>

      {/* Saved Memories List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Active Memory Bank ({memoryEntries.length})
          </h3>
          <span className="text-xs text-cyan-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Encrypted & Stored Locally
          </span>
        </div>

        <div className="space-y-3">
          {memoryEntries.map((item) => (
            <div
              key={item.id}
              className="bg-[#080b22] border border-white/10 hover:border-cyan-500/30 rounded-xl p-4 flex items-start justify-between gap-4 transition-all"
            >
              <div className="space-y-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-purple-400 bg-purple-950/40 border border-purple-800/40 inline-block">
                  {item.category}
                </span>
                <p className="text-xs text-white font-medium leading-relaxed">
                  {item.fact}
                </p>
                <span className="text-[10px] text-slate-500 block">
                  Added {item.dateAdded}
                </span>
              </div>

              <button
                onClick={() => handleDeleteMemory(item.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

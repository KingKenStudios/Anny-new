import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Terminal, Code2, Cpu, Database, CloudUpload, 
  Settings, Bot, FileText, Zap, Shield, Sparkles, X, ChevronRight, Activity
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  setView: (view: string) => void;
  startNewChat?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  setView,
  startNewChat
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = [
    { id: 'workspace', title: 'Open AI Workspace', category: 'Navigation', icon: Sparkles, view: 'workspace' },
    { id: 'new_chat', title: 'Start New AI Session', category: 'Actions', icon: Zap, action: () => { if (startNewChat) startNewChat(); setView('home'); } },
    { id: 'dashboard', title: 'View Analytics Dashboard', category: 'Navigation', icon: Activity, view: 'dashboard' },
    { id: 'code_editor', title: 'Open Code Editor & IDE', category: 'Development', icon: Code2, view: 'code_editor' },
    { id: 'agents', title: 'View Active AI Agents', category: 'Intelligence', icon: Bot, view: 'agents' },
    { id: 'studio', title: 'Open Super App Studio', category: 'Development', icon: Cpu, view: 'super_app_studio' },
    { id: 'database', title: 'Database Visualizer & Manager', category: 'Development', icon: Database, view: 'database' },
    { id: 'deployment', title: 'Deployment & CI/CD Pipeline', category: 'Operations', icon: CloudUpload, view: 'deployment' },
    { id: 'terminal', title: 'Open Interactive Terminal', category: 'Development', icon: Terminal, view: 'terminal' },
    { id: 'security', title: 'Cybersecurity Command & LOTO', category: 'Operations', icon: Shield, view: 'cybersecurity' },
    { id: 'settings', title: 'Platform Settings & Config', category: 'System', icon: Settings, view: 'settings' },
  ];

  const filtered = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) || 
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          executeCommand(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  const executeCommand = (cmd: typeof commands[0]) => {
    if (cmd.action) {
      cmd.action();
    } else if (cmd.view) {
      setView(cmd.view);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="w-full max-w-2xl bg-[#0d0f1b] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col"
        >
          {/* Search Input Bar */}
          <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#131628]">
            <Search className="w-5 h-5 text-cyan-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search command, page, agent, or tool... (Use ↑ ↓ to navigate, Enter to select)"
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
              autoFocus
            />
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Command List */}
          <div className="max-h-96 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No commands matching "{query}"
              </div>
            ) : (
              filtered.map((cmd, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = cmd.icon;
                return (
                  <div
                    key={cmd.id}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-3 rounded-xl flex items-center justify-between cursor-pointer text-xs font-mono transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500 text-black' : 'bg-white/5 text-cyan-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{cmd.title}</p>
                        <p className="text-[10px] text-slate-400">{cmd.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {cmd.category}
                      </span>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="p-3 bg-[#090b14] border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-3">
              <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white">↑↓</kbd> Navigate</span>
              <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white">↵</kbd> Select</span>
              <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white">ESC</kbd> Close</span>
            </div>
            <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
              <img src="/logo.png" alt="Anny" className="w-3.5 h-3.5 object-contain bg-transparent" />
              ANNY v2.0
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

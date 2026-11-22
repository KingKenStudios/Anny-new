import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Folder,
  History,
  Bot,
  BookOpen,
  Brain,
  Bookmark,
  Cpu,
  Wrench,
  Puzzle,
  Settings,
  Sparkles,
  Plus,
  X,
  Shield,
  Calculator,
  Building2,
} from 'lucide-react';
import logoImg from './assets/logo.png';

const appLogo = logoImg || '/logo.png';

interface AnnySlideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onSelectTab: (tabKey: string) => void;
  userName?: string;
  userEmail?: string;
  disabled?: boolean;
}

interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export const AnnySlideMenu: React.FC<AnnySlideMenuProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  disabled = false,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHovered(false);
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const menuItems: NavItem[] = [
    { key: 'chats', label: 'Chats', icon: MessageSquare },
    { key: 'creative-studio', label: 'King Ken Studios', icon: Sparkles },
    { key: 'projects', label: 'Projects', icon: Folder },
    { key: 'session-history', label: 'Session History', icon: History },
    { key: 'prompt-library', label: 'Prompt Library', icon: Bookmark },
    { key: 'ai-agents', label: 'AI Agents', icon: Bot },
    { key: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { key: 'memory', label: 'Memory', icon: Brain },
    { key: 'models', label: 'Models', icon: Cpu },
    { key: 'tools', label: 'Tools', icon: Wrench },
    { key: 'engineering-safety', label: 'Engineering & Safety', icon: Calculator },
    { key: 'media-arch-studio', label: 'Architecture & Media', icon: Building2 },
    { key: 'watchdog', label: 'Watchdog Security', icon: Shield },
    { key: 'integrations', label: 'Integrations', icon: Puzzle },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  const isTabActive = (itemKey: string) => {
    if (itemKey === 'chats' && (currentTab === 'anny' || currentTab === 'chats' || currentTab === '')) return true;
    if (itemKey === 'creative-studio' && (currentTab === 'creative-studio' || currentTab === 'studios' || currentTab === 'king-ken-studios')) return true;
    if (itemKey === 'projects' && (currentTab === 'projects' || currentTab === 'anny-projects')) return true;
    if (itemKey === 'session-history' && (currentTab === 'session-history' || currentTab === 'history' || currentTab === 'anny-history')) return true;
    if (itemKey === 'ai-agents' && (currentTab === 'ai-agents' || currentTab === 'agents' || currentTab === 'anny-agents')) return true;
    if (itemKey === 'knowledge' && (currentTab === 'knowledge' || currentTab === 'knowledge-base' || currentTab === 'anny-knowledge')) return true;
    if (itemKey === 'memory' && (currentTab === 'memory' || currentTab === 'anny-memory')) return true;
    if (itemKey === 'prompt-library' && (currentTab === 'prompt-library' || currentTab === 'prompts' || currentTab === 'anny-prompts')) return true;
    if (itemKey === 'models' && (currentTab === 'models' || currentTab === 'anny-models')) return true;
    if (itemKey === 'tools' && (currentTab === 'tools' || currentTab === 'anny-tools')) return true;
    if (itemKey === 'engineering-safety' && (currentTab === 'engineering-safety' || currentTab === 'safety')) return true;
    if (itemKey === 'media-arch-studio' && (currentTab === 'media-arch-studio' || currentTab === 'architecture' || currentTab === 'broadcast' || currentTab === 'distribution')) return true;
    if (itemKey === 'watchdog' && (currentTab === 'watchdog' || currentTab === 'cybersecurity')) return true;
    if (itemKey === 'integrations' && (currentTab === 'integrations' || currentTab === 'anny-integrations')) return true;
    if (itemKey === 'settings' && (currentTab === 'settings' || currentTab === 'anny-settings')) return true;
    return currentTab === itemKey;
  };

  const isVisible = (isOpen || isHovered) && !disabled;

  return (
    <>
      {/* Hover activation trigger edge at left screen boundary */}
      {!disabled && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          className="fixed top-0 left-0 bottom-0 w-6 z-[95] pointer-events-auto"
          title="Hover to slide out menu"
        />
      )}

      {/* Dark Overlay Backdrop when menu is open or hovered */}
      <div
        onClick={() => {
          setIsHovered(false);
          onClose();
        }}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[98] transition-opacity duration-300 ${
          isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Left Sliding Sidebar Panel */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-0 bottom-0 w-72 sm:w-80 bg-[#020412] border-r border-[#151c42] z-[99] shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col transition-transform duration-300 ease-out transform ${
          isVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-4 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          {/* 1. BRANDING HEADER */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              {/* Logo Badge */}
              <div className="relative w-11 h-11 rounded-2xl bg-[#080d2d] border border-cyan-500/40 p-2 flex items-center justify-center shadow-[0_0_20px_rgba(0,210,255,0.4)] shrink-0">
                <img
                  src="/logo.png"
                  alt="Anny Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== appLogo && appLogo) {
                      target.src = appLogo;
                    }
                  }}
                />
              </div>

              <div className="flex flex-col justify-center overflow-visible">
                <span className="text-2xl font-black font-heading tracking-wide leading-relaxed pb-2 animate-aios-shift drop-shadow-[0_0_12px_rgba(0,229,255,0.6)]">
                  Anny
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsHovered(false);
                onClose();
              }}
              aria-label="Close navigation menu"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2. NEW CHAT GRADIENT ACTION BUTTON */}
          <button
            onClick={() => {
              onSelectTab('new-chat');
              setIsHovered(false);
              onClose();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#00d2ff] via-[#8000ff] to-[#f050d8] hover:brightness-110 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,210,255,0.4)] transition-all cursor-pointer active:scale-[0.98] shrink-0"
          >
            <Plus className="w-5 h-5 text-white" />
            <span>New Chat</span>
          </button>

          {/* 4. NAVIGATION LIST ITEMS */}
          <nav className="space-y-1.5 pt-2 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isTabActive(item.key);

              return (
                <button
                  key={item.key}
                  onClick={() => {
                    onSelectTab(item.key);
                    setIsHovered(false);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3.5 py-3 px-4 rounded-2xl text-sm font-semibold transition-all cursor-pointer group text-left ${
                    active
                      ? 'bg-[#0a0f30] border border-cyan-500/50 text-white shadow-[0_0_18px_rgba(0,229,255,0.2)]'
                      : 'bg-transparent border border-transparent text-slate-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      active ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};

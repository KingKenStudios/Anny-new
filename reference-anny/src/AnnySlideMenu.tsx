import React, { useState } from 'react';
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
  Plus,
  Layers,
  Globe,
  Building2,
  Laptop,
  ShieldCheck,
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
  icon: React.ElementType;
}

export const AnnySlideMenu: React.FC<AnnySlideMenuProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  disabled = false,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const menuItems: NavItem[] = [
    { key: 'chats', label: 'Chats', icon: MessageSquare },
    { key: 'aios-control', label: 'AIOS Control Plane', icon: Layers },
    { key: 'collective-learning', label: 'Collective Learning & Privacy', icon: Brain },
    { key: 'organizations', label: 'Multi-Tenant Orgs', icon: Building2 },
    { key: 'portable-runtime', label: 'Portable Runtime Host', icon: Laptop },
    { key: 'master-audit', label: 'Master Reality Audit', icon: ShieldCheck },
    { key: 'capabilities', label: 'Capability Truth Registry', icon: Layers },
    { key: 'vision-diagnostics', label: 'Vision Diagnostics', icon: ShieldCheck },
    { key: 'languages', label: 'Universal Language Matrix', icon: Globe },
    { key: 'projects', label: 'Projects', icon: Folder },
    { key: 'session-history', label: 'Session History', icon: History },
    { key: 'ai-agents', label: 'AI Agents', icon: Bot },
    { key: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { key: 'memory', label: 'Memory (10 Classes)', icon: Brain },
    { key: 'prompt-library', label: 'Prompt Library', icon: Bookmark },
    { key: 'models', label: 'Models & Routing', icon: Cpu },
    { key: 'tools', label: 'Tools', icon: Wrench },
    { key: 'integrations', label: 'Integrations', icon: Puzzle },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  const isTabActive = (itemKey: string) => {
    if (itemKey === 'chats' && (currentTab === 'anny' || currentTab === 'chats' || currentTab === '')) return true;
    if (itemKey === 'aios-control' && (currentTab === 'aios-control' || currentTab === 'aios')) return true;
    if (itemKey === 'collective-learning' && (currentTab === 'collective-learning' || currentTab === 'learning')) return true;
    if (itemKey === 'organizations' && (currentTab === 'organizations' || currentTab === 'orgs')) return true;
    if (itemKey === 'portable-runtime' && (currentTab === 'portable-runtime' || currentTab === 'portable')) return true;
    if (itemKey === 'master-audit' && (currentTab === 'master-audit' || currentTab === 'audit')) return true;
    if (itemKey === 'capabilities' && (currentTab === 'capabilities' || currentTab === 'phase14' || currentTab === 'reality-verification')) return true;
    if (itemKey === 'languages' && (currentTab === 'languages' || currentTab === 'anny-languages' || currentTab === 'universal-languages')) return true;
    if (itemKey === 'projects' && (currentTab === 'projects' || currentTab === 'anny-projects')) return true;
    if (itemKey === 'session-history' && (currentTab === 'session-history' || currentTab === 'history' || currentTab === 'anny-history')) return true;
    if (itemKey === 'ai-agents' && (currentTab === 'ai-agents' || currentTab === 'agents' || currentTab === 'anny-agents')) return true;
    if (itemKey === 'knowledge' && (currentTab === 'knowledge' || currentTab === 'knowledge-base' || currentTab === 'anny-knowledge')) return true;
    if (itemKey === 'memory' && (currentTab === 'memory' || currentTab === 'anny-memory')) return true;
    if (itemKey === 'prompt-library' && (currentTab === 'prompt-library' || currentTab === 'prompts' || currentTab === 'anny-prompts')) return true;
    if (itemKey === 'models' && (currentTab === 'models' || currentTab === 'anny-models')) return true;
    if (itemKey === 'tools' && (currentTab === 'tools' || currentTab === 'anny-tools')) return true;
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
          <div className="flex items-center gap-3 pt-1">
            {/* Logo Badge */}
            <div className="relative w-11 h-11 rounded-2xl bg-[#080d2d] border border-cyan-500/40 p-2 flex items-center justify-center shadow-[0_0_20px_rgba(0,210,255,0.4)] shrink-0">
              <img src="/logo.png" alt="Anny Logo" className="w-full h-full object-contain" />
            </div>

            <div className="flex flex-col justify-center overflow-visible">
              <span className="text-2xl font-black font-heading tracking-wide leading-relaxed pb-2 animate-aios-shift drop-shadow-[0_0_12px_rgba(0,229,255,0.6)]">
                Anny
              </span>
            </div>
          </div>

          {/* 2. NEW CHAT GRADIENT ACTION BUTTON */}
          <button
            onClick={() => {
              onSelectTab('new-chat');
              setIsHovered(false);
              onClose();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#00d2ff] via-[#8000ff] to-[#f050d8] hover:brightness-110 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,210,255,0.4)] transition-all cursor-pointer active:scale-98 shrink-0"
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

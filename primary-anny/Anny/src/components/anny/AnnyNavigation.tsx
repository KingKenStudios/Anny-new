import React from 'react';
import {
  Plus, Folder, History, Layers, Boxes, Database, Network, Globe, Sparkles, Cpu, Rocket, Settings, ShieldCheck, Activity, TerminalSquare, User
} from 'lucide-react';

export interface AnnyNavigationProps {
  activeView: string;
  setActiveView: (view: string) => void;
  startNewChat?: () => void;
  isAdmin?: boolean;
}

export const AnnyNavigation: React.FC<AnnyNavigationProps> = ({
  activeView,
  setActiveView,
  startNewChat,
  isAdmin
}) => {
  const navItems = [
    { id: 'chat', label: 'AI Workspace Chat', icon: Plus, action: startNewChat },
    { id: 'my_apps', label: 'My Apps', icon: Folder },
    { id: 'history', label: 'Session History', icon: History },
    { id: 'ecosystem', label: 'Ecosystem & APIs', icon: Globe },
    { id: 'neural_lab', label: 'Neural Lab (3D Generator)', icon: Sparkles },
    { id: 'super_app_studio', label: 'Super App Studio', icon: Cpu },
    { id: 'cybersecurity', label: 'Cyber Security Command', icon: ShieldCheck },
    { id: 'diagnostics', label: 'Industrial SCADA', icon: Activity },
    { id: 'hardware_simulator', label: 'Robotics Simulator', icon: TerminalSquare },
    { id: 'subscription', label: 'Neural Matrix Access', icon: Rocket },
    { id: 'settings', label: 'Settings & Profile', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#080b1a] border-r border-white/10 flex flex-col shrink-0 select-none">
      {/* Brand Logo Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-extrabold text-slate-950 text-sm shadow-lg shadow-cyan-500/25">
          A
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-wider animate-aios-shift drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]">ANNY / ROBOT</span>
          <span className="text-[10px] text-cyan-400 font-mono">Enterprise AI OS</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.action) item.action();
                setActiveView(item.id);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 text-cyan-400" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

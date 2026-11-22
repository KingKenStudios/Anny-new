import { annyVoiceService } from '../../services/annyVoiceService';
import React from 'react';
import { Bot, Activity, Wifi, ShieldCheck, User, Settings, LogOut, Search, Volume2, VolumeX } from 'lucide-react';
import { safeStorage } from '../../lib/storage';

export interface AnnyTopBarProps {
  activeView: string;
  user: any;
  handleLogout?: () => void;
  onOpenSettings?: () => void;
  isAutoSpeak?: boolean;
  setIsAutoSpeak?: (val: boolean) => void;
  voices?: SpeechSynthesisVoice[];
}

export const AnnyTopBar: React.FC<AnnyTopBarProps> = ({
  activeView,
  user,
  handleLogout,
  onOpenSettings,
  isAutoSpeak = true,
  setIsAutoSpeak,
  voices = []
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const getViewTitle = () => {
    switch (activeView) {
      case 'chat': return 'AI Workspace & Neural Chat';
      case 'my_apps': return 'My Applications & Projects';
      case 'ecosystem': return 'Anny Ecosystem & API Gateway';
      case 'neural_lab': return 'Neural Lab 3D Asset Generator';
      case 'super_app_studio': return 'Super App Studio Builder';
      case 'cybersecurity': return 'Cyber Security Command Center';
      case 'diagnostics': return 'Industrial SCADA & ICS Diagnostics';
      case 'hardware_simulator': return 'ROS 2 Mechatronics Simulator';
      case 'subscription': return 'Neural Matrix Access & Billing';
      case 'settings': return 'System Settings & Profile';
      default: return 'Anny Universal Operating System';
    }
  };

  return (
    <header className="h-14 bg-[#080b1a] border-b border-white/10 px-4 flex items-center justify-between shrink-0 z-20">
      {/* View Title */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-xs font-bold font-mono text-white tracking-wider uppercase">{getViewTitle()}</span>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0d1222] border border-white/10 rounded-lg">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>ROS 2 Heartbeat: <strong className="text-emerald-400">NORMAL</strong></span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0d1222] border border-white/10 rounded-lg">
          <Wifi className="w-3.5 h-3.5 text-cyan-400" />
          <span>Offline Buffer: <strong className="text-cyan-400">READY</strong></span>
        </div>
      </div>

      {/* Right User Actions */}
      <div className="flex items-center gap-2">
        {/* Speaker Auto-Talk Button & Voice Selector */}
        <div className="relative flex items-center">
          <button
            onClick={() => {
              const nextVal = !isAutoSpeak;
              if (setIsAutoSpeak) setIsAutoSpeak(nextVal);
              safeStorage.setItem('anny_auto_speak', nextVal.toString());
              if (nextVal) {
                void annyVoiceService.speakConversation("ANNY auto speak active.");
              } else {
                annyVoiceService.stop();
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border ${
              isAutoSpeak
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md shadow-purple-500/20 font-bold'
                : 'text-slate-400 hover:text-white border-white/10 bg-[#0e1322]'
            }`}
            title={isAutoSpeak ? "ANNY Auto-Speak: ENABLED (Click to Mute)" : "ANNY Auto-Speak: DISABLED (Click to Enable Auto-Talk)"}
          >
            {isAutoSpeak ? (
              <>
                <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="hidden sm:inline">Voice: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline text-slate-400">Voice: OFF</span>
              </>
            )}
          </button>

        </div>

        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-8 h-8 rounded-lg bg-[#0e1322] border border-white/15 flex items-center justify-center text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all"
          >
            <User className="w-4 h-4 text-cyan-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute top-full mt-2 right-0 w-48 bg-[#090d1a] border border-white/15 rounded-xl p-1.5 shadow-2xl z-50">
              <div className="px-3 py-2 border-b border-white/10 mb-1">
                <div className="text-xs font-bold text-white truncate">{user?.displayName || 'Neural Operator'}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{user?.email || 'operator@anny.ai'}</div>
              </div>

              {onOpenSettings && (
                <button
                  onClick={() => {
                    onOpenSettings();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white rounded-lg transition-all"
                >
                  <Settings className="w-4 h-4 text-cyan-400" />
                  <span>Settings</span>
                </button>
              )}

              {handleLogout && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

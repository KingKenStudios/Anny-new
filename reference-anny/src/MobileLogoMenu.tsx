import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import logoImg from './assets/logo.png';

const appLogo = logoImg || '/logo.png';

interface MobileLogoMenuProps {
  onToggleMobileMenu?: () => void;
  className?: string;
}

export const MobileLogoMenu: React.FC<MobileLogoMenuProps> = ({
  onToggleMobileMenu,
  className = '',
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Cycles every 4.6 seconds
    const interval = setInterval(() => {
      setIsFlipped((prev) => !prev);
    }, 4600);

    return () => clearInterval(interval);
  }, []);

  return (
    <button
      type="button"
      onClick={onToggleMobileMenu}
      className={`flex items-center gap-2 cursor-pointer group select-none outline-none p-1 rounded-xl bg-[#080b22]/90 border border-cyan-500/30 hover:border-cyan-400/60 transition-colors shadow-[0_0_15px_rgba(0,229,255,0.15)] active:scale-95 shrink-0 ${className}`}
      title="Menu - Tap to toggle navigation"
    >
      {/* 3D Flipping Container */}
      <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0 perspective-1000">
        <div
          className={`w-full h-full relative transition-transform duration-700 ease-in-out preserve-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT SIDE: Logo with Rotating Ring */}
          <div className="absolute inset-0 backface-hidden flex items-center justify-center rounded-lg bg-[#0b1030] border border-cyan-500/40 shadow-[0_0_10px_rgba(0,229,255,0.3)] overflow-hidden">
            <svg
              className="absolute -inset-1 w-10 h-10 sm:w-11 sm:h-11 animate-ring-rotate pointer-events-none"
              viewBox="0 0 500 500"
              fill="none"
            >
              <defs>
                <rect id="mobileTick" x="242" y="6" width="16" height="40" rx="8" />
              </defs>
              <g>
                <use href="#mobileTick" transform="rotate(0 250 250)" style={{ fill: 'hsl(315, 100%, 60%)' }} />
                <use href="#mobileTick" transform="rotate(60 250 250)" style={{ fill: 'hsl(285, 100%, 60%)' }} />
                <use href="#mobileTick" transform="rotate(120 250 250)" style={{ fill: 'hsl(255, 100%, 62%)' }} />
                <use href="#mobileTick" transform="rotate(180 250 250)" style={{ fill: 'hsl(225, 100%, 58%)' }} />
                <use href="#mobileTick" transform="rotate(240 250 250)" style={{ fill: 'hsl(195, 100%, 58%)' }} />
                <use href="#mobileTick" transform="rotate(300 250 250)" style={{ fill: 'hsl(165, 100%, 56%)' }} />
              </g>
              <circle cx="250" cy="250" r="210" stroke="rgba(0, 210, 255, 0.5)" strokeWidth="10" strokeDasharray="20 30" />
            </svg>
            <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain relative z-10" />
          </div>

          {/* BACK SIDE: Hamburger Menu Icon */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center rounded-lg bg-[#0d143a] border border-cyan-400/60 shadow-[0_0_12px_rgba(0,229,255,0.4)]">
            <svg
              className="absolute -inset-1 w-10 h-10 sm:w-11 sm:h-11 animate-spin-reverse-slow pointer-events-none opacity-80"
              viewBox="0 0 500 500"
              fill="none"
            >
              <defs>
                <rect id="menuTick" x="242" y="6" width="16" height="40" rx="8" />
              </defs>
              <g>
                <use href="#menuTick" transform="rotate(0 250 250)" style={{ fill: 'hsl(180, 100%, 60%)' }} />
                <use href="#menuTick" transform="rotate(90 250 250)" style={{ fill: 'hsl(210, 100%, 60%)' }} />
                <use href="#menuTick" transform="rotate(180 250 250)" style={{ fill: 'hsl(240, 100%, 62%)' }} />
                <use href="#menuTick" transform="rotate(270 250 250)" style={{ fill: 'hsl(270, 100%, 58%)' }} />
              </g>
              <circle cx="250" cy="250" r="210" stroke="rgba(0, 229, 255, 0.7)" strokeWidth="12" strokeDasharray="25 25" />
            </svg>
            <Menu className="w-4 h-4 text-cyan-300 animate-pulse relative z-10" />
          </div>
        </div>
      </div>

      {/* Animated Text Label */}
      <span className="text-sm font-black font-heading animate-aios-shift tracking-wider pr-1 pb-0.5 inline-block">
        Anny
      </span>
    </button>
  );
};



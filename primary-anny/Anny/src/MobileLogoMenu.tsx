import React, { useState, useEffect, useId, createContext, useContext } from 'react';
import { Menu, X } from 'lucide-react';
import logoImg from './assets/logo.png';

const appLogo = logoImg || '/logo.png';

const AnnyMenuStateContext = createContext<boolean>(false);

export const AnnyMenuStateProvider: React.FC<{ isOpen: boolean; children: React.ReactNode }> = ({
  isOpen,
  children,
}) => (
  <AnnyMenuStateContext.Provider value={isOpen}>
    {children}
  </AnnyMenuStateContext.Provider>
);

interface MobileLogoMenuProps {
  onToggleMobileMenu?: () => void;
  isMenuOpen?: boolean;
  className?: string;
}

export const MobileLogoMenu: React.FC<MobileLogoMenuProps> = ({
  onToggleMobileMenu,
  isMenuOpen,
  className = '',
}) => {
  const contextMenuOpen = useContext(AnnyMenuStateContext);
  const menuOpen = isMenuOpen ?? contextMenuOpen;

  const [cycleToMenu, setCycleToMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const rawId = useId().replace(/:/g, '');
  const logoTickId = `mobileTick_${rawId}`;
  const menuTickId = `menuTick_${rawId}`;

  useEffect(() => {
    // Pause auto-cycling while hovered or drawer is open so user has deterministic visual feedback
    if (isHovered || menuOpen) return;

    const interval = setInterval(() => {
      setCycleToMenu((prev) => !prev);
    }, 3200);

    return () => clearInterval(interval);
  }, [isHovered, menuOpen]);

  const showMenuFace = menuOpen || isHovered || cycleToMenu;

  return (
    <button
      type="button"
      onClick={onToggleMobileMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
      aria-expanded={menuOpen}
      className={`flex items-center gap-2 cursor-pointer group select-none outline-none p-1 rounded-xl bg-[#080b22]/90 border transition-all duration-300 shadow-[0_0_15px_rgba(0,229,255,0.15)] active:scale-95 shrink-0 ${
        menuOpen
          ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.35)]'
          : 'border-cyan-500/30 hover:border-cyan-400/60'
      } ${className}`}
      title={menuOpen ? 'Close menu' : 'Menu - Tap to toggle navigation'}
    >
      {/* 3D Flipping Logo <-> Menu Badge */}
      <div
        className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0"
        style={{ perspective: '1000px', WebkitPerspective: '1000px' }}
      >
        <div
          className="w-full h-full relative transition-transform duration-700 ease-in-out"
          style={{
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            transform: showMenuFace ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* FRONT SIDE: Logo with Rotating Ring */}
          <div
            className={`absolute inset-0 flex items-center justify-center rounded-lg bg-[#0b1030] border border-cyan-500/40 shadow-[0_0_10px_rgba(0,229,255,0.3)] transition-opacity duration-300 ${
              showMenuFace ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg) translateZ(1px)',
            }}
          >
            <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none flex items-center justify-center">
              <svg
                className="w-10 h-10 sm:w-11 sm:h-11 animate-ring-rotate"
                viewBox="0 0 500 500"
                fill="none"
              >
                <defs>
                  <rect id={logoTickId} x="242" y="6" width="16" height="40" rx="8" />
                </defs>
                <g>
                  <use href={`#${logoTickId}`} transform="rotate(0 250 250)" style={{ fill: 'hsl(315, 100%, 60%)' }} />
                  <use href={`#${logoTickId}`} transform="rotate(60 250 250)" style={{ fill: 'hsl(285, 100%, 60%)' }} />
                  <use href={`#${logoTickId}`} transform="rotate(120 250 250)" style={{ fill: 'hsl(255, 100%, 62%)' }} />
                  <use href={`#${logoTickId}`} transform="rotate(180 250 250)" style={{ fill: 'hsl(225, 100%, 58%)' }} />
                  <use href={`#${logoTickId}`} transform="rotate(240 250 250)" style={{ fill: 'hsl(195, 100%, 58%)' }} />
                  <use href={`#${logoTickId}`} transform="rotate(300 250 250)" style={{ fill: 'hsl(165, 100%, 56%)' }} />
                </g>
                <circle cx="250" cy="250" r="210" stroke="rgba(0, 210, 255, 0.5)" strokeWidth="10" strokeDasharray="20 30" />
              </svg>
            </div>
            <img
              src="/logo.png"
              alt="Anny Logo"
              className="w-5 h-5 object-contain relative z-10"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== appLogo && appLogo) {
                  target.src = appLogo;
                }
              }}
            />
          </div>

          {/* BACK SIDE: Menu Icon with Counter-Rotating Ring */}
          <div
            className={`absolute inset-0 flex items-center justify-center rounded-lg bg-[#0d143a] border border-cyan-400/60 shadow-[0_0_12px_rgba(0,229,255,0.45)] transition-opacity duration-300 ${
              showMenuFace ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg) translateZ(1px)',
            }}
          >
            <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none flex items-center justify-center">
              <svg
                className="w-10 h-10 sm:w-11 sm:h-11 animate-spin-reverse-slow opacity-85"
                viewBox="0 0 500 500"
                fill="none"
              >
                <defs>
                  <rect id={menuTickId} x="242" y="6" width="16" height="40" rx="8" />
                </defs>
                <g>
                  <use href={`#${menuTickId}`} transform="rotate(0 250 250)" style={{ fill: 'hsl(180, 100%, 60%)' }} />
                  <use href={`#${menuTickId}`} transform="rotate(90 250 250)" style={{ fill: 'hsl(210, 100%, 60%)' }} />
                  <use href={`#${menuTickId}`} transform="rotate(180 250 250)" style={{ fill: 'hsl(240, 100%, 62%)' }} />
                  <use href={`#${menuTickId}`} transform="rotate(270 250 250)" style={{ fill: 'hsl(270, 100%, 58%)' }} />
                </g>
                <circle cx="250" cy="250" r="210" stroke="rgba(0, 229, 255, 0.7)" strokeWidth="12" strokeDasharray="25 25" />
              </svg>
            </div>
            {menuOpen ? (
              <X className="w-4 h-4 text-cyan-300 relative z-10" />
            ) : (
              <Menu className="w-4 h-4 text-cyan-300 relative z-10" />
            )}
          </div>
        </div>
      </div>

      {/* Animated Text Label transitioning subtly between Brand & Menu hint */}
      <div className="flex items-center gap-1 pr-1">
        <span className="text-sm font-black font-heading animate-aios-shift tracking-wider pb-0.5 inline-block">
          Anny
        </span>
        <span
          className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md border transition-all duration-300 overflow-hidden ${
            showMenuFace
              ? 'max-w-[54px] opacity-100 border-cyan-400/40 bg-cyan-500/15 text-cyan-300'
              : 'max-w-0 opacity-0 border-transparent px-0'
          }`}
        >
          Menu
        </span>
      </div>
    </button>
  );
};

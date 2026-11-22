import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import '@google/model-viewer';

const ModelViewer = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & Record<string, any>>(
  (props, ref) => React.createElement('model-viewer', { ...props, ref })
);

interface ThreeRobotProps {
  isPulsing: boolean;
  isSpeaking: boolean;
  isRobotMode?: boolean;
  isListening?: boolean;
}

export default function ThreeRobot({ isPulsing, isSpeaking, isRobotMode, isListening }: ThreeRobotProps) {
  const modelRef = useRef<any>(null);
  const [hasError, setHasError] = useState(false);
  const [orbit, setOrbit] = useState("0deg 75deg 115%");

  // Catch model-viewer error events directly on the element
  useEffect(() => {
    const el = modelRef.current;
    if (!el) return;
    const handleError = (e: any) => {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      console.warn("Model Viewer fallback activated:", e?.detail?.type || "load failure");
      setHasError(true);
    };
    el.addEventListener('error', handleError);
    return () => {
      el.removeEventListener('error', handleError);
    };
  }, []);

  // Handle Idle Animation & Speech Focus
  useEffect(() => {
    if (!modelRef.current || hasError) return;

    if (isSpeaking) {
      const interval = setInterval(() => {
        setOrbit(`0deg ${(75 + Math.sin(Date.now() / 100) * 2).toFixed(2)}deg 115%`);
      }, 50);
      return () => clearInterval(interval);
    }

    let sequence = 0;
    const poses = [
      "0deg 75deg 115%",
      "15deg 75deg 115%",
      "0deg 75deg 115%",
      "-15deg 75deg 115%"
    ];

    const animationInterval = setInterval(() => {
      sequence = (sequence + 1) % poses.length;
      setOrbit(poses[sequence]);
    }, 6000);

    return () => clearInterval(animationInterval);
  }, [isSpeaking, hasError]);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden bg-transparent">
      {/* Background Radial Glow */}
      <div className="absolute w-[600px] h-[600px] md:w-[900px] md:h-[900px] bg-sky-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Sci-Fi Circular HUD Grid Lines in Background */}
      <div className="absolute w-[450px] h-[450px] md:w-[680px] md:h-[680px] rounded-full border border-white/5 pointer-events-none flex items-center justify-center animate-spin-slow opacity-60">
        <div className="w-[85%] h-[85%] rounded-full border border-dashed border-white/10 flex items-center justify-center">
          <div className="w-[70%] h-[70%] rounded-full border border-cyan-500/10 flex items-center justify-center">
            <svg className="w-full h-full opacity-30 text-cyan-400" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="1 3" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.4" />
              <line x1="10" y1="50" x2="20" y2="50" stroke="currentColor" strokeWidth="0.5" />
              <line x1="80" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.5" />
              <line x1="50" y1="10" x2="50" y2="20" stroke="currentColor" strokeWidth="0.5" />
              <line x1="50" y1="80" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Floating Constellation Particles */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full opacity-40">
          <circle cx="20%" cy="30%" r="2" fill="#38bdf8" className="animate-pulse" />
          <circle cx="80%" cy="25%" r="1.5" fill="#60a5fa" className="animate-pulse" />
          <circle cx="75%" cy="65%" r="2.5" fill="#38bdf8" />
          <circle cx="25%" cy="70%" r="1" fill="#93c5fd" />
          <line x1="75%" y1="65%" x2="80%" y2="25%" stroke="rgba(56,189,248,0.15)" strokeWidth="1" strokeDasharray="2 4" />
          <line x1="20%" y1="30%" x2="25%" y2="70%" stroke="rgba(56,189,248,0.1)" strokeWidth="1" />
        </svg>
      </div>

      {/* Central 3D Head Container */}
      <div className="relative w-full h-full flex items-center justify-center max-w-4xl max-h-[800px] pointer-events-none">
        {!hasError ? (
          <div className="relative w-[340px] h-[340px] md:w-[500px] md:h-[500px] flex items-center justify-center">
            <ModelViewer
              id="robot-model"
              ref={modelRef}
              src="/model.glb"
              poster="/robot_head_3d.jpg"
              alt="Anny Robot"
              draco-decoder-path="https://www.gstatic.com/draco/versioned/decoders/1.5.5/"
              auto-rotate
              camera-controls
              disable-zoom
              interaction-prompt="none"
              camera-orbit={orbit}
              interpolation-decay="200"
              loading="eager"
              rotation-intensity="1.2"
              style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 45px rgba(14,165,233,0.35))' } as any}
              className="w-full h-full opacity-100 transform-gpu"
              environment-intensity="2.8"
              exposure="1.8"
              shadow-intensity="1"
              environment-image="neutral"
              onError={(e: any) => {
                console.warn("Model Viewer fallback activated:", e?.detail?.type || e?.type || "load failure");
                setHasError(true);
              }}
            >
              <div slot="poster" className="w-full h-full flex items-center justify-center">
                <img 
                  src="/robot_head_3d.jpg" 
                  alt="" 
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; setHasError(true); }}
                  className="w-[85%] h-[85%] object-contain drop-shadow-[0_0_50px_rgba(56,189,248,0.4)] transition-transform duration-700" 
                  referrerPolicy="no-referrer"
                />
              </div>
            </ModelViewer>
          </div>
        ) : (
          <div className="relative w-[320px] h-[320px] md:w-[480px] md:h-[480px] flex items-center justify-center">
            <motion.img 
              src="/robot_head_3d.jpg" 
              alt="" 
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              animate={{ 
                y: [0, -8, 0],
                rotateY: isSpeaking ? [-3, 3, -3] : [0, 0, 0]
              }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="w-full h-full object-contain drop-shadow-[0_0_60px_rgba(56,189,248,0.45)]" 
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* ACTIVE LISTENING Badge (Matching the image exactly on the right side) */}
        <div className="absolute right-[12%] md:right-[18%] top-[45%] flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-lg pointer-events-none z-30">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
          </span>
          <span className="text-[10px] md:text-xs font-mono tracking-widest text-emerald-400 uppercase font-semibold">
            ACTIVE LISTENING
          </span>
        </div>
      </div>
    </div>
  );
}


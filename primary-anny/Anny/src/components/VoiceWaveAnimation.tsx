import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Volume2, Activity, Zap } from 'lucide-react';

interface VoiceWaveAnimationProps {
  isListening: boolean;
  isContinuousListening?: boolean;
  className?: string;
}

export const VoiceWaveAnimation: React.FC<VoiceWaveAnimationProps> = ({
  isListening,
  isContinuousListening = true,
  className = ''
}) => {
  const [audioLevel, setAudioLevel] = useState(0.4);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // The chat's SpeechRecognition instance is the single authoritative microphone
  // capture path. This visualizer must never open a second microphone stream,
  // otherwise browser audio routing can interfere with recognition and produce
  // duplicate permission/capture behavior.
  useEffect(() => {
    if (!isListening) {
      analyserRef.current = null;
      return;
    }
    return () => {
      analyserRef.current = null;
    };
  }, [isListening]);

  // Canvas Real-Time Spectral Wave Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const renderWave = () => {
      let currentIntensity = 0.35;

      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / (dataArray.length || 1);
        currentIntensity = Math.max(0.2, avg / 128);
      } else {
        // Deterministic listening animation fallback. This is visual only and
        // never represents a second microphone capture path.
        currentIntensity = 0.3 + Math.sin(phase * 0.1) * 0.25;
      }

      setAudioLevel(currentIntensity);

      // Render Canvas Bars
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 32;
      const barWidth = width / numBars;

      for (let i = 0; i < numBars; i++) {
        const distance = Math.abs(i - numBars / 2) / (numBars / 2);
        const centerWeight = Math.cos(distance * Math.PI * 0.4);

        const sineComponent = Math.sin(phase * 0.15 + i * 0.3);
        const barHeight = Math.max(6, (height * 0.75) * currentIntensity * centerWeight * (0.6 + sineComponent * 0.4));

        const x = i * barWidth + barWidth * 0.15;
        const y = (height - barHeight) / 2;
        const actualWidth = barWidth * 0.7;

        // Radiant Gradient (Cyan -> Violet -> Purple)
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#38bdf8');
        gradient.addColorStop(0.5, '#a855f7');
        gradient.addColorStop(1, '#6366f1');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, actualWidth, barHeight, 4);
        } else {
          ctx.rect(x, y, actualWidth, barHeight);
        }
        ctx.fill();
      }

      phase += 1;
      animFrameRef.current = requestAnimationFrame(renderWave);
    };

    renderWave();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isListening]);

  if (!isListening && !isContinuousListening) return null;

  return (
    <div
      className={`p-3 rounded-2xl bg-[#090b1c]/90 border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col gap-2 font-mono ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <Mic className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="font-bold text-white tracking-wide">Continuous Listening</span>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-bold">
            SPEECH PROCESSOR ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Intensity: {(audioLevel * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Dynamic Spectral Voice Wave Canvas */}
      <div className="relative w-full h-10 bg-[#050612] border border-white/10 rounded-xl overflow-hidden flex items-center justify-center px-2">
        <canvas ref={canvasRef} width={400} height={40} className="w-full h-full object-cover" />
      </div>

      <div className="flex items-center justify-between text-[9.5px] text-slate-400">
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Listening for spoken instructions...
        </span>
        <span className="text-slate-500">ROS 2 Voice Uplink</span>
      </div>
    </div>
  );
};

export default VoiceWaveAnimation;

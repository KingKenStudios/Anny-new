import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Zap, Activity, Shield, Maximize2, Minimize2, Video, Settings } from 'lucide-react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera as MPCamera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

export default function SkellyCam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [fps, setFps] = useState(0);
  const [status, setStatus] = useState<'IDLE' | 'INITIALIZING' | 'ACTIVE' | 'ERROR'>('IDLE');
  const [metrics, setMetrics] = useState({ poseConfidence: 0, joints: 0 });

  useEffect(() => {
    if (!isActive) return;

    let pose: Pose | null = null;
    let camera: MPCamera | null = null;
    let lastTime = performance.now();
    let frameCount = 0;

    const onResults = (results: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const canvasCtx = canvas.getContext('2d');
      if (!canvasCtx) return;

      // FPS Calculation
      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the video frame darkened for "Shadow Mode"
      canvasCtx.globalAlpha = 0.3;
      canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      canvasCtx.globalAlpha = 1.0;

      if (results.poseLandmarks) {
        setMetrics({
          poseConfidence: results.poseLandmarks[0]?.visibility || 0,
          joints: results.poseLandmarks.length
        });

        // Draw connectors with cyan Glow
        canvasCtx.shadowBlur = 10;
        canvasCtx.shadowColor = '#06b6d4';
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                       { color: '#06b6d4', lineWidth: 2 });
        
        // Draw landmarks
        canvasCtx.shadowBlur = 0;
        drawLandmarks(canvasCtx, results.poseLandmarks,
                      { color: '#ffffff', lineWidth: 1, radius: 2 });
      } else {
        setMetrics({ poseConfidence: 0, joints: 0 });
      }
      canvasCtx.restore();
    };

    const initialize = async () => {
      setStatus('INITIALIZING');
      try {
        pose = new Pose({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          }
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        pose.onResults(onResults);

        if (videoRef.current) {
          camera = new MPCamera(videoRef.current, {
            onFrame: async () => {
              if (pose && videoRef.current) {
                await pose.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480
          });
          await camera.start();
          setStatus('ACTIVE');
        }
      } catch (err) {
        console.warn("[SkellyCam] Camera access permission dismissed or failed:", err);
        setStatus('ERROR');
      }
    };

    initialize();

    return () => {
      if (camera) camera.stop();
      if (pose) pose.close();
    };
  }, [isActive]);

  const toggleSkelly = () => {
    setIsActive(!isActive);
    if (!isActive) setStatus('INITIALIZING');
    else setStatus('IDLE');
  };

  return (
    <div className={`p-6 bg-white/[0.03] border border-white/10 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden transition-all duration-500 ${isMinimized ? 'h-[100px]' : 'min-h-[500px]'}`}>
      
      {/* Background Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(6,182,212,0.1),transparent)] pointer-events-none" />
      
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border transition-colors ${isActive ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
               <Video className="w-5 h-5" />
            </div>
            <div>
               <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none">Skelly_Cam</h2>
               <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-1">Neural_Kinematics v1.0.4 - FreeMoCap Nexus</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
             {isActive && (
               <div className="hidden md:flex items-center gap-4 mr-4 px-4 py-1.5 bg-black/40 border border-white/5 rounded-full">
                  <Metric label="FPS" value={fps.toString()} color="text-cyan-400" />
                  <div className="w-px h-3 bg-white/10" />
                  <Metric label="CONF" value={`${Math.round(metrics.poseConfidence * 100)}%`} color="text-emerald-400" />
                  <div className="w-px h-3 bg-white/10" />
                  <Metric label="JOINTS" value={metrics.joints.toString()} color="text-amber-400" />
               </div>
             )}
             <button 
               onClick={() => setIsMinimized(!isMinimized)}
               className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40"
             >
               {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
             </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex-1 relative bg-black/40 border border-white/5 rounded-3xl overflow-hidden group">
               {/* Hidden source video */}
               <video 
                 ref={videoRef} 
                 className="hidden" 
                 playsInline
                 muted
               />
               
               {/* Output Canvas */}
               <canvas 
                 ref={canvasRef} 
                 width={640} 
                 height={480}
                 className="w-full h-full object-cover scale-x-[-1]"
               />

               {!isActive && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                    <Activity className="w-16 h-16 text-white/10 mb-6" />
                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Neural_Motion_Engaged</h3>
                    <p className="text-white/30 text-[10px] uppercase tracking-widest max-w-xs mb-8">Synchronize vision sensors to extract skeletal matrices for robotic synthesis.</p>
                    <button 
                      onClick={toggleSkelly}
                      className="px-8 py-3 bg-cyan-500 text-black rounded-2xl font-black italic tracking-tight hover:bg-cyan-400 transition-all flex items-center gap-2 uppercase text-xs"
                    >
                      <Zap className="w-4 h-4" /> Link_Skelly_Matrix
                    </button>
                 </div>
               )}

               {status === 'INITIALIZING' && (
                 <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-12 text-center backdrop-blur-sm">
                    <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6" />
                    <h3 className="text-lg font-black uppercase italic tracking-tighter animate-pulse text-cyan-400">Loading_Kinetics_Core</h3>
                    <p className="text-white/20 text-[9px] uppercase tracking-[0.3em] mt-4 font-bold">Allocating Neural Buffer | {fps} Synapses/sec</p>
                 </div>
               )}

               {status === 'ERROR' && (
                 <div className="absolute inset-0 bg-red-950/20 flex flex-col items-center justify-center p-12 text-center backdrop-blur-xl">
                    <Shield className="w-12 h-12 text-red-500 mb-6" />
                    <h3 className="text-lg font-black uppercase tracking-tighter text-red-400">Vision_Link_Severed</h3>
                    <p className="text-white/40 text-[9px] uppercase tracking-widest mt-2">{`Critical Error: Hardware Response 403`}</p>
                    <button 
                      onClick={() => setStatus('IDLE')}
                      className="mt-6 px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                    >
                      Retry_Re-Link
                    </button>
                 </div>
               )}

               {/* Overlay Hud Elements */}
               {isActive && status === 'ACTIVE' && (
                 <>
                   <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                      <div className="flex items-center gap-2 px-2 py-1 bg-black/60 rounded-lg border border-white/5">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[8px] font-black text-white/60 tracking-widest uppercase">REC_LIVE</span>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1 bg-black/60 rounded-lg border border-white/5">
                        <span className="text-[8px] font-black text-cyan-500 tracking-widest uppercase italic">X: +2.14 Y: -0.84 Z: 1.22</span>
                      </div>
                   </div>

                   <div className="absolute bottom-4 right-4 flex gap-2">
                       <button 
                         onClick={toggleSkelly}
                         className="p-2.5 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/40 transition-all"
                       >
                         <Shield className="w-4 h-4" />
                       </button>
                       <button className="p-2.5 bg-black/60 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all">
                         <Settings className="w-4 h-4" />
                       </button>
                   </div>
                 </>
               )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <ControlBit icon={Shield} label="Stability" value="0.984" />
               <ControlBit icon={Zap} label="Response" value="2MS" />
               <ControlBit icon={Activity} label="Pulse" value="OPTIMAL" />
               <button 
                 onClick={toggleSkelly}
                 className={`p-4 rounded-3xl border flex flex-col gap-2 transition-all ${isActive ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'}`}
               >
                 <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{isActive ? 'Deactivate' : 'Initialize'}</span>
                 <span className="text-xs font-black uppercase italic tracking-tighter">{isActive ? 'Cut_Link' : 'Boot_Skelly'}</span>
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-black tracking-widest text-white/20 uppercase">{label}:</span>
      <span className={`text-[10px] font-black uppercase ${color}`}>{value}</span>
    </div>
  );
}

function ControlBit({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col gap-2">
       <div className="flex justify-between items-center opacity-30">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-[7px] font-black tracking-[0.2em] uppercase">{label}</span>
       </div>
       <span className="text-xs font-black uppercase italic tracking-tight text-white/60">{value}</span>
    </div>
  );
}

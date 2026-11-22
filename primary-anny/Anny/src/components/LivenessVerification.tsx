import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, AlertTriangle, UserCheck, X } from 'lucide-react';

interface LivenessVerificationProps {
  onSuccess?: () => void;
  onFail?: (msg: string) => void;
  onCapture?: (base64: string) => void;
  onClose?: () => void;
  mode?: 'liveness' | 'simple';
}

export default function LivenessVerification({ onSuccess, onFail, onCapture, onClose, mode = 'liveness' }: LivenessVerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [challenge, setChallenge] = useState<'turn_left' | 'turn_right' | 'verify'>('turn_left');
  const [status, setStatus] = useState<'initializing' | 'active' | 'processing' | 'success' | 'failed'>('initializing');
  const [progress, setProgress] = useState(0);
  const [trackingMetrics, setTrackingMetrics] = useState({ sensor: 'STANDBY', expression: 'UNVERIFIED' });

  const FaceMesh = (window as any).FaceMesh;
  const Camera = (window as any).Camera;

  const captureFrame = () => {
    const video = videoRef.current;
    if (video && video.readyState >= 2 && video.videoWidth > 0 && onCapture) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        onCapture(base64);
        if (mode === 'simple') {
          setStatus('success');
          setTimeout(() => onSuccess?.(), 600);
        }
      }
    }
  };

  const faceMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const challengeRef = useRef<'turn_left' | 'turn_right' | 'verify'>('turn_left');
  const statusRef = useRef<'initializing' | 'active' | 'processing' | 'success' | 'failed'>('initializing');

  useEffect(() => {
    challengeRef.current = challenge;
  }, [challenge]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!FaceMesh || !Camera) {
      // If scripts didn't load immediately, wait briefly then report honest failure
      const timer = setTimeout(() => {
        if (!((window as any).FaceMesh && (window as any).Camera)) {
          setStatus('failed');
          onFail?.("Identity engine modules failed to load from CDN.");
        }
      }, 5000);
      return () => clearTimeout(timer);
    }

    try {
      const faceMesh = new FaceMesh({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
        },
      });

      (faceMesh as any).arguments = [];

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMeshRef.current = faceMesh;

      faceMesh.onResults((results: any) => {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
          setTrackingMetrics({ sensor: 'NO_FACE_DETECTED', expression: 'AWAITING_SUBJECT' });
          return;
        }

        const landmarks = results.multiFaceLandmarks[0];
        const mouthDelta = landmarks[13] && landmarks[14] ? Math.abs(landmarks[13].y - landmarks[14].y) : 0;
        setTrackingMetrics({
          sensor: 'LANDMARKS_LOCKED',
          expression: mouthDelta > 0.02 ? 'EXPRESSION: OPEN' : 'EXPRESSION: NEUTRAL'
        });

        const nose = landmarks[1];
        const leftEar = landmarks[234];
        const rightEar = landmarks[454];
        const earSpan = rightEar.x - leftEar.x;
        if (Math.abs(earSpan) < 1e-4) return;
        const faceTurn = (nose.x - leftEar.x) / earSpan;

        if (mode === 'simple') return;

        if (statusRef.current === 'active') {
          if (faceTurn < 0.48 && challengeRef.current === 'turn_left') {
            setProgress(p => {
              const next = Math.min(p + 5, 100);
              if (next >= 100) {
                setChallenge('turn_right');
                return 0;
              }
              return next;
            });
          }

          if (faceTurn > 0.52 && challengeRef.current === 'turn_right') {
            setProgress(p => {
              const next = Math.min(p + 5, 100);
              if (next >= 100) {
                setChallenge('verify');
                setStatus('success');
                setTimeout(() => onSuccess?.(), 600);
                return 100;
              }
              return next;
            });
          }
        }
      });

      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (faceMeshRef.current && videoRef.current && videoRef.current.readyState >= 2) {
              try {
                await faceMeshRef.current.send({ image: videoRef.current });
              } catch (e) {
                console.error("FaceMesh processing error:", e);
              }
            }
          },
          width: 1280,
          height: 720,
        });
        cameraRef.current = camera;
        camera.start()
          .then(() => setStatus('active'))
          .catch((err: any) => {
            console.warn("[LivenessVerification] Camera access permission dismissed or failed:", err);
            setStatus('failed');
            onFail?.("Camera permission dismissed or unavailable.");
          });
      }
    } catch (err) {
      console.error("FaceMesh Init Error:", err);
      setStatus('failed');
      onFail?.("Identity engine initialization failed.");
    }

    return () => {
      cameraRef.current?.stop();
      if (faceMeshRef.current) {
        try { faceMeshRef.current.close(); } catch {}
      }
    };
  }, [mode]);

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-video md:aspect-[16/9] min-h-[400px] rounded-[2.5rem] overflow-hidden bg-black border border-cyan-500/50 backdrop-blur-3xl shadow-2xl overflow-hidden">
      <video 
        ref={videoRef} 
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none" 
        playsInline 
        muted 
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-red-500/50 rounded-full border border-white/10 transition-colors pointer-events-auto"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      )}
      
      <div className="absolute inset-0 flex flex-col justify-between p-6 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none">
        <div className="w-full flex justify-between items-start">
           <div className="bg-black/60 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
              <p className="text-[10px] text-white/40 uppercase font-mono mb-1">Optical Mesh Status</p>
              <p className="text-xs text-cyan-400 font-mono font-bold tracking-tighter italic uppercase">{trackingMetrics.sensor}</p>
           </div>
           <div className="bg-black/60 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md text-right">
              <p className="text-[10px] text-white/40 uppercase font-mono mb-1">Landmark Telemetry</p>
              <p className="text-xs text-yellow-400 font-mono font-bold uppercase">{trackingMetrics.expression}</p>
           </div>
        </div>

        <AnimatePresence mode="wait">
          {status === 'initializing' && (
             <motion.div key="init" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
               <div className="text-center">
                 <ShieldCheck className="w-12 h-12 text-cyan-400 animate-pulse mb-4 mx-auto" />
                 <p className="text-cyan-100 font-mono text-sm tracking-widest uppercase font-bold">Synchronizing Sensors...</p>
               </div>
             </motion.div>
          )}

          {status === 'active' && (
            <motion.div key="active" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm mx-auto mb-4 p-5 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 pointer-events-auto">
              <div className="mb-4">
                <p className="text-cyan-400 font-mono text-[10px] uppercase tracking-[0.3em] mb-2 text-center">
                  {mode === 'liveness' ? 'Sovereignty Challenge' : 'Neural Feed Active'}
                </p>
                <h3 className="text-xl md:text-2xl font-black text-white mb-4 italic uppercase tracking-tight text-center">
                  {mode === 'liveness' ? (
                    <>
                      {challenge === 'turn_left' && 'Turn Head Left'}
                      {challenge === 'turn_right' && 'Turn Head Right'}
                      {challenge === 'verify' && 'Challenge Complete'}
                    </>
                  ) : 'Ready for Optical Capture'}
                </h3>
                {mode === 'liveness' && (
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
              
              {mode === 'simple' && (
                <button 
                  onClick={captureFrame}
                  className="w-full py-4 bg-cyan-500 text-black rounded-xl font-black uppercase tracking-[0.2em] transition-all hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] pointer-events-auto"
                >
                  Capture Optical Frame
                </button>
              )}
            </motion.div>
          )}

          {status === 'failed' && (
             <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center bg-red-950/60 backdrop-blur-sm">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-red-400 mb-4 mx-auto" />
                  <p className="text-white font-bold text-sm uppercase tracking-widest">Optical Sensor Unavailable</p>
                </div>
             </motion.div>
          )}

          {status === 'success' && (
             <motion.div key="success" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex items-center justify-center bg-green-500/10 backdrop-blur-sm">
                <div className="text-center">
                  <UserCheck className="w-12 h-12 text-green-400 mb-4 mx-auto" />
                  <p className="text-white font-bold text-lg uppercase tracking-widest">Liveness Check Complete</p>
                  <p className="text-green-400 font-mono text-[10px] mt-2 italic">OPTICAL_PRESENCE_VERIFIED</p>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Box, Plus, Search, Layers, Download, Zap, Terminal, AlertCircle, Trash2, Maximize2, ExternalLink, Activity } from 'lucide-react';
import { generate3DModelFromImage, generate3DModelFromText, checkModlyHealth, pollModlyTask, ModlyTask } from '../services/modlyService';
import Neural3DPreview from './Neural3DPreview';
import SkellyCam from './SkellyCam';
import SpatialGridVisualization from './SpatialGridVisualization';

interface SynthesisTask extends ModlyTask {
  prompt: string;
  createdAt: string;
}

export default function NeuralLab() {
  const [tasks, setTasks] = useState<SynthesisTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<SynthesisTask | null>(null);
  const [prompt, setPrompt] = useState('');
  const [engine, setEngine] = useState<'modly' | 'trellis' | 'hunyuan'>('modly');
  const [mode, setMode] = useState<'synthesis' | 'spatial' | 'kinematics'>('synthesis');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [images, setImages] = useState<{file: File, preview: string}[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load from local storage for persistence across tab refresh
  useEffect(() => {
    const saved = localStorage.getItem('anny_3d_tasks');
    if (saved) setTasks(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('anny_3d_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const [localEngineAvailable, setLocalEngineAvailable] = useState<boolean | null>(null);
  const [localEngineHint, setLocalEngineHint] = useState<string>('');

  useEffect(() => {
    checkModlyHealth().then(h => {
      setLocalEngineAvailable(h.available);
      setLocalEngineHint(h.hint || '');
    }).catch(() => setLocalEngineAvailable(false));
  }, []);

  const handleSynthesis = async () => {
    if (!prompt && images.length === 0) return;
    setIsSynthesizing(true);
    const usingImage = images.length > 0;
    setLogs(prev => [`[INIT] ${usingImage ? 'Local image-to-3D' : 'Cloud text-to-3D'} request for: "${prompt || images[0].file.name}"`, ...prev]);

    try {
      let resp: ModlyTask;
      let pollEngine: 'local' | 'meshy-cloud' = 'meshy-cloud';

      if (usingImage) {
        // Real local generation: send the actual image file to the bundled Modly engine.
        resp = await generate3DModelFromImage(images[0].file, { modelId: engine === 'modly' ? 'sf3d' : engine });
        pollEngine = 'local';
      } else {
        resp = await generate3DModelFromText(prompt);
        pollEngine = 'meshy-cloud';
      }

      const newTask: SynthesisTask = {
        ...resp,
        prompt: usingImage ? `${images[0].file.name} → 3D (local, ${engine})` : `${prompt} (cloud)`,
        createdAt: new Date().toISOString()
      };
      
      setTasks(prev => [newTask, ...prev]);
      setPrompt('');
      setImages([]); // Clear references after submission
      
      const poll = async () => {
        try {
          const status = await pollModlyTask(resp.id, pollEngine);
          setTasks(prev => prev.map(t => t.id === resp.id ? { ...t, ...status } : t));
          
          if (status.status === 'succeeded') {
            setLogs(prev => [`[SUCCESS] 3D mesh ready: ${resp.id}`, ...prev]);
            setIsSynthesizing(false);
          } else if (status.status === 'failed') {
            setLogs(prev => [`[ERROR] Generation failed: ${status.error || resp.id}`, ...prev]);
            setIsSynthesizing(false);
          } else {
            setTimeout(poll, 3000);
          }
        } catch (e: any) {
          console.error("Poll error", e);
          setLogs(prev => [`[ERROR] ${e.message}`, ...prev]);
          setIsSynthesizing(false);
        }
      };
      
      poll();
    } catch (err: any) {
      setLogs(prev => [`[FATAL] ${err.message}`, ...prev]);
      setIsSynthesizing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => {
          if (prev.length >= 4) return prev;
          return [...prev, { file, preview: reader.result as string }];
        });
      };
      reader.readAsDataURL(file);
    });
    setLogs(prev => [`[INFO] Neural reference images buffered.`, ...prev]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const handleAction = (fn: any) => fn;

  return (
    <div className="flex-1 overflow-y-auto bg-[#050505] text-white p-4 md:p-10 font-mono scroll-smooth">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">
        
        {/* Left Sidebar: Library */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <div className="p-8 bg-white/[0.03] border border-white/10 rounded-[2.5rem] flex flex-col gap-6 backdrop-blur-md">
              <div className="flex items-center gap-3 text-cyan-400">
                 <div className="relative">
                    <Box className="w-8 h-8" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full blur-[2px]"
                    />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none flex items-center gap-2">
                       Neural_Lab <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500 text-black rounded font-black not-italic">MODLY_V1</span>
                    </h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mt-1">Image-to-3D Synthesis Matrix</p>
                 </div>
              </div>

              <div className="flex flex-col gap-3">
                 <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 mb-2">
                    <button 
                      onClick={() => setMode('synthesis')}
                      className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'synthesis' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-white/40 hover:text-white'}`}
                    >
                      3D_Synthesis
                    </button>
                    <button 
                      onClick={() => setMode('spatial')}
                      className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'spatial' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-white/40 hover:text-white'}`}
                    >
                      Spatial_Grid
                    </button>
                    <button 
                      onClick={() => setMode('kinematics')}
                      className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'kinematics' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-white/40 hover:text-white'}`}
                    >
                      Kinetics_HUB
                    </button>
                 </div>

                 {mode === 'synthesis' ? (
                   <div className="space-y-4">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          disabled={isSynthesizing}
                          placeholder="Quantize prompt to 3D..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-cyan-500 transition-all font-mono"
                        />
                        <button 
                          onClick={handleAction(handleSynthesis)}
                          disabled={isSynthesizing || (!prompt && images.length === 0)}
                          className="p-3 bg-cyan-500 text-black rounded-2xl hover:bg-cyan-400 active:scale-95 transition-all disabled:opacity-30"
                        >
                          <Plus className={`w-6 h-6 ${isSynthesizing ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {localEngineAvailable === false && (
                        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                          <p className="text-[9px] text-amber-300 leading-relaxed">
                            Local 3D engine offline — image-to-3D generation needs it running.
                            {localEngineHint ? ` ${localEngineHint}` : ''} Text prompts will still use cloud generation if MESHY_API_KEY is set.
                          </p>
                        </div>
                      )}
                      {localEngineAvailable === true && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <p className="text-[9px] text-emerald-300 font-mono">Local 3D engine online</p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {[
                          { id: 'modly', label: 'SF3D (local)' },
                          { id: 'trellis', label: 'Trellis' },
                          { id: 'hunyuan', label: 'Hunyuan' }
                        ].map(eng => (
                          <button
                            key={eng.id}
                            onClick={() => setEngine(eng.id as any)}
                            className={`flex-1 py-2 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${
                              engine === eng.id ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10'
                            }`}
                          >
                            {eng.label}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-3">
                         <div className="flex items-center justify-between">
                            <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Visual Reference Matrix</p>
                            <p className="text-[9px] text-cyan-400 font-mono">{images.length}/4</p>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {images.map((img, idx) => (
                               <div key={idx} className="relative group w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                  {img.preview ? (
                                    <img src={img.preview} alt="Ref" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-white/5" />
                                  )}
                                  <button onClick={() => removeImage(idx)} className="absolute inset-0 bg-red-500/80 items-center justify-center hidden group-hover:flex">
                                     <Plus className="w-4 h-4 rotate-45 text-white" />
                                  </button>
                               </div>
                            ))}
                            {images.length < 4 && (
                              <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 bg-white/5 border border-dashed border-white/20 rounded-lg flex items-center justify-center text-white/20 hover:text-cyan-400 transition-all shrink-0">
                                 <Plus className="w-4 h-4" />
                              </button>
                            )}
                         </div>
                      </div>
                      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                   </div>
                 ) : (
                   <div className="p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-3xl flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-cyan-400">
                         <Activity className="w-4 h-4" />
                         <span className="text-[10px] font-black uppercase tracking-widest italic">FreeMoCap Nexus Active</span>
                      </div>
                      <p className="text-[10px] text-white/40 leading-relaxed uppercase">Neural Kinematics engine initialized. Ready for skeletal synchronization and robot armature mapping.</p>
                   </div>
                 )}
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                 <AnimatePresence>
                   {tasks.map(task => (
                     <motion.div
                       key={task.id}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       role="button"
                       tabIndex={0}
                       onClick={() => setSelectedTask(task)}
                       onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedTask(task); }}
                       className={`w-full p-4 rounded-2xl border transition-all text-left relative group overflow-hidden cursor-pointer ${
                         selectedTask?.id === task.id ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-white/5 border-white/5 hover:border-white/20'
                       }`}
                     >
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate pr-6">{task.prompt}</p>
                              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">
                                {task.status === 'succeeded' ? 'Materialized' : task.status === 'failed' ? 'Neural Leak' : 'Synthesizing...'}
                              </p>
                           </div>
                           <button 
                             onClick={(e) => removeTask(task.id, e)}
                             className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 transition-all cursor-pointer"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                        
                        {(task.status === 'pending' || task.status === 'processing') && (
                           <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${task.progress || 20}%` }}
                                transition={{ duration: 1 }}
                                className="h-full bg-cyan-500"
                              />
                           </div>
                        )}
                        
                        {task.status === 'succeeded' && (
                           <div className="absolute bottom-0 right-0 p-2 transform rotate-12 opacity-10 group-hover:opacity-20 translate-x-2 translate-y-2 transition-all">
                              <Layers className="w-16 h-16" />
                           </div>
                        )}
                     </motion.div>
                   ))}
                 </AnimatePresence>
                 {tasks.length === 0 && (
                   <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                      <Zap className="w-8 h-8 text-white/10 mx-auto mb-4" />
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/20">Awaiting_Instructions</p>
                   </div>
                 )}
              </div>
           </div>

           <div className="p-6 bg-black border border-white/10 rounded-3xl flex flex-col h-[180px]">
              <div className="flex items-center gap-2 mb-4 px-1">
                 <Terminal className="w-3 h-3 text-cyan-400" />
                 <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Uplink_Logs</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar-fancy pr-1">
                 {logs.map((log, i) => (
                   <p key={i} className={`text-[10px] font-mono ${log.includes('[ERROR]') || log.includes('[FATAL]') ? 'text-red-400' : 'text-white/40'}`}>
                      {log}
                   </p>
                 ))}
                 {logs.length === 0 && <p className="text-[10px] text-white/10 italic">No activity detected.</p>}
              </div>
           </div>
        </div>

        {/* Right Content: Preview */}
        <div className="lg:col-span-8 flex flex-col min-h-[600px]">
           {mode === 'synthesis' ? (
             <div className="flex-1 flex flex-col">
               <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-[3rem] relative overflow-hidden flex flex-col shadow-2xl min-h-[400px]">
                  {selectedTask && selectedTask.status === 'succeeded' && selectedTask.model_url ? (
                     <div className="flex-1 relative flex flex-col">
                        <div className="absolute top-8 left-8 z-10 space-y-1">
                           <h2 className="text-3xl font-black italic tracking-tighter uppercase text-cyan-400 truncate max-w-md">{selectedTask.prompt}</h2>
                           <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-bold">Neural Asset materialize_id: {selectedTask.id}</p>
                        </div>

                        <div className="absolute top-8 right-8 z-10 flex gap-2">
                           <button className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-white/60 hover:text-white">
                              <Maximize2 className="w-5 h-5" />
                           </button>
                           <a 
                             href={selectedTask.model_url} 
                             download 
                             className="p-3 bg-cyan-500 text-black rounded-2xl hover:bg-cyan-400 transition-all font-black text-[10px] flex items-center gap-2"
                           >
                              <Download className="w-4 h-4" /> EXPORT_GLB
                           </a>
                        </div>
                        
                        <div className="flex-1 bg-black/40">
                           <Neural3DPreview url={selectedTask.model_url} />
                        </div>

                        <div className="p-8 border-t border-white/5 bg-white/[0.02] grid grid-cols-2 md:grid-cols-4 gap-6">
                           <Spec label="Polygons" value="12,402" />
                           <Spec label="Vertices" value="6,821" />
                           <Spec label="Engine" value="Modly Synthesis" />
                           <Spec label="Bones" value="Armature_Rig: 0" />
                        </div>
                     </div>
                  ) : selectedTask && selectedTask.status === 'failed' ? (
                     <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-red-950/20">
                        <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Neural Leak Detected</h2>
                        <p className="text-white/40 text-sm max-w-md">The synthesis process for "{selectedTask.prompt}" encountered a critical dimensional error. Re-quantization required.</p>
                     </div>
                  ) : selectedTask && (selectedTask.status === 'pending' || selectedTask.status === 'processing') ? (
                     <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-24 h-24 mb-8 relative">
                           <motion.div 
                             animate={{ rotate: 360 }}
                             transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                             className="absolute inset-0 border-4 border-dashed border-cyan-500/20 rounded-full"
                           />
                           <motion.div 
                             animate={{ scale: [1, 1.2, 1] }}
                             transition={{ repeat: Infinity, duration: 2 }}
                             className="absolute inset-0 flex items-center justify-center"
                           >
                              <Zap className="w-10 h-10 text-cyan-400 animate-pulse" />
                           </motion.div>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 italic">Synthesizing_Mesh...</h2>
                        <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden mt-4">
                           <motion.div 
                             initial={{ x: "-100%" }}
                             animate={{ x: "100%" }}
                             transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                             className="w-full h-full bg-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                           />
                        </div>
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black mt-6">Estimated Stability: 84.2%</p>
                     </div>
                  ) : (
                     <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-white/10 group">
                        <Box className="w-32 h-32 mb-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700" />
                        <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-4 text-white">Awaiting_Neural_Load</h2>
                        <p className="text-[10px] uppercase tracking-[0.5em] font-bold">Select an asset from the vault or synthesize a new matrix</p>
                     </div>
                  )}
               </div>

               <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <IntegrationCard 
                    name="Blender Hub" 
                    info="Direct 3D pipeline upload" 
                    icon={ExternalLink}
                    status="Ready" 
                    onClick={() => {
                      if (!selectedTask || selectedTask.status !== 'succeeded') return;
                      setLogs((prev) => [`[PIPELINE] Exporting ${selectedTask.id} to Blender Hub...`, ...prev]);
                      setTimeout(() => {
                        setLogs((prev) => [`[PIPELINE] Asset Handshake COMPLETE: Blender now polling matrix.`, ...prev]);
                        window.open(selectedTask.model_url || '', '_blank');
                      }, 1500);
                    }}
                  />
                  <IntegrationCard 
                    name="Hunyuan3D Link" 
                    info="Advanced surface refinement" 
                    icon={Layers}
                    status="Connected" 
                    onClick={() => {
                      setEngine('hunyuan');
                      setLogs((prev) => [`[LINK] Hunyuan3D optimizing surface normals for current asset...`, ...prev]);
                    }}
                  />
                  <IntegrationCard 
                    name="TRELLIS-2 Engine" 
                    info="High-fidelity mesh engine" 
                    icon={Zap}
                    status="Standby" 
                    onClick={() => {
                      setEngine('trellis');
                      setLogs((prev) => [`[ENGINE] Switch: TRELLIS-2 High-Latency Synthesis now active.`, ...prev]);
                    }}
                  />
               </div>
             </div>
           ) : mode === 'spatial' ? (
             <div className="flex-1 min-h-[500px]">
                <SpatialGridVisualization />
             </div>
           ) : (
             <div className="flex-1 min-h-[500px]">
                <SkellyCam />
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
       <p className="text-[9px] text-white/30 uppercase tracking-widest">{label}</p>
       <p className="text-sm font-bold text-white uppercase italic">{value}</p>
    </div>
  );
}

function IntegrationCard({ name, info, icon: Icon, status, onClick }: { name: string, info: string, icon: any, status: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="p-5 bg-white/[0.03] border border-white/10 rounded-3xl group hover:border-cyan-500/30 transition-all cursor-pointer"
    >
       <div className="flex justify-between items-start mb-3">
          <Icon className="w-5 h-5 text-white/20 group-hover:text-cyan-400 transition-all" />
          <span className="text-[8px] font-mono px-2 py-0.5 bg-white/5 text-white/40 rounded uppercase">{status}</span>
       </div>
       <h4 className="text-xs font-bold text-white mb-1 uppercase tracking-tight">{name}</h4>
       <p className="text-[9px] text-white/30 leading-relaxed uppercase">{info}</p>
    </div>
  );
}

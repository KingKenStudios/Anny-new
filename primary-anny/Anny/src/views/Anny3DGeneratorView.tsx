import React, { useEffect, useState } from 'react';
import { Box, Cpu, Cloud, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Download, ExternalLink, Menu, StopCircle } from 'lucide-react';
import { checkModlyHealth, cancelLocalModlyTask, generate3DModelFromImage, generate3DModelFromText, generate3DModelFromTextLocal, pollModlyTask, type ModlyHealth, type ModlyTask } from '../services/modlyService';
import Neural3DPreview from '../components/Neural3DPreview';

type GenerationMode = 'local' | 'cloud';

const isTerminal = (status: ModlyTask['status'] | string) => ['succeeded', 'failed', 'cancelled'].includes(status);

export const Anny3DGeneratorView: React.FC<{ onToggleMobileMenu?: () => void }> = ({ onToggleMobileMenu }) => {
  const [prompt, setPrompt] = useState('');
  const [sourceMode, setSourceMode] = useState<'text' | 'image'>('text');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mode, setMode] = useState<GenerationMode>('local');
  const [health, setHealth] = useState<ModlyHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [task, setTask] = useState<ModlyTask | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshHealth = async () => {
    setHealthLoading(true);
    try {
      setHealth(await checkModlyHealth());
    } catch {
      setHealth({ available: false, engine: 'local', url: '', hint: 'The local Modly health endpoint could not be reached.' });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => { void refreshHealth(); }, []);

  useEffect(() => {
    if (!uploadedImage) { setImagePreview(null); return; }
    const url = URL.createObjectURL(uploadedImage);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadedImage]);

  useEffect(() => {
    if (!task?.id || isTerminal(task.status)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const next = await pollModlyTask(task.id, task.engine === 'meshy-cloud' ? 'meshy-cloud' : 'local');
        if (cancelled) return;
        setTask(next);
        if (!isTerminal(next.status)) timer = setTimeout(poll, 2500);
      } catch (err) {
        if (!cancelled) {
          setTask(previous => previous ? { ...previous, status: 'failed', error: err instanceof Error ? err.message : 'Unable to poll generation status.' } : previous);
        }
      }
    };

    timer = setTimeout(poll, 1200);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [task?.id, task?.engine, task?.status]);

  const submit = async () => {
    const clean = prompt.trim();
    if ((sourceMode === 'text' && !clean) || (sourceMode === 'image' && !uploadedImage) || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setTask(null);
    try {
      const result = sourceMode === 'image'
        ? await generate3DModelFromImage(uploadedImage!)
        : mode === 'local'
          ? await generate3DModelFromTextLocal(clean)
          : await generate3DModelFromText(clean);
      setTask(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '3D generation could not start.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelTask = async () => {
    if (!task?.id || task.engine !== 'local' || isCancelling) return;
    setIsCancelling(true);
    try {
      const cancelled = await cancelLocalModlyTask(task.id);
      if (cancelled) setTask(previous => previous ? { ...previous, status: 'cancelled', step: 'Cancelled by user' } : previous);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel this generation job.');
    } finally {
      setIsCancelling(false);
    }
  };

  const active = Boolean(task && !isTerminal(task.status));
  const statusLabel = task?.status === 'succeeded' ? 'Model ready'
    : task?.status === 'failed' ? 'Generation failed'
    : task?.status === 'cancelled' ? 'Cancelled'
    : task?.status === 'running' || task?.status === 'processing' ? 'Generating'
    : task ? 'Queued' : 'Idle';

  return (
    <div className="h-full w-full overflow-y-auto bg-[#040612] text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center gap-3">
          {onToggleMobileMenu && <button onClick={onToggleMobileMenu} className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white" aria-label="Open menu"><Menu className="h-5 w-5" /></button>}
          <div>
            <div className="flex items-center gap-2 text-cyan-300"><Box className="h-5 w-5" /><span className="text-xs font-mono uppercase tracking-[0.2em]">ANNY 3D Fabrication</span></div>
            <h1 className="mt-1 text-2xl font-bold text-white">Text-to-3D Generator</h1>
            <p className="mt-1 text-sm text-slate-400">Create a reference image and turn it into a mesh, or use the configured cloud text-to-3D provider.</p>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
          <div className="rounded-2xl border border-white/10 bg-[#080b22] p-5 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSourceMode('text')} className={`rounded-xl border p-3 text-left ${sourceMode === 'text' ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 bg-white/[0.02]'}`}><span className="block text-sm font-semibold">Text prompt</span><span className="block mt-1 text-[10px] text-slate-500">Create a reference first</span></button>
              <button onClick={() => setSourceMode('image')} className={`rounded-xl border p-3 text-left ${sourceMode === 'image' ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 bg-white/[0.02]'}`}><span className="block text-sm font-semibold">Image upload</span><span className="block mt-1 text-[10px] text-slate-500">Reconstruct from a photo</span></button>
            </div>
            <div className={`grid grid-cols-2 gap-2 ${sourceMode === 'image' ? 'opacity-50' : ''}`}>
              <button disabled={sourceMode === 'image'} onClick={() => setMode('local')} className={`rounded-xl border p-3 text-left ${mode === 'local' ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 bg-white/[0.02]'}`}><Cpu className="h-4 w-4 text-cyan-300" /><span className="block mt-2 text-sm font-semibold">Local / Offline</span><span className="block mt-1 text-[10px] text-slate-500">No cloud fallback</span></button>
              <button disabled={sourceMode === 'image'} onClick={() => setMode('cloud')} className={`rounded-xl border p-3 text-left ${mode === 'cloud' ? 'border-violet-400/50 bg-violet-400/10' : 'border-white/10 bg-white/[0.02]'}`}><Cloud className="h-4 w-4 text-violet-300" /><span className="block mt-2 text-sm font-semibold">Cloud</span><span className="block mt-1 text-[10px] text-slate-500">Meshy provider</span></button>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
              {healthLoading ? <div className="flex items-center gap-2 text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking local Modly engine…</div>
                : health?.available ? <div className="flex items-center gap-2 text-emerald-300"><CheckCircle2 className="h-4 w-4" />Local mesh engine reachable</div>
                : <div className="flex items-start gap-2 text-amber-300"><AlertTriangle className="h-4 w-4 shrink-0" /><span>Local mesh engine unavailable. {health?.hint || 'Start the Modly local API.'}</span></div>}
              {health?.available && <div className={`mt-2 text-[11px] ${health.localRasterConfigured ? 'text-amber-300' : 'text-slate-500'}`}>Local text-reference stage: {health.localRasterConfigured ? 'configured, but not live-tested' : 'not configured (image mode still works)'}</div>}
              <button onClick={() => void refreshHealth()} className="mt-2 flex items-center gap-1 text-slate-500 hover:text-white"><RefreshCw className="h-3 w-3" />Refresh status</button>
            </div>

            {sourceMode === 'text' ? <>
              <label className="block text-sm font-medium text-slate-300">Describe the object</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={4000} rows={7} placeholder="A compact industrial gearbox with a steel housing, visible shafts and mounting brackets…" className="w-full resize-y rounded-xl border border-white/10 bg-[#050817] p-3 text-sm text-white outline-none focus:border-cyan-400/50" />
              <div className="flex justify-between text-[10px] text-slate-500"><span>Be specific about form, materials and parts.</span><span>{prompt.length}/4000</span></div>
            </> : <>
              <label className="block text-sm font-medium text-slate-300">Reference image (PNG, JPEG or WebP)</label>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => {
                const file = e.target.files?.[0] || null;
                if (file && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Select a PNG, JPEG, or WebP image.'); setUploadedImage(null); e.currentTarget.value = ''; return; }
                if (file && file.size > 25 * 1024 * 1024) { setError('Image must be 25 MB or smaller.'); setUploadedImage(null); e.currentTarget.value = ''; return; }
                setError(null);
                setUploadedImage(file);
              }} className="w-full rounded-xl border border-white/10 bg-[#050817] p-3 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-3 file:py-2 file:text-cyan-200" />
              {imagePreview && <img src={imagePreview} alt="Selected 3D reconstruction reference" className="max-h-48 w-full rounded-xl border border-white/10 object-contain bg-black/20" />}
              {uploadedImage && <p className="text-[10px] text-slate-500">{uploadedImage.name} · {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB</p>}
            </>}
            <button disabled={(sourceMode === 'text' ? !prompt.trim() : !uploadedImage) || isSubmitting || active} onClick={() => void submit()} className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 hover:bg-cyan-500">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Box className="h-4 w-4" />}
              {isSubmitting ? 'Starting generation…' : sourceMode === 'image' ? 'Reconstruct from image' : mode === 'local' ? 'Generate locally' : 'Generate with cloud'}
            </button>
            {sourceMode === 'image' ? <p className="text-[11px] text-slate-500">Image reconstruction runs through the local Modly model. No cloud image generation is used.</p> : mode === 'local' && <p className="text-[11px] text-slate-500">Requires a local Stable Diffusion WebUI-compatible raster API (with API access enabled) and local Modly mesh models. Public endpoints are rejected; no paid fallback.</p>}
            {sourceMode === 'text' && mode === 'cloud' && <p className="text-[11px] text-slate-500">Requires a server-configured Meshy API key. Cloud provider usage may incur charges.</p>}
            {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>}
          </div>

          <div className="min-h-[480px] rounded-2xl border border-white/10 bg-[#080b22] p-5 space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Generation result</h2><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-400">{statusLabel}</span></div>
            {task ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex justify-between text-xs text-slate-300"><span>{task.step || (task.status === 'succeeded' ? 'Completed' : 'Working…')}</span><span>{Math.max(0, Math.min(100, Number(task.progress) || 0))}%</span></div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-cyan-400 transition-all" style={{ width: `${Math.max(0, Math.min(100, Number(task.progress) || 0))}%` }} /></div>
                  <p className="mt-2 text-[10px] text-slate-500">Engine: {task.engine || mode} {task.pipeline ? '· Local image-to-mesh chain' : ''}</p>
                </div>
                {task.error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">{task.error}</div>}
                {task.referenceImageUrl && <a href={task.referenceImageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-white"><ExternalLink className="h-3 w-3" />Open reference image</a>}
                {task.model_url && <div className="space-y-2"><Neural3DPreview url={task.model_url} title="Generated 3D Mesh" autoRotate /><a href={task.model_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-cyan-300 hover:bg-white/5"><Download className="h-3.5 w-3.5" />Download model</a></div>}
                {!task.model_url && !isTerminal(task.status) && <div className="flex flex-col items-center justify-center py-16 text-slate-500"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /><p className="mt-3 text-sm">Model generation is running…</p></div>}
                {active && task.engine === 'local' && <button onClick={() => void cancelTask()} disabled={isCancelling} className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"><StopCircle className="h-3.5 w-3.5" />{isCancelling ? 'Cancelling…' : 'Cancel local job'}</button>}
                {task.status === 'succeeded' && !task.model_url && <div className="text-sm text-amber-300">The provider reports success but did not return a model URL.</div>}
              </div>
            ) : <div className="flex h-[400px] flex-col items-center justify-center text-center text-slate-500"><Box className="h-12 w-12 text-slate-700" /><p className="mt-3 text-sm">Your generated mesh will appear here.</p></div>}
          </div>
        </section>
      </div>
    </div>
  );
};

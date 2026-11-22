/**
 * ANNY — Unified King Ken Studios Creative Hub
 *
 * Connects all four creative studios over the shared CreativeArtifactStore
 * and truthful server-side /api/creative/* endpoints:
 *  1. Graphics & Logo Studio (Dedicated Vector SVG Logo Kit + Raster Image Gen + Reference Image Edit)
 *  2. Video Studio (Text-to-Video, Image-to-Video, Animated Logo Intro, Storyboard Planner, Real Job Polling, Playable Preview & Extension)
 *  3. Music Studio (Lyria 3 Audio Generation when configured, honest offline/unconfigured boundary)
 *  4. Website Design Studio (Launches ANNY real website/full-stack builder + live VFS Code Explorer)
 */

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  Code2,
  Download,
  Film,
  Globe,
  Image as ImageIcon,
  Layers,
  Loader2,
  Menu,
  Music,
  Palette,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import { AnnyCodeExplorer } from '../components/AnnyCodeExplorer';
import { WorkspaceManager } from '../core/workspaceManager';
import { creativeArtifactStore } from '../creative/CreativeArtifactStore';
import type {
  CreativeArtifactRecord,
  CreativeImageResult,
  CreativeProviderCapability,
  LogoVariant,
  VideoJobRecord,
} from '../creative/types';
import { fetchWithAuth } from '../lib/apiUtils';

interface KingKenStudiosViewProps {
  onToggleMobileMenu?: () => void;
  onOpenChatWithPrompt?: (prompt: string) => void;
}

type StudioTab = 'graphics' | 'video' | 'music' | 'web' | 'artifacts';

function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const KingKenStudiosView: React.FC<KingKenStudiosViewProps> = ({
  onToggleMobileMenu,
  onOpenChatWithPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('graphics');
  const [providers, setProviders] = useState<CreativeProviderCapability[]>([]);
  const [executionMode, setExecutionMode] = useState<string>('HYBRID_DEFAULT');
  const [artifacts, setArtifacts] = useState<CreativeArtifactRecord[]>(() => creativeArtifactStore.listArtifacts());

  // Graphics & Logo Studio State
  const [graphicsPrompt, setGraphicsPrompt] = useState('Create a premium luxury logo for King Ken Studios');
  const [graphicsAspect, setGraphicsAspect] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [graphicsRefImage, setGraphicsRefImage] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [graphicsLoading, setGraphicsLoading] = useState(false);
  const [graphicsResult, setGraphicsResult] = useState<CreativeImageResult | null>(null);
  const [graphicsError, setGraphicsError] = useState<string | null>(null);
  const [selectedLogoVariantIdx, setSelectedLogoVariantIdx] = useState(0);
  const [revisionNote, setRevisionNote] = useState('');

  // Video Studio State
  const [videoPrompt, setVideoPrompt] = useState('Create an animated logo intro for King Ken Studios with golden rim lighting');
  const [videoAspect, setVideoAspect] = useState<'16:9' | '9:16'>('16:9');
  const [videoDuration, setVideoDuration] = useState<number>(8);
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('720p');
  const [videoPlanOnly, setVideoPlanOnly] = useState(false);
  const [videoRefImage, setVideoRefImage] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [activeVideoJob, setActiveVideoJob] = useState<VideoJobRecord | null>(null);
  const [videoEditPrompt, setVideoEditPrompt] = useState('');
  const [videoError, setVideoError] = useState<string | null>(null);

  // Music Studio State
  const [musicPrompt, setMusicPrompt] = useState('Afrobeats luxury studio instrumental with warm brass, deep 808 bassline, and crisp percussion for King Ken Studios');
  const [musicFullTrack, setMusicFullTrack] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicResult, setMusicResult] = useState<{ audioUrl?: string; lyrics?: string; model?: string; provider?: string; error?: string; recoveryGuidance?: string } | null>(null);

  // Website Design Studio State
  const [webPrompt, setWebPrompt] = useState('Build a modern music and creative agency website for King Ken Studios with artist showcase, audio previews, studio booking form, and responsive navigation');
  const [vfsSnapshot, setVfsSnapshot] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProviders();
    refreshVfsSnapshot();
    const unsub = creativeArtifactStore.subscribe(() => {
      setArtifacts(creativeArtifactStore.listArtifacts());
    });
    return unsub;
  }, []);

  // Poll active running video job until terminal state
  useEffect(() => {
    if (!activeVideoJob) return;
    if (!['QUEUED', 'PLANNING', 'GENERATING', 'VALIDATING'].includes(activeVideoJob.status)) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetchWithAuth(`/api/creative/video/jobs/${encodeURIComponent(activeVideoJob.jobId)}`);
        if (!res.ok) return;
        const updated: VideoJobRecord = await res.json();
        setActiveVideoJob(updated);
        if (updated.status === 'COMPLETED' && updated.playableValidated && updated.videoUrl) {
          const project = creativeArtifactStore.ensureProject('King Ken Studios');
          creativeArtifactStore.saveArtifact({
            id: updated.jobId,
            projectId: project.id,
            studio: 'video',
            domain: 'VIDEO',
            category: updated.category,
            title: updated.productionPlan?.title || updated.prompt.slice(0, 60),
            prompt: updated.prompt,
            enhancedPrompt: updated.enhancedPrompt,
            provider: updated.provider,
            model: updated.model,
            format: 'mp4',
            mimeType: updated.mimeType || 'video/mp4',
            url: updated.videoUrl,
            revisionNumber: updated.parentJobId ? 2 : 1,
            parentArtifactId: updated.parentJobId,
            createdAt: updated.completedAt || new Date().toISOString(),
            metadata: {
              jobId: updated.jobId,
              interactionId: updated.interactionId,
              aspectRatio: updated.aspectRatio,
              durationSeconds: updated.durationSeconds,
              resolution: updated.resolution,
            },
          });
        }
      } catch {
        // Keep polling transiently
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [activeVideoJob?.jobId, activeVideoJob?.status]);

  const loadProviders = async () => {
    try {
      const res = await fetchWithAuth('/api/creative/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(Array.isArray(data.providers) ? data.providers : []);
        if (data.executionMode) setExecutionMode(data.executionMode);
      }
    } catch {
      // Ignore transient fetch errors
    }
  };

  const refreshVfsSnapshot = () => {
    try {
      const vfs = WorkspaceManager.getInstance().getVFS();
      if (typeof (vfs as any).getAllFilesMap === 'function') {
        setVfsSnapshot((vfs as any).getAllFilesMap());
      } else {
        setVfsSnapshot({});
      }
    } catch {
      setVfsSnapshot({});
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: { name: string; mimeType: string; data: string } | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setGraphicsError('Reference image must be 10 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter({
          name: file.name,
          mimeType: file.type || 'image/png',
          data: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateGraphics = async (isRevision = false) => {
    const effectivePrompt = isRevision ? revisionNote.trim() : graphicsPrompt.trim();
    if (!effectivePrompt) return;
    setGraphicsLoading(true);
    setGraphicsError(null);

    try {
      const response = await fetchWithAuth('/api/creative/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: effectivePrompt,
          aspectRatio: graphicsAspect,
          referenceImages: graphicsRefImage ? [graphicsRefImage] : undefined,
          previousLogoPlan: isRevision ? graphicsResult?.logoBundle?.plan : undefined,
          parentArtifactId: isRevision ? graphicsResult?.artifactId : undefined,
          activeContext: isRevision && graphicsResult
            ? {
                artifactId: graphicsResult.artifactId,
                domain: 'IMAGE',
                category: graphicsResult.classification.category,
                brandName: graphicsResult.logoBundle?.plan.brandName,
                logoPlan: graphicsResult.logoBundle?.plan,
              }
            : undefined,
        }),
      });

      const data: CreativeImageResult = await response.json();
      if (!response.ok || !data.success || !data.primaryImageUrl) {
        throw new Error(data.error || data.recoveryGuidance || 'Image generation failed.');
      }

      setGraphicsResult(data);
      setSelectedLogoVariantIdx(0);
      if (isRevision) setRevisionNote('');

      const project = creativeArtifactStore.ensureProject('King Ken Studios');
      creativeArtifactStore.saveArtifact({
        id: data.artifactId,
        projectId: project.id,
        studio: 'graphics',
        domain: 'IMAGE',
        category: data.classification.category,
        title: data.logoBundle
          ? `${data.logoBundle.plan.brandName} Logo Kit (Rev ${data.revisionNumber})`
          : effectivePrompt.slice(0, 64),
        prompt: effectivePrompt,
        enhancedPrompt: data.enhancedPrompt.enhancedPrompt,
        provider: data.provider,
        model: data.model,
        format: data.primaryFormat,
        mimeType: data.primaryMimeType,
        url: data.primaryImageUrl,
        thumbnailUrl: data.primaryImageUrl,
        revisionNumber: data.revisionNumber,
        parentArtifactId: data.parentArtifactId,
        createdAt: data.generatedAt,
        metadata: {
          brandName: data.logoBundle?.plan.brandName,
          logoPlan: data.logoBundle?.plan,
          dimensions: `${data.quality.width}x${data.quality.height}`,
          variantCount: data.logoBundle?.variants.length || 1,
        },
      });
    } catch (err: any) {
      setGraphicsError(err?.message || 'Unable to generate image asset.');
    } finally {
      setGraphicsLoading(false);
    }
  };

  const handleStartVideo = async (isFollowUp = false) => {
    const prompt = isFollowUp ? videoEditPrompt.trim() : videoPrompt.trim();
    if (!prompt) return;
    setVideoLoading(true);
    setVideoError(null);

    try {
      const response = await fetchWithAuth('/api/creative/video/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio: videoAspect,
          durationSeconds: videoDuration,
          resolution: videoResolution,
          planOnly: !isFollowUp && videoPlanOnly,
          referenceImages: !isFollowUp && videoRefImage ? [videoRefImage] : undefined,
          parentJobId: isFollowUp ? activeVideoJob?.jobId : undefined,
          previousInteractionId: isFollowUp ? activeVideoJob?.interactionId : undefined,
        }),
      });
      const job: VideoJobRecord = await response.json();
      if (!job?.jobId) {
        throw new Error((job as any)?.error || 'Video request failed.');
      }
      setActiveVideoJob(job);
      if (isFollowUp) setVideoEditPrompt('');
    } catch (err: any) {
      setVideoError(err?.message || 'Video studio request failed.');
    } finally {
      setVideoLoading(false);
    }
  };

  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim()) return;
    setMusicLoading(true);
    setMusicResult(null);
    try {
      const response = await fetchWithAuth('/api/creative/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: musicPrompt.trim(), fullTrack: musicFullTrack }),
      });
      const data = await response.json();
      setMusicResult(data);
      if (data.success && data.audioUrl) {
        const project = creativeArtifactStore.ensureProject('King Ken Studios');
        creativeArtifactStore.saveArtifact({
          id: `art_aud_${Date.now().toString(36)}`,
          projectId: project.id,
          studio: 'music',
          domain: 'AUDIO',
          category: 'MUSIC_GENERATION',
          title: musicPrompt.slice(0, 60),
          prompt: musicPrompt,
          provider: data.provider,
          model: data.model,
          format: data.mimeType?.includes('wav') ? 'wav' : 'mp3',
          mimeType: data.mimeType || 'audio/mpeg',
          url: data.audioUrl,
          revisionNumber: 1,
          createdAt: new Date().toISOString(),
          metadata: { lyrics: data.lyrics },
        });
      }
    } catch (err: any) {
      setMusicResult({ error: err?.message || 'Music generation failed.' });
    } finally {
      setMusicLoading(false);
    }
  };

  const activeVariant: LogoVariant | undefined = graphicsResult?.logoBundle?.variants[selectedLogoVariantIdx];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030512] text-slate-100 overflow-hidden">
      {/* Studio Header */}
      <header className="px-4 sm:px-6 py-4 border-b border-white/10 bg-[#050819]/90 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-label="Open navigation menu"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                King Ken Studios — Unified Creative Engine
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Graphics &amp; Logo Identity · Video Production · Music Studio · Website Design · Shared Artifact Library
            </p>
          </div>
        </div>

        {/* Truthful Provider Readiness Summary */}
        <div className="flex items-center gap-2 flex-wrap">
          {providers
            .filter((p) => ['local-vector-svg', 'gemini-image', 'gemini-omni-video', 'gemini-lyria-music'].includes(p.id))
            .map((p) => (
              <span
                key={p.id}
                title={p.detail}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                  p.configured
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-800/70 border-white/10 text-slate-400'
                }`}
              >
                {p.id === 'local-vector-svg'
                  ? 'Vector SVG: Ready (Offline)'
                  : p.id === 'gemini-image'
                    ? `Raster Image: ${p.configured ? 'Ready' : 'Unconfigured'}`
                    : p.id === 'gemini-omni-video'
                      ? `Omni Video: ${p.configured ? 'Ready' : 'Plan Only'}`
                      : `Lyria Music: ${p.configured ? 'Ready' : 'Unconfigured'}`}
              </span>
            ))}
          <button
            type="button"
            onClick={loadProviders}
            title="Refresh provider status"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Studio Switcher Tabs */}
      <div className="px-4 sm:px-6 pt-3 border-b border-white/10 bg-[#040717] flex items-center gap-2 overflow-x-auto shrink-0">
        {[
          { key: 'graphics' as const, label: 'Graphics & Logo Studio', icon: Palette },
          { key: 'video' as const, label: 'Video Studio', icon: Clapperboard },
          { key: 'music' as const, label: 'Music Studio', icon: Music },
          { key: 'web' as const, label: 'Website Design Studio', icon: Globe },
          { key: 'artifacts' as const, label: `Shared Library (${artifacts.length})`, icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === 'web') refreshVfsSnapshot();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                active
                  ? 'border-amber-400 text-amber-300 bg-amber-400/5'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* ==================== 1. GRAPHICS & LOGO STUDIO ==================== */}
          {activeTab === 'graphics' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#070b1e] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-amber-400" />
                      Creative Brief &amp; Logo / Image Generator
                    </h2>
                    <span className="text-[11px] text-slate-400">{executionMode}</span>
                  </div>

                  <textarea
                    rows={4}
                    value={graphicsPrompt}
                    onChange={(e) => setGraphicsPrompt(e.target.value)}
                    placeholder="e.g., Create a luxury gold and obsidian logo for King Ken Studios, OR attach an image to edit..."
                    className="w-full rounded-xl bg-black/40 border border-white/15 p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Aspect Ratio</label>
                      <select
                        value={graphicsAspect}
                        onChange={(e) => setGraphicsAspect(e.target.value as any)}
                        className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-white"
                      >
                        <option value="1:1">1:1 (Logo / Square)</option>
                        <option value="16:9">16:9 (Widescreen)</option>
                        <option value="9:16">9:16 (Vertical)</option>
                        <option value="4:3">4:3 (Editorial)</option>
                        <option value="3:4">3:4 (Poster)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Reference Image (Optional Edit)</label>
                      <label className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 px-3 py-2 text-xs text-slate-200 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="truncate">{graphicsRefImage ? graphicsRefImage.name : 'Upload Image'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, setGraphicsRefImage)}
                        />
                      </label>
                    </div>
                  </div>

                  {graphicsRefImage && (
                    <div className="flex items-center justify-between rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-3 py-2 text-xs text-cyan-200">
                      <span className="truncate">Reference attached: {graphicsRefImage.name}</span>
                      <button
                        type="button"
                        onClick={() => setGraphicsRefImage(null)}
                        className="text-cyan-300 hover:text-white font-semibold ml-2 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={graphicsLoading || !graphicsPrompt.trim()}
                    onClick={() => handleGenerateGraphics(false)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {graphicsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{graphicsLoading ? 'Generating & Validating...' : 'Generate Verified Asset'}</span>
                  </button>

                  {graphicsError && (
                    <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{graphicsError}</span>
                    </div>
                  )}
                </div>

                {/* Iterative Refinement Box when a Logo / Image is active */}
                {graphicsResult && (
                  <div className="rounded-2xl border border-white/10 bg-[#070b1e] p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Iterative Revision (Rev {graphicsResult.revisionNumber})
                    </h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={revisionNote}
                        onChange={(e) => setRevisionNote(e.target.value)}
                        placeholder='e.g., "Make the logo more minimal" or "Change it to emerald and white"'
                        className="flex-1 rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-white placeholder-slate-500"
                      />
                      <button
                        type="button"
                        disabled={graphicsLoading || !revisionNote.trim()}
                        onClick={() => handleGenerateGraphics(true)}
                        className="px-3.5 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        Refine
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Verified Output Preview Panel */}
              <div className="lg:col-span-7">
                {graphicsResult ? (
                  <div className="rounded-2xl border border-white/10 bg-[#070b1e] p-5 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
                          {graphicsResult.classification.category.replace(/_/g, ' ')}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {graphicsResult.logoBundle
                            ? `${graphicsResult.logoBundle.plan.brandName} — Brand Logo Kit`
                            : 'Verified Image Output'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {graphicsResult.primaryFormat.toUpperCase()} · {graphicsResult.quality.width}×{graphicsResult.quality.height}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            triggerDownload(
                              activeVariant?.dataUrl || graphicsResult.primaryImageUrl,
                              `${(graphicsResult.logoBundle?.plan.brandName || 'anny-asset').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${activeVariant?.id || 'asset'}.${graphicsResult.primaryFormat}`
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download {graphicsResult.primaryFormat.toUpperCase()}
                        </button>
                      </div>
                    </div>

                    {/* Main Preview Canvas */}
                    <div className="rounded-2xl border border-white/10 bg-[#040610] p-6 flex items-center justify-center min-h-[340px]">
                      <img
                        src={activeVariant?.dataUrl || graphicsResult.primaryImageUrl}
                        alt={graphicsResult.logoBundle?.plan.brandName || graphicsResult.classification.preservedOriginalPrompt}
                        className="max-h-[340px] max-w-full object-contain rounded-xl shadow-2xl"
                      />
                    </div>

                    {/* Logo Kit Variant Switcher & Brand Specs */}
                    {graphicsResult.logoBundle && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {graphicsResult.logoBundle.variants.map((variant, idx) => (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => setSelectedLogoVariantIdx(idx)}
                              className={`rounded-xl border p-2 text-left transition-all cursor-pointer ${
                                selectedLogoVariantIdx === idx
                                  ? 'border-amber-400 bg-amber-400/10'
                                  : 'border-white/10 bg-black/30 hover:border-white/25'
                              }`}
                            >
                              <div className="h-20 flex items-center justify-center rounded-lg bg-[#050814] overflow-hidden mb-2">
                                <img src={variant.dataUrl} alt={variant.label} className="max-h-full max-w-full object-contain" />
                              </div>
                              <div className="text-[11px] font-semibold text-slate-200 truncate">{variant.label}</div>
                              <div className="text-[10px] text-slate-400">SVG · {variant.width}×{variant.height}</div>
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                              Brand Color Palette
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {graphicsResult.logoBundle.plan.palette.slice(0, 5).map((swatch) => (
                                <div key={swatch.name} className="flex items-center gap-1.5 rounded-lg bg-black/40 border border-white/10 px-2 py-1">
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-white/20"
                                    style={{ backgroundColor: swatch.hex }}
                                  />
                                  <span className="text-[11px] text-slate-200">{swatch.name}</span>
                                  <span className="text-[10px] font-mono text-slate-400">{swatch.hex}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                              Identity Spec
                            </div>
                            <div className="text-xs text-slate-300 space-y-1">
                              <div>Monogram: <span className="font-mono text-amber-300">{graphicsResult.logoBundle.plan.monogram}</span> · Type: {graphicsResult.logoBundle.plan.logoType}</div>
                              <div>Display Font: <span className="text-white">{graphicsResult.logoBundle.plan.typography.displayFont}</span></div>
                              <div>Provider: <span className="font-mono text-emerald-300">{graphicsResult.provider}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-[#060a1b] p-12 flex flex-col items-center justify-center text-center min-h-[380px]">
                    <ImageIcon className="w-10 h-10 text-amber-400/70 mb-3" />
                    <h3 className="text-sm font-bold text-white">Graphics &amp; Brand Identity Canvas</h3>
                    <p className="text-xs text-slate-400 max-w-md mt-1">
                      Generate verified vector SVG logo kits (working 100% offline with light, dark, icon, and emblem variants) or configured raster photography &amp; reference-preserving image edits.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 2. VIDEO STUDIO ==================== */}
          {activeTab === 'video' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#070b1e] p-5 space-y-4">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-cyan-400" />
                    Video Generation &amp; Directorial Studio
                  </h2>
                  <textarea
                    rows={4}
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="Describe your scene, camera motion, animated logo intro, or image-to-video motion..."
                    className="w-full rounded-xl bg-black/40 border border-white/15 p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60"
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Aspect</label>
                      <select
                        value={videoAspect}
                        onChange={(e) => setVideoAspect(e.target.value as '16:9' | '9:16')}
                        className="w-full rounded-lg bg-black/40 border border-white/15 px-2.5 py-2 text-xs text-white"
                      >
                        <option value="16:9">16:9 Wide</option>
                        <option value="9:16">9:16 Reel</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Duration</label>
                      <select
                        value={videoDuration}
                        onChange={(e) => setVideoDuration(Number(e.target.value))}
                        className="w-full rounded-lg bg-black/40 border border-white/15 px-2.5 py-2 text-xs text-white"
                      >
                        <option value={5}>5 sec</option>
                        <option value={8}>8 sec</option>
                        <option value={12}>12 sec</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Resolution</label>
                      <select
                        value={videoResolution}
                        onChange={(e) => setVideoResolution(e.target.value as '720p' | '1080p')}
                        className="w-full rounded-lg bg-black/40 border border-white/15 px-2.5 py-2 text-xs text-white"
                      >
                        <option value="720p">720p</option>
                        <option value="1080p">1080p</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={videoPlanOnly}
                        onChange={(e) => setVideoPlanOnly(e.target.checked)}
                        className="rounded border-white/20"
                      />
                      <span>Storyboard &amp; Shot Plan Only</span>
                    </label>

                    <label className="flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{videoRefImage ? videoRefImage.name : 'Image-to-Video Ref'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, setVideoRefImage)}
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={videoLoading || !videoPrompt.trim()}
                    onClick={() => handleStartVideo(false)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {videoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
                    <span>{videoPlanOnly ? 'Generate Storyboard Plan' : 'Start Video Production Job'}</span>
                  </button>

                  {videoError && (
                    <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-200">
                      {videoError}
                    </div>
                  )}
                </div>

                {/* Multi-Turn Video Edit / Extension when interactionId exists */}
                {activeVideoJob?.status === 'COMPLETED' && activeVideoJob.interactionId && (
                  <div className="rounded-2xl border border-white/10 bg-[#070b1e] p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      Edit or Extend This Video
                    </h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={videoEditPrompt}
                        onChange={(e) => setVideoEditPrompt(e.target.value)}
                        placeholder='e.g., "Change scene lighting to nighttime neon" or "Extend video by 5 seconds"'
                        className="flex-1 rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-white"
                      />
                      <button
                        type="button"
                        disabled={videoLoading || !videoEditPrompt.trim()}
                        onClick={() => handleStartVideo(true)}
                        className="px-3.5 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-semibold cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Video Output & Storyboard Inspector */}
              <div className="lg:col-span-7">
                {activeVideoJob ? (
                  <div className="rounded-2xl border border-white/10 bg-[#070b1e] p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300">
                          {activeVideoJob.category.replace(/_/g, ' ')} · {activeVideoJob.mode}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {activeVideoJob.productionPlan?.title || 'Video Production Job'}
                        </h3>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border ${
                          activeVideoJob.status === 'COMPLETED'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : activeVideoJob.status === 'FAILED'
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                              : activeVideoJob.status === 'PROVIDER_UNCONFIGURED' || activeVideoJob.status === 'STORYBOARD_PLAN_ONLY'
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                        }`}
                      >
                        {activeVideoJob.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">{activeVideoJob.stageMessage}</p>

                    {/* Verified Playable Video Player */}
                    {activeVideoJob.status === 'COMPLETED' && activeVideoJob.playableValidated && activeVideoJob.videoUrl && (
                      <div className="space-y-3">
                        <video
                          controls
                          playsInline
                          src={activeVideoJob.videoUrl}
                          className="w-full max-h-[380px] rounded-xl bg-black border border-white/10"
                        />
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Provider: {activeVideoJob.provider} ({activeVideoJob.model})</span>
                          <a
                            href={activeVideoJob.videoUrl}
                            download={`${activeVideoJob.jobId}.mp4`}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download MP4
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Honest Unconfigured Notice */}
                    {activeVideoJob.status === 'PROVIDER_UNCONFIGURED' && (
                      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-200 space-y-1">
                        <div className="font-semibold">No video rendering provider is configured on the server</div>
                        <div>{activeVideoJob.recoveryGuidance}</div>
                      </div>
                    )}

                    {/* Directorial Storyboard Shots */}
                    {activeVideoJob.productionPlan && (
                      <div className="space-y-3 pt-2 border-t border-white/10">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Directorial Storyboard &amp; Shot Plan ({activeVideoJob.productionPlan.aspectRatio} · {activeVideoJob.productionPlan.targetDurationSeconds}s)
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                          {activeVideoJob.productionPlan.shots.map((shot) => (
                            <div key={shot.shotNumber} className="rounded-xl bg-black/35 border border-white/10 p-3 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-cyan-300">Shot {shot.shotNumber}</span>
                                <span className="font-mono text-slate-400">{shot.durationSeconds}s</span>
                              </div>
                              <div className="text-slate-200">{shot.visualDescription}</div>
                              <div className="text-[11px] text-slate-400">
                                Camera: {shot.cameraMovement} · Lighting: {shot.lightingAndMood} · Audio: {shot.audioCue}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-[#060a1b] p-12 flex flex-col items-center justify-center text-center min-h-[380px]">
                    <Clapperboard className="w-10 h-10 text-cyan-400/70 mb-3" />
                    <h3 className="text-sm font-bold text-white">Video Production Stage</h3>
                    <p className="text-xs text-slate-400 max-w-md mt-1">
                      Create text-to-video scenes, animated brand intros, image-to-video clips, or multi-shot storyboards. Jobs are truthfully tracked and verified for MP4 playability before preview.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 3. MUSIC STUDIO ==================== */}
          {activeTab === 'music' && (
            <div className="rounded-2xl border border-white/10 bg-[#070b1e] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Music className="w-4 h-4 text-purple-400" />
                  King Ken Music Studio (Lyria 3 Integration)
                </h2>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={musicFullTrack}
                    onChange={(e) => setMusicFullTrack(e.target.checked)}
                  />
                  <span>Full Track (Lyria 3 Pro)</span>
                </label>
              </div>
              <textarea
                rows={3}
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/15 p-3 text-sm text-white"
              />
              <button
                type="button"
                disabled={musicLoading || !musicPrompt.trim()}
                onClick={handleGenerateMusic}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {musicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
                <span>{musicLoading ? 'Synthesizing Audio...' : 'Generate Studio Track'}</span>
              </button>

              {musicResult?.audioUrl && (
                <div className="rounded-xl bg-black/40 border border-emerald-500/30 p-4 space-y-3">
                  <audio controls src={musicResult.audioUrl} className="w-full" />
                  {musicResult.lyrics && (
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans">{musicResult.lyrics}</pre>
                  )}
                </div>
              )}

              {musicResult?.error && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs text-amber-200 space-y-1">
                  <div className="font-semibold">{musicResult.error}</div>
                  {musicResult.recoveryGuidance && <div>{musicResult.recoveryGuidance}</div>}
                </div>
              )}
            </div>
          )}

          {/* ==================== 4. WEBSITE DESIGN STUDIO ==================== */}
          {activeTab === 'web' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-[#070b1e] p-5 space-y-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  Website &amp; Application Design Studio
                </h2>
                <textarea
                  rows={3}
                  value={webPrompt}
                  onChange={(e) => setWebPrompt(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/15 p-3 text-sm text-white"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenChatWithPrompt && onOpenChatWithPrompt(webPrompt)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Launch in ANNY Builder &amp; Live Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={refreshVfsSnapshot}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Code2 className="w-4 h-4" />
                    <span>Refresh VFS Code Explorer</span>
                  </button>
                </div>
              </div>

              <AnnyCodeExplorer
                vfsFiles={vfsSnapshot}
                onFileSave={(filePath, content) => {
                  const vfs = WorkspaceManager.getInstance().getVFS() as any;
                  if (typeof vfs._unsafe_writeFile === 'function') {
                    vfs._unsafe_writeFile(filePath, content);
                  }
                  refreshVfsSnapshot();
                }}
              />
            </div>
          )}

          {/* ==================== 5. SHARED ARTIFACT LIBRARY ==================== */}
          {activeTab === 'artifacts' && (
            <div className="space-y-4">
              {artifacts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-[#060a1b] p-12 text-center">
                  <Layers className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-white">No Saved Creative Artifacts Yet</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Generated logos, images, videos, audio tracks, and project snapshots appear here automatically — zero hardcoded placeholders.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {artifacts.map((art) => (
                    <div key={art.id} className="rounded-2xl border border-white/10 bg-[#070b1e] p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono uppercase text-amber-300">{art.studio} · {art.format}</span>
                        <span className="text-slate-400">Rev {art.revisionNumber}</span>
                      </div>
                      {art.domain === 'IMAGE' && art.url && (
                        <div className="h-44 rounded-xl bg-black/50 flex items-center justify-center overflow-hidden p-2">
                          <img src={art.url} alt={art.title} className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                      {art.domain === 'VIDEO' && art.url && (
                        <video controls src={art.url} className="h-44 w-full rounded-xl bg-black object-cover" />
                      )}
                      {art.domain === 'AUDIO' && art.url && (
                        <audio controls src={art.url} className="w-full" />
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-white truncate">{art.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{art.prompt}</p>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          {art.provider} · {art.model}
                        </div>
                      </div>
                      {art.url && (
                        <button
                          type="button"
                          onClick={() => triggerDownload(art.url!, `${art.id}.${art.format}`)}
                          className="mt-auto w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download {art.format.toUpperCase()}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

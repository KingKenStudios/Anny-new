import React, { useMemo, useState } from 'react';
import {
  Building2,
  Radio,
  Tv,
  Disc3,
  Film,
  Download,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileCode2,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import { fetchWithAuth } from '../lib/apiUtils';
import {
  BuildingTypology,
  ClimateProfile,
  ArchitecturePlanResult,
  generateArchitecturePlan,
} from '../core/architectureDesignEngine';
import {
  BroadcastMedium,
  BroadcastPlanResult,
  MusicReleaseInput,
  MusicReleaseValidationResult,
  ReleaseType,
  VideoPipelineResult,
  generateBroadcastPlan,
  validateAndPrepareMusicRelease,
  generateVideoStreamingPipeline,
} from '../core/broadcastMediaEngine';

type StudioTab = 'architecture' | 'broadcast' | 'music_distribution' | 'video_streaming';

interface AnnyMediaArchStudioViewProps {
  onToggleMobileMenu?: () => void;
  onOpenChatWithPrompt?: (prompt: string) => void;
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const AnnyMediaArchStudioView: React.FC<AnnyMediaArchStudioViewProps> = ({
  onToggleMobileMenu,
  onOpenChatWithPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('architecture');
  const [busy, setBusy] = useState(false);

  // ---------------- ARCHITECTURE STATE ----------------
  const [archForm, setArchForm] = useState<{
    projectName: string;
    typology: BuildingTypology;
    climate: ClimateProfile;
    location: string;
    plotWidthM: number;
    plotDepthM: number;
    bedrooms: number;
    floors: number;
  }>({
    projectName: 'Ikeja Tropical Courtyard Duplex',
    typology: 'duplex',
    climate: 'tropical_west_africa',
    location: 'Lagos, Nigeria',
    plotWidthM: 18,
    plotDepthM: 30,
    bedrooms: 4,
    floors: 2,
  });

  const [archPlan, setArchPlan] = useState<ArchitecturePlanResult>(() =>
    generateArchitecturePlan({
      projectName: 'Ikeja Tropical Courtyard Duplex',
      typology: 'duplex',
      climate: 'tropical_west_africa',
      location: 'Lagos, Nigeria',
      plotWidthM: 18,
      plotDepthM: 30,
      bedrooms: 4,
      floors: 2,
    })
  );

  // ---------------- BROADCAST STATE ----------------
  const [broadcastForm, setBroadcastForm] = useState<{
    stationName: string;
    medium: BroadcastMedium;
    format: string;
    tagline: string;
    timezone: string;
  }>({
    stationName: 'King Ken FM / TV Live',
    medium: 'tv',
    format: 'Culture, Music, Tech & Evening Talk',
    tagline: 'Independent Voice. Always On Air.',
    timezone: 'Africa/Lagos',
  });

  const [broadcastPlan, setBroadcastPlan] = useState<BroadcastPlanResult>(() =>
    generateBroadcastPlan({
      stationName: 'King Ken FM / TV Live',
      medium: 'tv',
      format: 'Culture, Music, Tech & Evening Talk',
      tagline: 'Independent Voice. Always On Air.',
      timezone: 'Africa/Lagos',
    })
  );

  // ---------------- MUSIC DISTRIBUTION STATE ----------------
  const [releaseForm, setReleaseForm] = useState<{
    artistName: string;
    releaseTitle: string;
    releaseType: ReleaseType;
    primaryGenre: string;
    releaseDate: string;
    upcOrEan: string;
    rightsOwner: string;
    artworkWidthPx: number;
    artworkHeightPx: number;
    trackTitle: string;
    trackIsrc: string;
    trackExplicit: boolean;
    splitPrimary: number;
    splitProducer: number;
  }>({
    artistName: 'King Ken',
    releaseTitle: 'Midnight Skyline',
    releaseType: 'Single',
    primaryGenre: 'Afrobeats',
    releaseDate: '2026-12-01',
    upcOrEan: '036000291452',
    rightsOwner: 'King Ken Studios Ltd',
    artworkWidthPx: 3000,
    artworkHeightPx: 3000,
    trackTitle: 'Midnight Skyline (Main Mix)',
    trackIsrc: 'NG-KKS-26-00001',
    trackExplicit: false,
    splitPrimary: 70,
    splitProducer: 30,
  });

  const buildReleasePayload = (): MusicReleaseInput => ({
    artistName: releaseForm.artistName,
    releaseTitle: releaseForm.releaseTitle,
    releaseType: releaseForm.releaseType,
    primaryGenre: releaseForm.primaryGenre,
    releaseDate: releaseForm.releaseDate,
    upcOrEan: releaseForm.upcOrEan,
    rightsOwner: releaseForm.rightsOwner,
    artworkWidthPx: releaseForm.artworkWidthPx,
    artworkHeightPx: releaseForm.artworkHeightPx,
    tracks: [
      {
        title: releaseForm.trackTitle,
        isrc: releaseForm.trackIsrc,
        explicit: releaseForm.trackExplicit,
        durationSeconds: 198,
      },
    ],
    royaltySplits: [
      { collaboratorName: releaseForm.artistName || 'Lead Artist', role: 'Primary Artist / Songwriter', percentage: releaseForm.splitPrimary },
      { collaboratorName: 'Executive Producer', role: 'Producer / Beatmaker', percentage: releaseForm.splitProducer },
    ],
  });

  const [releaseResult, setReleaseResult] = useState<MusicReleaseValidationResult>(() =>
    validateAndPrepareMusicRelease({
      artistName: 'King Ken',
      releaseTitle: 'Midnight Skyline',
      releaseType: 'Single',
      primaryGenre: 'Afrobeats',
      releaseDate: '2026-12-01',
      upcOrEan: '036000291452',
      rightsOwner: 'King Ken Studios Ltd',
      artworkWidthPx: 3000,
      artworkHeightPx: 3000,
      tracks: [{ title: 'Midnight Skyline (Main Mix)', isrc: 'NG-KKS-26-00001', explicit: false, durationSeconds: 198 }],
      royaltySplits: [
        { collaboratorName: 'King Ken', role: 'Primary Artist / Songwriter', percentage: 70 },
        { collaboratorName: 'Executive Producer', role: 'Producer / Beatmaker', percentage: 30 },
      ],
    })
  );

  // ---------------- VIDEO STREAMING STATE ----------------
  const [videoForm, setVideoForm] = useState({
    videoTitle: 'Studio Session Premiere 4K',
    sourceFileName: 'studio_premiere_master.mp4',
    transcriptText:
      'Welcome to our live studio session. Tonight we walk through the adaptive bitrate workflow. Select 1080p or auto quality in your player.',
  });

  const [videoPipeline, setVideoPipeline] = useState<VideoPipelineResult>(() =>
    generateVideoStreamingPipeline({
      videoTitle: 'Studio Session Premiere 4K',
      sourceFileName: 'studio_premiere_master.mp4',
      transcriptText:
        'Welcome to our live studio session. Tonight we walk through the adaptive bitrate workflow. Select 1080p or auto quality in your player.',
    })
  );

  const svgDataUri = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(archPlan.svgFloorPlan)}`,
    [archPlan.svgFloorPlan]
  );

  const runArchitecturePlan = async () => {
    setBusy(true);
    try {
      const res = await fetchWithAuth('/api/architecture/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(archForm),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.plan) setArchPlan(json.plan);
      else setArchPlan(generateArchitecturePlan(archForm));
    } catch {
      setArchPlan(generateArchitecturePlan(archForm));
    } finally {
      setBusy(false);
    }
  };

  const runBroadcastPlan = async () => {
    setBusy(true);
    try {
      const res = await fetchWithAuth('/api/broadcast/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastForm),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.plan) setBroadcastPlan(json.plan);
      else setBroadcastPlan(generateBroadcastPlan(broadcastForm));
    } catch {
      setBroadcastPlan(generateBroadcastPlan(broadcastForm));
    } finally {
      setBusy(false);
    }
  };

  const runMusicValidation = async () => {
    setBusy(true);
    const payload = buildReleasePayload();
    try {
      const res = await fetchWithAuth('/api/distribution/validate-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.result) setReleaseResult(json.result);
      else setReleaseResult(validateAndPrepareMusicRelease(payload));
    } catch {
      setReleaseResult(validateAndPrepareMusicRelease(payload));
    } finally {
      setBusy(false);
    }
  };

  const runVideoPipeline = async () => {
    setBusy(true);
    try {
      const res = await fetchWithAuth('/api/video-platform/abr-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoForm),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.pipeline) setVideoPipeline(json.pipeline);
      else setVideoPipeline(generateVideoStreamingPipeline(videoForm));
    } catch {
      setVideoPipeline(generateVideoStreamingPipeline(videoForm));
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ id: StudioTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'architecture', label: 'Architecture & CAD', icon: Building2 },
    { id: 'broadcast', label: 'TV & Radio Broadcast', icon: broadcastForm.medium === 'radio' ? Radio : Tv },
    { id: 'music_distribution', label: 'Music Distribution', icon: Disc3 },
    { id: 'video_streaming', label: 'Video ABR Streaming', icon: Film },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#050814] text-slate-900 dark:text-slate-100 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-400 font-semibold">
              ANNY Domain Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Architecture, Broadcasting & Media Distribution
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Generate CAD DXF R12 floor plans, 24-hour TV/radio station rundowns & Icecast/FFmpeg configs, verify ISRC/UPC music releases, and configure multi-bitrate HLS video streaming stacks.
          </p>
        </div>

        {onOpenChatWithPrompt && (
          <button
            type="button"
            onClick={() => {
              const promptMap: Record<StudioTab, string> = {
                architecture: `Build me an architectural planning & DXF floor-plan web application tailored for ${archForm.location} (${archForm.typology}, ${archForm.plotWidthM}m x ${archForm.plotDepthM}m).`,
                broadcast: `Build me a complete ${broadcastForm.medium === 'tv' ? 'online TV station' : 'internet radio station'} platform named "${broadcastForm.stationName}" with 24h EPG, live control rundown, and Icecast/FFmpeg/Nginx-RTMP configs.`,
                music_distribution: `Build me a music distribution & record label portal with ISRC/UPC check-digit validation, 100% royalty split sheets, DDEX ERN JSON export, and honest DSP partner status.`,
                video_streaming: `Build me an online video distribution & ABR HLS streaming platform with MinIO upload queue, FFmpeg 1080p-360p ladder, WebVTT captions, and watch-time analytics.`,
              };
              onOpenChatWithPrompt(promptMap[activeTab]);
            }}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Build Full Platform in ANNY</span>
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 py-4 border-b border-slate-200 dark:border-slate-800/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer border ${
                active
                  ? 'bg-slate-900 dark:bg-cyan-500/15 text-white dark:text-cyan-300 border-slate-900 dark:border-cyan-500/50'
                  : 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ARCHITECTURE & CAD */}
      {activeTab === 'architecture' && (
        <div className="mt-6 space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-950 dark:text-amber-200">
              <strong className="font-bold">Conceptual & Schematic Planning Only: </strong>
              {archPlan.honestyDisclaimer}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Inputs */}
            <div className="lg:col-span-4 bg-white dark:bg-[#0b1022] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-bold">Site & Building Program</h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Project Name</label>
                <input
                  type="text"
                  value={archForm.projectName}
                  onChange={(e) => setArchForm((s) => ({ ...s, projectName: e.target.value }))}
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Typology</label>
                  <select
                    value={archForm.typology}
                    onChange={(e) => setArchForm((s) => ({ ...s, typology: e.target.value as BuildingTypology }))}
                    className="w-full min-h-[44px] px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  >
                    <option value="bungalow">Residential Bungalow</option>
                    <option value="duplex">Detached Duplex</option>
                    <option value="detached_villa">Detached Villa</option>
                    <option value="mansion">Executive Mansion</option>
                    <option value="apartment_block">Apartment Block</option>
                    <option value="office_hub">Commercial Office Hub</option>
                    <option value="retail_plaza">Retail Plaza</option>
                    <option value="studio_broadcast">TV / Radio Studio Building</option>
                    <option value="clinic">Medical Clinic</option>
                    <option value="hospitality">Hospitality / Boutique Hotel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Climate Profile</label>
                  <select
                    value={archForm.climate}
                    onChange={(e) => setArchForm((s) => ({ ...s, climate: e.target.value as ClimateProfile }))}
                    className="w-full min-h-[44px] px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  >
                    <option value="tropical_west_africa">Tropical (West Africa / Passive Cool)</option>
                    <option value="temperate">Temperate</option>
                    <option value="arid">Arid / Hot-Dry Courtyard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Plot Width (m)</label>
                  <input
                    type="number"
                    min={9}
                    max={120}
                    value={archForm.plotWidthM}
                    onChange={(e) => setArchForm((s) => ({ ...s, plotWidthM: Number(e.target.value) || 18 }))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Plot Depth (m)</label>
                  <input
                    type="number"
                    min={12}
                    max={160}
                    value={archForm.plotDepthM}
                    onChange={(e) => setArchForm((s) => ({ ...s, plotDepthM: Number(e.target.value) || 30 }))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Floors</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={archForm.floors}
                    onChange={(e) => setArchForm((s) => ({ ...s, floors: Number(e.target.value) || 1 }))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Bedrooms / Suites</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={archForm.bedrooms}
                    onChange={(e) => setArchForm((s) => ({ ...s, bedrooms: Number(e.target.value) || 4 }))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={runArchitecturePlan}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Generating Layout & DXF...' : 'Generate Floor Plan & CAD DXF'}
              </button>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => downloadTextFile(`${archPlan.projectName.replace(/\s+/g, '_')}.dxf`, archPlan.dxfR12Content, 'application/dxf')}
                  className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Export DXF R12
                </button>
                <button
                  type="button"
                  onClick={() => downloadTextFile(`${archPlan.projectName.replace(/\s+/g, '_')}.svg`, archPlan.svgFloorPlan, 'image/svg+xml')}
                  className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Export SVG
                </button>
              </div>
            </div>

            {/* Drawing + Schedules */}
            <div className="lg:col-span-8 space-y-5">
              <div className="bg-white dark:bg-[#0b1022] border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="text-sm font-bold">
                    Scaled Conceptual Blueprint ({archPlan.totalGrossFloorAreaM2} m² GFA • {archPlan.siteCoveragePercent}% site coverage)
                  </div>
                  <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
                    {archPlan.floors} Floor(s) • AutoCAD DXF R12 Ready
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#050b18]">
                  <img
                    src={svgDataUri}
                    alt={`Architectural schematic floor plan for ${archPlan.projectName}`}
                    className="w-full h-auto block"
                  />
                </div>
              </div>

              {/* 5-Stage Design Tracker */}
              <div className="bg-white dark:bg-[#0b1022] border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  5-Stage Architectural Delivery Workflow
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {archPlan.workflowStages.map((st) => (
                    <div
                      key={st.stageNumber}
                      className={`p-3 rounded-xl border text-xs ${
                        st.status === 'COMPLETED'
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : st.status === 'CURRENT'
                          ? 'border-cyan-500/60 bg-cyan-500/10'
                          : 'border-slate-200 dark:border-slate-800 opacity-80'
                      }`}
                    >
                      <div className="font-mono text-[10px] uppercase font-bold mb-1">
                        Stage {st.stageNumber} • {st.status.replace(/_/g, ' ')}
                      </div>
                      <div className="font-semibold mb-1">{st.name}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">{st.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Room Schedule + BOQ Guidance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white dark:bg-[#0b1022] border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold mb-3">Room Schedule ({archPlan.roomSchedule.length} Spaces)</h3>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1 text-xs">
                    {archPlan.roomSchedule.map((rm, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                        <div>
                          <div className="font-semibold">F{rm.floor}: {rm.room}</div>
                          <div className="text-[11px] text-slate-500">{rm.ventilation}</div>
                        </div>
                        <div className="text-right font-mono">
                          <div>{rm.dimensionsM}</div>
                          <div className="text-cyan-700 dark:text-cyan-400">{rm.areaM2} m²</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0b1022] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold">Preliminary BOQ Cost Guidance</h3>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
                    {archPlan.preliminaryBoqGuidance.disclaimer}
                  </p>
                  <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                    Concept Range: ${archPlan.preliminaryBoqGuidance.estimatedTotalRangeUsd[0].toLocaleString()} – ${archPlan.preliminaryBoqGuidance.estimatedTotalRangeUsd[1].toLocaleString()}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {archPlan.preliminaryBoqGuidance.lineItems.map((li, i) => (
                      <div key={i} className="flex justify-between gap-2 border-b border-slate-100 dark:border-slate-800/70 pb-1">
                        <span className="text-slate-700 dark:text-slate-300">{li.element}</span>
                        <span className="font-mono text-slate-900 dark:text-slate-100">
                          ${li.estimatedRangeUsd[0].toLocaleString()}–${li.estimatedRangeUsd[1].toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TV & RADIO BROADCAST BRAIN */}
      {activeTab === 'broadcast' && (
        <div className="mt-6 space-y-6">
          <div className="bg-slate-900 text-slate-100 border border-cyan-500/40 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <strong className="font-mono uppercase text-amber-300">{broadcastPlan.executionStatus}: </strong>
              {broadcastPlan.honestyNotice}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white dark:bg-[#0b1022] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-bold">Station Control Configuration</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Station Name</label>
                <input
                  type="text"
                  value={broadcastForm.stationName}
                  onChange={(e) => setBroadcastForm((s) => ({ ...s, stationName: e.target.value }))}
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Medium</label>
                  <select
                    value={broadcastForm.medium}
                    onChange={(e) => setBroadcastForm((s) => ({ ...s, medium: e.target.value as BroadcastMedium }))}
                    className="w-full min-h-[44px] px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  >
                    <option value="tv">Online TV Station</option>
                    <option value="radio">Internet Radio Station</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={broadcastForm.timezone}
                    onChange={(e) => setBroadcastForm((s) => ({ ...s, timezone: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Programming Format</label>
                <input
                  type="text"
                  value={broadcastForm.format}
                  onChange={(e) => setBroadcastForm((s) => ({ ...s, format: e.target.value }))}
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={runBroadcastPlan}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold text-sm cursor-pointer"
              >
                {busy ? 'Generating Broadcast Pack...' : 'Generate 24h EPG & Playout Configs'}
              </button>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => downloadTextFile('icecast.xml', broadcastPlan.exportConfigs.icecastXml, 'application/xml')}
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download icecast.xml
                </button>
                <button
                  type="button"
                  onClick={() => downloadTextFile('station.liq', broadcastPlan.exportConfigs.liquidsoapLiq, 'text/plain')}
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download Liquidsoap (.liq)
                </button>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-5">
              <div className="bg-white dark:bg-[#0b1022] border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold mb-3">24-Hour Broadcast EPG Grid</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {broadcastPlan.epgSchedule.map((slot) => (
                    <div key={slot.hourUtc} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                      <div className="flex justify-between font-mono text-cyan-700 dark:text-cyan-400 font-bold mb-1">
                        <span>{slot.hourUtc} ({slot.durationMins}m)</span>
                        <span className="uppercase">{slot.segmentType.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="font-bold text-sm">{slot.blockName}</div>
                      <div className="text-slate-600 dark:text-slate-400 mt-0.5">Role: {slot.hostRole}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-1">Overlay: {slot.lowerThirdOverlay}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-[#0b1022] border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold mb-2">FFmpeg Ingest Command & Scripts</h3>
                <pre className="p-3 rounded-xl bg-slate-950 text-emerald-300 text-xs overflow-x-auto font-mono mb-4">
                  {broadcastPlan.exportConfigs.ffmpegIngestCommand}
                </pre>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="font-bold text-cyan-700 dark:text-cyan-400 mb-1">Station ID Script</div>
                    <p>{broadcastPlan.scripts.stationId}</p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="font-bold text-rose-600 dark:text-rose-400 mb-1">Emergency Interrupt Script</div>
                    <p>{broadcastPlan.scripts.emergencyInterrupt}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MUSIC DISTRIBUTION */}
      {activeTab === 'music_distribution' && (
        <div className="mt-6 space-y-6">
          <div className="bg-slate-900 text-slate-100 border border-emerald-500/40 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <strong className="font-mono text-cyan-300">INTERNAL_PREP_ONLY (PARTNER_API_NOT_CONNECTED): </strong>
              ANNY strictly validates ISRC format, mathematical mod-10 UPC-12/EAN-13 check digits, 100% collaborator splits, and ≥3000×3000px artwork before exporting DDEX ERN JSON & royalty CSVs. Live DSP delivery requires licensed aggregator credentials.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white dark:bg-[#0b1022] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-base font-bold">Release & Metadata Intake</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Artist Name</label>
                  <input
                    type="text"
                    value={releaseForm.artistName}
                    onChange={(e) => setReleaseForm((s) => ({ ...s, artistName: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Release Title</label>
                  <input
                    type="text"
                    value={releaseForm.releaseTitle}
                    onChange={(e) => setReleaseForm((s) => ({ ...s, releaseTitle: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Release Type</label>
                  <select
                    value={releaseForm.releaseType}
                    onChange={(e) => setReleaseForm((s) => ({ ...s, releaseType: e.target.value as ReleaseType }))}
                    className="w-full min-h-[44px] px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  >
                    <option value="Single">Single</option>
                    <option value="EP">EP</option>
                    <option value="Album">Album</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">UPC-12 / EAN-13</label>
                  <input
                    type="text"
                    value={releaseForm.upcOrEan}
                    onChange={(e) => setReleaseForm((s) => ({ ...s, upcOrEan: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-base sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Track Title</label>
                  <input
                    type="text"
                    value={releaseForm.trackTitle}
                    onChange={(e) => setReleaseForm((s) => ({ ...s, trackTitle: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">ISRC (CC-XXX-YY-NNNNN)</label>
                  <input
                    type="text"
                    value={releaseForm.trackIsrc}
                    onChange={(e) => setReleaseForm((s) => ({ ...s, trackIsrc: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-base sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Artist Share (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={releaseForm.splitPrimary}
                    onChange={(e) => setReleaseForm((s) => ({ ...s, splitPrimary: Number(e.target.value) }))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Producer Share (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={releaseForm.splitProducer}
                    onChange={(e) => setReleaseForm((s) => ({ ...s, splitProducer: Number(e.target.value) }))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={runMusicValidation}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold text-sm cursor-pointer"
              >
                {busy ? 'Validating Release...' : 'Validate ISRC / UPC & Prepare DDEX'}
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => downloadTextFile(`${releaseForm.releaseTitle.replace(/\s+/g, '_')}_ddex.json`, releaseResult.ddexStyleJson, 'application/json')}
                  className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Export DDEX JSON
                </button>
                <button
                  type="button"
                  onClick={() => downloadTextFile(`${releaseForm.releaseTitle.replace(/\s+/g, '_')}_splits.csv`, releaseResult.splitSheetCsv, 'text/csv')}
                  className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Export Split CSV
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-5">
              <div className="bg-white dark:bg-[#0b1022] border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold">Validation Report</h3>
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${releaseResult.valid ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                    {releaseResult.valid ? 'METADATA VALIDATED' : 'VALIDATION ERRORS FOUND'}
                  </span>
                </div>

                {releaseResult.errors.length > 0 && (
                  <div className="mb-3 space-y-1 text-xs text-rose-600 dark:text-rose-400">
                    {releaseResult.errors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs mb-4">
                  {releaseResult.dspPartnerStatuses.map((d) => (
                    <div key={d.dsp} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-semibold">{d.dsp}</span>
                      <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">{d.status}</span>
                    </div>
                  ))}
                </div>

                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">DDEX ERN Package Preview</h4>
                <pre className="p-3 rounded-xl bg-slate-950 text-cyan-200 text-xs overflow-x-auto max-h-60 font-mono">
                  {releaseResult.ddexStyleJson}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ONLINE VIDEO STREAMING */}
      {activeTab === 'video_streaming' && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white dark:bg-[#0b1022] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-bold">ABR Video & Captions Config</h2>
              <div>
                <label className="block text-xs font-semibold mb-1">Video Title</label>
                <input
                  type="text"
                  value={videoForm.videoTitle}
                  onChange={(e) => setVideoForm((s) => ({ ...s, videoTitle: e.target.value }))}
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Source Master Filename</label>
                <input
                  type="text"
                  value={videoForm.sourceFileName}
                  onChange={(e) => setVideoForm((s) => ({ ...s, sourceFileName: e.target.value }))}
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Transcript for WebVTT Captions</label>
                <textarea
                  rows={4}
                  value={videoForm.transcriptText}
                  onChange={(e) => setVideoForm((s) => ({ ...s, transcriptText: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm"
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={runVideoPipeline}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold text-sm cursor-pointer"
              >
                {busy ? 'Building ABR Pipeline...' : 'Generate HLS/DASH Ladder & WebVTT'}
              </button>
              <button
                type="button"
                onClick={() => downloadTextFile(`${videoForm.videoTitle.replace(/\s+/g, '_')}.vtt`, videoPipeline.webVttCaptions, 'text/vtt')}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download WebVTT (.vtt)
              </button>
            </div>

            <div className="lg:col-span-8 space-y-5">
              <div className="bg-white dark:bg-[#0b1022] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Multi-Bitrate FFmpeg ABR HLS Command (1080p / 720p / 480p / 360p)
                </h3>
                <pre className="p-3 rounded-xl bg-slate-950 text-emerald-300 text-xs overflow-x-auto font-mono">
                  {videoPipeline.ffmpegAbrHlsCommand}
                </pre>

                <h3 className="text-sm font-bold">Generated WebVTT Caption Track</h3>
                <pre className="p-3 rounded-xl bg-slate-950 text-cyan-200 text-xs overflow-x-auto font-mono">
                  {videoPipeline.webVttCaptions}
                </pre>

                <h3 className="text-sm font-bold">Self-Hostable Streaming Infrastructure</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {videoPipeline.selfHostedStackBlueprint.map((item) => (
                    <div key={item.component} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-cyan-700 dark:text-cyan-400">{item.component}</div>
                      <div className="font-mono text-[11px] font-semibold mt-0.5">{item.technology}</div>
                      <div className="text-slate-600 dark:text-slate-400 mt-1">{item.purpose}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

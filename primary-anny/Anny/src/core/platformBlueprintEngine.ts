/**
 * ANNY — PLATFORM-BUILDING INTELLIGENCE ENGINE (PHASE 6)
 *
 * Supplies deep, production-authentic architectural blueprints when users ask ANNY to build:
 * - Online TV Station
 * - Internet Radio Station
 * - Music Distribution Platform
 * - Video Streaming & Creator Platform
 * - Architecture & CAD Design Studio Platform
 *
 * Injects real backend schemas, worker topologies, Icecast/FFmpeg/MinIO configurations,
 * and honest configured-vs-unconfigured third-party integration checklists into the synthesizer.
 */

export type DomainPlatformArchetype =
  | 'online_tv_station'
  | 'internet_radio_station'
  | 'music_distribution_platform'
  | 'video_streaming_platform'
  | 'architecture_studio_platform'
  | null;

export interface DomainPlatformBlueprint {
  archetype: Exclude<DomainPlatformArchetype, null>;
  label: string;
  recommendedIndustryStyle: string;
  requiredBackendModules: string[];
  databaseTables: string[];
  infrastructureConfigs: string[];
  unconfiguredExternalDependenciesChecklist: string[];
  promptContextBlock: string;
}

export function detectDomainPlatformArchetype(prompt: string): DomainPlatformArchetype {
  const lower = String(prompt || '').toLowerCase();
  if (/\b(online tv|tv station|television network|iptv|broadcast studio|live tv channel)\b/i.test(lower)) {
    return 'online_tv_station';
  }
  if (/\b(internet radio|radio station|fm stream|icecast|liquidsoap|online radio)\b/i.test(lower)) {
    return 'internet_radio_station';
  }
  if (/\b(music distribution|dsp aggregator|record label portal|isrc|ddex|royalty split)\b/i.test(lower)) {
    return 'music_distribution_platform';
  }
  if (/\b(video streaming|vod platform|youtube clone|ott platform|hls streaming|video hosting)\b/i.test(lower)) {
    return 'video_streaming_platform';
  }
  if (/\b(architectural design|floor plan|cad studio|building planner|dxf generator)\b/i.test(lower)) {
    return 'architecture_studio_platform';
  }
  return null;
}

export function buildDomainPlatformBlueprint(prompt: string): DomainPlatformBlueprint | null {
  const archetype = detectDomainPlatformArchetype(prompt);
  if (!archetype) return null;

  const blueprints: Record<Exclude<DomainPlatformArchetype, null>, DomainPlatformBlueprint> = {
    online_tv_station: {
      archetype: 'online_tv_station',
      label: 'Online TV Station & Live Broadcast Platform',
      recommendedIndustryStyle:
        'professional broadcast control-room aesthetic: deep slate charcoal (#0B101B), crisp telemetry white (#F8FAFC), broadcast amber on-air alerts (#F59E0B), crimson live Tally (#EF4444), structured EPG grid',
      requiredBackendModules: [
        'EPG 24h Schedule API (/api/epg)',
        'Live Studio Rundown & Lower-Thirds Controller (/api/rundown)',
        'HLS/RTMP Ingest Manifest Endpoint & Docker Compose (Nginx-RTMP + FFmpeg)',
        'Role-based Producer / Director / Presenter controls',
      ],
      databaseTables: ['channels', 'epg_programs', 'cue_rundowns', 'lower_thirds', 'ad_pods', 'stream_health_events'],
      infrastructureConfigs: ['docker-compose.yml (nginx-rtmp + ffmpeg transcoder)', 'ffmpeg-hls.sh', '.env.example'],
      unconfiguredExternalDependenciesChecklist: [
        'OBS / Hardware Encoder RTMP stream key must point to your live ingest host',
        'CDN distribution (Cloudflare Stream / CloudFront / self-hosted Nginx edge) required for high viewer concurrency',
      ],
      promptContextBlock: '',
    },
    internet_radio_station: {
      archetype: 'internet_radio_station',
      label: 'Internet Radio Station & AutoDJ Platform',
      recommendedIndustryStyle:
        'warm studio broadcast aesthetic: matte obsidian (#101218), brushed brass/amber (#F59E0B), tactile cue buttons, crisp show schedule cards',
      requiredBackendModules: [
        '24h Show Schedule & Rotation API (/api/shows)',
        'Icecast2 + Liquidsoap AutoDJ configuration generator',
        'Listener Request & Live Shoutout Queue (/api/requests)',
        'DJ Script & Station-ID Library',
      ],
      databaseTables: ['shows', 'tracks_library', 'rotation_rules', 'listener_requests', 'on_air_logs'],
      infrastructureConfigs: ['icecast.xml', 'station.liq', 'docker-compose.yml', '.env.example'],
      unconfiguredExternalDependenciesChecklist: [
        'Live Icecast2 server mount & Liquidsoap container must be started to push real MP3/AAC audio streams',
        'PRO music licensing / royalties reporting depends on territory rules',
      ],
      promptContextBlock: '',
    },
    music_distribution_platform: {
      archetype: 'music_distribution_platform',
      label: 'Music Distribution, ISRC/UPC & Royalty Platform',
      recommendedIndustryStyle:
        'clean executive label dashboard: crisp paper white (#FFFFFF) & cool slate (#F1F5F9), deep obsidian ink (#0F172A), emerald validation badges (#059669), tabular ISRC/UPC & split sheets',
      requiredBackendModules: [
        'Release Intake & Track Metadata Validation API (/api/releases)',
        'ISRC & Mathematical Mod-10 UPC-12/EAN-13 Validator',
        '100% Collaborator Royalty Split Ledger & CSV Export',
        'Artwork 3000x3000 Spec Check & DDEX ERN JSON Export',
      ],
      databaseTables: ['artists', 'releases', 'tracks', 'royalty_splits', 'dsp_delivery_queue', 'takedown_requests'],
      infrastructureConfigs: ['.env.example (DSP partner SFTP/API keys)', 'server/schema.sql'],
      unconfiguredExternalDependenciesChecklist: [
        'Spotify / Apple Music / YouTube Music / Boomplay require licensed DDEX partner credentials (mark live delivery as PARTNER_API_NOT_CONNECTED until configured)',
        'ISRC registrant prefix & GS1 UPC prefix must be registered with official agencies',
      ],
      promptContextBlock: '',
    },
    video_streaming_platform: {
      archetype: 'video_streaming_platform',
      label: 'Online Video Distribution & ABR Streaming Platform',
      recommendedIndustryStyle:
        'editorial cinema streaming aesthetic: deep neutral slate (#0D0F14), crisp alabaster ink (#F8FAFC), cobalt action accents (#2563EB), clean 16:9 card grids and adaptive player UI',
      requiredBackendModules: [
        'Video Upload & MinIO/S3 Presigned Ingest Route (/api/videos/upload)',
        'FFmpeg Multi-Bitrate ABR HLS Transcoding Worker Queue (1080p/720p/480p/360p)',
        'WebVTT Captions Manager & HLS.js Player',
        'Moderation Queue & Watch-Time Analytics Telemetry',
      ],
      databaseTables: ['channels', 'videos', 'video_renditions', 'caption_tracks', 'moderation_reviews', 'watch_events'],
      infrastructureConfigs: ['docker-compose.yml (minio + postgres + redis + ffmpeg-worker)', 'transcode-abr.sh', '.env.example'],
      unconfiguredExternalDependenciesChecklist: [
        'MinIO / S3 bucket credentials and FFmpeg worker host must be provisioned for real file transcoding',
        'DRM Widevine/FairPlay license server requires commercial CENC vendor setup',
      ],
      promptContextBlock: '',
    },
    architecture_studio_platform: {
      archetype: 'architecture_studio_platform',
      label: 'Architectural Planning & CAD DXF Studio',
      recommendedIndustryStyle:
        'precision architectural studio aesthetic: crisp blueprint paper white (#F8FAFC) or blueprint navy (#071124), drafting ink (#0F172A), cyan metric callouts (#0284C7), tabular schedules',
      requiredBackendModules: [
        'Spatial Layout & Setback Calculator (/api/plans)',
        'Scaled SVG Floor Plan & Valid AutoCAD DXF R12 Exporter',
        'Room / Door / Window Schedule & Preliminary BOQ Generator',
        '5-Stage Design Workflow Tracker with Explicit Engineering Disclaimer',
      ],
      databaseTables: ['architecture_projects', 'floor_plans', 'room_schedules', 'boq_estimates'],
      infrastructureConfigs: ['server/schema.sql', '.env.example'],
      unconfiguredExternalDependenciesChecklist: [
        'Site survey coordinates, geotech borehole data, and structural engineer stamp happen outside software before construction',
      ],
      promptContextBlock: '',
    },
  };

  const bp = blueprints[archetype];
  bp.promptContextBlock = `
DOMAIN PLATFORM ARCHITECTURE BLUEPRINT (${bp.label}):
- Required Backend & Domain Modules: ${bp.requiredBackendModules.join('; ')}
- Database Tables to include in /server/schema.sql: ${bp.databaseTables.join(', ')}
- Real Infrastructure Config Files to generate alongside the React + Express app: ${bp.infrastructureConfigs.join(', ')}
- HONESTY / INTEGRATION CHECKLIST TO INCLUDE IN UI & README:
  ${bp.unconfiguredExternalDependenciesChecklist.map((c) => `* ${c}`).join('\n  ')}
- Never fake live streaming, live DSP delivery, or engineering stamps when those external credentials/servers are not configured.`;

  return bp;
}

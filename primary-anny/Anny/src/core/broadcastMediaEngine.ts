/**
 * ANNY — TV & RADIO BROADCASTING, MUSIC DISTRIBUTION & VIDEO STREAMING ENGINE
 * (PHASES 3, 4 & 5)
 *
 * Truthful by design:
 * - Phase 3: Produces 24h EPG schedules, studio control rundowns, presenter scripts,
 *   and real exportable Icecast2 XML / Liquidsoap .liq / FFmpeg RTMP+HLS configs.
 *   Clearly separates PLANNING_SIMULATION_ONLY vs LIVE_ENDPOINT_CONFIGURED.
 * - Phase 4: Real ISRC format checks, mathematical mod-10 UPC-12 / EAN-13 check-digit
 *   verification, 100% royalty split validation, >=3000px artwork verification,
 *   DDEX ERN JSON + CSV exports, and honest PARTNER_API_NOT_CONNECTED DSP status.
 * - Phase 5: Real multi-bitrate FFmpeg ABR HLS/DASH commands, WebVTT generator,
 *   self-hostable stack architecture (MinIO/PostgreSQL/Redis+BullMQ/HLS.js).
 */

export type BroadcastMedium = 'tv' | 'radio';

export interface BroadcastPlanInput {
  stationName: string;
  medium: BroadcastMedium;
  format?: string;
  tagline?: string;
  timezone?: string;
  liveEndpointUrl?: string;
}

export interface EpgSlot {
  hourUtc: string;
  blockName: string;
  hostRole: string;
  durationMins: number;
  segmentType: 'live' | 'syndicated' | 'music_rotation' | 'news_bulletin';
  lowerThirdOverlay: string;
}

export interface BroadcastPlanResult {
  stationName: string;
  medium: BroadcastMedium;
  format: string;
  timezone: string;
  executionStatus: 'LIVE_ENDPOINT_CONFIGURED' | 'PLANNING_SIMULATION_ONLY';
  honestyNotice: string;
  epgSchedule: EpgSlot[];
  controlRoomRundown: Array<{ cue: string; timeOffset: string; source: string; lowerThird: string; notes: string }>;
  scripts: {
    stationId: string;
    topOfHourNews: string;
    hostSegue: string;
    emergencyInterrupt: string;
  };
  rotationRules: string[];
  exportConfigs: {
    icecastXml: string;
    liquidsoapLiq: string;
    ffmpegIngestCommand: string;
  };
}

export function generateBroadcastPlan(input: BroadcastPlanInput): BroadcastPlanResult {
  const stationName = (input.stationName || 'Anny Broadcast Network').trim();
  const medium: BroadcastMedium = input.medium === 'radio' ? 'radio' : 'tv';
  const format = (input.format || (medium === 'tv' ? 'News, Culture & Live Studio TV' : 'Afrobeats, Talk & Live DJ Radio')).trim();
  const tagline = (input.tagline || 'Independent Voice. Always On Air.').trim();
  const timezone = (input.timezone || 'Africa/Lagos').trim();
  const hasEndpoint = Boolean(input.liveEndpointUrl && /^https?:\/\/|^rtmps?:\/\//i.test(input.liveEndpointUrl.trim()));

  const epgSchedule: EpgSlot[] = [
    { hourUtc: '00:00', blockName: 'Overnight AutoDJ / Replay Loop', hostRole: 'Automated Playout', durationMins: 360, segmentType: 'music_rotation', lowerThirdOverlay: `${stationName} | Overnight Replay` },
    { hourUtc: '06:00', blockName: 'Morning Wake-Up & Headlines', hostRole: 'Morning Anchor + Producer', durationMins: 180, segmentType: 'live', lowerThirdOverlay: `LIVE: Morning Headlines | ${stationName}` },
    { hourUtc: '09:00', blockName: 'Mid-Morning Culture & Interviews', hostRole: 'Senior Presenter', durationMins: 180, segmentType: 'live', lowerThirdOverlay: `ON AIR: Mid-Morning Studio` },
    { hourUtc: '12:00', blockName: 'Midday News Bulletin & Briefing', hostRole: 'News Desk', durationMins: 60, segmentType: 'news_bulletin', lowerThirdOverlay: `NEWS DESK: Midday Briefing` },
    { hourUtc: '13:00', blockName: 'Afternoon Curated Rotation', hostRole: 'Music Director / Playout', durationMins: 240, segmentType: 'music_rotation', lowerThirdOverlay: `NOW PLAYING | ${format}` },
    { hourUtc: '17:00', blockName: 'Drive-Time Live Studio', hostRole: 'Drive Host + Live Call-Ins', durationMins: 180, segmentType: 'live', lowerThirdOverlay: `DRIVE TIME LIVE | ${tagline}` },
    { hourUtc: '20:00', blockName: 'Prime Time Feature / Evening Show', hostRole: 'Executive Producer', durationMins: 120, segmentType: 'syndicated', lowerThirdOverlay: `PRIME TIME | ${stationName}` },
    { hourUtc: '22:00', blockName: 'Late Night Sessions', hostRole: 'Resident DJ / Host', durationMins: 120, segmentType: 'music_rotation', lowerThirdOverlay: `LATE NIGHT SESSIONS | ${stationName}` },
  ];

  const controlRoomRundown = [
    { cue: 'CUE-01', timeOffset: '00:00:00', source: 'Playout Server / Bumper Deck', SourceType: 'Video/Audio', lowerThird: `${stationName} — LIVE`, notes: 'Roll 10s station ID + open mic gate' },
    { cue: 'CUE-02', timeOffset: '00:00:12', source: medium === 'tv' ? 'CAM-1 Wide Studio' : 'Studio Mic A', lowerThird: `Host: Live Desk`, notes: 'Presenter greeting & top 3 headlines' },
    { cue: 'CUE-03', timeOffset: '00:05:00', source: 'VTR / Audio Package A', lowerThird: `SPECIAL REPORT`, notes: 'Play pre-cleared package; prep guest audio' },
    { cue: 'CUE-04', timeOffset: '00:14:30', source: 'Spot Break / Sponsor Pod', lowerThird: `Back in 90s`, notes: 'Fire automated ad pod & reset talkback' },
  ].map(({ cue, timeOffset, source, lowerThird, notes }) => ({ cue, timeOffset, source, lowerThird, notes }));

  const slug = stationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'anny-station';

  const icecastXml = `<icecast>
  <location>${timezone}</location>
  <limits>
    <clients>500</clients>
    <sources>4</sources>
  </limits>
  <authentication>
    <source-password>\${ICECAST_SOURCE_PASSWORD}</source-password>
    <admin-password>\${ICECAST_ADMIN_PASSWORD}</admin-password>
  </authentication>
  <mount type="normal">
    <mount-name>/${slug}.mp3</mount-name>
    <fallback-mount>/${slug}-autodj.mp3</fallback-mount>
    <fallback-override>1</fallback-override>
    <stream-name>${stationName}</stream-name>
    <stream-description>${tagline}</stream-description>
  </mount>
</icecast>`;

  const liquidsoapLiq = `# Liquidsoap Playout Configuration for ${stationName}
set("log.stdout", true)
music = playlist(mode="randomize", reload=3600, "/media/library/rotation.m3u")
jingles = playlist(mode="normal", "/media/library/station_ids.m3u")
autodj = rotate(weights=[5, 1], [music, jingles])
live_dj = input.harbor("${slug}-live", port=8005, password="\${LIQUIDSOAP_HARBOR_PASSWORD}")
radio = fallback(track_sensitive=false, [strip_blank(max_blank=5., live_dj), mksafe(autodj)])
output.icecast(%mp3(bitrate=192), host="127.0.0.1", port=8000, password="\${ICECAST_SOURCE_PASSWORD}", mount="/${slug}.mp3", name="${stationName}", radio)`;

  const ffmpegIngestCommand =
    medium === 'tv'
      ? `ffmpeg -re -i rtmp://127.0.0.1:1935/live/${slug} \\
  -c:v libx264 -preset veryfast -g 48 -sc_threshold 0 \\
  -c:a aac -b:a 128k -ar 48000 \\
  -f hls -hls_time 4 -hls_list_size 6 -hls_flags delete_segments+append_list \\
  /var/www/hls/${slug}/live.m3u8`
      : `ffmpeg -re -i /media/library/input.wav -c:a libmp3lame -b:a 192k -content_type audio/mpeg icecast://source:\${ICECAST_SOURCE_PASSWORD}@127.0.0.1:8000/${slug}.mp3`;

  return {
    stationName,
    medium,
    format,
    timezone,
    executionStatus: hasEndpoint ? 'LIVE_ENDPOINT_CONFIGURED' : 'PLANNING_SIMULATION_ONLY',
    honestyNotice: hasEndpoint
      ? `Broadcast endpoint reference registered (${input.liveEndpointUrl}). Verify live stream health on your media ingest server.`
      : 'PLANNING & CONFIG MODE ONLY: No live Icecast/RTMP broadcast server is currently attached in this session. Generated schedules, scripts, and Icecast/Liquidsoap/FFmpeg configs are ready for deployment.',
    epgSchedule,
    controlRoomRundown,
    scripts: {
      stationId: `You are tuned into ${stationName} — ${tagline}. Broadcasting live in ${timezone}.`,
      topOfHourNews: `From the ${stationName} newsroom, it is the top of the hour. Here are the verified stories shaping the day.`,
      hostSegue: `Coming up next on ${stationName}, stay locked in as we dive into live ${format} programming and listener feedback.`,
      emergencyInterrupt: `Attention: ${stationName} interrupts scheduled programming for an urgent verified public safety advisory. Stand by for official details.`,
    },
    rotationRules: [
      'A-Rotation (Current Hits / Priority Segments): max 1 play every 2h 30m, artist separation >= 60m.',
      'Station ID Sweeper every 20 minutes; hard top-of-hour legal station ID at :00:00.',
      'Loudness target: -14 LUFS integrated for web streaming, -24 LKFS for broadcast TV compliance.',
    ],
    exportConfigs: {
      icecastXml,
      liquidsoapLiq,
      ffmpegIngestCommand,
    },
  };
}

// ============================================================================
// PHASE 4 — MUSIC DISTRIBUTION VALIDATION & DDEX/SPLIT PACKAGE GENERATOR
// ============================================================================

export type ReleaseType = 'Single' | 'EP' | 'Album';

export interface MusicTrackInput {
  title: string;
  isrc?: string;
  explicit?: boolean;
  durationSeconds?: number;
  composers?: string[];
  producers?: string[];
}

export interface RoyaltySplitInput {
  collaboratorName: string;
  role: string;
  percentage: number;
  proAffiliation?: string;
}

export interface MusicReleaseInput {
  artistName: string;
  releaseTitle: string;
  releaseType: ReleaseType;
  primaryGenre: string;
  releaseDate: string;
  upcOrEan?: string;
  labelName?: string;
  rightsOwner: string;
  artworkWidthPx?: number;
  artworkHeightPx?: number;
  tracks: MusicTrackInput[];
  royaltySplits: RoyaltySplitInput[];
  targetDsps?: string[];
}

export interface MusicReleaseValidationResult {
  valid: boolean;
  distributionState: 'INTERNAL_PREP_ONLY';
  dspPartnerStatuses: Array<{ dsp: string; status: 'PARTNER_API_NOT_CONNECTED'; readinessNote: string }>;
  releaseSummary: {
    artistName: string;
    releaseTitle: string;
    releaseType: ReleaseType;
    trackCount: number;
    barcodeValid: boolean | null;
    royaltySplitTotal: number;
    artworkCompliant: boolean;
  };
  errors: string[];
  warnings: string[];
  ddexStyleJson: string;
  splitSheetCsv: string;
  takedownPacketTemplate: string;
}

/**
 * Validates ISRC format: CC-XXX-YY-NNNNN (or compact 12-char CCXXXYYNNNNN)
 */
export function validateIsrc(rawIsrc: string): { valid: boolean; normalized: string; reason?: string } {
  const cleaned = String(rawIsrc || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/.test(cleaned)) {
    return {
      valid: false,
      normalized: rawIsrc,
      reason: 'ISRC must match CC-XXX-YY-NNNNN (2-letter country, 3-char registrant, 2-digit year, 5-digit designation).',
    };
  }
  const normalized = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 7)}-${cleaned.slice(7, 12)}`;
  return { valid: true, normalized };
}

/**
 * Mathematical mod-10 GTIN check-digit validator for UPC-A (12 digits) and EAN-13 (13 digits).
 */
export function validateBarcodeCheckDigit(rawCode: string): {
  valid: boolean;
  format: 'UPC-12' | 'EAN-13' | 'INVALID';
  expectedCheckDigit?: number;
  actualCheckDigit?: number;
  reason?: string;
} {
  const digits = String(rawCode || '').trim().replace(/\s|-/g, '');
  if (!/^\d{12,13}$/.test(digits)) {
    return { valid: false, format: 'INVALID', reason: 'Barcode must be exactly 12 digits (UPC-A) or 13 digits (EAN-13).' };
  }

  const format = digits.length === 12 ? 'UPC-12' : 'EAN-13';
  const payload = digits.slice(0, -1).split('').map(Number);
  const actualCheckDigit = Number(digits[digits.length - 1]);

  // GS1 standard: walking from rightmost data digit leftward, alternating weight 3, 1, 3, 1...
  let weightedSum = 0;
  for (let i = 0; i < payload.length; i++) {
    const posFromRight = payload.length - 1 - i;
    const weight = posFromRight % 2 === 0 ? 3 : 1;
    weightedSum += payload[i] * weight;
  }

  const expectedCheckDigit = (10 - (weightedSum % 10)) % 10;
  if (actualCheckDigit !== expectedCheckDigit) {
    return {
      valid: false,
      format,
      expectedCheckDigit,
      actualCheckDigit,
      reason: `${format} check digit mismatch: expected ${expectedCheckDigit}, got ${actualCheckDigit}.`,
    };
  }

  return { valid: true, format, expectedCheckDigit, actualCheckDigit };
}

export function validateAndPrepareMusicRelease(input: MusicReleaseInput): MusicReleaseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const artistName = String(input.artistName || '').trim();
  const releaseTitle = String(input.releaseTitle || '').trim();
  const rightsOwner = String(input.rightsOwner || '').trim();
  const tracks = Array.isArray(input.tracks) ? input.tracks : [];
  const splits = Array.isArray(input.royaltySplits) ? input.royaltySplits : [];

  if (!artistName) errors.push('Artist name is required.');
  if (!releaseTitle) errors.push('Release title is required.');
  if (!rightsOwner) errors.push('Rights owner / phonographic copyright holder is required.');

  if (tracks.length === 0) {
    errors.push('At least 1 track is required.');
  } else if (input.releaseType === 'Single' && tracks.length > 3) {
    warnings.push('Single releases typically contain 1–3 tracks; consider classifying as EP (4–6) or Album (7+).');
  } else if (input.releaseType === 'EP' && (tracks.length < 4 || tracks.length > 6)) {
    warnings.push('EP releases typically contain 4–6 tracks.');
  } else if (input.releaseType === 'Album' && tracks.length < 7) {
    warnings.push('Album releases typically contain 7 or more tracks.');
  }

  const normalizedTracks = tracks.map((t, idx) => {
    const title = String(t.title || '').trim();
    if (!title) errors.push(`Track #${idx + 1} is missing a title.`);
    let normalizedIsrc = t.isrc || '';
    if (t.isrc) {
      const check = validateIsrc(t.isrc);
      if (!check.valid) {
        errors.push(`Track #${idx + 1} (${title || 'untitled'}): ${check.reason}`);
      } else {
        normalizedIsrc = check.normalized;
      }
    } else {
      warnings.push(`Track #${idx + 1} (${title || 'untitled'}) has no ISRC assigned yet — obtain/assign ISRC before DSP ingestion.`);
    }
    return {
      trackNumber: idx + 1,
      title,
      isrc: normalizedIsrc || null,
      explicit: Boolean(t.explicit),
      durationSeconds: Number(t.durationSeconds) || 0,
      composers: t.composers || [],
      producers: t.producers || [],
    };
  });

  let barcodeValid: boolean | null = null;
  if (input.upcOrEan && input.upcOrEan.trim()) {
    const bc = validateBarcodeCheckDigit(input.upcOrEan);
    barcodeValid = bc.valid;
    if (!bc.valid) {
      errors.push(bc.reason || 'Invalid UPC/EAN barcode check digit.');
    }
  } else {
    warnings.push('No UPC-12 / EAN-13 barcode supplied — distributor must allocate a valid GS1 barcode prior to delivery.');
  }

  const artW = Number(input.artworkWidthPx) || 0;
  const artH = Number(input.artworkHeightPx) || 0;
  const artworkCompliant = artW >= 3000 && artH >= 3000 && artW === artH;
  if (!artW || !artH) {
    errors.push('Cover artwork dimensions must be specified and verified (>= 3000x3000px square).');
  } else if (!artworkCompliant) {
    errors.push(`Cover artwork (${artW}x${artH}px) does not meet DSP minimum 3000x3000px square RGB specification.`);
  }

  const splitTotal = Math.round(splits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0) * 100) / 100;
  if (splits.length === 0) {
    errors.push('At least one collaborator royalty split summing to 100% is required.');
  } else if (Math.abs(splitTotal - 100) > 0.01) {
    errors.push(`Royalty splits total ${splitTotal}% — collaborator shares must sum to exactly 100%.`);
  }

  const dsps = (input.targetDsps && input.targetDsps.length > 0
    ? input.targetDsps
    : ['Spotify', 'Apple Music', 'YouTube Music', 'Boomplay', 'Audiomack']
  ).map((dsp) => ({
    dsp,
    status: 'PARTNER_API_NOT_CONNECTED' as const,
    readinessNote:
      errors.length === 0
        ? 'Release metadata package validated locally. Requires licensed aggregator/DDEX partner SFTP or API credentials to transmit.'
        : 'Fix release validation errors above before aggregator submission.',
  }));

  const ddexPayload = {
    schema: 'ERN-4.3-PREP-PACKAGE',
    distributionState: 'INTERNAL_PREP_ONLY',
    liveDeliveryPerformed: false,
    release: {
      artistName,
      releaseTitle,
      releaseType: input.releaseType,
      primaryGenre: input.primaryGenre || 'Afrobeats / Contemporary',
      releaseDate: input.releaseDate || new Date().toISOString().slice(0, 10),
      upcOrEan: input.upcOrEan || null,
      labelName: input.labelName || 'Independent / Self-Released',
      rightsOwner,
      artworkSpec: { widthPx: artW, heightPx: artH, compliant: artworkCompliant },
    },
    tracks: normalizedTracks,
    royaltySplits: splits,
  };

  const splitSheetCsv = [
    'Collaborator,Role,SharePercent,PRO_Affiliation',
    ...splits.map((s) => `"${String(s.collaboratorName || '').replace(/"/g, '""')}","${String(s.role || '').replace(/"/g, '""')}",${Number(s.percentage) || 0},"${String(s.proAffiliation || 'N/A').replace(/"/g, '""')}"`),
  ].join('\n');

  const takedownPacketTemplate = `TAKEDOWN / UPDATE REQUEST PACKET (INTERNAL PREP)\nArtist: ${artistName}\nRelease: ${releaseTitle}\nUPC/EAN: ${input.upcOrEan || 'UNASSIGNED'}\nRights Holder: ${rightsOwner}\nRequested Action: FULL_CATALOG_TAKEDOWN\nDSP Notice: Transmit via authorized aggregator/DDEX portal (ANNY does not hold live DSP takedown keys).`;

  return {
    valid: errors.length === 0,
    distributionState: 'INTERNAL_PREP_ONLY',
    dspPartnerStatuses: dsps,
    releaseSummary: {
      artistName,
      releaseTitle,
      releaseType: input.releaseType,
      trackCount: tracks.length,
      barcodeValid,
      royaltySplitTotal: splitTotal,
      artworkCompliant,
    },
    errors,
    warnings,
    ddexStyleJson: JSON.stringify(ddexPayload, null, 2),
    splitSheetCsv,
    takedownPacketTemplate,
  };
}

// ============================================================================
// PHASE 5 — ONLINE VIDEO DISTRIBUTION & ABR STREAMING PIPELINE
// ============================================================================

export interface CaptionSegmentInput {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface VideoPipelineInput {
  videoTitle: string;
  sourceFileName?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  enableDrmNotes?: boolean;
  captionSegments?: CaptionSegmentInput[];
  transcriptText?: string;
}

export interface VideoPipelineResult {
  videoTitle: string;
  ffmpegAbrHlsCommand: string;
  ffmpegDashCommand: string;
  masterManifestTemplate: string;
  webVttCaptions: string;
  selfHostedStackBlueprint: Array<{ component: string; technology: string; purpose: string }>;
  moderationAndAnalyticsSchema: {
    moderationStates: string[];
    qoeMetrics: string[];
  };
  honestyNotice: string;
}

function formatVttTimestamp(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hrs = Math.floor(clamped / 3600);
  const mins = Math.floor((clamped % 3600) / 60);
  const secs = Math.floor(clamped % 60);
  const ms = Math.round((clamped - Math.floor(clamped)) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function generateWebVttCaptions(
  segments?: CaptionSegmentInput[],
  fallbackTranscript?: string
): string {
  const cues: CaptionSegmentInput[] = [];
  if (Array.isArray(segments) && segments.length > 0) {
    for (const seg of segments) {
      if (String(seg.text || '').trim()) {
        cues.push({
          startSeconds: Number(seg.startSeconds) || 0,
          endSeconds: Math.max((Number(seg.startSeconds) || 0) + 1, Number(seg.endSeconds) || 3),
          text: String(seg.text).trim(),
        });
      }
    }
  } else if (fallbackTranscript && fallbackTranscript.trim()) {
    const sentences = fallbackTranscript
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    let cursor = 0;
    for (const line of sentences) {
      const duration = Math.max(2.5, Math.min(7, line.split(/\s+/).length * 0.45));
      cues.push({ startSeconds: cursor, endSeconds: cursor + duration, text: line });
      cursor += duration;
    }
  } else {
    cues.push({ startSeconds: 0, endSeconds: 4, text: 'Welcome to the stream. Captions configured via WebVTT.' });
  }

  return (
    'WEBVTT\n\n' +
    cues
      .map((c, idx) => `${idx + 1}\n${formatVttTimestamp(c.startSeconds)} --> ${formatVttTimestamp(c.endSeconds)}\n${c.text}\n`)
      .join('\n')
  );
}

export function generateVideoStreamingPipeline(input: VideoPipelineInput): VideoPipelineResult {
  const videoTitle = (input.videoTitle || 'Platform Master Video').trim();
  const safeSlug = videoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'stream';
  const sourceFile = (input.sourceFileName || 'source_master.mp4').replace(/[^a-zA-Z0-9._-]/g, '_');

  const ffmpegAbrHlsCommand = `ffmpeg -i ${sourceFile} \\
  -filter_complex "[0:v]split=4[v1][v2][v3][v4]; \\
    [v1]scale=w=1920:h=1080:force_original_aspect_ratio=decrease[v1out]; \\
    [v2]scale=w=1280:h=720:force_original_aspect_ratio=decrease[v2out]; \\
    [v3]scale=w=854:h=480:force_original_aspect_ratio=decrease[v3out]; \\
    [v4]scale=w=640:h=360:force_original_aspect_ratio=decrease[v4out]" \\
  -map "[v1out]" -c:v:0 libx264 -b:v:0 5000k -maxrate:v:0 5350k -bufsize:v:0 7500k \\
  -map "[v2out]" -c:v:1 libx264 -b:v:1 2800k -maxrate:v:1 2996k -bufsize:v:1 4200k \\
  -map "[v3out]" -c:v:2 libx264 -b:v:2 1400k -maxrate:v:2 1498k -bufsize:v:2 2100k \\
  -map "[v4out]" -c:v:3 libx264 -b:v:3 800k  -maxrate:v:3 856k  -bufsize:v:3 1200k \\
  -map a:0 -map a:0 -map a:0 -map a:0 -c:a aac -b:a 128k -ac 2 \\
  -var_stream_map "v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:480p v:3,a:3,name:360p" \\
  -master_pl_name master.m3u8 \\
  -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${safeSlug}_%v/seg_%04d.ts" \\
  "${safeSlug}_%v/index.m3u8"`;

  const ffmpegDashCommand = `ffmpeg -i ${sourceFile} -c:v libx264 -c:a aac -b:v:0 5000k -s:v:0 1920x1080 -b:v:1 1800k -s:v:1 1280x720 -use_timeline 1 -use_template 1 -adaptation_sets "id=0,streams=v id=1,streams=a" -f dash ${safeSlug}_dash.mpd`;

  const masterManifestTemplate = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5128000,RESOLUTION=1920x1080
${safeSlug}_1080p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2928000,RESOLUTION=1280x720
${safeSlug}_720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1528000,RESOLUTION=854x480
${safeSlug}_480p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=928000,RESOLUTION=640x360
${safeSlug}_360p/index.m3u8`;

  const webVttCaptions = generateWebVttCaptions(input.captionSegments, input.transcriptText);

  return {
    videoTitle,
    ffmpegAbrHlsCommand,
    ffmpegDashCommand,
    masterManifestTemplate,
    webVttCaptions,
    selfHostedStackBlueprint: [
      { component: 'Ingest & Storage', technology: 'MinIO / S3 Presigned Multipart Upload', purpose: 'Direct browser upload to raw-media bucket with SHA-256 verification' },
      { component: 'Transcode Worker Queue', technology: 'RabbitMQ or Redis + BullMQ + FFmpeg Worker', purpose: 'Asynchronously produces 1080p/720p/480p/360p HLS segments + thumbnail sprite sheets' },
      { component: 'Catalog & Rights DB', technology: 'PostgreSQL', purpose: 'Stores video assets, moderation status, geo/DRM policies, and creator ownership' },
      { component: 'Adaptive Player & Edge', technology: 'HLS.js + Nginx/Cloudflare CDN', purpose: 'Serves segmented .m3u8/.ts + WebVTT captions with byte-range caching' },
      { component: 'Watch-Time Analytics', technology: 'ClickHouse / Postgres Heartbeat Events', purpose: 'Records play, buffering stalls, bitrate switches, and completion funnels' },
    ],
    moderationAndAnalyticsSchema: {
      moderationStates: ['UPLOADED_RAW', 'TRANSCODING', 'AUTOMATED_POLICY_SCAN', 'HUMAN_REVIEW_QUEUE', 'PUBLISHED', 'TAKEDOWN_RESTRICTED'],
      qoeMetrics: ['startup_time_ms', 'rebuffer_ratio', 'average_bitrate_kbps', 'watch_duration_seconds', 'completion_rate'],
    },
    honestyNotice:
      'Generated real ABR transcoding commands, manifests, and WebVTT files. Actual video transcoding requires executing FFmpeg on your worker server with uploaded source media.',
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  calculateAutoTextareaHeight,
  shouldSubmitOnKeyDown,
  canSubmitPrompt,
  resolveDraftAfterFailedSend,
} from '../components/chat/composerUtils';
import { AnnyPromptComposer } from '../components/chat/AnnyPromptComposer';
import {
  generateArchitecturePlan,
  detectBriefGaps,
  exportArchitecturalReportMarkdown,
} from '../core/architectureDesignEngine';
import {
  generateBroadcastPlan,
  validateIsrc,
  validateBarcodeCheckDigit,
  validateAndPrepareMusicRelease,
  generateVideoStreamingPipeline,
  generateWebVttCaptions,
} from '../core/broadcastMediaEngine';
import {
  detectDomainPlatformArchetype,
  buildDomainPlatformBlueprint,
} from '../core/platformBlueprintEngine';
import { classifyProjectRequest, synthesizeAppFiles } from '../core/realAppCodeSynthesizer';
import { agentRegistry } from '../core/agentRegistry';
import { annyCapabilityTruthRegistry } from '../core/annyCapabilityTruthRegistry';
import { aiProviderPlatform } from './aiProviderPlatform';

test('Phase 1: composerUtils handles multiline auto-grow, Shift+Enter, mobile Enter, IME, and failed-send draft restoration', () => {
  const shortBox = calculateAutoTextareaHeight({ scrollHeight: 40, minHeight: 52, maxHeight: 220 });
  assert.equal(shortBox.heightPx, 52);
  assert.equal(shortBox.overflowY, 'hidden');

  const tallBox = calculateAutoTextareaHeight({ scrollHeight: 360, minHeight: 52, maxHeight: 220 });
  assert.equal(tallBox.heightPx, 220);
  assert.equal(tallBox.overflowY, 'auto');

  // Desktop keyboard rules
  assert.equal(shouldSubmitOnKeyDown({ key: 'Enter', shiftKey: false }, { isTouchPrimary: false }), true);
  assert.equal(shouldSubmitOnKeyDown({ key: 'Enter', shiftKey: true }, { isTouchPrimary: false }), false);
  assert.equal(shouldSubmitOnKeyDown({ key: 'Enter', isComposing: true }, { isTouchPrimary: false }), false);

  // Touch / mobile keyboard inserts newline on Enter, submits on Ctrl/Cmd+Enter
  assert.equal(shouldSubmitOnKeyDown({ key: 'Enter', shiftKey: false }, { isTouchPrimary: true }), false);
  assert.equal(shouldSubmitOnKeyDown({ key: 'Enter', metaKey: true }, { isTouchPrimary: true }), true);

  // Draft recovery & submission guard
  assert.equal(canSubmitPrompt({ prompt: '   ', attachedCount: 0, hasVisionSnapshot: false, isWorking: false }), false);
  assert.equal(canSubmitPrompt({ prompt: 'Design a duplex', attachedCount: 0, hasVisionSnapshot: false, isWorking: false }), true);
  assert.equal(canSubmitPrompt({ prompt: 'Design a duplex', attachedCount: 0, hasVisionSnapshot: false, isWorking: true }), false);
  assert.equal(resolveDraftAfterFailedSend('', 'Keep my multi-line prompt\nSecond line'), 'Keep my multi-line prompt\nSecond line');
  assert.equal(resolveDraftAfterFailedSend('New typed prompt', 'Old failed draft'), 'New typed prompt');
});

test('Phase 2: architectureDesignEngine builds non-overlapping multi-floor layouts, valid SVG, valid DXF R12, and honest disclaimers', () => {
  const gaps = detectBriefGaps({ typology: 'duplex' });
  assert.ok(gaps.clarifyingQuestions.length >= 2);
  assert.ok(gaps.appliedAssumptions.length >= 2);

  const plan = generateArchitecturePlan({
    projectName: 'Abuja Passive Cooling Residence',
    typology: 'duplex',
    climate: 'tropical_west_africa',
    location: 'Abuja, Nigeria',
    plotWidthM: 20,
    plotDepthM: 32,
    bedrooms: 4,
    floors: 2,
  });

  assert.equal(plan.floors, 2);
  assert.ok(plan.rooms.length >= 10);
  assert.ok(plan.siteCoveragePercent > 15 && plan.siteCoveragePercent < 80);

  // Mathematically verify zero room overlaps on every floor
  for (const floorNum of [1, 2]) {
    const floorRooms = plan.rooms.filter((r) => r.floor === floorNum);
    for (let i = 0; i < floorRooms.length; i++) {
      for (let j = i + 1; j < floorRooms.length; j++) {
        const a = floorRooms[i];
        const b = floorRooms[j];
        const overlapX = Math.min(a.xM + a.widthM, b.xM + b.widthM) - Math.max(a.xM, b.xM);
        const overlapY = Math.min(a.yM + a.depthM, b.yM + b.depthM) - Math.max(a.yM, b.yM);
        assert.ok(
          overlapX <= 0.01 || overlapY <= 0.01,
          `Rooms "${a.name}" and "${b.name}" overlap on floor ${floorNum}`
        );
      }
    }
  }

  // Verify SVG schematic, front elevation SVG, elevation datums, & disclaimer
  assert.ok(plan.svgFloorPlan.startsWith('<svg '));
  assert.ok(plan.svgFloorPlan.includes('NOT FOR CONSTRUCTION'));
  assert.ok(plan.svgFrontElevation.startsWith('<svg '));
  assert.ok(plan.svgFrontElevation.includes('SCHEMATIC SOUTH ELEVATION'));
  assert.ok(plan.elevationAndSectionSummary.ridgeHeightM > plan.elevationAndSectionSummary.plinthHeightM);

  // Verify Markdown brief export
  const mdReport = exportArchitecturalReportMarkdown(plan);
  assert.ok(mdReport.includes('Abuja Passive Cooling Residence'));
  assert.ok(mdReport.includes('## 3. Room Schedule'));
  assert.ok(mdReport.includes('## 6. Preliminary BOQ Guidance'));

  // Verify commercial & institutional typologies
  for (const typology of ['bungalow', 'office_hub', 'clinic', 'studio_broadcast'] as const) {
    const commercial = generateArchitecturePlan({ typology, floors: typology === 'bungalow' ? 1 : 2 });
    assert.ok(commercial.roomSchedule.length >= 4);
    assert.ok(commercial.svgFrontElevation.startsWith('<svg '));
  }

  // Verify genuine ASCII AutoCAD DXF R12 sections
  assert.ok(plan.dxfR12Content.includes('AC1009'));
  assert.ok(plan.dxfR12Content.includes('SECTION\n2\nENTITIES'));
  assert.ok(plan.dxfR12Content.includes('LINE'));
  assert.ok(plan.dxfR12Content.trimEnd().endsWith('EOF'));

  // Verify 5-stage workflow tracker & honesty
  assert.equal(plan.workflowStages.length, 5);
  assert.match(plan.honestyDisclaimer, /NOT a stamped construction drawing/i);
});

test('Phase 3: broadcastMediaEngine builds 24h EPG, scripts, Icecast/Liquidsoap/FFmpeg configs, and truthful endpoint status', () => {
  const simPlan = generateBroadcastPlan({
    stationName: 'King Ken Radio',
    medium: 'radio',
    format: 'Afrobeats & Talk',
    timezone: 'Africa/Lagos',
  });
  assert.equal(simPlan.executionStatus, 'PLANNING_SIMULATION_ONLY');
  assert.ok(simPlan.epgSchedule.length >= 6);
  assert.ok(simPlan.exportConfigs.icecastXml.includes('<icecast>'));
  assert.ok(simPlan.exportConfigs.liquidsoapLiq.includes('output.icecast'));
  assert.ok(simPlan.exportConfigs.ffmpegIngestCommand.includes('ffmpeg'));

  const livePlan = generateBroadcastPlan({
    stationName: 'King Ken TV',
    medium: 'tv',
    liveEndpointUrl: 'https://stream.example.com/live/master.m3u8',
  });
  assert.equal(livePlan.executionStatus, 'LIVE_ENDPOINT_CONFIGURED');
  assert.ok(livePlan.exportConfigs.ffmpegIngestCommand.includes('-f hls'));
});

test('Phase 4: music distribution validates ISRC, mathematical mod-10 UPC-12 / EAN-13 check digits, splits=100%, artwork>=3000px, and honest DSP status', () => {
  assert.equal(validateIsrc('NG-KKS-26-00001').valid, true);
  assert.equal(validateIsrc('BAD-ISRC').valid, false);

  // Standard GS1 check-digit verification
  assert.equal(validateBarcodeCheckDigit('036000291452').valid, true); // Valid UPC-12
  assert.equal(validateBarcodeCheckDigit('036000291459').valid, false); // Bad check digit
  assert.equal(validateBarcodeCheckDigit('4006381333931').valid, true); // Valid EAN-13
  assert.equal(validateBarcodeCheckDigit('4006381333939').valid, false); // Bad check digit

  const validRelease = validateAndPrepareMusicRelease({
    artistName: 'King Ken',
    releaseTitle: 'Gold Horizon',
    releaseType: 'Single',
    primaryGenre: 'Afrobeats',
    releaseDate: '2026-12-01',
    upcOrEan: '036000291452',
    rightsOwner: 'King Ken Studios',
    artworkWidthPx: 3000,
    artworkHeightPx: 3000,
    tracks: [{ title: 'Gold Horizon', isrc: 'NG-KKS-26-00001', explicit: false, durationSeconds: 205 }],
    royaltySplits: [
      { collaboratorName: 'King Ken', role: 'Artist', percentage: 60 },
      { collaboratorName: 'Producer X', role: 'Producer', percentage: 40 },
    ],
  });

  assert.equal(validRelease.valid, true);
  assert.equal(validRelease.distributionState, 'INTERNAL_PREP_ONLY');
  assert.ok(validRelease.dspPartnerStatuses.every((d) => d.status === 'PARTNER_API_NOT_CONNECTED'));
  assert.ok(validRelease.ddexStyleJson.includes('"schema": "ERN-4.3-PREP-PACKAGE"'));
  assert.ok(validRelease.splitSheetCsv.includes('King Ken'));

  const badRelease = validateAndPrepareMusicRelease({
    artistName: 'King Ken',
    releaseTitle: 'Broken Release',
    releaseType: 'Single',
    primaryGenre: 'Afrobeats',
    releaseDate: '2026-12-01',
    upcOrEan: '036000291459',
    rightsOwner: 'King Ken Studios',
    artworkWidthPx: 1200,
    artworkHeightPx: 1200,
    tracks: [{ title: 'Track 1', isrc: 'INVALID', explicit: false }],
    royaltySplits: [{ collaboratorName: 'King Ken', role: 'Artist', percentage: 80 }],
  });
  assert.equal(badRelease.valid, false);
  assert.ok(badRelease.errors.length >= 4);
});

test('Phase 5: video streaming generates multi-bitrate FFmpeg ABR commands and valid WebVTT captions', () => {
  const vtt = generateWebVttCaptions(undefined, 'First sentence. Second sentence here.');
  assert.ok(vtt.startsWith('WEBVTT'));
  assert.ok(vtt.includes('-->'));

  const pipe = generateVideoStreamingPipeline({
    videoTitle: 'Anny Tech Keynote',
    sourceFileName: 'keynote.mp4',
    transcriptText: 'Hello world. Adaptive bitrate streaming works smoothly.',
  });
  assert.ok(pipe.ffmpegAbrHlsCommand.includes('1920:h=1080'));
  assert.ok(pipe.ffmpegAbrHlsCommand.includes('640:h=360'));
  assert.ok(pipe.masterManifestTemplate.includes('#EXT-X-STREAM-INF'));
  assert.ok(pipe.selfHostedStackBlueprint.length >= 4);
});

test('Phase 6: domain platform blueprints, synthesizer classification, agents, and capability truth registry stay aligned', () => {
  assert.equal(detectDomainPlatformArchetype('Build me an online TV station platform'), 'online_tv_station');
  assert.equal(detectDomainPlatformArchetype('Build me an internet radio station with AutoDJ'), 'internet_radio_station');
  assert.equal(detectDomainPlatformArchetype('Build a music distribution platform with ISRC and royalty splits'), 'music_distribution_platform');
  assert.equal(detectDomainPlatformArchetype('Build a video streaming VOD platform'), 'video_streaming_platform');

  const bp = buildDomainPlatformBlueprint('Build me an online TV station platform');
  assert.ok(bp && bp.databaseTables.includes('epg_programs'));

  const classified = classifyProjectRequest('Build me an online TV station platform');
  assert.equal(classified.requiresBackend, true);
  assert.equal(classified.projectType, 'fullstack_web_app');

  assert.ok(agentRegistry.getAgent('architectural_designer'));
  assert.ok(agentRegistry.getAgent('broadcast_director'));
  assert.ok(agentRegistry.getAgent('music_distribution_lead'));
  assert.ok(agentRegistry.getAgent('video_streaming_architect'));

  assert.ok(annyCapabilityTruthRegistry.getCapability('ARCHITECTURE_PLANNING'));
  assert.ok(annyCapabilityTruthRegistry.getCapability('BROADCAST_STUDIO_PLANNING'));
  assert.ok(annyCapabilityTruthRegistry.getCapability('MUSIC_DISTRIBUTION_PREP'));
  assert.ok(annyCapabilityTruthRegistry.getCapability('VIDEO_STREAMING_PIPELINE'));
});

test('Phase 7A: AnnyPromptComposer renders mobile-zoom-safe >=16px inputs, accessible pinch-to-zoom HTML, and high-contrast light/dark themes', () => {
  const noop = () => {};
  const lightMarkup = renderToStaticMarkup(
    React.createElement(AnnyPromptComposer, {
      prompt: 'Design an online TV broadcast portal',
      setPrompt: noop,
      onSend: noop,
      onStop: noop,
      isWorking: false,
      theme: 'light',
      attachedFiles: [],
      onRemoveAttachedFile: noop,
      visionSnapshot: null,
      onClearVisionSnapshot: noop,
      isListening: false,
      isRecordingAudio: false,
      isTranscribingAudio: false,
      onToggleVoiceInput: noop,
      onStopSpeechRecognition: noop,
      onStopMediaRecording: noop,
      onAttachFilesClick: noop,
      isWebSearchEnabled: true,
      onToggleWebSearch: noop,
      isProToolsActive: true,
      onToggleProTools: noop,
      activeModelLabel: 'Anny Core',
      isModelPopoverActive: false,
      selectedModelId: 'gemini-3-flash',
      onToggleModelPopover: noop,
      includeCodeContext: true,
      onToggleCodeContext: noop,
      vfsFileCount: 5,
    })
  );

  assert.ok(lightMarkup.includes('data-testid="anny-composer-textarea"'));
  assert.ok(lightMarkup.includes('aria-label="Prompt input"'));
  assert.ok(lightMarkup.includes('text-[16px]'));
  assert.ok(lightMarkup.includes('text-amber-900'));
  assert.ok(lightMarkup.includes('data-testid="pro-tools-btn"'));
  assert.ok(lightMarkup.includes('data-testid="record-voice-note-btn"'));
  assert.ok(lightMarkup.includes('data-testid="voice-to-text-btn"'));
  assert.ok(!lightMarkup.includes('aria-label="Toggle web search grounding"'));
  assert.ok(!lightMarkup.includes('aria-label="Select neural model route"'));
  assert.ok(!lightMarkup.includes('aria-label="Include workspace code context"'));
  assert.ok(lightMarkup.includes('aria-label="Send message"'));

  const workingDarkMarkup = renderToStaticMarkup(
    React.createElement(AnnyPromptComposer, {
      prompt: '',
      setPrompt: noop,
      onSend: noop,
      onStop: noop,
      isWorking: true,
      theme: 'dark',
      attachedFiles: [],
      onRemoveAttachedFile: noop,
      visionSnapshot: null,
      onClearVisionSnapshot: noop,
      isListening: false,
      isRecordingAudio: false,
      isTranscribingAudio: false,
      onToggleVoiceInput: noop,
      onStopSpeechRecognition: noop,
      onStopMediaRecording: noop,
      onAttachFilesClick: noop,
      isWebSearchEnabled: false,
      onToggleWebSearch: noop,
      isProToolsActive: false,
      onToggleProTools: noop,
      activeModelLabel: 'Anny Core',
      isModelPopoverActive: false,
      selectedModelId: 'gemini-3-flash',
      onToggleModelPopover: noop,
      includeCodeContext: false,
      onToggleCodeContext: noop,
      vfsFileCount: 0,
    })
  );
  assert.ok(workingDarkMarkup.includes('aria-label="Stop response generation"'));

  // Verify index.html keeps accessible pinch-to-zoom & index.css guards mobile inputs against iOS auto-zoom
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../');
  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const indexCss = fs.readFileSync(path.join(repoRoot, 'primary-anny/Anny/src/index.css'), 'utf8');
  assert.ok(indexHtml.includes('interactive-widget=resizes-content'));
  assert.ok(!/user-scalable\s*=\s*no/i.test(indexHtml));
  assert.ok(!/maximum-scale\s*=\s*1(\.0)?/i.test(indexHtml));
  assert.ok(indexCss.includes('font-size: max(16px, 1rem)'));
});

test('Phase 7B: synthesizeAppFiles executes fullstack synthesis, validation, and targeted repair loop deterministically', async () => {
  let callCount = 0;
  const mockExecutor = async () => {
    callCount += 1;
    if (callCount === 1) {
      // Return intentionally incomplete manifest (missing /src/styles.css referenced by /src/main.tsx)
      return {
        provider: 'ollama',
        model: 'qwen2.5-coder',
        content: JSON.stringify({
          files: {
            '/package.json': JSON.stringify({
              name: 'tv-station-platform',
              private: true,
              scripts: { dev: 'tsx server.ts', build: 'vite build' },
              dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0', express: '^4.21.0' },
            }),
            '/index.html': '<!doctype html><html><head><title>TV Station</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
            '/src/main.tsx': 'import React from "react"; import { createRoot } from "react-dom/client"; import App from "./App"; import "./styles.css"; createRoot(document.getElementById("root")!).render(<App />);',
            '/src/App.tsx': 'import React, { useState } from "react"; export default function App() { const [ch, setCh] = useState("Live"); return <main><h1>Studio Broadcast</h1><p>{ch}</p></main>; }',
            '/server.ts': 'import express from "express"; const app = express(); app.get("/api/health", (_req, res) => res.json({ ok: true })); app.listen(3000);',
          },
          summary: 'Initial draft missing CSS file',
        }),
      };
    }
    return {
      provider: 'ollama',
      model: 'qwen2.5-coder',
      content: JSON.stringify({
        files: {
          '/src/styles.css': 'body { font-family: system-ui, sans-serif; margin: 0; background: #0f172a; color: #f8fafc; }',
        },
        summary: 'Added missing /src/styles.css and verified fullstack build.',
      }),
    };
  };

  const plan = await synthesizeAppFiles(
    'Build an online TV station platform with API routes',
    {},
    { chatExecutor: mockExecutor, maxRepairAttempts: 2 }
  );

  assert.equal(callCount, 2);
  assert.equal(plan.repairAttempts, 1);
  assert.equal(plan.projectKind, 'fullstack');
  assert.ok(plan.verification?.passed);
  assert.ok(plan.stages.includes('repair_attempt_1'));
  assert.ok(plan.stages.includes('completed'));
  assert.ok(plan.files['/src/styles.css']);
  assert.ok(plan.files['/server.ts']);
});

test('Phase 7C: Offline-First enforcement blocks cloud providers when offlineOnly=true and health status never fakes HEALTHY', async () => {
  await assert.rejects(
    () =>
      aiProviderPlatform.chat(
        [{ role: 'user', content: 'ping' }],
        { offlineOnly: true },
        'openai'
      ),
    /OFFLINE_UNAVAILABLE/
  );

  const healthMap = aiProviderPlatform.getHealthMap();
  for (const [provider, entry] of Object.entries(healthMap)) {
    if (provider !== 'ollama' && !process.env[`${provider.toUpperCase()}_API_KEY`]) {
      assert.notEqual(
        entry.status,
        'HEALTHY',
        `Provider ${provider} without credentials must never report fake HEALTHY`
      );
    }
  }
});

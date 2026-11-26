/**
 * ANNY — REAL-TIME VISION & PERCEPTION ENGINE TEST SUITE (Node.js 22 node:test)
 * Tests pixel-level motion & camera-pan compensation, multi-frame object tracking,
 * bounded temporal memory, adaptive FPS & strict backpressure, offline local CV,
 * camera/screen lifecycle, permission errors, disconnect/reconnect, truthful status flags,
 * robot safety guardrails, and privacy/API-key boundaries.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { FrameProcessor } from './FrameProcessor.ts';
import { MotionAnalysisEngine } from './MotionAnalysisEngine.ts';
import { ObjectTrackingEngine } from './ObjectTrackingEngine.ts';
import { TemporalSceneMemory } from './TemporalSceneMemory.ts';
import { VideoFrameScheduler } from './VideoFrameScheduler.ts';
import { LocalVisionProvider } from './LocalVisionProvider.ts';
import { SceneUnderstandingStore } from './SceneUnderstanding.ts';
import { VisionSession, type MediaDevicesLike } from './VisionSession.ts';
import { LiveVisionController } from './LiveVisionController.ts';
import type { OnlineVisionProviderContract, LiveSessionCallbacks, ServerVisionCapabilities } from './VisionProvider.ts';
import type { AiVisionObservation, EncodedFramePayload } from './types.ts';

// Helper: generate textured synthetic RGBA image with optional moving bright square
function createSyntheticRgbaFrame(
  width: number,
  height: number,
  options: {
    bgOffsetX?: number;
    bgOffsetY?: number;
    bgBrightness?: number;
    rect?: { x: number; y: number; w: number; h: number; luma: number };
    invertPattern?: boolean;
  } = {}
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(width * height * 4);
  const ox = options.bgOffsetX ?? 0;
  const oy = options.bgOffsetY ?? 0;
  const base = options.bgBrightness ?? 55;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Deterministic textured background (checker + gradient) for optical flow
      const sx = x - ox;
      const sy = y - oy;
      const checker = ((Math.floor(sx / 6) + Math.floor(sy / 6)) & 1) === 0 ? 18 : -18;
      const grad = Math.floor(((sx + width * 4) % width) / 4);
      let lum = Math.max(0, Math.min(255, base + checker + grad));
      if (options.invertPattern) {
        lum = 255 - lum;
      }

      if (options.rect) {
        const r = options.rect;
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
          lum = r.luma;
        }
      }

      const idx = (y * width + x) * 4;
      buf[idx] = lum;
      buf[idx + 1] = lum;
      buf[idx + 2] = lum;
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

// Mock MediaStream / Track for hardware lifecycle unit tests
function createMockStream(label = 'Mock Camera', facingMode: 'user' | 'environment' = 'environment') {
  let stopped = false;
  const track: any = {
    kind: 'video',
    label,
    readyState: 'live',
    onended: null as null | (() => void),
    stop() {
      stopped = true;
      this.readyState = 'ended';
    },
    getSettings() {
      return { deviceId: `dev_${facingMode}`, facingMode };
    },
    triggerUnexpectedEnd() {
      this.readyState = 'ended';
      if (typeof this.onended === 'function') this.onended();
    },
    isStopped() {
      return stopped;
    },
  };
  const stream: any = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  };
  return { stream: stream as MediaStream, track };
}

class StubOnlineVisionProvider implements OnlineVisionProviderContract {
  readonly id = 'stub_online';
  readonly name = 'Stub Online Provider';
  liveConnected = false;
  shouldFailAnalyze = false;
  analyzeCalls = 0;
  liveCallbacks: LiveSessionCallbacks = {};

  async checkServerCapabilities(): Promise<ServerVisionCapabilities> {
    return {
      liveStreamAvailable: true,
      liveModel: 'gemini-3.8-live',
      frameAnalysisAvailable: true,
      frameAnalysisModel: 'gemini-4-hydrogen',
      localVlmAvailable: false,
      executionMode: 'ONLINE',
      limitations: [],
    };
  }

  async analyzeFrame(): Promise<AiVisionObservation> {
    this.analyzeCalls += 1;
    if (this.shouldFailAnalyze) {
      throw new Error('Upstream provider temporarily unreachable');
    }
    return {
      id: `obs_${this.analyzeCalls}`,
      timestamp: Date.now(),
      description: 'A coffee mug resting on a wooden desk.',
      objects: [{ label: 'Coffee Mug', confidence: 0.91, box: { x: 0.3, y: 0.3, w: 0.2, h: 0.2 } }],
      transport: 'continuous_frame_analysis',
      provider: this.name,
      model: 'gemini-4-hydrogen',
      latencyMs: 120,
      rawMode: 'continuous_frame_analysis',
    };
  }

  async connectLiveSession(options: { callbacks: LiveSessionCallbacks }): Promise<boolean> {
    this.liveCallbacks = options.callbacks;
    this.liveConnected = true;
    options.callbacks.onConnected?.({
      provider: 'Gemini Live API',
      model: 'gemini-3.8-live',
      transport: 'native_live_stream',
    });
    return true;
  }

  sendLiveVideoFrame(_frame: EncodedFramePayload): boolean {
    return this.liveConnected;
  }

  sendLiveAudioChunk(_base64Pcm16k: string): boolean {
    return this.liveConnected;
  }

  sendLiveTextPrompt(_text: string): boolean {
    return this.liveConnected;
  }

  disconnectLiveSession(): void {
    this.liveConnected = false;
  }

  isLiveConnected(): boolean {
    return this.liveConnected;
  }

  simulateDisconnect(reason = 'Network drop'): void {
    this.liveConnected = false;
    this.liveCallbacks.onDisconnected?.(reason);
  }
}

test('1. MotionAnalysisEngine: static scene produces zero false motion; moving object produces accurate region', () => {
  const processor = new FrameProcessor({ analysisWidth: 64, analysisHeight: 48 });
  const engine = new MotionAnalysisEngine();

  const f1 = processor.processRgbaBuffer(createSyntheticRgbaFrame(64, 48), 64, 48, 1000);
  const f2 = processor.processRgbaBuffer(createSyntheticRgbaFrame(64, 48), 64, 48, 1100);

  engine.analyze(f1);
  const staticRes = engine.analyze(f2);
  assert.equal(staticRes.objectMotionActive, false);
  assert.equal(staticRes.cameraMoving, false);
  assert.equal(staticRes.regions.length, 0);

  // Introduce a real moving high-contrast object
  const f3 = processor.processRgbaBuffer(
    createSyntheticRgbaFrame(64, 48, { rect: { x: 20, y: 16, w: 10, h: 10, luma: 245 } }),
    64,
    48,
    1200
  );
  const moveRes = engine.analyze(f3);
  assert.equal(moveRes.objectMotionActive, true);
  assert.ok(moveRes.regions.length >= 1, 'Expected at least 1 motion region');
  const box = moveRes.regions[0].box;
  assert.ok(box.x >= 0.25 && box.x <= 0.4, `Unexpected box.x=${box.x}`);
  assert.ok(box.y >= 0.25 && box.y <= 0.45, `Unexpected box.y=${box.y}`);
});

test('2. MotionAnalysisEngine: distinguishes global camera pan from independent object motion', () => {
  const processor = new FrameProcessor({ analysisWidth: 64, analysisHeight: 48 });
  const engine = new MotionAnalysisEngine();

  const f1 = processor.processRgbaBuffer(createSyntheticRgbaFrame(64, 48, { bgOffsetX: 0 }), 64, 48, 1000);
  // Shift entire textured background by +2px horizontally (simulates smooth camera pan)
  const f2 = processor.processRgbaBuffer(createSyntheticRgbaFrame(64, 48, { bgOffsetX: 2 }), 64, 48, 1100);

  engine.analyze(f1);
  const panRes = engine.analyze(f2);
  assert.equal(panRes.cameraMoving, true, 'Expected global camera pan to be detected');
  assert.equal(panRes.cameraMotion.direction, 'right');
  // Because camera motion is compensated, foreground noise stays minimal
  assert.ok(panRes.foregroundRatio < 0.08, `Expected low compensated foregroundRatio, got ${panRes.foregroundRatio}`);
});

test('3. MotionAnalysisEngine: detects genuine sudden scene change with cooldown', () => {
  const processor = new FrameProcessor({ analysisWidth: 64, analysisHeight: 48 });
  const engine = new MotionAnalysisEngine({ sceneChangeCooldownMs: 1500 });

  const dark = processor.processRgbaBuffer(createSyntheticRgbaFrame(64, 48, { bgBrightness: 25 }), 64, 48, 1000);
  const brightCut = processor.processRgbaBuffer(
    createSyntheticRgbaFrame(64, 48, { bgBrightness: 215 }),
    64,
    48,
    2600
  );
  const immediateCut = processor.processRgbaBuffer(
    createSyntheticRgbaFrame(64, 48, { bgBrightness: 20 }),
    64,
    48,
    2800
  );

  engine.analyze(dark);
  const cutRes = engine.analyze(brightCut);
  assert.equal(cutRes.sceneChanged, true, 'Expected scene cut to trigger sceneChanged=true');
  assert.ok(cutRes.sceneChangeMagnitude >= 0.34);

  // Within cooldown window -> should not spam sceneChanged
  const cooldownRes = engine.analyze(immediateCut);
  assert.equal(cooldownRes.sceneChanged, false, 'Cooldown should suppress rapid duplicate scene-change events');
});

test('4. ObjectTrackingEngine: persistent track IDs, direction tracking, AI enrichment, and disappearance', () => {
  const tracker = new ObjectTrackingEngine({ maxMissedFrames: 3 });

  // Frame 1: object appears on left
  const r1 = tracker.update(
    [{ label: 'Moving Region', source: 'local_motion', box: { x: 0.15, y: 0.4, w: 0.15, h: 0.2 }, confidence: 0.8 }],
    1000
  );
  assert.equal(r1.tracks.length, 1);
  const id = r1.tracks[0].trackId;
  assert.equal(r1.events.some((e) => e.type === 'appeared' && e.trackId === id), true);

  // Frames 2-4: object moves steadily right
  const r2 = tracker.update(
    [{ label: 'Moving Region', source: 'local_motion', box: { x: 0.22, y: 0.4, w: 0.15, h: 0.2 }, confidence: 0.82 }],
    1100
  );
  const r3 = tracker.update(
    [{ label: 'Moving Region', source: 'local_motion', box: { x: 0.29, y: 0.4, w: 0.15, h: 0.2 }, confidence: 0.85 }],
    1200
  );
  assert.equal(r2.tracks[0].trackId, id, 'Track ID must persist across frames');
  assert.equal(r3.tracks[0].trackId, id, 'Track ID must persist across frames');
  assert.equal(r3.tracks[0].velocity.direction, 'right');

  // Enrich with AI semantic label
  tracker.enrichWithAiObjects([{ label: 'Person', confidence: 0.94, box: { x: 0.28, y: 0.39, w: 0.16, h: 0.22 } }], 1250);
  assert.equal(tracker.getActiveTracks()[0].label, 'Person');

  // Disappear after exceeding maxMissedFrames
  let disappeared = false;
  for (let i = 1; i <= 4; i++) {
    const res = tracker.update([], 1300 + i * 100);
    if (res.events.some((e) => e.type === 'disappeared' && e.trackId === id)) {
      disappeared = true;
    }
  }
  assert.equal(disappeared, true, 'Expected disappeared event after track exits view');
  assert.equal(tracker.getActiveTracks().length, 0);
});

test('5. VideoFrameScheduler: strict single-slot backpressure, stale drop, event priority preservation & adaptive FPS', async () => {
  const processedIds: number[] = [];
  let droppedReasons: string[] = [];

  const scheduler = new VideoFrameScheduler<{ seq: number }>({
    targetFps: 10,
    minFps: 1,
    maxFps: 15,
    onProcess: async (item) => {
      // Simulate slow inference (80ms)
      await new Promise((r) => setTimeout(r, 80));
      processedIds.push(item.payload.seq);
    },
    onDrop: (_item, reason) => {
      droppedReasons.push(reason);
    },
  });

  scheduler.start();
  const baseNow = Date.now();
  // Frame 1 starts immediately (inFlight=true)
  assert.equal(scheduler.submit({ seq: 1 }, 'normal', baseNow), true);
  // Frame 2 fills single pending slot
  assert.equal(scheduler.submit({ seq: 2 }, 'normal', baseNow + 10), true);
  // Frame 3 (high priority event) replaces normal pending frame 2
  assert.equal(scheduler.submit({ seq: 3 }, 'event', baseNow + 20), true);
  // Frame 4 (normal) must NOT overwrite high-priority event frame 3!
  assert.equal(scheduler.submit({ seq: 4 }, 'normal', baseNow + 30), false);

  await scheduler.waitForIdle();
  const stats = scheduler.getStats();

  assert.equal(stats.maxQueueDepthObserved, 1, 'Queue depth must never exceed 1');
  assert.deepEqual(processedIds, [1, 3], 'Must process in-flight frame 1 and preserve priority event frame 3');
  assert.ok(stats.droppedCount >= 2, 'Stale/superseded frames must be counted as dropped');
  assert.ok(droppedReasons.includes('backpressure'));
});

test('6. TemporalSceneMemory: bounded ring buffer, staleness detection, and honest inactive prompt context', () => {
  const mem = new TemporalSceneMemory({ maxEvents: 12, maxObservations: 5, maxMotionSamples: 10, staleAfterMs: 5000 });

  const inactiveCtx = mem.buildPromptContext({ active: false, source: null, provider: 'none', now: 10_000 });
  assert.match(inactiveCtx, /Inactive/i);

  for (let i = 0; i < 40; i++) {
    mem.recordFramePerception(
      {
        frameIndex: i + 1,
        timestamp: 1000 + i * 100,
        motionScore: 0.2,
        cameraMotion: { dx: 0, dy: 0, magnitude: 0, direction: 'stationary' },
        cameraMoving: false,
        objectMotionActive: true,
        sceneChanged: false,
        sceneChangeMagnitude: 0.05,
        foregroundRatio: 0.05,
        noiseFloor: 18,
        regions: [],
      },
      [],
      [{ id: `e_${i}`, type: 'moved', timestamp: 1000 + i * 100, summary: `Moved ${i}` }]
    );
  }

  const counts = mem.getCounts();
  assert.ok(counts.events <= 12, `Events must stay bounded (<=12), got ${counts.events}`);
  assert.ok(counts.motionSamples <= 10, `Motion samples must stay bounded (<=10), got ${counts.motionSamples}`);
  assert.equal(mem.isStale(5000), false);
  assert.equal(mem.isStale(20_000), true, 'Memory must report stale once staleAfterMs elapses');
});

test('7. VisionSession: permission denied, device unavailable, camera switching, screen share & full stop teardown', async () => {
  // Permission denied
  const deniedMd: MediaDevicesLike = {
    getUserMedia: async () => {
      const err: any = new Error('Permission dismissed');
      err.name = 'NotAllowedError';
      throw err;
    },
  };
  const deniedSession = new VisionSession({}, () => deniedMd);
  await assert.rejects(() => deniedSession.start({ source: 'camera' }), /Permission dismissed/);
  assert.equal(deniedSession.getActiveTrackCount(), 0);

  // Camera switch + screen share + full stop
  const cam1 = createMockStream('Front Cam', 'user');
  const cam2 = createMockStream('Rear Cam', 'environment');
  const screen = createMockStream('Screen Share', 'environment');
  let camCalls = 0;

  const workingMd: MediaDevicesLike = {
    getUserMedia: async () => {
      camCalls += 1;
      return camCalls === 1 ? cam1.stream : cam2.stream;
    },
    getDisplayMedia: async () => screen.stream,
    enumerateDevices: async () =>
      [
        { deviceId: 'dev_user', kind: 'videoinput', label: 'Front Camera', groupId: 'g1', toJSON: () => ({}) },
        { deviceId: 'dev_env', kind: 'videoinput', label: 'Rear Camera', groupId: 'g2', toJSON: () => ({}) },
      ] as MediaDeviceInfo[],
  };

  let endedReason = '';
  const session = new VisionSession({ onStreamEnded: (r) => { endedReason = r; } }, () => workingMd);

  const devices = await session.listVideoDevices();
  assert.equal(devices.length, 2);

  await session.start({ source: 'camera', facingMode: 'user' });
  assert.equal(session.getActiveTrackCount(), 1);
  assert.equal(cam1.track.isStopped(), false);

  // Switch camera -> old track MUST stop cleanly
  await session.start({ source: 'camera', facingMode: 'environment' });
  assert.equal(cam1.track.isStopped(), true, 'Previous camera track must be stopped when switching cameras');
  assert.equal(cam2.track.isStopped(), false);

  // Simulate unexpected camera disconnect
  cam2.track.triggerUnexpectedEnd();
  assert.match(endedReason, /disconnected|ended/i);

  // Screen share lifecycle
  await session.start({ source: 'screen' });
  assert.equal(session.getSource(), 'screen');
  assert.equal(screen.track.isStopped(), false);

  // Stop cleans up everything
  session.stop();
  assert.equal(screen.track.isStopped(), true);
  assert.equal(session.getActiveTrackCount(), 0);
});

test('VisionSession: late camera permission resolution cannot revive a stopped session', async () => {
  const late = createMockStream('Late Camera');
  let resolveCapture!: (stream: MediaStream) => void;
  const media: MediaDevicesLike = {
    getUserMedia: () => new Promise<MediaStream>(resolve => { resolveCapture = resolve; }),
  };
  const session = new VisionSession({}, () => media);
  const pendingStart = session.start({ source: 'camera' });
  session.stop();
  resolveCapture(late.stream);

  await assert.rejects(pendingStart, (err: any) => err?.name === 'AbortError');
  assert.equal(late.track.isStopped(), true, 'Late-arriving tracks must be stopped immediately');
  assert.equal(session.getActiveTrackCount(), 0, 'Superseded capture must not be attached to the session');
});

test('8. LiveVisionController: offline local perception, online disconnect degradation, truthful status & robot safety', async () => {
  const store = new SceneUnderstandingStore();
  const stubOnline = new StubOnlineVisionProvider();
  const cam = createMockStream('USB Webcam', 'environment');

  const controller = new LiveVisionController({
    onlineProvider: stubOnline,
    localProvider: new LocalVisionProvider(),
    store,
    mediaDevicesProvider: () => ({
      getUserMedia: async () => cam.stream,
      enumerateDevices: async () => [],
    }),
  });

  // Start in Local Offline mode -> zero cloud calls, truthful separated flags
  const startRes = await controller.start({ source: 'camera', mode: 'local_offline', offline: true });
  assert.equal(startRes.ok, true);

  let st = controller.getState();
  assert.equal(st.status.cameraConnected, true);
  assert.equal(st.status.videoStreamActive, true);
  assert.equal(st.status.localPerceptionActive, true);
  assert.equal(st.status.liveAiSessionActive, false, 'Offline mode must NOT claim LIVE AI active');
  assert.equal(st.status.voiceSessionActive, false);
  assert.equal(st.latestSceneDescription, null, 'Must never fabricate AI scene descriptions offline');

  // Feed synthetic moving object offline -> real local tracking works with zero network
  await controller.ingestSyntheticRgbaFrame(createSyntheticRgbaFrame(64, 48), 64, 48, 1000);
  await controller.ingestSyntheticRgbaFrame(
    createSyntheticRgbaFrame(64, 48, { rect: { x: 18, y: 14, w: 12, h: 12, luma: 245 } }),
    64,
    48,
    1100
  );
  st = controller.getState();
  assert.ok(st.trackedEntities.length >= 1, 'Offline local tracking must detect genuine moving object');
  assert.equal(stubOnline.analyzeCalls, 0, 'Offline mode must make zero online AI calls');

  // Switch to online Continuous Live mode -> liveAiSessionActive becomes true
  await controller.setOfflineMode(false);
  await controller.setMode('continuous_live');
  st = controller.getState();
  assert.equal(st.status.liveAiSessionActive, true);
  assert.equal(st.activeTransport, 'native_live_stream');

  // Simulate online Live WebSocket drop -> local perception remains active, liveAiSessionActive truthfully false
  stubOnline.simulateDisconnect('Server unreachable');
  st = controller.getState();
  assert.equal(st.status.liveAiSessionActive, false);
  assert.equal(st.status.localPerceptionActive, true);
  assert.equal(st.activeTransport, 'local_only');

  // Robot perception packet enforces explicit safety boundaries & never fakes ROS hardware
  const robotPacket = store.getRobotPerceptionPacket();
  assert.equal(robotPacket.rosHardwareConnected, false);
  assert.equal(robotPacket.visionOnlyUnverifiedForPhysicalSafety, true);
  assert.match(robotPacket.safetyDisclaimer, /not a verified physical safety system/i);

  // Stop immediately terminates tracks, clears memory, and resets all flags
  controller.stop();
  assert.equal(cam.track.isStopped(), true);
  assert.equal(controller.getActiveTrackCount(), 0);
  const stoppedState = controller.getState();
  assert.equal(stoppedState.status.cameraConnected, false);
  assert.equal(stoppedState.status.videoStreamActive, false);
  assert.equal(stoppedState.status.localPerceptionActive, false);
  assert.equal(stoppedState.status.liveAiSessionActive, false);
});

test('9. Security & Privacy Boundaries: zero client Gemini keys and zero base64 payload logging', () => {
  const visionDir = path.resolve(process.cwd(), 'primary-anny/Anny/src/vision');
  const gatewayFile = path.resolve(process.cwd(), 'primary-anny/Anny/src/services/liveVisionGateway.ts');
  const sensorFile = path.resolve(process.cwd(), 'primary-anny/Anny/src/components/VisionSensor.tsx');

  const filesToCheck = [
    ...fs.readdirSync(visionDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).map((f) => path.join(visionDir, f)),
    sensorFile,
  ];

  for (const file of filesToCheck) {
    const content = fs.readFileSync(file, 'utf8');
    assert.equal(/GEMINI_API_KEY|GOOGLE_AI_STUDIO_KEY|VITE_GEMINI/i.test(content), false, `Client file must never reference Gemini keys: ${file}`);
    assert.equal(/console\.log\([^)]*(base64|cleanBase64|image|pcm)/i.test(content), false, `Must never log image/audio payloads: ${file}`);
  }

  const gwContent = fs.readFileSync(gatewayFile, 'utf8');
  assert.equal(/console\.log\([^)]*(msg\.data|base64|inline\.data)/i.test(gwContent), false, 'Gateway must never log raw frame/audio payloads');
  assert.match(gwContent, /resolveVerifiedIdentity/, 'Live vision WebSocket must enforce server-side identity verification');
  assert.match(gwContent, /isOriginAllowed/, 'Live vision WebSocket must verify Origin header');
  assert.match(gwContent, /gemini-3\.8-live/, 'Live vision gateway must use supported Gemini Live model');
});

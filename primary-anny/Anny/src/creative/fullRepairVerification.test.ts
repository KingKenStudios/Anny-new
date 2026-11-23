import test from 'node:test';
import assert from 'node:assert/strict';

import {
  attachCanonicalImageFields,
  detectImageMimeFromBase64,
  normalizeAudioSource,
  normalizeImageSource,
} from './mediaNormalization';
import { synthesizeLocalWavAudio } from './localAudioSynthEngine';
import { validateAudioAsset } from './ImageQualityValidator';
import { classifyCreativeIntent } from './CreativeIntentRouter';
import { creativeGenerationService } from '../services/creativeGenerationService';
import { providerRegistryService } from '../services/providerRegistryService';
import { aiProviderPlatform } from '../services/aiProviderPlatform';
import { postgresPlatform } from '../services/postgresPlatform';
import { synthesizeAppFiles } from '../core/realAppCodeSynthesizer';
import { verifyGeneratedProject } from '../core/generatedProjectValidator';

test('Part A: normalizeImageSource handles URLs, data URLs, raw SVG, and raw PNG/JPEG/WebP base64 while rejecting HTML/empty', () => {
  const pngRaw = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(32, 0x2a),
  ]).toString('base64');

  const jpegRaw = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
    Buffer.alloc(24, 0x11),
  ]).toString('base64');

  assert.equal(detectImageMimeFromBase64(pngRaw), 'image/png');
  assert.equal(detectImageMimeFromBase64(jpegRaw), 'image/jpeg');

  const fromUrl = normalizeImageSource({ imageUrl: 'https://cdn.example.com/art.png' });
  assert.equal(fromUrl.valid, true);
  assert.equal(fromUrl.src, 'https://cdn.example.com/art.png');

  const fromJpegRaw = normalizeImageSource({ base64: jpegRaw });
  assert.equal(fromJpegRaw.valid, true);
  assert.equal(fromJpegRaw.mimeType, 'image/jpeg');
  assert.ok(fromJpegRaw.src.startsWith('data:image/jpeg;base64,'));

  const fromSvg = normalizeImageSource({ url: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>' });
  assert.equal(fromSvg.valid, true);
  assert.equal(fromSvg.mimeType, 'image/svg+xml');
  assert.ok(fromSvg.src.startsWith('data:image/svg+xml;base64,'));

  const rejectedHtml = normalizeImageSource({ imageUrl: '<html><body>502 Bad Gateway</body></html>' });
  assert.equal(rejectedHtml.valid, false);

  const rejectedEmpty = normalizeImageSource({});
  assert.equal(rejectedEmpty.valid, false);

  const canonical = attachCanonicalImageFields({ primaryImageUrl: fromJpegRaw.src, primaryMimeType: 'image/jpeg' });
  assert.equal(canonical.imageUrl, fromJpegRaw.src);
  assert.equal(canonical.url, fromJpegRaw.src);
  assert.equal(canonical.mimeType, 'image/jpeg');
});

test('Part C & I: providerRegistryService & aiProviderPlatform use honest states without fake CONNECTED cloud health', async () => {
  const geminiProvider = providerRegistryService.getProvider('gemini');
  assert.ok(geminiProvider);
  assert.notEqual(geminiProvider.healthStatus, 'CONNECTED');

  const healthMap = await aiProviderPlatform.refreshHealthChecks();
  assert.ok(healthMap.gemini);
  assert.notEqual(healthMap.gemini.status, 'CONNECTED');
  assert.notEqual(healthMap.gemini.status, 'HEALTHY');
  const pollinationsProvider = providerRegistryService.getProvider('pollinations-flux');
  assert.ok(pollinationsProvider);
  assert.notEqual(pollinationsProvider.healthStatus, 'CONNECTED');
});

test('Part E: CreativeIntentRouter classifies MUSIC, BEAT, SFX, VOICE TTS cleanly without colliding with APP or VIDEO', () => {
  assert.equal(classifyCreativeIntent('Create an afrobeat instrumental loop 118 bpm').category, 'MUSIC_GENERATION');
  assert.equal(classifyCreativeIntent('Generate a trap drum beat for my chorus').category, 'AUDIO_BEAT');
  assert.equal(classifyCreativeIntent('Create a cinematic thunder sound effect sfx').category, 'AUDIO_SFX');
  assert.equal(classifyCreativeIntent('Generate voiceover text-to-speech narration for intro').category, 'AUDIO_VOICE_TTS');
  assert.equal(classifyCreativeIntent('Build a SaaS analytics web app').domain, 'APPLICATION');
  assert.equal(classifyCreativeIntent('Render a 10s cinematic teaser video').domain, 'VIDEO');
});

test('Part E: Deterministic local WAV synthesis creates valid RIFF/WAVE PCM payloads for MUSIC, INSTRUMENTAL, BEAT, SFX', () => {
  for (const audioType of ['MUSIC', 'INSTRUMENTAL', 'BEAT', 'SFX'] as const) {
    const synth = synthesizeLocalWavAudio({
      prompt: `Test ${audioType} afrobeat rain thunder laser chime 120 bpm`,
      audioType,
    });
    assert.equal(synth.mimeType, 'audio/wav');
    assert.ok(synth.audioBytes.byteLength > 44);
    assert.equal(Buffer.from(synth.audioBytes.subarray(0, 4)).toString('ascii'), 'RIFF');
    assert.equal(Buffer.from(synth.audioBytes.subarray(8, 12)).toString('ascii'), 'WAVE');

    const validation = validateAudioAsset(synth.audioBytes, 'audio/wav');
    assert.equal(validation.valid, true);
    assert.equal(validation.format, 'wav');
    assert.ok((validation.durationSeconds || 0) >= 1.5);
  }

  const invalidHtml = validateAudioAsset(Buffer.from('<!doctype html><html>error</html>', 'utf8'), 'audio/mpeg');
  assert.equal(invalidHtml.valid, false);

  const normalizedWav = normalizeAudioSource({
    base64: Buffer.from(
      synthesizeLocalWavAudio({ prompt: 'beat 110 bpm', audioType: 'BEAT' }).audioBytes
    ).toString('base64'),
    mimeType: 'audio/wav',
  });
  assert.equal(normalizedWav.valid, true);
  assert.ok(normalizedWav.src.startsWith('data:audio/wav;base64,'));
});

test('Part A, D, E: creativeGenerationService handles local SVG logo, honest keyless raster/video/voice failure, verified custom adapters, and local WAV audio', async () => {
  const prevGemini = process.env.GEMINI_API_KEY;
  const prevGoogle = process.env.GOOGLE_AI_STUDIO_KEY;
  const prevApi = process.env.API_KEY;
  const prevOpenai = process.env.OPENAI_API_KEY;
  const prevPoll = process.env.ENABLE_POLLINATIONS_IMAGE_FALLBACK;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_AI_STUDIO_KEY;
  delete process.env.API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ENABLE_POLLINATIONS_IMAGE_FALLBACK;

  try {
    // 1. Logo SVG succeeds deterministically
    const logoRes = await creativeGenerationService.generateCreativeImage({
      prompt: 'Design a minimalist luxury monogram logo for King Ken Studios',
      count: 2,
    });
    assert.equal(logoRes.success, true);
    assert.equal(logoRes.provider, 'local-vector-svg');
    assert.ok(logoRes.imageUrl?.startsWith('data:image/svg+xml;base64,'));
    assert.ok((logoRes.images?.length || 0) >= 2);

    // 2. Raster image without cloud keys fails honestly with canonical errorCode
    const rasterFail = await creativeGenerationService.generateCreativeImage({
      prompt: 'Photorealistic neon futuristic Lagos skyline at sunset',
    });
    assert.equal(rasterFail.success, false);
    assert.equal(rasterFail.errorCode, 'NO_IMAGE_PROVIDER_CONFIGURED');

    // 3. Video without cloud keys marks PROVIDER_UNCONFIGURED + VIDEO_RENDERER_NOT_CONFIGURED (never fake MP4)
    creativeGenerationService.setCustomVideoAdapterForTests(null);
    const videoFail = await creativeGenerationService.startVideoJob({
      prompt: 'Cinematic drone flight over Atlantic coastline',
    });
    assert.equal(videoFail.status, 'PROVIDER_UNCONFIGURED');
    assert.equal(videoFail.errorCode, 'VIDEO_RENDERER_NOT_CONFIGURED');
    assert.equal(videoFail.playableValidated, false);

    // 4. Local audio MUSIC/BEAT/SFX succeed with verified playable WAV data URLs
    const musicRes = await creativeGenerationService.generateCreativeAudio({
      prompt: 'Warm afrobeat groove 116 bpm with deep bass',
      type: 'MUSIC',
      mode: 'offline',
    });
    assert.equal(musicRes.success, true);
    assert.equal(musicRes.provider, 'local-pcm-audio-synth');
    assert.equal(musicRes.mimeType, 'audio/wav');
    assert.ok(musicRes.audioUrl?.startsWith('data:audio/wav;base64,'));

    // 5. Voice TTS fails honestly when no cloud key is present
    const voiceFail = await creativeGenerationService.generateCreativeAudio({
      prompt: 'Welcome to King Ken Studios',
      type: 'VOICE',
    });
    assert.equal(voiceFail.success, false);
    assert.equal(voiceFail.errorCode, 'AUDIO_RENDERER_NOT_CONFIGURED');

    // 6. Custom verified video adapter completes MP4 validation cleanly (valid ftyp + moov + mdat ISO BMFF boxes)
    const ftypBox = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x18]), Buffer.from('ftypmp42\x00\x00\x00\x00mp42isom', 'ascii')]);
    const moovBox = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x10]), Buffer.from('moov', 'ascii'), Buffer.alloc(8, 0x00)]);
    const mdatBox = Buffer.concat([Buffer.from([0x00, 0x00, 0x04, 0x00]), Buffer.from('mdat', 'ascii'), Buffer.alloc(1016, 0x33)]);
    const fakeMp4 = Buffer.concat([ftypBox, moovBox, mdatBox]);
    creativeGenerationService.setCustomVideoAdapterForTests(async () => ({
      provider: 'test-video-adapter',
      model: 'test-veo',
      mimeType: 'video/mp4',
      videoBytes: new Uint8Array(fakeMp4),
    }));
    const customJob = await creativeGenerationService.startVideoJob({ prompt: 'Animated cube', planOnly: false });
    await new Promise((r) => setTimeout(r, 120));
    const settled = creativeGenerationService.getVideoJob(customJob.jobId);
    assert.ok(settled);
    assert.equal(settled.status, 'COMPLETED');
    assert.equal(settled.playableValidated, true);
    assert.ok(settled.videoUrl?.includes('/media'));
  } finally {
    creativeGenerationService.setCustomVideoAdapterForTests(null);
    if (prevGemini !== undefined) process.env.GEMINI_API_KEY = prevGemini;
    if (prevGoogle !== undefined) process.env.GOOGLE_AI_STUDIO_KEY = prevGoogle;
    if (prevApi !== undefined) process.env.API_KEY = prevApi;
    if (prevOpenai !== undefined) process.env.OPENAI_API_KEY = prevOpenai;
    if (prevPoll !== undefined) process.env.ENABLE_POLLINATIONS_IMAGE_FALLBACK = prevPoll;
  }
});

test('Part E & F: aiProviderPlatform.audioGeneration routes music/sfx locally and reports honest voice unconfigured', async () => {
  const music = await aiProviderPlatform.audioGeneration({
    prompt: 'lofi chill chords 90 bpm',
    type: 'INSTRUMENTAL',
    mode: 'offline',
  });
  assert.equal(music.provider, 'local-pcm-audio-synth');
  assert.ok(music.audioUrl.startsWith('data:audio/wav;base64,'));

  const voice = await aiProviderPlatform.audioGeneration({
    prompt: 'Read this announcement aloud',
    type: 'VOICE',
  });
  assert.equal(voice.audioUrl, '');
  assert.equal(voice.errorCode, 'AUDIO_RENDERER_NOT_CONFIGURED');
});

test('Part G: Website/App Synthesizer + Validator + Studio persistence work together cleanly', async () => {
  const mockReactJson = JSON.stringify({
    files: {
      '/package.json': JSON.stringify({
        name: 'hospital-ops-portal',
        version: '1.0.0',
        dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
      }),
      '/index.html': '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
      '/src/main.tsx': "import React from 'react'; import { createRoot } from 'react-dom/client'; import App from './App'; createRoot(document.getElementById('root')!).render(<App />);",
      '/src/App.tsx': "import React, { useState } from 'react'; export default function App() { const [beds, setBeds] = useState(12); return <main><h1>Hospital Ops</h1><button onClick={() => setBeds(b => b + 1)}>{beds}</button></main>; }",
    },
    summary: 'Generated Hospital Ops Portal',
  });

  const synth = await synthesizeAppFiles(
    'Build a hospital management dashboard with patient intake and bed occupancy',
    {},
    {
      chatExecutor: async () => ({ content: mockReactJson }),
    }
  );
  const paths = Object.keys(synth.files);
  assert.ok(paths.includes('/src/App.tsx'));
  assert.ok(paths.includes('/package.json'));

  const validation = verifyGeneratedProject(synth.files);
  assert.equal(validation.passed, true, `Validation failed: ${validation.errors.join('; ')}`);

  const inserted = await postgresPlatform.insert<any>('studio_records', {
    ownerUserId: 'qa_test',
    kind: 'architecture',
    title: 'Verification Test Record',
    payload: { floors: 2 },
  });
  assert.ok(inserted.id);
  const queried = await postgresPlatform.query<any>('studio_records', (r: any) => r.id === inserted.id);
  assert.equal(queried.length, 1);
});

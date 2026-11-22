import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyCreativeIntent } from './CreativeIntentRouter.ts';
import { buildEnhancedPrompt } from './PromptEnhancer.ts';
import { generateVectorLogoBundle } from './LogoGenerationPipeline.ts';
import {
  sanitizeAndValidateSvg,
  utf8ToBytes,
  validateImageAsset,
  validateVideoAsset,
} from './ImageQualityValidator.ts';
import { creativeArtifactStore } from './CreativeArtifactStore.ts';
import { creativeGenerationService } from '../services/creativeGenerationService.ts';
import { verifyGeneratedProject } from '../core/generatedProjectValidator.ts';
import { buildTreeFromVFS } from '../components/AnnyCodeExplorer.tsx';
import {
  discoverRegisteredModels,
  PROHIBITED_OR_INVENTED_MODELS,
  VERIFIED_MODEL_REGISTRY,
} from '../core/modelRegistry.ts';

// Minimal valid 1x1 PNG binary (signature + IHDR with width=64, height=64)
function createValidPngHeaderBytes(width = 64, height = 64): Uint8Array {
  const bytes = new Uint8Array(32);
  // PNG magic
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR length (13) + type 'IHDR'
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

// Minimal valid ISO BMFF MP4 container with complete ftyp + moov + mdat boxes
function createValidMp4Bytes(): Uint8Array {
  // Box 1: ftyp (20 bytes)
  const ftyp = new Uint8Array([
    0x00, 0x00, 0x00, 0x14, // size = 20
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x69, 0x73, 0x6f, 0x6d, // 'isom'
    0x00, 0x00, 0x02, 0x00, // minor version
    0x69, 0x73, 0x6f, 0x6d, // compatible brand
  ]);
  // Box 2: moov (16 bytes)
  const moov = new Uint8Array([
    0x00, 0x00, 0x00, 0x10, // size = 16
    0x6d, 0x6f, 0x6f, 0x76, // 'moov'
    0x00, 0x00, 0x00, 0x08, 0x6d, 0x76, 0x68, 0x64, // inner mvhd stub
  ]);
  // Box 3: mdat (24 bytes with non-empty media payload)
  const mdat = new Uint8Array([
    0x00, 0x00, 0x00, 0x18, // size = 24
    0x6d, 0x64, 0x61, 0x74, // 'mdat'
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
  ]);
  const out = new Uint8Array(ftyp.length + moov.length + mdat.length);
  out.set(ftyp, 0);
  out.set(moov, ftyp.length);
  out.set(mdat, ftyp.length + moov.length);
  return out;
}

test('1. CreativeIntentRouter disambiguates King Ken logo vs portrait vs throne vs video vs website', () => {
  const logo = classifyCreativeIntent('Create a logo for King Ken.');
  assert.equal(logo.domain, 'IMAGE');
  assert.equal(logo.category, 'LOGO_DESIGN');
  assert.equal(logo.extractedBrandName, 'King Ken');
  assert.equal(logo.extractedMonogram, 'KK');
  assert.equal(logo.preservedOriginalPrompt, 'Create a logo for King Ken.');

  const portrait = classifyCreativeIntent('Create a portrait of King Ken.');
  assert.equal(portrait.domain, 'IMAGE');
  assert.equal(portrait.category, 'PORTRAIT');

  const royalLogo = classifyCreativeIntent('Create a royal logo with a crown.');
  assert.equal(royalLogo.domain, 'IMAGE');
  assert.equal(royalLogo.category, 'LOGO_DESIGN');

  const throne = classifyCreativeIntent('Create a king sitting on a throne.');
  assert.equal(throne.domain, 'IMAGE');
  assert.equal(throne.category, 'CHARACTER_DESIGN');

  const animatedIntro = classifyCreativeIntent('Create an animated logo intro for King Ken Studios.');
  assert.equal(animatedIntro.domain, 'VIDEO');
  assert.equal(animatedIntro.category, 'BRAND_INTRO');
  assert.equal(animatedIntro.extractedBrandName, 'King Ken Studios');

  const imgToVideo = classifyCreativeIntent('Turn this picture into a moving cinematic video.', [
    { name: 'scene.png', mimeType: 'image/png', hasData: true },
  ]);
  assert.equal(imgToVideo.domain, 'VIDEO');
  assert.equal(imgToVideo.category, 'IMAGE_TO_VIDEO');

  const imgEdit = classifyCreativeIntent(
    'Keep the person and composition but change the outfit to a black suit.',
    [{ name: 'portrait.jpg', mimeType: 'image/jpeg', hasData: true }]
  );
  assert.equal(imgEdit.domain, 'IMAGE');
  assert.equal(imgEdit.category, 'IMAGE_EDIT');
  assert.equal(imgEdit.requiresReferenceImage, true);

  const musicSite = classifyCreativeIntent('Make a website for my music company.');
  assert.equal(musicSite.domain, 'APPLICATION');
  assert.equal(musicSite.category, 'WEBSITE_GENERATION');

  const workshopApp = classifyCreativeIntent('Build an inventory management app for an electrical workshop.');
  assert.equal(workshopApp.domain, 'APPLICATION');
  assert.equal(workshopApp.category, 'FULLSTACK_APPLICATION');

  const mockup = classifyCreativeIntent('Create a website mockup image for a luxury fashion brand.');
  assert.equal(mockup.domain, 'IMAGE');
  assert.equal(mockup.category, 'WEBSITE_MOCKUP');
});

test('2. Conversational refinement preserves active logo, video, and app contexts', () => {
  const logoBundle = generateVectorLogoBundle('Create a premium logo for King Ken', 'King Ken');

  const revLogo = classifyCreativeIntent('Make the logo more minimal', [], {
    artifactId: 'art_1',
    domain: 'IMAGE',
    category: 'LOGO_DESIGN',
    brandName: 'King Ken',
    logoPlan: logoBundle.plan,
  });
  assert.equal(revLogo.isRevision, true);
  assert.equal(revLogo.domain, 'IMAGE');
  assert.equal(revLogo.category, 'LOGO_DESIGN');
  assert.equal(revLogo.extractedBrandName, 'King Ken');

  const revVideo = classifyCreativeIntent('Change scene two to nighttime', [], {
    artifactId: 'vid_1',
    domain: 'VIDEO',
    category: 'CINEMATIC_SCENE',
    videoInteractionId: 'int_abc',
  });
  assert.equal(revVideo.isRevision, true);
  assert.equal(revVideo.domain, 'VIDEO');
  assert.equal(revVideo.category, 'VIDEO_EDITING');

  const revApp = classifyCreativeIntent('Add a mobile navigation menu', [], {
    domain: 'APPLICATION',
    category: 'WEBSITE_GENERATION',
    hasVfsProject: true,
  });
  assert.equal(revApp.isRevision, true);
  assert.equal(revApp.domain, 'APPLICATION');
});

test('3. Dedicated Logo Generation Pipeline produces 4 verified SVG variants & blocks human portraits', () => {
  const classification = classifyCreativeIntent('Create a premium logo for King Ken');
  const bundle = generateVectorLogoBundle(classification.preservedOriginalPrompt, classification.extractedBrandName);
  const enhanced = buildEnhancedPrompt(classification, bundle.plan);

  assert.equal(bundle.plan.brandName, 'King Ken');
  assert.equal(bundle.plan.monogram, 'KK');
  assert.equal(bundle.plan.includeCrown, true);
  assert.equal(bundle.plan.explicitHumanRequested, false);
  assert.equal(bundle.variants.length, 4);

  // Every variant must be authentic SVG XML with real geometry and KK monogram
  for (const variant of bundle.variants) {
    assert.equal(variant.format, 'svg');
    assert.equal(variant.mimeType, 'image/svg+xml');
    assert.ok(variant.svgMarkup.startsWith('<svg '));
    assert.ok(variant.svgMarkup.includes('KK'));
    assert.ok(variant.width >= 512 && variant.height >= 512);
    assert.ok(variant.dataUrl.startsWith('data:image/svg+xml;base64,'));
  }

  // Enhanced prompt strictly forbids literal king on throne / human portrait
  assert.ok(/Do NOT depict a human person|king sitting on a throne/i.test(enhanced.enhancedPrompt));
  assert.ok(enhanced.negativeConstraints.includes('no king sitting on a throne'));

  // Iterative revision preserves brand name and mutates aesthetic to minimal
  const rev2 = generateVectorLogoBundle('Make the logo more minimal and remove the crown', undefined, bundle.plan);
  assert.equal(rev2.plan.brandName, 'King Ken');
  assert.equal(rev2.plan.aesthetic, 'minimal');
  assert.equal(rev2.plan.includeCrown, false);
  assert.equal(rev2.plan.revisionNumber, 2);
});

test('4. Category-specific PromptEnhancer produces distinct directives per image category', () => {
  const logoEnh = buildEnhancedPrompt(classifyCreativeIntent('Create logo for King Ken'));
  const portraitEnh = buildEnhancedPrompt(classifyCreativeIntent('Create a portrait of King Ken'));
  const productEnh = buildEnhancedPrompt(classifyCreativeIntent('Create product photography of luxury studio headphones'));

  assert.notEqual(logoEnh.enhancedPrompt, portraitEnh.enhancedPrompt);
  assert.notEqual(portraitEnh.enhancedPrompt, productEnh.enhancedPrompt);
  assert.ok(portraitEnh.enhancedPrompt.includes('85mm'));
  assert.ok(productEnh.enhancedPrompt.includes('Commercial studio product photography'));
});

test('5. ImageQualityValidator validates PNG/SVG headers, rejects corrupt/HTML/mislabeled files, and sanitizes SVG XSS', () => {
  // Valid PNG passes
  const pngReport = validateImageAsset({ bytes: createValidPngHeaderBytes(512, 512), declaredMimeType: 'image/png' });
  assert.equal(pngReport.valid, true);
  assert.equal(pngReport.width, 512);
  assert.equal(pngReport.height, 512);
  assert.equal(pngReport.format, 'png');

  // PNG mislabeled as SVG must FAIL
  const mislabeled = validateImageAsset({ bytes: createValidPngHeaderBytes(512, 512), declaredMimeType: 'image/svg+xml' });
  assert.equal(mislabeled.valid, false);
  assert.ok(mislabeled.errors.some((e) => e.includes('mislabeled')));

  // HTML error page masquerading as image must FAIL
  const htmlFake = validateImageAsset({ bytes: utf8ToBytes('<!DOCTYPE html><html><body>502 Bad Gateway</body></html>'), declaredMimeType: 'image/png' });
  assert.equal(htmlFake.valid, false);

  // Empty buffer must FAIL
  const empty = validateImageAsset({ bytes: new Uint8Array(0), declaredMimeType: 'image/png' });
  assert.equal(empty.valid, false);

  // Malicious SVG XSS must be stripped cleanly
  const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" onload="alert(1)"><script>fetch('https://evil.test')</script><foreignObject><div>xss</div></foreignObject><a href="javascript:alert(2)"><rect width="100" height="100" onclick="steal()" fill="#D4AF37" /></a></svg>`;
  const sanitized = sanitizeAndValidateSvg(maliciousSvg);
  assert.equal(sanitized.valid, true);
  assert.ok(!sanitized.sanitizedSvg.includes('<script'));
  assert.ok(!sanitized.sanitizedSvg.includes('onload='));
  assert.ok(!sanitized.sanitizedSvg.includes('onclick='));
  assert.ok(!sanitized.sanitizedSvg.includes('javascript:'));
  assert.ok(!sanitized.sanitizedSvg.includes('foreignObject'));

  // Duplicate detection works
  const seen = new Set([pngReport.sha256]);
  const dupReport = validateImageAsset({
    bytes: createValidPngHeaderBytes(512, 512),
    declaredMimeType: 'image/png',
    previousHashes: seen,
    requireUnique: true,
  });
  assert.equal(dupReport.duplicateDetected, true);
});

test('6. Provider registry is truthful (never lists Ollama as image/video generator) and offline Logo generation succeeds', async () => {
  const providers = creativeGenerationService.getCreativeProviders();
  assert.ok(!providers.some((p) => p.id.toLowerCase().includes('ollama')));

  const localVector = providers.find((p) => p.id === 'local-vector-svg');
  assert.ok(localVector);
  assert.equal(localVector.configured, true);
  assert.equal(localVector.offlineCapable, true);
  assert.equal(localVector.requiresPaidKey, false);

  // End-to-end offline King Ken logo generation works with zero cloud keys
  const logoResult = await creativeGenerationService.generateCreativeImage({
    prompt: 'Create logo for king Ken',
    providerPreference: 'local-vector-svg',
  });
  assert.equal(logoResult.success, true);
  assert.equal(logoResult.primaryFormat, 'svg');
  assert.equal(logoResult.quality.valid, true);
  assert.equal(logoResult.logoBundle?.plan.brandName, 'King Ken');
  assert.equal(logoResult.logoBundle?.variants.length, 4);
});

test('7. Video lifecycle never fakes GENERATED when unconfigured or planning; real job validates MP4 & completes', async () => {
  // A. Unconfigured / offline mode NEVER reports COMPLETED or GENERATED
  const unconfiguredJob = await creativeGenerationService.startVideoJob({
    prompt: 'Create an animated logo intro for King Ken Studios',
    providerOverride: 'offline',
  });
  assert.equal(unconfiguredJob.status, 'PROVIDER_UNCONFIGURED');
  assert.equal(unconfiguredJob.playableValidated, false);
  assert.equal(unconfiguredJob.videoUrl, undefined);
  assert.ok((unconfiguredJob.productionPlan?.shots.length || 0) >= 3);

  // B. Storyboard planning mode is explicitly STORYBOARD_PLAN_ONLY
  const planJob = await creativeGenerationService.startVideoJob({
    prompt: 'Create a storyboard for a King Ken music video',
    planOnly: true,
    providerOverride: 'offline',
  });
  assert.equal(planJob.status, 'STORYBOARD_PLAN_ONLY');
  assert.equal(planJob.playableValidated, false);
  assert.equal(planJob.videoUrl, undefined);

  // C. Real async job with valid MP4 container passes playability check & transitions to COMPLETED
  creativeGenerationService.setCustomVideoAdapterForTests(async () => ({
    videoBytes: createValidMp4Bytes(),
    mimeType: 'video/mp4',
    interactionId: 'int_test_video_01',
    provider: 'gemini-omni-video',
    model: 'gemini-omni-1.2-flash',
  }));

  try {
    const runningJob = await creativeGenerationService.startVideoJob({
      prompt: 'Create an animated logo intro for King Ken Studios',
      aspectRatio: '16:9',
      durationSeconds: 8,
    });
    assert.ok(runningJob.jobId);
    // Allow microtask/async completion
    await new Promise((r) => setTimeout(r, 30));
    const completed = creativeGenerationService.getVideoJob(runningJob.jobId);
    assert.ok(completed);
    assert.equal(completed.status, 'COMPLETED');
    assert.equal(completed.playableValidated, true);
    assert.equal(completed.interactionId, 'int_test_video_01');
    assert.ok(completed.videoUrl?.includes(runningJob.jobId));

    const media = creativeGenerationService.getVideoMediaBuffer(runningJob.jobId);
    assert.ok(media);
    assert.equal(validateVideoAsset(media.bytes).valid, true);

    // D. Corrupt video output must FAIL instead of marking COMPLETED
    creativeGenerationService.setCustomVideoAdapterForTests(async () => ({
      videoBytes: utf8ToBytes('not-a-video-file'),
      mimeType: 'video/mp4',
      provider: 'gemini-omni-video',
      model: 'gemini-omni-1.2-flash',
    }));
    const badJob = await creativeGenerationService.startVideoJob({
      prompt: 'Corrupt stream test video',
    });
    await new Promise((r) => setTimeout(r, 30));
    const failed = creativeGenerationService.getVideoJob(badJob.jobId);
    assert.equal(failed?.status, 'FAILED');
    assert.equal(failed?.playableValidated, false);
  } finally {
    creativeGenerationService.setCustomVideoAdapterForTests(null);
  }
});

test('8. GeneratedProjectValidator catches broken imports & secrets and passes clean full-stack workshop app', () => {
  const validProject = {
    '/package.json': JSON.stringify({ name: 'workshop-inventory', dependencies: { react: '^19.0.0', express: '^4.21.0' } }),
    '/index.html': '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
    '/src/main.tsx': `import React from 'react';\nimport App from './App';\nexport const boot = () => App;`,
    '/src/App.tsx': `import React, { useState } from 'react';\nimport './styles.css';\nexport default function App() { const [items, setItems] = useState([]); return <main><button onClick={() => setItems([])}>Add Item</button></main>; }`,
    '/src/styles.css': `@media (max-width: 768px) { main { padding: 12px; } }`,
    '/server/index.ts': `export const handler = () => ({ ok: true });`,
  };

  const passReport = verifyGeneratedProject(validProject, { requireBackend: true });
  assert.equal(passReport.passed, true);
  assert.equal(passReport.score, 100);

  const syntheticApiKey = ['sk', '1234567890abcdefghijklmnop'].join('-');
  const brokenProject = {
    ...validProject,
    '/src/App.tsx': `import Missing from './DoesNotExist';\nconst k = "${syntheticApiKey}";\nexport default function App() { return <div>Lorem ipsum</div>; }`,
  };
  const failReport = verifyGeneratedProject(brokenProject, { requireBackend: true });
  assert.equal(failReport.passed, false);
  assert.ok(failReport.errors.some((e) => e.includes('DoesNotExist')));
  assert.ok(failReport.errors.some((e) => e.includes('hardcoded secret')));
});

test('9. Unified CreativeArtifactStore tracks revisions with zero hardcoded seed data & VFS Code Explorer builds tree', () => {
  creativeArtifactStore.clearAll();
  assert.equal(creativeArtifactStore.listArtifacts().length, 0);

  const project = creativeArtifactStore.ensureProject('King Ken Studios');
  creativeArtifactStore.saveArtifact({
    id: 'art_rev1',
    projectId: project.id,
    studio: 'graphics',
    domain: 'IMAGE',
    category: 'LOGO_DESIGN',
    title: 'King Ken Logo Rev 1',
    prompt: 'Create logo for King Ken',
    provider: 'local-vector-svg',
    model: 'anny-vector-svg-v1',
    format: 'svg',
    mimeType: 'image/svg+xml',
    revisionNumber: 1,
    createdAt: new Date().toISOString(),
    metadata: { brandName: 'King Ken' },
  });
  creativeArtifactStore.saveArtifact({
    id: 'art_rev2',
    projectId: project.id,
    studio: 'graphics',
    domain: 'IMAGE',
    category: 'LOGO_DESIGN',
    title: 'King Ken Logo Rev 2',
    prompt: 'Make the logo more minimal',
    provider: 'local-vector-svg',
    model: 'anny-vector-svg-v1',
    format: 'svg',
    mimeType: 'image/svg+xml',
    revisionNumber: 2,
    parentArtifactId: 'art_rev1',
    createdAt: new Date().toISOString(),
    metadata: { brandName: 'King Ken' },
  });

  const history = creativeArtifactStore.getRevisionHistory('art_rev2');
  assert.equal(history.length, 2);
  assert.equal(history[0].id, 'art_rev2');
  assert.equal(history[1].id, 'art_rev1');

  // Migrated Reference VFS Code Explorer tree builder works cleanly
  const tree = buildTreeFromVFS({
    '/package.json': '{}',
    '/src/App.tsx': 'export default function App() {}',
    '/src/components/Header.tsx': 'export const Header = () => null;',
  });
  assert.ok(tree.some((n) => n.name === 'src' && n.type === 'folder'));
  assert.ok(tree.some((n) => n.name === 'package.json' && n.type === 'file'));
});

test('10. MP4 container validation rejects header-only or truncated payloads and verifies ftyp+moov+mdat', () => {
  // Header-only ftyp box without moov/mdat MUST be rejected
  const headerOnly = new Uint8Array(24);
  headerOnly.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d], 0);
  const badRes = validateVideoAsset(headerOnly);
  assert.equal(badRes.valid, false);
  assert.equal(badRes.containerDetails.hasFtypBox, true);
  assert.equal(badRes.containerDetails.hasMoovBox, false);
  assert.equal(badRes.containerDetails.hasMdatBox, false);

  // Full container with ftyp + moov + mdat passes
  const goodRes = validateVideoAsset(createValidMp4Bytes());
  assert.equal(goodRes.valid, true);
  assert.equal(goodRes.mimeType, 'video/mp4');
  assert.equal(goodRes.containerDetails.hasFtypBox, true);
  assert.equal(goodRes.containerDetails.hasMoovBox, true);
  assert.equal(goodRes.containerDetails.hasMdatBox, true);
});

test('11. Video jobs enforce per-user ownership isolation, cancellation, and truthful auth/quota error states', async () => {
  creativeGenerationService.setCustomVideoAdapterForTests(async () => ({
    videoBytes: createValidMp4Bytes(),
    mimeType: 'video/mp4',
    interactionId: 'int_iso_test_01',
    provider: 'gemini-omni-video',
    model: 'gemini-omni-1.2-flash',
  }));

  try {
    const aliceJob = await creativeGenerationService.startVideoJob({
      prompt: 'Cinematic sports car driving through Lagos at night',
      durationSeconds: 10,
      ownerUserId: 'user_alice',
      ownerOrgId: 'org_kingken',
    });
    await new Promise((r) => setTimeout(r, 30));

    // Alice can access her own completed job & video bytes
    assert.equal(
      creativeGenerationService.getVideoJob(aliceJob.jobId, { userId: 'user_alice', orgId: 'org_kingken' })?.status,
      'COMPLETED'
    );
    assert.ok(
      creativeGenerationService.getVideoMediaBuffer(aliceJob.jobId, { userId: 'user_alice', orgId: 'org_kingken' })
    );

    // Bob CANNOT read Alice's job, list it, or download her media
    assert.equal(
      creativeGenerationService.getVideoJob(aliceJob.jobId, { userId: 'user_bob', orgId: 'org_kingken' }),
      undefined
    );
    assert.equal(
      creativeGenerationService.getVideoMediaBuffer(aliceJob.jobId, { userId: 'user_bob', orgId: 'org_kingken' }),
      undefined
    );
    assert.equal(
      creativeGenerationService
        .listVideoJobs({ userId: 'user_bob', orgId: 'org_kingken' })
        .some((j) => j.jobId === aliceJob.jobId),
      false
    );

    // Admin can inspect for moderation/audit
    assert.equal(
      creativeGenerationService.getVideoJob(aliceJob.jobId, { userId: 'admin_1', isAdmin: true })?.jobId,
      aliceJob.jobId
    );

    // 403 PERMISSION_DENIED maps cleanly to AUTHENTICATION_FAILED
    creativeGenerationService.setCustomVideoAdapterForTests(async () => {
      const err: any = new Error('PERMISSION_DENIED: API key lacks entitlement');
      err.status = 403;
      throw err;
    });
    const authFailJob = await creativeGenerationService.startVideoJob({
      prompt: 'Auth fail test',
      ownerUserId: 'user_alice',
    });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(
      creativeGenerationService.getVideoJob(authFailJob.jobId, { userId: 'user_alice' })?.status,
      'AUTHENTICATION_FAILED'
    );

    // 429 RESOURCE_EXHAUSTED maps cleanly to PROVIDER_UNAVAILABLE
    creativeGenerationService.setCustomVideoAdapterForTests(async () => {
      const err: any = new Error('RESOURCE_EXHAUSTED: Paid quota required');
      err.status = 429;
      throw err;
    });
    const quotaFailJob = await creativeGenerationService.startVideoJob({
      prompt: 'Quota fail test',
      ownerUserId: 'user_alice',
    });
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(
      creativeGenerationService.getVideoJob(quotaFailJob.jobId, { userId: 'user_alice' })?.status,
      'PROVIDER_UNAVAILABLE'
    );

    // Cancellation stops an in-flight job cleanly
    creativeGenerationService.setCustomVideoAdapterForTests(async () => {
      await new Promise((r) => setTimeout(r, 80));
      return {
        videoBytes: createValidMp4Bytes(),
        mimeType: 'video/mp4',
        provider: 'gemini-omni-video',
        model: 'gemini-omni-1.2-flash',
      };
    });
    const slowJob = await creativeGenerationService.startVideoJob({
      prompt: 'Slow render to cancel',
      ownerUserId: 'user_alice',
    });
    const cancelled = creativeGenerationService.cancelVideoJob(slowJob.jobId, { userId: 'user_alice' });
    assert.equal(cancelled?.status, 'CANCELLED');
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(
      creativeGenerationService.getVideoJob(slowJob.jobId, { userId: 'user_alice' })?.status,
      'CANCELLED'
    );
  } finally {
    creativeGenerationService.setCustomVideoAdapterForTests(null);
  }
});

test('12. Central Model Registry contains zero prohibited/invented models and accurately reports offline vs paid availability', () => {
  const prohibitedSet = new Set<string>(PROHIBITED_OR_INVENTED_MODELS);
  for (const spec of VERIFIED_MODEL_REGISTRY) {
    assert.equal(prohibitedSet.has(spec.id), false, `Prohibited model found in registry: ${spec.id}`);
  }

  // Offline policy disables all cloud models while keeping local vector SVG available
  const offlineModels = discoverRegisteredModels({
    env: { GEMINI_API_KEY: 'test_fake_key_for_unit_discovery_only' },
    executionMode: 'OFFLINE_ONLY',
    ollamaModels: ['llama3.2:3b'],
  });
  const svgEngine = offlineModels.find((m) => m.id === 'anny-vector-svg-v1');
  assert.equal(svgEngine?.availability, 'AVAILABLE_OFFLINE');
  const omniVideo = offlineModels.find((m) => m.id === 'gemini-omni-1.2-flash');
  assert.equal(omniVideo?.availability, 'DISABLED_BY_OFFLINE_POLICY');

  // Discovered Ollama model is NEVER labeled as IMAGE_GENERATION or VIDEO_GENERATION
  const ollamaEntry = offlineModels.find((m) => m.id === 'ollama:llama3.2:3b');
  assert.ok(ollamaEntry);
  assert.equal(ollamaEntry.capabilities.includes('IMAGE_GENERATION'), false);
  assert.equal(ollamaEntry.capabilities.includes('VIDEO_GENERATION'), false);

  // Paid models clearly report REQUIRES_PAID_KEY when key is configured online
  const onlineModels = discoverRegisteredModels({
    env: { GEMINI_API_KEY: 'test_fake_key_for_unit_discovery_only' },
    executionMode: 'AUTO',
  });
  const onlineOmni = onlineModels.find((m) => m.id === 'gemini-omni-1.2-flash');
  assert.equal(onlineOmni?.availability, 'REQUIRES_PAID_KEY');
});


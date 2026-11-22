import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyCreativeIntent,
  extractRequestedImageCount,
} from './CreativeIntentRouter';
import {
  buildSafeImageFilename,
  mimeTypeToExtension,
  prepareVerifiedImageDownload,
} from './imageDownloadService';
import {
  createViewerState,
  mapViewerKeyToAction,
  reduceViewerState,
  VIEWER_MAX_ZOOM,
  VIEWER_MIN_ZOOM,
} from '../components/ImageLightboxViewer';
import { creativeGenerationService } from '../services/creativeGenerationService';
import { bytesToBase64 } from './ImageQualityValidator';

/** Builds a valid PNG binary with exact width/height header and unique pixel/chunk seed. */
function makeSyntheticPng(width: number, height: number, seedByte: number): Uint8Array {
  // Minimal valid PNG header (8-byte signature + IHDR chunk with exact dimensions + unique trailing payload)
  const buf = new Uint8Array(64);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR length = 13
  buf.set([0x00, 0x00, 0x00, 0x0d], 8);
  // 'IHDR'
  buf.set([0x49, 0x48, 0x44, 0x52], 12);
  // width (big-endian)
  buf[16] = (width >>> 24) & 0xff;
  buf[17] = (width >>> 16) & 0xff;
  buf[18] = (width >>> 8) & 0xff;
  buf[19] = width & 0xff;
  // height (big-endian)
  buf[20] = (height >>> 24) & 0xff;
  buf[21] = (height >>> 16) & 0xff;
  buf[22] = (height >>> 8) & 0xff;
  buf[23] = height & 0xff;
  buf[24] = 8; // bit depth
  buf[25] = 6; // color type RGBA
  buf[40] = seedByte & 0xff;
  buf[41] = (seedByte * 7) & 0xff;
  return buf;
}

/** Builds a valid JPEG binary with SOF0 dimensions. */
function makeSyntheticJpeg(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x0b, 0x08,
    (height >>> 8) & 0xff, height & 0xff,
    (width >>> 8) & 0xff, width & 0xff,
    0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

/** Builds a valid WebP VP8X binary with exact width/height. */
function makeSyntheticWebp(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(34);
  buf.set(new TextEncoder().encode('RIFF'), 0);
  buf.set([0x1a, 0x00, 0x00, 0x00], 4);
  buf.set(new TextEncoder().encode('WEBP'), 8);
  buf.set(new TextEncoder().encode('VP8X'), 12);
  buf.set([0x0a, 0x00, 0x00, 0x00], 16);
  const wMinus1 = width - 1;
  const hMinus1 = height - 1;
  buf[24] = wMinus1 & 0xff;
  buf[25] = (wMinus1 >>> 8) & 0xff;
  buf[26] = (wMinus1 >>> 16) & 0xff;
  buf[27] = hMinus1 & 0xff;
  buf[28] = (hMinus1 >>> 8) & 0xff;
  buf[29] = (hMinus1 >>> 16) & 0xff;
  return buf;
}

test('CreativeIntentRouter extracts requested multi-image count and routes follow-up raster edits', () => {
  assert.equal(extractRequestedImageCount('Generate 4 images of a futuristic solar energy station.'), 4);
  assert.equal(extractRequestedImageCount('Create three variations of an industrial turbine'), 3);
  assert.equal(extractRequestedImageCount('Generate an image of a transformer substation'), 1);

  const multiIntent = classifyCreativeIntent('Generate 4 images of a futuristic solar energy station.');
  assert.equal(multiIntent.domain, 'IMAGE');
  assert.equal(multiIntent.requestedImageCount, 4);

  const editIntent = classifyCreativeIntent('Make the colors warmer and change the background to sunset', [], {
    artifactId: 'art_prev_1',
    domain: 'IMAGE',
    category: 'PHOTOREALISTIC_SCENE',
    selectedImageUrl: 'data:image/png;base64,AAAA',
    revisionNumber: 1,
  });
  assert.equal(editIntent.domain, 'IMAGE');
  assert.equal(editIntent.isRevision, true);
  assert.equal(editIntent.category, 'IMAGE_EDIT');
  assert.equal(editIntent.requiresReferenceImage, false);
});

test('Multi-image generation produces 4 independent images with unique hashes, asset download URLs, and non-destructive editing preserves original', async () => {
  creativeGenerationService.setCustomImageAdapterForTests(async ({ optionIndex }) => ({
    bytes: makeSyntheticPng(1024, 1024, optionIndex + 10),
    mimeType: 'image/png',
    model: 'test-image-model',
    provider: 'test-image-provider',
  }));

  try {
    const res = await creativeGenerationService.generateCreativeImage({
      prompt: 'Generate 4 images of a futuristic solar energy station.',
      count: 4,
      ownerUserId: 'user_test_1',
    });

    assert.equal(res.success, true);
    assert.equal(res.images?.length, 4);
    const uniqueHashes = new Set(res.images!.map((img) => img.sha256));
    assert.equal(uniqueHashes.size, 4, 'All 4 generated gallery images must be distinct');
    assert.equal(res.images![2].index, 3);
    assert.equal(res.images![2].width, 1024);
    assert.equal(res.images![2].height, 1024);
    assert.ok(res.images![2].downloadUrl?.startsWith('/api/creative/image/asset/'));

    // Verify server asset retrieval enforces owner scoping
    const assetKey = decodeURIComponent(res.images![1].downloadUrl!.split('/').pop()!);
    const ownAsset = creativeGenerationService.getImageAsset(assetKey, { userId: 'user_test_1' });
    assert.ok(ownAsset);
    assert.equal(ownAsset.mimeType, 'image/png');
    const foreignAsset = creativeGenerationService.getImageAsset(assetKey, { userId: 'other_user' });
    assert.equal(foreignAsset, null);

    // Non-destructive edit on Option 2 preserves original and increments revision
    creativeGenerationService.setCustomImageAdapterForTests(async () => ({
      bytes: makeSyntheticPng(1024, 1024, 99),
      mimeType: 'image/png',
      model: 'test-image-model',
      provider: 'test-image-provider',
    }));

    const selectedOption = res.images![1];
    const edited = await creativeGenerationService.generateCreativeImage({
      prompt: 'Make the colors warmer and improve the lighting',
      parentArtifactId: res.artifactId,
      ownerUserId: 'user_test_1',
      activeContext: {
        artifactId: res.artifactId,
        domain: 'IMAGE',
        category: 'PHOTOREALISTIC_SCENE',
        selectedImageId: selectedOption.id,
        selectedImageUrl: selectedOption.url,
        selectedImageMimeType: selectedOption.mimeType,
        revisionNumber: 1,
      },
    });

    assert.equal(edited.success, true);
    assert.equal(edited.revisionNumber, 2);
    assert.equal(edited.parentArtifactId, res.artifactId);
    assert.equal(edited.originalImageUrl, selectedOption.url, 'Original image must be preserved untouched');
    assert.notEqual(edited.primaryImageUrl, selectedOption.url, 'Revised image must be stored separately');
  } finally {
    creativeGenerationService.setCustomImageAdapterForTests(null);
  }
});

test('ImageLightboxViewer state machine handles open, select exact image, prev/next wrap, zoom, compare, and keyboard shortcuts', () => {
  // Opening image #3 (index 2 of 4)
  let state = reduceViewerState(createViewerState(0, false), { type: 'OPEN', index: 2, total: 4 });
  assert.equal(state.isOpen, true);
  assert.equal(state.currentIndex, 2);
  assert.equal(state.zoom, 1);

  // ArrowRight -> index 3 -> wraps to 0
  state = reduceViewerState(state, mapViewerKeyToAction('ArrowRight', 4)!);
  assert.equal(state.currentIndex, 3);
  state = reduceViewerState(state, mapViewerKeyToAction('ArrowRight', 4)!);
  assert.equal(state.currentIndex, 0);

  // ArrowLeft -> wraps back to 3
  state = reduceViewerState(state, mapViewerKeyToAction('ArrowLeft', 4)!);
  assert.equal(state.currentIndex, 3);

  // Zoom in/out/clamp/reset
  state = reduceViewerState(state, mapViewerKeyToAction('+', 4)!);
  assert.equal(state.zoom, 1.25);
  for (let i = 0; i < 20; i++) {
    state = reduceViewerState(state, { type: 'ZOOM_IN' });
  }
  assert.equal(state.zoom, VIEWER_MAX_ZOOM);

  for (let i = 0; i < 30; i++) {
    state = reduceViewerState(state, { type: 'ZOOM_OUT' });
  }
  assert.equal(state.zoom, VIEWER_MIN_ZOOM);

  state = reduceViewerState(state, mapViewerKeyToAction('0', 4)!);
  assert.equal(state.zoom, 1);
  assert.equal(state.fitMode, 'fit');

  // Compare mode toggle
  state = reduceViewerState(state, { type: 'TOGGLE_COMPARE' });
  assert.equal(state.compareMode, true);

  // Escape closes cleanly
  state = reduceViewerState(state, mapViewerKeyToAction('Escape', 4)!);
  assert.equal(state.isOpen, false);
});

test('imageDownloadService preserves exact bytes, original resolution, true MIME/extensions (.png/.jpg/.webp/.svg), and safe filenames', async () => {
  assert.equal(mimeTypeToExtension('image/png'), 'png');
  assert.equal(mimeTypeToExtension('image/jpeg'), 'jpg');
  assert.equal(mimeTypeToExtension('image/webp'), 'webp');
  assert.equal(mimeTypeToExtension('image/svg+xml'), 'svg');

  assert.equal(
    buildSafeImageFilename({ title: 'King Ken Logo / ../evil*', index: 1, mimeType: 'image/png' }),
    'King_Ken_Logo_evil_01.png'
  );
  assert.equal(
    buildSafeImageFilename({ title: 'Solar Station', index: 3, mimeType: 'image/webp' }),
    'Solar_Station_03.webp'
  );

  // 1. PNG via Data URL (must NOT force .jpg!)
  const pngBytes = makeSyntheticPng(2048, 1536, 42);
  const pngPrepared = await prepareVerifiedImageDownload({
    url: `data:image/png;base64,${bytesToBase64(pngBytes)}`,
    title: 'King Ken Logo',
    index: 1,
  });
  assert.equal(pngPrepared.ok, true);
  assert.equal(pngPrepared.extension, 'png');
  assert.equal(pngPrepared.filename, 'King_Ken_Logo_01.png');
  assert.equal(pngPrepared.width, 2048);
  assert.equal(pngPrepared.height, 1536);
  assert.equal(Buffer.compare(Buffer.from(pngPrepared.bytes!), Buffer.from(pngBytes)), 0);
  assert.ok(pngPrepared.sha256.length >= 16);

  // 2. JPEG via Blob
  const jpgBytes = makeSyntheticJpeg(1600, 900);
  const jpgPrepared = await prepareVerifiedImageDownload({
    blob: new Blob([jpgBytes], { type: 'image/jpeg' }),
    title: 'Industrial Lab',
    index: 2,
  });
  assert.equal(jpgPrepared.ok, true);
  assert.equal(jpgPrepared.extension, 'jpg');
  assert.equal(jpgPrepared.filename, 'Industrial_Lab_02.jpg');
  assert.equal(jpgPrepared.width, 1600);
  assert.equal(jpgPrepared.height, 900);

  // 3. WebP via Base64
  const webpBytes = makeSyntheticWebp(1280, 720);
  const webpPrepared = await prepareVerifiedImageDownload({
    base64: bytesToBase64(webpBytes),
    declaredMimeType: 'image/webp',
    title: 'Turbine Render',
    index: 4,
  });
  assert.equal(webpPrepared.ok, true);
  assert.equal(webpPrepared.extension, 'webp');
  assert.equal(webpPrepared.filename, 'Turbine_Render_04.webp');
  assert.equal(webpPrepared.width, 1280);
  assert.equal(webpPrepared.height, 720);
});

test('imageDownloadService rejects HTML/JSON/empty payloads, handles expired-URL fallback, and sanitizes SVG XSS', async () => {
  // 1. Rejects HTML error page masquerading as image URL
  const htmlResult = await prepareVerifiedImageDownload(
    { url: 'https://cdn.example.com/image.png', title: 'Test' },
    {
      fetcher: async () =>
        new Response('<!DOCTYPE html><html><body>404 Not Found</body></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
    }
  );
  assert.equal(htmlResult.ok, false);
  assert.ok(htmlResult.error?.toLowerCase().includes('html') || htmlResult.error?.toLowerCase().includes('image'));

  // 2. Rejects JSON error response
  const jsonResult = await prepareVerifiedImageDownload(
    { url: 'https://cdn.example.com/image.png', title: 'Test' },
    {
      fetcher: async () =>
        new Response('{"error":"expired"}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    }
  );
  assert.equal(jsonResult.ok, false);

  // 3. Rejects empty 0-byte file
  const emptyResult = await prepareVerifiedImageDownload({
    blob: new Blob([], { type: 'image/png' }),
    title: 'Empty',
  });
  assert.equal(emptyResult.ok, false);

  // 4. Rejects unsafe javascript: URL
  const unsafeUrlResult = await prepareVerifiedImageDownload({
    url: 'javascript:alert(1)',
    title: 'Unsafe',
  });
  assert.equal(unsafeUrlResult.ok, false);

  // 5. Expired remote URL (HTTP 410) automatically recovers via fallbackUrl
  const pngBytes = makeSyntheticPng(1024, 1024, 77);
  const fallbackResult = await prepareVerifiedImageDownload(
    {
      url: 'https://expired.example.com/temp-signed-image.png',
      fallbackUrl: '/api/creative/image/asset/art_cached_1',
      title: 'Solar_Station',
      index: 2,
    },
    {
      fetcher: async (u) => {
        if (u.includes('expired.example.com')) {
          return new Response('Gone', { status: 410 });
        }
        return new Response(pngBytes, {
          status: 200,
          headers: { 'content-type': 'image/png' },
        });
      },
    }
  );
  assert.equal(fallbackResult.ok, true);
  assert.equal(fallbackResult.usedFallback, true);
  assert.equal(fallbackResult.filename, 'Solar_Station_02.png');

  // 6. SVG XSS sanitization strips <script>, onload=, javascript:, and <foreignObject>
  const dirtySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" onload="alert(1)"><script>alert('xss')</script><foreignObject><div>bad</div></foreignObject><a href="javascript:alert(2)"><rect width="512" height="512" fill="#0f172a"/></a></svg>`;
  const svgPrepared = await prepareVerifiedImageDownload({
    url: `data:image/svg+xml;base64,${bytesToBase64(new TextEncoder().encode(dirtySvg))}`,
    title: 'King Ken Logo',
    index: 1,
  });
  assert.equal(svgPrepared.ok, true);
  assert.equal(svgPrepared.extension, 'svg');
  assert.equal(svgPrepared.filename, 'King_Ken_Logo_01.svg');
  const sanitizedText = new TextDecoder().decode(svgPrepared.bytes!);
  assert.equal(sanitizedText.toLowerCase().includes('<script'), false);
  assert.equal(sanitizedText.toLowerCase().includes('onload='), false);
  assert.equal(sanitizedText.toLowerCase().includes('javascript:'), false);
  assert.equal(sanitizedText.toLowerCase().includes('<foreignobject'), false);
});

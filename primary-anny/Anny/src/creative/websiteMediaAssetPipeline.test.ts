import test from 'node:test';
import assert from 'node:assert/strict';
import { materializeWebsiteMediaAssets } from './websiteMediaAssetPipeline';

test('website media manifest is materialized into VFS-safe data URLs and removed', async () => {
  const input = {
    '/anny-media-manifest.json': JSON.stringify({ assets: [
      { id: 'hero-photo', kind: 'image', prompt: 'Cinematic electric vehicle charging station' },
      { id: 'hero-motion', kind: 'video', prompt: 'Slow dolly across a solar installation', durationSeconds: 5 },
    ] }),
    '/src/App.tsx': 'export const hero = "__ANNY_MEDIA:hero-photo__"; export const motion = "__ANNY_MEDIA:hero-motion__";',
  };
  const result = await materializeWebsiteMediaAssets(input, {
    imageGenerator: async () => ({ dataUrl: 'data:image/png;base64,aGVsbG8=', mimeType: 'image/png', provider: 'mock-image' }),
    videoGenerator: async () => ({ dataUrl: 'data:video/mp4;base64,aGVsbG8=', mimeType: 'video/mp4', provider: 'mock-video' }),
  });
  assert.equal(result.files['/anny-media-manifest.json'], undefined);
  assert.match(result.files['/src/App.tsx'], /data:image\\/png;base64,aGVsbG8=/);
  assert.match(result.files['/src/App.tsx'], /data:video\\/mp4;base64,aGVsbG8=/);
  assert.deepEqual(result.generated.map(a => a.kind), ['image', 'video']);
  assert.deepEqual(result.warnings, []);
});

test('website media provider failure is non-fatal and replaces image token with safe fallback', async () => {
  const result = await materializeWebsiteMediaAssets({
    '/anny-media-manifest.json': JSON.stringify({ assets: [{ id: 'failed-image', kind: 'image', prompt: 'photo' }] }),
    '/src/App.tsx': 'const image = "__ANNY_MEDIA:failed-image__";',
  }, { imageGenerator: async () => { throw new Error('provider offline'); } });
  assert.match(result.files['/src/App.tsx'], /^const image = "data:image\\/svg\\+xml;base64,/);
  assert.equal(result.generated.length, 0);
  assert.match(result.warnings[0], /provider offline/);
});

test('invalid manifest is removed and warns without failing the project build', async () => {
  const result = await materializeWebsiteMediaAssets({
    '/anny-media-manifest.json': '{not json',
    '/src/App.tsx': 'export default 1;',
  });
  assert.equal(result.files['/anny-media-manifest.json'], undefined);
  assert.equal(result.files['/src/App.tsx'], 'export default 1;');
  assert.match(result.warnings[0], /manifest rejected/i);
});

test('caps asset count and replaces unresolved media tokens safely', async () => {
  const manifest = { assets: [
    ...Array.from({ length: 5 }, (_, i) => ({ id: 'image-' + i, kind: 'image', prompt: 'image' })),
    { id: 'video-1', kind: 'video', prompt: 'video' }, { id: 'video-2', kind: 'video', prompt: 'video' },
  ] };
  let imageCalls = 0, videoCalls = 0;
  const result = await materializeWebsiteMediaAssets({
    '/anny-media-manifest.json': JSON.stringify(manifest),
    '/src/App.tsx': 'const unused = "__ANNY_MEDIA:unknown-id__";',
  }, {
    imageGenerator: async () => { imageCalls++; return { dataUrl: 'data:image/webp;base64,aGVsbG8=', mimeType: 'image/webp', provider: 'test' }; },
    videoGenerator: async () => { videoCalls++; return { dataUrl: 'data:video/webm;base64,aGVsbG8=', mimeType: 'video/webm', provider: 'test' }; },
  });
  assert.equal(imageCalls, 3);
  assert.equal(videoCalls, 1);
  assert.match(result.files['/src/App.tsx'], /data:image\\/svg\\+xml;base64,/);
  assert.ok(result.warnings.some(w => /limited|capped/i.test(w)));
});

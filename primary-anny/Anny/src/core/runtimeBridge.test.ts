import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LocalNodeRuntimeProvider,
  SandpackRuntimeProvider,
  RemoteRuntimeProvider,
  DockerRuntimeProvider,
  ViteIframePreviewProvider,
  NextJsPreviewProvider,
  runtimeBridge
} from './runtimeBridge';

test('runtime bridge placeholder providers never report a spawned runtime', async () => {
  for (const provider of [
    new LocalNodeRuntimeProvider(),
    new SandpackRuntimeProvider(),
    new RemoteRuntimeProvider(),
    new DockerRuntimeProvider()
  ]) {
    assert.equal(await provider.isAvailable(), false);
    const result = await provider.execute({ projectId: 'test-project', port: 3000 });
    assert.equal(result.success, false);
    assert.equal(result.processId, undefined);
    assert.equal(result.port, undefined);
    assert.match(result.errorMessage || '', /UNAVAILABLE|UNCONFIGURED/i);
  }
});

test('runtime bridge returns no provider rather than fake remote execution success', async () => {
  const result = await runtimeBridge.executeProject({ projectId: 'test-project', port: 3000 });
  assert.equal(result.success, false);
  assert.equal(result.providerId, 'none');
  assert.equal(result.processId, undefined);
  assert.equal(result.port, undefined);
});

test('preview provider routes do not claim a live server before artifact verification', () => {
  const vite = new ViteIframePreviewProvider().createPreviewConfig('test-project', 3000);
  assert.equal(vite.isLive, false);
  if (typeof window === 'undefined') assert.equal(vite.activeUrl, '');

  const next = new NextJsPreviewProvider().createPreviewConfig('test-project', 3000);
  assert.equal(next.isLive, false);
  assert.equal(next.activeUrl, '');
});

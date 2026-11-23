import test from 'node:test';
import assert from 'node:assert/strict';
import { capabilityManager } from '../core/capabilityManager';

test('unprobed engines, storage and preview are not reported healthy or connected', () => {
  for (const id of ['eabp_engine', 'intent_router', 'vfs_engine', 'preview_vite_iframe']) {
    const capability = capabilityManager.getById(id);
    assert.ok(capability, `expected registered capability: ${id}`);
    assert.equal(capability.isConnected, false);
    assert.equal(capability.status, 'standby');
    assert.equal(capability.health, 'degraded');
    assert.match(capability.lastVerified, /not runtime-verified|not probed/i);
    assert.equal(capability.metrics, undefined);
  }
});

test('local Node runtime registration reflects the actual runtime only', () => {
  const runtime = capabilityManager.getById('provider_local_node');
  assert.ok(runtime);
  const nodeAvailable = typeof process !== 'undefined' && Boolean(process.versions?.node);
  assert.equal(runtime.isConnected, nodeAvailable);
  assert.equal(runtime.status, nodeAvailable ? 'active' : 'disabled');
  assert.equal(runtime.health, nodeAvailable ? 'healthy' : 'offline');
});

test('unimplemented or unprobed external runtimes remain unavailable', () => {
  for (const id of ['provider_sandpack', 'provider_remote', 'preview_generic_http', 'provider_docker']) {
    const capability = capabilityManager.getById(id);
    assert.ok(capability);
    assert.equal(capability.isConnected, false);
    assert.equal(capability.health, 'offline');
    assert.equal(capability.status, 'disabled');
  }
});

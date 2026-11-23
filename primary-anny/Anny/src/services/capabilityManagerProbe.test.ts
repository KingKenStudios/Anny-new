import test from 'node:test';
import assert from 'node:assert/strict';
import { CapabilityManager } from '../core/capabilityManager';

test('a successful live probe is the only path that promotes a capability to healthy', async () => {
  const manager = CapabilityManager.getInstance();
  const report = await manager.verify('eabp_engine', () => ({
    healthy: true, connected: true, detail: 'test probe passed'
  }));
  assert.equal(report.outcome, 'verified');
  const capability = manager.getById('eabp_engine');
  assert.equal(capability?.health, 'healthy');
  assert.equal(capability?.isConnected, true);
  assert.equal(capability?.status, 'active');
  assert.match(capability?.lastVerified ?? '', /^20\d\d-/);
});

test('missing probe leaves registration explicitly unverified', async () => {
  const manager = CapabilityManager.getInstance();
  const report = await manager.verify('intent_router');
  assert.equal(report.outcome, 'no_probe');
  assert.equal(manager.getById('intent_router')?.health, 'degraded');
});

test('failed probes disconnect a capability and record the reason', async () => {
  const manager = CapabilityManager.getInstance();
  const report = await manager.verify('vfs_engine', () => {
    throw new Error('storage unavailable');
  });
  assert.equal(report.outcome, 'failed');
  assert.equal(manager.getById('vfs_engine')?.isConnected, false);
  assert.equal(manager.getById('vfs_engine')?.health, 'degraded');
  assert.ok(manager.getById('vfs_engine')?.limitations.some(x => x.includes('storage unavailable')));
});

test('probe timeouts are bounded and mark the capability critical', async () => {
  const manager = CapabilityManager.getInstance();
  const report = await manager.verify('preview_vite_iframe', () => new Promise(() => {}), 5);
  assert.equal(report.outcome, 'timed_out');
  assert.equal(manager.getById('preview_vite_iframe')?.health, 'critical');
  assert.equal(manager.getById('preview_vite_iframe')?.isConnected, false);
});

test('verifyAll never invents probes for unregistered capabilities', async () => {
  const manager = CapabilityManager.getInstance();
  const reports = await manager.verifyAll({ provider_local_node: () => ({
    healthy: true, connected: true, detail: 'node probe supplied'
  }) });
  assert.ok(reports.some(x => x.id === 'provider_local_node' && x.outcome === 'verified'));
  assert.ok(reports.some(x => x.id === 'provider_docker' && x.outcome === 'no_probe'));
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { integrationRegistry } from './integrationRegistry';

test('subsystem registry avoids claiming unverified runtime and security implementations are healthy', () => {
  const workspace = integrationRegistry.getById('subsystem_workspace');
  assert.ok(workspace);
  assert.match(workspace!.capabilities.join(' '), /not a full AST\/compiler/i);

  const runtime = integrationRegistry.getById('subsystem_runtime_bridge');
  assert.ok(runtime);
  assert.equal(runtime!.health, 'degraded');
  assert.equal(runtime!.status, 'standby');
  assert.doesNotMatch(runtime!.capabilities.join(' '), /real runtime is connected/i);
  assert.match(runtime!.capabilities.join(' '), /No verified process-spawning runtime/i);

  const security = integrationRegistry.getById('subsystem_security');
  assert.ok(security);
  assert.equal(security!.health, 'degraded');
  assert.equal(security!.status, 'standby');
  assert.match(security!.capabilities.join(' '), /Not a complete prompt-injection defense/i);
  assert.match(security!.capabilities.join(' '), /No biometric authentication capability/i);

  const builder = integrationRegistry.getById('subsystem_eabp');
  assert.ok(builder);
  assert.equal(builder!.health, 'degraded');
  assert.equal(builder!.status, 'standby');
});

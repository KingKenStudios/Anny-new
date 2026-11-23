import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtimePlatform } from './runtimeExecutionPlatform';

test('runtime platform default state does not claim a real process or telemetry', () => {
  const project = runtimePlatform.getProjects().find(item => item.projectId === 'proj_primary_anny');
  assert.ok(project);
  assert.equal(project!.executionMode, 'SIMULATED');
  assert.equal(project!.state, 'simulated');
  assert.equal(project!.port, 0);
  assert.equal(project!.metrics.pid, null);
  assert.equal(project!.metrics.cpuUsagePct, null);
  assert.equal(project!.metrics.memoryUsageMb, null);
  assert.equal(project!.metrics.uptimeSeconds, null);
  assert.equal(project!.metrics.listeningPort, null);
  assert.equal(project!.metrics.healthStatus, 'degraded');
  assert.doesNotMatch(runtimePlatform.getLogs(project!.projectId).map(log => log.message).join('\n'), /dev server listening on http/i);
});

test('starting a workspace runs only structural validation and reports simulation mode', async () => {
  const projectId = 'test-runtime-simulation-' + Date.now();
  const vfs = (await import('./workspaceManager')).WorkspaceManager.getInstance().getVFS();
  const started = runtimePlatform.startProject(projectId, 'Test Runtime', vfs);
  assert.equal(started.executionMode, 'SIMULATED');
  assert.equal(started.metrics.pid, null);
  assert.equal(started.port, 0);

  await new Promise(resolve => setTimeout(resolve, 500));
  const result = runtimePlatform.getProjects().find(item => item.projectId === projectId);
  assert.ok(result);
  assert.equal(result!.executionMode, 'SIMULATED');
  assert.equal(result!.metrics.pid, null);
  assert.equal(result!.metrics.cpuUsagePct, null);
  assert.equal(result!.metrics.memoryUsageMb, null);
  assert.equal(result!.metrics.listeningPort, null);
  if (result!.state === 'simulated') {
    assert.equal(result!.metrics.healthStatus, 'degraded');
  }
  assert.doesNotMatch(runtimePlatform.getLogs(projectId).map(log => log.message).join('\n'), /dev server listening on http/i);
  runtimePlatform.stopProject(projectId);
});

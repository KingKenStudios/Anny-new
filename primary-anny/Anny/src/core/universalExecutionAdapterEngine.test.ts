import assert from 'node:assert/strict';
import { test } from 'node:test';
import { universalExecutionAdapterEngine } from './universalExecutionAdapterEngine';

test('placeholder runtime adapter does not report a fake build or spawned process as success', async () => {
  const adapter = universalExecutionAdapterEngine.getAdapter('NODE_VITE');
  assert.ok(adapter);
  const build = await adapter!.build('test-project');
  assert.equal(build.success, false);
  assert.match(build.logs.join('\n'), /no compiler or external runtime is attached/i);
  assert.match(build.logs.join('\n'), /Build was NOT executed/i);

  const run = await adapter!.run('test-project', 4321);
  assert.equal(run.pid, 0);
  assert.equal(run.status, 'SIMULATED');
  const health = await adapter!.healthCheck();
  assert.equal(health.status, 'DEGRADED');
  assert.match(health.message, /no real process is spawned/i);
  assert.equal(adapter!.getPreviewURL(), '');
  await adapter!.stop();
});

test('selecting an unimplemented adapter does not mark a runtime process as running', async () => {
  const adapter = await universalExecutionAdapterEngine.selectAdapterAndRun('PYTHON_FASTAPI', 'test-project');
  const health = await adapter.healthCheck();
  assert.equal(health.status, 'AWAITING_DEPENDENCY');
  assert.match(health.message, /real runtime adapter unavailable/i);
  assert.equal(adapter.getPreviewURL(), '');
});

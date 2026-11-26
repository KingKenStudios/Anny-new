import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskStateManager } from './taskStateManager';
import { systemBus } from './systemBus';

function createTask(sessionId: string, executionId: string) {
  return taskStateManager.createOrUpdateTask({
    sessionId,
    projectId: 'task-manager-test',
    userPrompt: 'test task',
    interpretedIntent: 'test',
    planSteps: ['step-a', 'step-b'],
    executionId,
  });
}

test('BuildCancelled with a session target only cancels that session', () => {
  const a = createTask('cancel-target-a', 'exec-a');
  const b = createTask('cancel-target-b', 'exec-b');
  taskStateManager.updateStatus(a.sessionId, 'running');
  taskStateManager.updateStatus(b.sessionId, 'running');

  systemBus.publish('BuildCancelled', 'test', { sessionId: a.sessionId });

  assert.equal(taskStateManager.getTask(a.sessionId)?.status, 'cancelled');
  assert.equal(taskStateManager.getTask(b.sessionId)?.status, 'running');
  taskStateManager.clearTask(a.sessionId);
  taskStateManager.clearTask(b.sessionId);
});

test('BuildCancelled with execution id only cancels the matching execution', () => {
  const a = createTask('cancel-exec-a', 'unique-exec-a');
  const b = createTask('cancel-exec-b', 'unique-exec-b');
  taskStateManager.updateStatus(a.sessionId, 'running');
  taskStateManager.updateStatus(b.sessionId, 'running');

  systemBus.publish('BuildCancelled', 'test', { executionId: a.executionId });

  assert.equal(taskStateManager.getTask(a.sessionId)?.status, 'cancelled');
  assert.equal(taskStateManager.getTask(b.sessionId)?.status, 'running');
  taskStateManager.clearTask(a.sessionId);
  taskStateManager.clearTask(b.sessionId);
});

test('refinement preserves pending steps and completed work', () => {
  const task = createTask('refinement-session', 'refinement-exec');
  taskStateManager.markStepCompleted(task.sessionId, 'step-a');
  taskStateManager.updateStatus(task.sessionId, 'running');

  const refined = taskStateManager.createOrUpdateTask({
    sessionId: task.sessionId,
    projectId: task.projectId,
    userPrompt: 'add a new step',
    interpretedIntent: 'refine',
    planSteps: ['step-b', 'step-c'],
    isRefinement: true,
  });

  assert.deepEqual(refined.completedSteps, ['step-a']);
  assert.deepEqual(refined.pendingSteps, ['step-b', 'step-c']);
  assert.deepEqual(refined.activePlan, ['step-a', 'step-b', 'step-c']);
  taskStateManager.clearTask(task.sessionId);
});

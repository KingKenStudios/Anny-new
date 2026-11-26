import assert from 'node:assert/strict';
import test from 'node:test';
import { generate3DModelFromTextLocal } from './modlyService';

test('local text-to-3D client rejects empty and oversized prompts before network calls', async () => {
  await assert.rejects(() => generate3DModelFromTextLocal('  '), /between 1 and 4000 characters/);
  await assert.rejects(() => generate3DModelFromTextLocal('x'.repeat(4001)), /between 1 and 4000 characters/);
});

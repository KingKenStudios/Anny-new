import assert from 'node:assert/strict';
import test from 'node:test';
import { generate3DModelFromImage, generate3DModelFromTextLocal, generate3DModelFromText, normalizeLocalModlyJobResponse } from './modlyService';

test('local text-to-3D client rejects empty and oversized prompts before network calls', async () => {
  await assert.rejects(() => generate3DModelFromTextLocal('  '), /between 1 and 4000 characters/);
  await assert.rejects(() => generate3DModelFromTextLocal('x'.repeat(4001)), /between 1 and 4000 characters/);
  await assert.rejects(() => generate3DModelFromText(''), /between 1 and 4000 characters/);
  await assert.rejects(() => generate3DModelFromText('x'.repeat(4001)), /between 1 and 4000 characters/);
});

test('image-to-3D client rejects invalid MIME and oversized files before network calls', async () => {
  const invalid = new File(['not an image'], 'invalid.txt', { type: 'text/plain' });
  const oversized = new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' });
  await assert.rejects(() => generate3DModelFromImage(invalid), /valid image file/);
  await assert.rejects(() => generate3DModelFromImage(oversized), /25 MB or smaller/);
});

test('local Modly job response maps job_id to pollable client task id', () => {
  assert.deepEqual(normalizeLocalModlyJobResponse({ job_id: 'local-job-123' }), {
    id: 'local-job-123',
    status: 'pending',
    progress: 0,
    engine: 'local',
  });
  assert.throws(() => normalizeLocalModlyJobResponse({ status: 'pending' }), /no job identifier/);
});

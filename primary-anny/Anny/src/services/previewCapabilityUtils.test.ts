import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { derivePreviewCapabilityToken } from './previewCapabilityUtils';

test('preview capability tokens are reproducible after restart from stable session metadata', () => {
  const secret = crypto.randomBytes(48).toString('base64url');
  const identity = {
    previewId: 'prev_0123456789abcdef01234567',
    projectId: 'project-a',
    ownerUserId: 'tenant-a',
    updatedAt: '2026-11-23T10:00:00.000Z'
  };
  const first = derivePreviewCapabilityToken(secret, identity);
  const restoredAfterRestart = derivePreviewCapabilityToken(secret, { ...identity });

  assert.equal(first, restoredAfterRestart);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test('preview capability tokens are bound to tenant, project, session, and refresh timestamp', () => {
  const secret = crypto.randomBytes(48).toString('base64url');
  const identity = {
    previewId: 'prev_0123456789abcdef01234567',
    projectId: 'project-a',
    ownerUserId: 'tenant-a',
    updatedAt: '2026-11-23T10:00:00.000Z'
  };
  const token = derivePreviewCapabilityToken(secret, identity);

  assert.notEqual(token, derivePreviewCapabilityToken(secret, { ...identity, ownerUserId: 'tenant-b' }));
  assert.notEqual(token, derivePreviewCapabilityToken(secret, { ...identity, projectId: 'project-b' }));
  assert.notEqual(token, derivePreviewCapabilityToken(secret, { ...identity, updatedAt: '2026-11-23T10:01:00.000Z' }));
  assert.notEqual(token, derivePreviewCapabilityToken(crypto.randomBytes(48).toString('base64url'), identity));
});

test('preview capability derivation rejects weak or placeholder secrets', () => {
  assert.throws(() => derivePreviewCapabilityToken('development-secret', {
    previewId: 'prev_0123456789abcdef01234567',
    projectId: 'project-a',
    ownerUserId: 'tenant-a',
    updatedAt: '2026-11-23T10:00:00.000Z'
  }), /PREVIEW_CAPABILITY_SECRET_UNAVAILABLE/);
});

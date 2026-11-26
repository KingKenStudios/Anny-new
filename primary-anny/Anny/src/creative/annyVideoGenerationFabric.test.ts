import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRequestedVideoResolution } from '../core/annyVideoGenerationFabric';

test('requested video quality is not silently downgraded', () => {
  assert.equal(normalizeRequestedVideoResolution('4k'), '4k');
  assert.equal(normalizeRequestedVideoResolution('1080p'), '1080p');
  assert.equal(normalizeRequestedVideoResolution('720p'), '720p');
  assert.equal(normalizeRequestedVideoResolution('unsupported'), '720p');
});

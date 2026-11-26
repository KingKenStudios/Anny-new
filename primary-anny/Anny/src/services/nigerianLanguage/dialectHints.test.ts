import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidNigerianDialectHint, NIGERIAN_DIALECT_HINTS } from './types';

test('dialect hints are constrained to the requested language', () => {
  assert.equal(isValidNigerianDialectHint('yo', 'yo-ekiti'), true);
  assert.equal(isValidNigerianDialectHint('ha', 'ha-kano'), true);
  assert.equal(isValidNigerianDialectHint('ig', 'ig-anambra'), true);
  assert.equal(isValidNigerianDialectHint('pcm', 'pcm-port-harcourt'), true);
  assert.equal(isValidNigerianDialectHint('en-ng', 'en-ng-lagos'), true);
  assert.equal(isValidNigerianDialectHint('yo', 'ha-kano'), false);
  assert.equal(isValidNigerianDialectHint('ig', 'yo-ekiti'), false);
  assert.equal(isValidNigerianDialectHint('pcm', 'arbitrary-user-string'), false);
});

test('every declared dialect hint has an explicit language mapping', () => {
  const flattened = Object.values(NIGERIAN_DIALECT_HINTS).flat();
  assert.equal(new Set(flattened).size, flattened.length);
  assert.ok(flattened.length >= 15);
});

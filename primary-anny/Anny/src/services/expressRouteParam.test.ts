import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeExpressRouteParam } from './expressRouteParam';

test('normalizes string route params without changing their value', () => {
  assert.equal(normalizeExpressRouteParam('project-123'), 'project-123');
});

test('uses the first array element for Express 5 route-param typing', () => {
  assert.equal(normalizeExpressRouteParam(['asset-123', 'unexpected']), 'asset-123');
});

test('returns an empty string for missing or empty route params', () => {
  assert.equal(normalizeExpressRouteParam(undefined), '');
  assert.equal(normalizeExpressRouteParam([]), '');
});

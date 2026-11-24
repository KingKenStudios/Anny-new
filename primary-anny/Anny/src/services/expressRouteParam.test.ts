import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeExpressRouteParam } from './expressRouteParam';

test('normalizes Express route params from strings, arrays, and missing values', () => {
  assert.equal(normalizeExpressRouteParam('project-123'), 'project-123');
  assert.equal(normalizeExpressRouteParam(['company-1', 'company-2']), 'company-1');
  assert.equal(normalizeExpressRouteParam(undefined), '');
  assert.equal(normalizeExpressRouteParam([]), '');
});

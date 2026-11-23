import assert from 'node:assert/strict';
import { test } from 'node:test';
import { universalPreviewEngine } from './universalPreviewEngine';

test('preview route selection is not misreported as verified rendering', () => {
  const current = universalPreviewEngine.getCurrentRoute();
  assert.equal(current.status, 'ROUTED_UNVERIFIED');

  const report = universalPreviewEngine.validatePreviewHealth();
  assert.equal(report.status, 'DEGRADED');
  assert.equal(report.isComponentRendered, false);
  assert.equal(report.domVerified, false);
  assert.match(report.details, /independent render\/load evidence/i);
  assert.match(report.details, /Host application DOM is not counted/i);
});

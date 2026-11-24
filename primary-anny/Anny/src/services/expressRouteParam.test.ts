import { describe, expect, test } from 'bun:test';
import { normalizeExpressRouteParam } from './expressRouteParam';

describe('normalizeExpressRouteParam', () => {
  test('preserves string params', () => {
    expect(normalizeExpressRouteParam('project-123')).toBe('project-123');
  });

  test('selects the first route param from an array', () => {
    expect(normalizeExpressRouteParam(['company-1', 'company-2'])).toBe('company-1');
  });

  test('returns empty for missing or empty array params', () => {
    expect(normalizeExpressRouteParam(undefined)).toBe('');
    expect(normalizeExpressRouteParam([])).toBe('');
  });
});

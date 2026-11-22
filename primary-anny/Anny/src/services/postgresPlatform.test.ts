import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { requiresDurablePersistence } from './postgresPlatform.ts';

describe('PostgreSQL persistence mode', () => {
  test('requires durable persistence in production', () => {
    assert.equal(requiresDurablePersistence({ NODE_ENV: 'production' }), true);
  });

  test('allows explicit durable-persistence enforcement outside production', () => {
    assert.equal(requiresDurablePersistence({ NODE_ENV: 'test', ANNY_REQUIRE_DURABLE_PERSISTENCE: 'true' }), true);
  });

  test('does not infer production enforcement from an unset environment', () => {
    assert.equal(requiresDurablePersistence({ NODE_ENV: 'development' }), false);
  });
});

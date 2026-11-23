import assert from 'node:assert/strict';
import { test } from 'node:test';
import { qdrantReadinessFromHealth } from './enterpriseSystemGateway';

test('readiness reports verified remote Qdrant as PASS and describes live storage', () => {
  const status = qdrantReadinessFromHealth({
    status: 'CONNECTED',
    latencyMs: 21,
    totalVectors: 5,
    detail: 'Connected to Qdrant; 2 collections discovered.'
  });
  assert.equal(status.status, 'PASS');
  assert.equal(status.latencyMs, 21);
  assert.match(status.details, /Connected to Qdrant/);
  assert.match(status.details, /5/);
});

test('readiness distinguishes browser-persistent and volatile offline vector modes', () => {
  const persistent = qdrantReadinessFromHealth({
    status: 'LOCAL_PERSISTENT',
    latencyMs: 2,
    totalVectors: 12,
    detail: 'IndexedDB persistent storage available.'
  });
  assert.equal(persistent.status, 'DEGRADED');
  assert.match(persistent.details, /IndexedDB persistent storage/);

  const volatile = qdrantReadinessFromHealth({
    status: 'VOLATILE_OFFLINE',
    latencyMs: 0,
    totalVectors: 0,
    detail: 'Vectors exist only in process memory.'
  });
  assert.equal(volatile.status, 'DEGRADED');
  assert.match(volatile.details, /process memory/);
});

test('readiness marks configured vector storage and local persistence failures as FAIL', () => {
  for (const statusName of ['CONNECTION_FAILED', 'LOCAL_PERSISTENCE_FAILED']) {
    assert.equal(qdrantReadinessFromHealth({
      status: statusName,
      latencyMs: 100,
      totalVectors: 0,
      detail: 'Storage check failed.'
    }).status, 'FAIL');
  }
});

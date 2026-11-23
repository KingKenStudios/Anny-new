import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveProviderAttempts } from './providerRoutingUtils';

const priority = ['gemini', 'groq', 'deepseek', 'ollama'] as const;

test('offline-only mode attempts only the local provider', () => {
  assert.deepEqual(resolveProviderAttempts([...priority], undefined, {
    offlineOnly: true,
    localProvider: 'ollama'
  }), ['ollama']);
  assert.throws(() => resolveProviderAttempts([...priority], 'gemini', {
    offlineOnly: true,
    localProvider: 'ollama'
  }), /OFFLINE_UNAVAILABLE/);
});

test('explicit Ollama selection never falls back to cloud providers', () => {
  assert.deepEqual(resolveProviderAttempts([...priority], 'ollama', {
    localProvider: 'ollama'
  }), ['ollama']);
});

test('disabled fallback uses only the requested provider or local provider when none is selected', () => {
  assert.deepEqual(resolveProviderAttempts([...priority], 'gemini', {
    disableCloudFallback: true,
    localProvider: 'ollama'
  }), ['gemini']);
  assert.deepEqual(resolveProviderAttempts([...priority], undefined, {
    disableCloudFallback: true,
    localProvider: 'ollama'
  }), ['ollama']);
});

test('default routing preserves ordered provider failover', () => {
  assert.deepEqual(resolveProviderAttempts([...priority], 'groq', {
    localProvider: 'ollama'
  }), ['groq', 'gemini', 'deepseek', 'ollama']);
  assert.deepEqual(resolveProviderAttempts([...priority], undefined, {
    localProvider: 'ollama'
  }), [...priority]);
});

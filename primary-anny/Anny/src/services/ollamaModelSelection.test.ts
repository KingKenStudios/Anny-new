import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveOllamaEndpoint, resolveOllamaModel } from './ollamaModelSelection';
import type { OllamaDiscoveryResult } from './ollamaService';

const discovery: OllamaDiscoveryResult = {
  reachable: true,
  activeEndpoint: 'http://127.0.0.1:11434/',
  discoveredModels: [
    { name: 'llama3.2:latest' },
    { name: 'qwen2.5:7b-instruct-q4_K_M' }
  ],
  inferenceTestPassed: true,
  latencyMs: 120
};

test('local endpoint resolution uses the actually discovered endpoint and normalizes its path', () => {
  assert.equal(resolveOllamaEndpoint(discovery), 'http://127.0.0.1:11434');
  assert.throws(() => resolveOllamaEndpoint({
    ...discovery,
    reachable: false,
    activeEndpoint: undefined
  }), /OFFLINE_UNAVAILABLE/);
});

test('local model resolution auto-selects an installed model and supports exact or base-name aliases', () => {
  assert.equal(resolveOllamaModel(undefined, discovery.discoveredModels), 'llama3.2:latest');
  assert.equal(resolveOllamaModel('ollama-local', discovery.discoveredModels), 'llama3.2:latest');
  assert.equal(resolveOllamaModel('qwen2.5:7b-instruct-q4_K_M', discovery.discoveredModels), 'qwen2.5:7b-instruct-q4_K_M');
  assert.equal(resolveOllamaModel('llama3.2', discovery.discoveredModels), 'llama3.2:latest');
});

test('local model resolution fails clearly when no model is installed or requested model is missing', () => {
  assert.throws(() => resolveOllamaModel(undefined, []), /no local models are installed/i);
  assert.throws(() => resolveOllamaModel('deepseek-r1', discovery.discoveredModels), /not installed locally/i);
  assert.throws(() => resolveOllamaModel('qwen2.5:72b', discovery.discoveredModels), /not installed locally/i);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertOllamaMediaSupported, isInstalledOllamaModel, isOllamaVisionModel, resolveOllamaEndpoint, resolveOllamaModel } from './ollamaModelSelection';
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
  assert.equal(resolveOllamaModel('ollama:llama3.2:latest', discovery.discoveredModels), 'llama3.2:latest');
  assert.equal(resolveOllamaModel('qwen2.5:7b-instruct-q4_K_M', ['llama3.2:latest', 'qwen2.5:7b-instruct-q4_K_M']), 'qwen2.5:7b-instruct-q4_K_M');
});

test('local model resolution fails clearly when no model is installed or requested model is missing', () => {
  assert.throws(() => resolveOllamaModel(undefined, []), /no local chat-capable models are installed/i);
  assert.throws(() => resolveOllamaModel(undefined, [{ name: 'nomic-embed-text' }]), /no local chat-capable models are installed/i);
  assert.equal(isInstalledOllamaModel('nomic-embed-text', ['nomic-embed-text']), false);
  assert.throws(() => resolveOllamaModel('deepseek-r1', discovery.discoveredModels), /not installed locally/i);
  assert.throws(() => resolveOllamaModel('qwen2.5:72b', discovery.discoveredModels), /not installed locally/i);
});


test('model router only treats an exact discovered Ollama model as installed', () => {
  const installed = discovery.discoveredModels.map(model => model.name);
  assert.equal(isInstalledOllamaModel('llama3.2:latest', installed), true);
  assert.equal(isInstalledOllamaModel('qwen2.5:72b', installed), false);
});


test('vision support is inferred only for known vision model families', () => {
  assert.equal(isOllamaVisionModel('llava:7b'), true);
  assert.equal(isOllamaVisionModel('qwen2.5-vl:7b'), true);
  assert.equal(isOllamaVisionModel('moondream:latest'), true);
  assert.equal(isOllamaVisionModel('qwen2.5-coder:7b'), false);
});


test('offline media validation allows text and vision images but rejects unsupported media', () => {
  assert.doesNotThrow(() => assertOllamaMediaSupported([
    { content: 'plain text' },
    { content: [{ text: 'describe this' } as any] }
  ], 'llama3.2:latest'));

  assert.doesNotThrow(() => assertOllamaMediaSupported([
    { content: [{ inlineData: { mimeType: 'image/png', data: 'aGVsbG8=' } }] }
  ], 'llava:7b'));

  assert.throws(() => assertOllamaMediaSupported([
    { content: [{ inlineData: { mimeType: 'image/png', data: 'aGVsbG8=' } }] }
  ], 'llama3.2:latest'), /not identified as a vision-capable/i);

  assert.throws(() => assertOllamaMediaSupported([
    { content: [{ inlineData: { mimeType: 'audio/wav', data: 'aGVsbG8=' } }] }
  ], 'llava:7b'), /text and image input only/i);

  assert.throws(() => assertOllamaMediaSupported([
    { content: [{ fileData: { mimeType: 'application/pdf', fileUri: 'file://private.pdf' } }] }
  ], 'llava:7b'), /remote file references/i);
});

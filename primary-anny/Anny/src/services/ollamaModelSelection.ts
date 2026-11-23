import type { OllamaDiscoveryResult, OllamaModelInfo } from './ollamaService';

export function resolveOllamaEndpoint(discovery: OllamaDiscoveryResult): string {
  if (!discovery.reachable || !discovery.activeEndpoint) {
    throw new Error('OFFLINE_UNAVAILABLE: No reachable local Ollama endpoint was discovered.');
  }
  return discovery.activeEndpoint.replace(/\/+$/, '');
}

export function resolveOllamaModel(
  requestedModel: string | undefined,
  discoveredModels: OllamaModelInfo[]
): string {
  if (!Array.isArray(discoveredModels) || discoveredModels.length === 0) {
    throw new Error('OFFLINE_UNAVAILABLE: Ollama is reachable but no local models are installed.');
  }

  const requested = String(requestedModel || '').trim();
  const autoSelect = !requested || ['none', 'ollama', 'ollama-local', 'local', 'auto'].includes(requested.toLowerCase());
  if (autoSelect) return discoveredModels[0].name;

  const exact = discoveredModels.find(model => model.name === requested);
  if (exact) return exact.name;

  const baseName = requested.split(':')[0];
  const alias = discoveredModels.find(model => model.name.split(':')[0] === baseName);
  if (alias) return alias.name;

  throw new Error(`OFFLINE_UNAVAILABLE: Requested Ollama model "${requested}" is not installed locally.`);
}

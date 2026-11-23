import { isOllamaChatModel, type OllamaDiscoveryResult, type OllamaModelInfo } from './ollamaService';

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
  const chatModels = Array.isArray(discoveredModels)
    ? discoveredModels.filter(model => isOllamaChatModel(model.name))
    : [];
  if (chatModels.length === 0) {
    throw new Error('OFFLINE_UNAVAILABLE: Ollama is reachable but no local chat-capable models are installed.');
  }

  const rawRequested = String(requestedModel || '').trim();
  const requested = rawRequested.replace(/^ollama:/i, '');
  const autoSelect = !requested || ['none', 'ollama', 'ollama-local', 'local', 'auto'].includes(requested.toLowerCase());
  if (autoSelect) return chatModels[0].name;

  const exact = chatModels.find(model => model.name === requested);
  if (exact) return exact.name;

  if (!requested.includes(':')) {
    const alias = chatModels.find(model => model.name.split(':')[0] === requested);
    if (alias) return alias.name;
  }

  throw new Error(`OFFLINE_UNAVAILABLE: Requested Ollama model "${requested}" is not installed locally.`);
}

export function isInstalledOllamaModel(modelName: string, discoveredModels: string[]): boolean {
  return Array.isArray(discoveredModels) && discoveredModels.includes(modelName) && isOllamaChatModel(modelName);
}

export function isOllamaVisionModel(modelName: string): boolean {
  const name = String(modelName || '').toLowerCase();
  return name.includes('vision') || name.includes('llava') ||
    name.includes('minicpm-v') || name.includes('moondream') || name.includes('-vl');
}


export function assertOllamaMediaSupported(
  messages: Array<{ content: string | Array<{
    fileData?: unknown;
    inlineData?: { mimeType?: string; data?: string };
  }> }>,
  modelName: string
): void {
  const unsupported = messages.some(message =>
    Array.isArray(message.content) && message.content.some(part =>
      Boolean(part.fileData) ||
      Boolean(part.inlineData && !(part.inlineData.mimeType || '').toLowerCase().startsWith('image/'))
    )
  );
  if (unsupported) {
    throw new Error('OFFLINE_UNAVAILABLE: This Ollama chat route currently supports text and image input only; audio, video, and remote file references are not passed to the local model.');
  }

  const hasImages = messages.some(message =>
    Array.isArray(message.content) && message.content.some(part =>
      Boolean(part.inlineData?.data && (part.inlineData.mimeType || '').toLowerCase().startsWith('image/'))
    )
  );
  if (hasImages && !isOllamaVisionModel(modelName)) {
    throw new Error(`OFFLINE_UNAVAILABLE: Local model "${modelName}" is not identified as a vision-capable Ollama model.`);
  }
}

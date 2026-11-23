import { isOllamaChatModel, type OllamaDiscoveryResult, type OllamaModelInfo } from './ollamaService';

export function resolveOllamaEndpoint(discovery: OllamaDiscoveryResult): string {
  if (!discovery.reachable || !discovery.activeEndpoint) {
    throw new Error('OFFLINE_UNAVAILABLE: No reachable local Ollama endpoint was discovered.');
  }
  return discovery.activeEndpoint.replace(/\/+$/, '');
}

export function resolveOllamaModel(
  requestedModel: string | undefined,
  discoveredModels: Array<OllamaModelInfo | string>
): string {
  const modelNames = Array.isArray(discoveredModels)
    ? discoveredModels.map(model => typeof model === 'string' ? model : model.name)
    : [];
  const chatModels = modelNames.filter(name => isOllamaChatModel(name));
  if (chatModels.length === 0) {
    throw new Error('OFFLINE_UNAVAILABLE: Ollama is reachable but no local chat-capable models are installed.');
  }

  const rawRequested = String(requestedModel || '').trim();
  const requested = rawRequested.replace(/^ollama:/i, '');
  const autoSelect = !requested || ['none', 'ollama', 'ollama-local', 'local', 'auto'].includes(requested.toLowerCase());
  if (autoSelect) return chatModels[0];

  const exact = chatModels.find(name => name === requested);
  if (exact) return exact;

  if (!requested.includes(':')) {
    const alias = chatModels.find(name => name.split(':')[0] === requested);
    if (alias) return alias;
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


export function isOllamaEmbeddingModel(modelName: string): boolean {
  return /(embed|embedding)/i.test(String(modelName || ''));
}

export function resolveOllamaEmbeddingModel(
  requestedModel: string | undefined,
  discoveredModels: Array<OllamaModelInfo | string>
): string {
  const modelNames = Array.isArray(discoveredModels)
    ? discoveredModels.map(model => typeof model === 'string' ? model : model.name)
    : [];
  const embeddingModels = modelNames.filter(isOllamaEmbeddingModel);
  if (embeddingModels.length === 0) {
    throw new Error('OFFLINE_EMBEDDINGS_UNAVAILABLE: Install a local Ollama embedding model (for example nomic-embed-text) or set OLLAMA_EMBEDDING_MODEL to an installed embedding model.');
  }

  const requested = String(requestedModel || '').trim().replace(/^ollama:/i, '');
  if (!requested) return embeddingModels[0];
  const exact = embeddingModels.find(name => name === requested);
  if (exact) return exact;
  if (!requested.includes(':')) {
    const alias = embeddingModels.find(name => name.split(':')[0] === requested);
    if (alias) return alias;
  }
  throw new Error(`OFFLINE_EMBEDDINGS_UNAVAILABLE: Configured Ollama embedding model "${requested}" is not installed or is not identified as an embedding model.`);
}

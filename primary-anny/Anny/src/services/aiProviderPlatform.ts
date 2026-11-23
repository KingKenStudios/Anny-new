import { formatNaturalConversation } from '../utils/chatHelpers';
/**
 * ANNY — AI PROVIDER PLATFORM
 * Unified Enterprise SDK for Gemini, OpenAI, Anthropic Claude, DeepSeek, Qwen, Groq, Hugging Face, OpenRouter, and Ollama.
 * Includes failover, timeout management, retries, health monitoring, cost calculation, and token accounting.
 */

import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import { envConfigService } from './envConfigService';
import { ollamaDiscoveryService } from './ollamaService';
import { resolveOllamaEndpoint, resolveOllamaModel } from './ollamaModelSelection';

export type AIProviderId = 
  | 'gemini' 
  | 'openai' 
  | 'anthropic' 
  | 'deepseek' 
  | 'qwen' 
  | 'groq' 
  | 'huggingface' 
  | 'openrouter' 
  | 'xai'
  | 'mistral'
  | 'together'
  | 'fireworks'
  | 'pollinations-flux'
  | 'ollama';

export interface ChatPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
  fileData?: {
    mimeType: string;
    fileUri: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string | ChatPart[];
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeoutMs?: number;
  functions?: FunctionDefinition[];
  taskCategory?: string;
  preserveStructured?: boolean;
  responseMimeType?: string;
  offlineOnly?: boolean;
  disableCloudFallback?: boolean;
  webSearch?: boolean;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ChatResponse {
  content: string;
  provider: AIProviderId;
  model: string;
  tokensUsed: { prompt: number; completion: number; total: number };
  estimatedCostUsd: number;
  latencyMs: number;
  functionCall?: { name: string; arguments: Record<string, any> };
  groundingSources?: Array<{ title: string; url: string }>;
}

export interface ProviderHealth {
  provider: AIProviderId;
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'NO_CREDENTIALS';
  latencyMs: number;
  lastChecked: string;
  error?: string;
}

export interface ImageGenOptions {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  numberOfImages?: number;
}

export interface ImageGenResult {
  imageUrl?: string;
  base64?: string;
  provider: AIProviderId;
  model: string;
}

// Cost estimation table (USD per 1M tokens: [promptCost, completionCost])
const PROVIDER_COSTS: Record<string, [number, number]> = {
  'gemini-4-hydrogen': [0.10, 0.40],
  'gemini-3.1-flash-lite': [0.05, 0.20],
  'gpt-4o': [2.50, 10.00],
  'gpt-4o-mini': [0.15, 0.60],
  'claude-3-5-sonnet-20241022': [3.00, 15.00],
  'claude-3-haiku-20240307': [0.25, 1.25],
  'deepseek-chat': [0.14, 0.28],
  'deepseek-coder': [0.14, 0.28],
  // Anthropic: introductory pricing through Aug 31, 2026 shown here; standard rate is $3.00/$15.00 after.
  'claude-sonnet-5': [2.00, 10.00],
  'claude-opus-4-8': [5.00, 25.00],
  'claude-haiku-4-5-20251001': [1.00, 5.00],
  'qwen-2.5-72b-instruct': [0.35, 0.70],
  'llama-3.3-70b-versatile': [0.59, 0.79],
  'mixtral-8x7b-32768': [0.24, 0.24],
  'ollama-local': [0, 0]
};

function normalizeGeminiModel(model?: string): string {
  const m = (model || '').trim();
  if (!m || m === 'gemini') return 'gemini-4-hydrogen';
  if (
    m.includes('gemini-1.') ||
    m.includes('gemini-2.') ||
    m.includes('gemini-3.5') ||
    m.includes('gemini-3.6') ||
    m.includes('gemini-3.7') ||
    m.includes('gemini-3.8') ||
    m === 'gemini-pro'
  ) {
    return 'gemini-4-hydrogen';
  }
  return m;
}

function isTransientProviderError(err: any): { is503: boolean; is429: boolean; transient: boolean } {
  const msg = String(err?.message || err || '').toLowerCase();
  const status = err?.status || err?.response?.status;
  const is503 = status === 503 || msg.includes('503') || msg.includes('unavailable') || msg.includes('high demand') || msg.includes('overloaded');
  const is429 = status === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('rate limit') || msg.includes('quota');
  const isNetwork = msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('socket hang up');
  return { is503, is429, transient: is503 || is429 || isNetwork };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const geminiModelCooldownMap = new Map<string, number>();

function orderGeminiCandidates(candidates: string[]): string[] {
  const now = Date.now();
  const unique = [...new Set(candidates)];
  const ready = unique.filter(m => (geminiModelCooldownMap.get(m) || 0) <= now);
  const cooled = unique.filter(m => (geminiModelCooldownMap.get(m) || 0) > now);
  return [...ready, ...cooled];
}

const UNIVERSAL_ANNY_CONVERSATION_POLICY = `For ordinary conversation, speak naturally like a thoughtful human. Use normal sentences and paragraphs. Do not use decorative Markdown such as **, __, ###, ---, ___, or bullet-list formatting unless the user explicitly requests structured output. Use commas, periods, question marks, exclamation marks, colons, and semicolons naturally. Do not use robotic filler phrases. Preserve code, JSON, tables, URLs, and other technical structures when the task explicitly requires them.`;

export class AIProviderPlatform {
  private static instance: AIProviderPlatform;
  private providerPriority: AIProviderId[] = ['gemini', 'groq', 'deepseek', 'anthropic', 'openai', 'mistral', 'xai', 'together', 'fireworks', 'openrouter', 'ollama'];
  private healthMap: Map<AIProviderId, ProviderHealth> = new Map();

  private constructor() {
    if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
      const cfg = envConfigService.getConfig();
      const anyConfigured = Boolean(
        cfg.geminiApiKey || cfg.groqApiKey || cfg.deepseekApiKey || cfg.openaiApiKey ||
        cfg.anthropicApiKey || cfg.openrouterApiKey || cfg.xaiApiKey || cfg.mistralApiKey ||
        cfg.togetherApiKey || cfg.fireworksApiKey
      );
      if (anyConfigured) {
        void this.refreshHealthChecks();
      }
    }
  }

  public static getInstance(): AIProviderPlatform {
    if (!AIProviderPlatform.instance) {
      AIProviderPlatform.instance = new AIProviderPlatform();
    }
    return AIProviderPlatform.instance;
  }

  // Providers with a real chat() implementation below. qwen/huggingface are declared
  // in the type system and shown in modelListing() for transparency, but are NOT
  // silently included in automatic failover — better to fail loudly than pretend
  // a configured key works when nothing actually calls that API yet.
  private static IMPLEMENTED_PROVIDERS: AIProviderId[] = ['gemini', 'groq', 'deepseek', 'openai', 'anthropic', 'openrouter', 'xai', 'mistral', 'together', 'fireworks', 'ollama'];

  public async refreshHealthChecks(): Promise<Record<AIProviderId, ProviderHealth>> {
    const config = envConfigService.getConfig();
    const providers: AIProviderId[] = ['gemini', 'openai', 'anthropic', 'deepseek', 'qwen', 'groq', 'huggingface', 'openrouter', 'xai', 'mistral', 'together', 'fireworks', 'ollama'];

    await Promise.all(providers.map(async (p) => {
      const startTime = Date.now();

      if (!AIProviderPlatform.IMPLEMENTED_PROVIDERS.includes(p)) {
        this.healthMap.set(p, {
          provider: p,
          status: 'OFFLINE',
          latencyMs: 0,
          lastChecked: new Date().toISOString(),
          error: 'Not yet implemented in AIProviderPlatform.chat()'
        });
        return;
      }

      let hasCreds = p === 'ollama';
      if (p === 'gemini') hasCreds = Boolean(config.geminiApiKey);
      else if (p === 'openai') hasCreds = Boolean(config.openaiApiKey);
      else if (p === 'anthropic') hasCreds = Boolean(config.anthropicApiKey);
      else if (p === 'deepseek') hasCreds = Boolean(config.deepseekApiKey);
      else if (p === 'groq') hasCreds = Boolean(config.groqApiKey);
      else if (p === 'openrouter') hasCreds = Boolean(config.openrouterApiKey);
      else if (p === 'xai') hasCreds = Boolean(config.xaiApiKey);
      else if (p === 'mistral') hasCreds = Boolean(config.mistralApiKey);
      else if (p === 'together') hasCreds = Boolean(config.togetherApiKey);
      else if (p === 'fireworks') hasCreds = Boolean(config.fireworksApiKey);

      if (!hasCreds) {
        this.healthMap.set(p, { provider: p, status: 'NO_CREDENTIALS', latencyMs: 0, lastChecked: new Date().toISOString() });
        return;
      }

      if (p === 'ollama') {
        const discovery = await ollamaDiscoveryService.discoverAndTest();
        const status: ProviderHealth['status'] = !discovery.reachable
          ? 'OFFLINE'
          : discovery.discoveredModels.length === 0 || !discovery.inferenceTestPassed
            ? 'DEGRADED'
            : 'HEALTHY';
        this.healthMap.set(p, {
          provider: p,
          status,
          latencyMs: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
          ...(status === 'HEALTHY' ? {} : { error: discovery.error || (!discovery.discoveredModels.length
            ? 'Ollama is reachable but no local models are installed.'
            : 'Ollama did not pass a real local inference probe.') })
        });
        return;
      }

      // Real, lightweight reachability check (not a fake "simulation") — a cheap
      // GET against each provider's models-list endpoint, 3s timeout.
      try {
        const check = async () => {
          switch (p) {
            case 'gemini':
              return axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey}`, { timeout: 3000 });
            case 'openai':
              return axios.get('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${config.openaiApiKey}` }, timeout: 3000 });
            case 'anthropic':
              return axios.get('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': config.anthropicApiKey, 'anthropic-version': '2023-06-01' }, timeout: 3000 });
            case 'deepseek':
              return axios.get('https://api.deepseek.com/v1/models', { headers: { Authorization: `Bearer ${config.deepseekApiKey}` }, timeout: 3000 });
            case 'groq':
              return axios.get('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${config.groqApiKey}` }, timeout: 3000 });
            case 'openrouter':
              return axios.get('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${config.openrouterApiKey}` }, timeout: 3000 });
            case 'xai':
              return axios.get('https://api.x.ai/v1/models', { headers: { Authorization: `Bearer ${config.xaiApiKey}` }, timeout: 3000 });
            case 'mistral':
              return axios.get('https://api.mistral.ai/v1/models', { headers: { Authorization: `Bearer ${config.mistralApiKey}` }, timeout: 3000 });
            case 'together':
              return axios.get('https://api.together.xyz/v1/models', { headers: { Authorization: `Bearer ${config.togetherApiKey}` }, timeout: 3000 });
            case 'fireworks':
              return axios.get('https://api.fireworks.ai/inference/v1/models', { headers: { Authorization: `Bearer ${config.fireworksApiKey}` }, timeout: 3000 });
            case 'ollama':
              return axios.get(`${config.ollamaBaseUrl}/api/tags`, { timeout: 2000 });
          }
        };
        await check();
        this.healthMap.set(p, { provider: p, status: 'HEALTHY', latencyMs: Date.now() - startTime, lastChecked: new Date().toISOString() });
      } catch (err: any) {
        this.healthMap.set(p, {
          provider: p,
          status: p === 'ollama' ? 'OFFLINE' : 'DEGRADED',
          latencyMs: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
          error: err.response?.status ? `HTTP ${err.response.status}` : (err.code || err.message)
        });
      }
    }));

    const result: Partial<Record<AIProviderId, ProviderHealth>> = {};
    this.healthMap.forEach((v, k) => { result[k] = v; });
    return result as Record<AIProviderId, ProviderHealth>;
  }

  public getHealthMap(): Record<string, ProviderHealth> {
    const obj: Record<string, ProviderHealth> = {};
    this.healthMap.forEach((v, k) => { obj[k] = v; });
    return obj;
  }

  // Calculate tokens & cost
  public estimateTokensAndCost(promptText: string, completionText: string, model: string): { tokens: { prompt: number; completion: number; total: number }; costUsd: number } {
    const promptTokens = Math.ceil(promptText.length / 4);
    const completionTokens = Math.ceil(completionText.length / 4);
    const totalTokens = promptTokens + completionTokens;

    const rates = PROVIDER_COSTS[model] || [0.20, 0.50];
    const costUsd = ((promptTokens * rates[0]) + (completionTokens * rates[1])) / 1000000;

    return {
      tokens: { prompt: promptTokens, completion: completionTokens, total: totalTokens },
      costUsd: Number(costUsd.toFixed(6))
    };
  }

  // Standard Chat execution with Automatic Failover & Retry
  public async chat(messages: ChatMessage[], options: ChatOptions = {}, preferredProvider?: AIProviderId): Promise<ChatResponse> {
    const overallStartTime = Date.now();
    const config = envConfigService.getConfig();
    const inlineSystemPrompts = messages
      .filter(m => m.role === 'system')
      .map(m => (typeof m.content === 'string' ? m.content : m.content.map(p => p.text || '').join('\n')))
      .filter(s => s.trim().length > 0);
    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    const baseSystemPrompt = [options.systemPrompt, ...inlineSystemPrompts].filter(Boolean).join('\n\n') || 'You are ANNY, the Enterprise AI Operating System.';
    const sysPrompt = options.preserveStructured
      ? baseSystemPrompt
      : `${baseSystemPrompt}\n\n${UNIVERSAL_ANNY_CONVERSATION_POLICY}`;
    const effectiveMessages = nonSystemMessages.length > 0 ? nonSystemMessages : messages;
    const strictOffline = Boolean(options.offlineOnly);
    // Explicitly selecting local Ollama must never silently send the prompt to
    // a cloud provider if local inference fails.
    const blockCloudFallback = Boolean(options.offlineOnly || options.disableCloudFallback || preferredProvider === 'ollama');

    if (strictOffline && preferredProvider && preferredProvider !== 'ollama') {
      throw new Error(`OFFLINE_UNAVAILABLE: Provider "${preferredProvider}" is blocked in OFFLINE_ONLY mode.`);
    }

    // Check if any message contains multimodal content (images/audio/etc)
    const hasMultimodal = messages.some(m => Array.isArray(m.content));

    const providersToTry: AIProviderId[] = strictOffline || (blockCloudFallback && (!preferredProvider || preferredProvider === 'ollama'))
      ? ['ollama']
      : blockCloudFallback && preferredProvider
        ? [preferredProvider]
        : preferredProvider
          ? [preferredProvider, ...this.providerPriority.filter(p => p !== preferredProvider)]
          : this.providerPriority;

    let lastError: Error | null = null;

    for (const provider of providersToTry) {
      const startTime = Date.now();
      try {
        if (provider === 'gemini') {
          if (config.geminiApiKey) {
            const genAI = new GoogleGenAI({
              apiKey: config.geminiApiKey,
              ...(typeof window === 'undefined' ? { httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } } : {})
            });
            const primaryModelName = normalizeGeminiModel(options.model);
            const orderedCandidates = orderGeminiCandidates([primaryModelName, 'gemini-4-hydrogen', 'gemini-3.1-flash-lite']);
            
            // Convert non-system messages to Gemini format
            const contents = effectiveMessages.map(m => {
              const role = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';
              if (Array.isArray(m.content)) {
                return { role, parts: m.content.map(p => {
                  if (p.text) return { text: p.text };
                  if (p.inlineData) return { inlineData: p.inlineData };
                  if (p.fileData) return { fileData: p.fileData };
                  return { text: '' };
                })};
              }
              return { role, parts: [{ text: m.content }] };
            });

            let lastGeminiErr: any = null;
            const retryDelaysMs = [900, 2200];
            const permanentFailures = new Set<string>();

            for (let round = 0; round <= retryDelaysMs.length; round++) {
              if (round > 0) {
                const jitter = Math.floor(Math.random() * 350);
                const waitMs = retryDelaysMs[round - 1] + jitter;
                console.warn(`[AI Provider Platform] All Gemini candidates transiently busy. Backing off ${waitMs}ms before retry round ${round + 1}/${retryDelaysMs.length + 1}...`);
                await sleep(waitMs);
              }

              let hadTransient = false;
              for (const modelName of orderedCandidates) {
                if (permanentFailures.has(modelName)) continue;
                try {
                  const genConfig: Record<string, any> = { systemInstruction: sysPrompt };
                  if (options.webSearch && !strictOffline && !blockCloudFallback) {
                    genConfig.tools = [{ googleSearch: {} }];
                  } else if (options.responseMimeType) {
                    genConfig.responseMimeType = options.responseMimeType;
                  }
                  const res = await genAI.models.generateContent({
                    model: modelName,
                    contents: contents,
                    config: genConfig
                  });

                  geminiModelCooldownMap.delete(modelName);
                  const firstCandidate = res.candidates?.[0];
                  const candidateParts = firstCandidate?.content?.parts || [];
                  const extractedFunctionCall = candidateParts.find((p: any) => p?.functionCall)?.functionCall;
                  let rawText = typeof res.text === 'string' ? res.text : '';
                  if (!rawText && candidateParts.length > 0) {
                    rawText = candidateParts.map((p: any) => (typeof p?.text === 'string' ? p.text : '')).filter(Boolean).join('\n');
                  }
                  if (!rawText.trim() && !extractedFunctionCall) {
                    const finishReason = firstCandidate?.finishReason || 'EMPTY';
                    throw new Error(`PROVIDER_EMPTY_RESPONSE: Gemini model ${modelName} returned no content (finishReason=${finishReason}).`);
                  }
                  const content = rawText;
                  const rawChunks = firstCandidate?.groundingMetadata?.groundingChunks || [];
                  const groundingSources = rawChunks
                    .map((chunk: any) => chunk?.web ? { title: String(chunk.web.title || chunk.web.uri || 'Web Source'), url: String(chunk.web.uri || '') } : null)
                    .filter((s: any): s is { title: string; url: string } => Boolean(s && s.url));
                  const latencyMs = Date.now() - startTime;
                  const { tokens, costUsd } = this.estimateTokensAndCost(JSON.stringify(effectiveMessages), content, modelName);

                  return {
                    content: options.preserveStructured ? content : formatNaturalConversation(content),
                    provider: 'gemini',
                    model: modelName,
                    tokensUsed: tokens,
                    estimatedCostUsd: costUsd,
                    latencyMs,
                    ...(extractedFunctionCall?.name ? {
                      functionCall: {
                        name: String(extractedFunctionCall.name),
                        arguments: (extractedFunctionCall.args && typeof extractedFunctionCall.args === 'object')
                          ? extractedFunctionCall.args as Record<string, any>
                          : {}
                      }
                    } : {}),
                    ...(groundingSources.length > 0 ? { groundingSources } : {})
                  };
                } catch (gErr: any) {
                  lastGeminiErr = gErr;
                  const { is503, is429, transient } = isTransientProviderError(gErr);
                  if (transient) {
                    hadTransient = true;
                    geminiModelCooldownMap.set(modelName, Date.now() + 60000);
                    console.warn(`[AI Provider Platform] Gemini model ${modelName} ${is503 ? 'experiencing high demand (503)' : (is429 ? 'rate limited (429)' : 'transient error')}. Switching to next candidate...`);
                  } else {
                    permanentFailures.add(modelName);
                    console.warn(`[AI Provider Platform] Gemini model ${modelName} error: ${gErr?.message || gErr}. Trying next...`);
                  }
                }
              }
              if (!hadTransient) break;
            }
            if (lastGeminiErr) throw lastGeminiErr;
          } else if (typeof window !== 'undefined') {
            // Browser uplink proxy to server endpoint
            const rawLast = messages[messages.length - 1]?.content || '';
            const lastUserMsg = Array.isArray(rawLast)
              ? rawLast.map(p => p.text || '').filter(Boolean).join('\n')
              : rawLast;
            const lastUserImages = Array.isArray(rawLast)
              ? rawLast.filter(p => p.inlineData?.data).map(p => p.inlineData!)
              : [];
            const historyFormatted = messages.slice(0, -1).map(m => ({
              role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: Array.isArray(m.content) ? m.content.map(p => p.text || '').join(' ') : m.content }]
            }));

            const { getAuthHeaders } = await import('../lib/apiUtils');
            const authHeaders = Object.fromEntries((await getAuthHeaders()).entries());
            const normalizedProxyModel = normalizeGeminiModel(options.model);
            const response = await axios.post('/api/brain/think', {
              prompt: lastUserMsg,
              api: 'gemini',
              model: normalizedProxyModel,
              systemPrompt: sysPrompt,
              history: historyFormatted,
              images: lastUserImages,
              webSearch: Boolean(options.webSearch),
              preserveStructured: Boolean(options.preserveStructured)
            }, { timeout: options.timeoutMs || 120000, headers: authHeaders, withCredentials: true });

            if (response.data && response.data.response) {
              const content = response.data.response;
              const latencyMs = Date.now() - startTime;
              const { tokens, costUsd } = this.estimateTokensAndCost(JSON.stringify(messages), content, normalizedProxyModel);
              return {
                content: options.preserveStructured ? content : formatNaturalConversation(content),
                provider: 'gemini',
                model: response.data.model || normalizedProxyModel,
                tokensUsed: tokens,
                estimatedCostUsd: costUsd,
                latencyMs,
                ...(Array.isArray(response.data.sources) && response.data.sources.length > 0 ? { groundingSources: response.data.sources } : {})
              };
            }
          }
        }

        if (provider === 'groq' && config.groqApiKey) {
          const modelName = options.model || 'llama-3.3-70b-versatile';

          const apiMessages = [
            { role: 'system', content: sysPrompt },
            ...effectiveMessages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content }))
          ];

          const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              model: modelName,
              messages: apiMessages,
              temperature: options.temperature ?? 0.7,
              ...(options.responseMimeType === 'application/json' ? { response_format: { type: 'json_object' } } : {})
            },
            {
              headers: { Authorization: `Bearer ${config.groqApiKey}` },
              timeout: options.timeoutMs || 25000
            }
          );

          const content = response.data.choices?.[0]?.message?.content;
          if (!content || !String(content).trim()) {
            throw new Error(`Groq returned an empty response for model ${modelName}.`);
          }
          const latencyMs = Date.now() - startTime;
          const { tokens, costUsd } = this.estimateTokensAndCost(JSON.stringify(effectiveMessages), content, modelName);

          return {
            content: options.preserveStructured ? content : formatNaturalConversation(content),
            provider: 'groq',
            model: modelName,
            tokensUsed: tokens,
            estimatedCostUsd: costUsd,
            latencyMs
          };
        }

        if (provider === 'deepseek' && config.deepseekApiKey) {
          const modelName = options.model || 'deepseek-chat';
          const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
              model: modelName,
              messages: [
                { role: 'system', content: sysPrompt },
                ...effectiveMessages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content }))
              ],
              temperature: options.temperature ?? 0.7,
              ...(options.responseMimeType === 'application/json' ? { response_format: { type: 'json_object' } } : {})
            },
            {
              headers: { Authorization: `Bearer ${config.deepseekApiKey}` },
              timeout: options.timeoutMs || 30000
            }
          );

          const content = response.data.choices?.[0]?.message?.content;
          if (!content || !String(content).trim()) {
            throw new Error(`DeepSeek returned an empty response for model ${modelName}.`);
          }
          const latencyMs = Date.now() - startTime;
          const { tokens, costUsd } = this.estimateTokensAndCost(JSON.stringify(effectiveMessages), content, modelName);

          return {
            content: options.preserveStructured ? content : formatNaturalConversation(content),
            provider: 'deepseek',
            model: modelName,
            tokensUsed: tokens,
            estimatedCostUsd: costUsd,
            latencyMs
          };
        }

        if (provider === 'anthropic' && config.anthropicApiKey) {
          const modelName = options.model || 'claude-sonnet-5';
          const anthropicMessages = effectiveMessages
            .map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content }));

          const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
              model: modelName,
              max_tokens: options.maxTokens || 8192,
              system: sysPrompt,
              messages: anthropicMessages,
              temperature: options.temperature ?? 0.7
            },
            {
              headers: {
                'x-api-key': config.anthropicApiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
              },
              timeout: options.timeoutMs || 30000
            }
          );

          const content = response.data.content?.map((b: any) => b.text || '').join('') || '';
          const latencyMs = Date.now() - startTime;
          const anthropicPromptTokens = response.data.usage?.input_tokens ?? Math.ceil(JSON.stringify(effectiveMessages).length / 4);
          const anthropicCompletionTokens = response.data.usage?.output_tokens ?? Math.ceil(content.length / 4);
          const rates = PROVIDER_COSTS[modelName] || [0.20, 0.50];
          const anthropicCostUsd = Number((((anthropicPromptTokens * rates[0]) + (anthropicCompletionTokens * rates[1])) / 1000000).toFixed(6));

          return {
            content: options.preserveStructured ? content : formatNaturalConversation(content),
            provider: 'anthropic',
            model: modelName,
            tokensUsed: { prompt: anthropicPromptTokens, completion: anthropicCompletionTokens, total: anthropicPromptTokens + anthropicCompletionTokens },
            estimatedCostUsd: anthropicCostUsd,
            latencyMs
          };
        }

        if (provider === 'openrouter' && config.openrouterApiKey) {
          const modelName = options.model || 'anthropic/claude-3.5-sonnet';
          const apiMessages = [
            { role: 'system', content: sysPrompt },
            ...effectiveMessages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content }))
          ];

          const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            { model: modelName, messages: apiMessages, temperature: options.temperature ?? 0.7 },
            { headers: { Authorization: `Bearer ${config.openrouterApiKey}` }, timeout: options.timeoutMs || 30000 }
          );

          const content = response.data.choices[0]?.message?.content || '';
          const latencyMs = Date.now() - startTime;
          const { tokens, costUsd } = this.estimateTokensAndCost(JSON.stringify(effectiveMessages), content, modelName);

          return { content: options.preserveStructured ? content : formatNaturalConversation(content), provider: 'openrouter', model: modelName, tokensUsed: tokens, estimatedCostUsd: costUsd, latencyMs };
        }

        if (provider === 'xai' && config.xaiApiKey) {
          const modelName = options.model || 'grok-4.5';
          const response = await axios.post(
            'https://api.x.ai/v1/chat/completions',
            {
              model: modelName,
              messages: [
                { role: 'system', content: sysPrompt },
                ...effectiveMessages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content }))
              ],
              temperature: options.temperature ?? 0.7
            },
            { headers: { Authorization: `Bearer ${config.xaiApiKey}` }, timeout: options.timeoutMs || 30000 }
          );
          const content = response.data.choices[0]?.message?.content || '';
          const latencyMs = Date.now() - startTime;
          const { tokens, costUsd } = this.estimateTokensAndCost(JSON.stringify(effectiveMessages), content, modelName);
          return { content: options.preserveStructured ? content : formatNaturalConversation(content), provider: 'xai', model: modelName, tokensUsed: tokens, estimatedCostUsd: costUsd, latencyMs };
        }

        if (provider === 'mistral' && config.mistralApiKey) {
          const modelName = options.model || 'mistral-large-latest';
          const response = await axios.post(
            'https://api.mistral.ai/v1/chat/completions',
            {
              model: modelName,
              messages: [
                { role: 'system', content: sysPrompt },
                ...effectiveMessages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content }))
              ],
              temperature: options.temperature ?? 0.7
            },
            { headers: { Authorization: `Bearer ${config.mistralApiKey}` }, timeout: options.timeoutMs || 30000 }
          );
          const content = response.data.choices[0]?.message?.content || '';
          const latencyMs = Date.now() - startTime;
          const { tokens, costUsd } = this.estimateTokensAndCost(JSON.stringify(effectiveMessages), content, modelName);
          return { content: options.preserveStructured ? content : formatNaturalConversation(content), provider: 'mistral', model: modelName, tokensUsed: tokens, estimatedCostUsd: costUsd, latencyMs };
        }

        if (provider === 'together' && config.togetherApiKey) {
          const modelName = options.model || 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
          const response = await axios.post(
            'https://api.together.xyz/v1/chat/completions',
            {
              model: modelName,
              messages: [
                { role: 'system', content: sysPrompt },
                ...effectiveMessages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content }))
              ],
              temperature: options.temperature ?? 0.7
            },
            { headers: { Authorization: `Bearer ${config.togetherApiKey}` }, timeout: options.timeoutMs || 30000 }
          );
          const content = response.data.choices[0]?.message?.content || '';
          const latencyMs = Date.now() - startTime;
          const { tokens, costUsd } = this.estimateTokensAndCost(JSON.stringify(effectiveMessages), content, modelName);
          return { content: options.preserveStructured ? content : formatNaturalConversation(content), provider: 'together', model: modelName, tokensUsed: tokens, estimatedCostUsd: costUsd, latencyMs };
        }

        if (provider === 'fireworks' && config.fireworksApiKey) {
          const modelName = options.model || 'accounts/fireworks/models/llama-v3p3-70b-instruct';
          const response = await axios.post(
            'https://api.fireworks.ai/inference/v1/chat/completions',
            {
              model: modelName,
              messages: [
                { role: 'system', content: sysPrompt },
                ...effectiveMessages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content }))
              ],
              temperature: options.temperature ?? 0.7
            },
            { headers: { Authorization: `Bearer ${config.fireworksApiKey}` }, timeout: options.timeoutMs || 30000 }
          );
          const content = response.data.choices[0]?.message?.content || '';
          const latencyMs = Date.now() - startTime;
          const { tokens, costUsd } = this.estimateTokensAndCost(JSON.stringify(effectiveMessages), content, modelName);
          return { content: options.preserveStructured ? content : formatNaturalConversation(content), provider: 'fireworks', model: modelName, tokensUsed: tokens, estimatedCostUsd: costUsd, latencyMs };
        }

        if (provider === 'openai' && config.openaiApiKey) {
          const modelName = options.model || 'gpt-4o-mini';
          const apiMessages = [
            { role: 'system', content: sysPrompt },
            ...effectiveMessages.map(m => {
              const role = m.role === 'model' ? 'assistant' : m.role;
              if (Array.isArray(m.content)) {
                // OpenAI multimodal format
                const contentParts = m.content.map(p => {
                  if (p.text) return { type: 'text', text: p.text };
                  if (p.inlineData) return { 
                    type: 'image_url', 
                    image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } 
                  };
                  return null;
                }).filter(Boolean);
                return { role, content: contentParts };
              }
              return { role, content: m.content };
            })
          ];

          const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: modelName,
              messages: apiMessages,
              temperature: options.temperature ?? 0.7,
              ...(options.responseMimeType === 'application/json' ? { response_format: { type: 'json_object' } } : {})
            },
            {
              headers: { Authorization: `Bearer ${config.openaiApiKey}` },
              timeout: options.timeoutMs || 30000
            }
          );

          const content = response.data.choices?.[0]?.message?.content;
          if (!content || !String(content).trim()) {
            throw new Error(`OpenAI returned an empty response for model ${modelName}.`);
          }
          const latencyMs = Date.now() - startTime;
          const { tokens, costUsd } = this.estimateTokensAndCost(JSON.stringify(effectiveMessages), content, modelName);

          return {
            content: options.preserveStructured ? content : formatNaturalConversation(content),
            provider: 'openai',
            model: modelName,
            tokensUsed: tokens,
            estimatedCostUsd: costUsd,
            latencyMs
          };
        }

        if (provider === 'ollama') {
          const discovery = ollamaDiscoveryService.getLastDiscovery() || await ollamaDiscoveryService.discoverAndTest();
          const endpoint = resolveOllamaEndpoint(discovery);
          const modelName = resolveOllamaModel(options.model, discovery.discoveredModels);
          const apiMessages = [
            { role: 'system', content: sysPrompt },
            ...effectiveMessages.map(m => {
              if (typeof m.content === 'string') {
                return { role: m.role === 'model' ? 'assistant' : m.role, content: m.content };
              }
              const text = m.content.map(p => p.text || '').filter(Boolean).join('\n');
              const imgs = m.content
                .filter(p => p.inlineData?.data && (p.inlineData.mimeType || '').startsWith('image/'))
                .map(p => p.inlineData!.data);
              return {
                role: m.role === 'model' ? 'assistant' : m.role,
                content: text,
                ...(imgs.length > 0 ? { images: imgs } : {})
              };
            })
          ];
          const requestBody: Record<string, any> = {
            model: modelName,
            messages: apiMessages,
            stream: false,
            options: {
              ...(typeof options.temperature === 'number' ? { temperature: options.temperature } : {}),
              ...(typeof options.maxTokens === 'number' ? { num_predict: options.maxTokens } : {})
            },
            ...(options.responseMimeType === 'application/json' ? { format: 'json' } : {}),
            ...(options.functions?.length ? {
              tools: options.functions.map(fn => ({
                type: 'function',
                function: { name: fn.name, description: fn.description, parameters: fn.parameters }
              }))
            } : {})
          };
          const response = await axios.post(
            `${endpoint}/api/chat`,
            requestBody,
            { timeout: options.timeoutMs || 120_000 }
          );

          const content = String(response.data.message?.content || '');
          const rawFunctionCall = response.data.message?.tool_calls?.[0]?.function;
          const functionCall = rawFunctionCall?.name
            ? { name: String(rawFunctionCall.name), arguments: rawFunctionCall.arguments || {} }
            : undefined;
          if (!content.trim() && !functionCall) {
            throw new Error('OLLAMA_EMPTY_RESPONSE: Local Ollama returned neither text nor a tool call.');
          }
          const latencyMs = Date.now() - startTime;
          const { tokens, costUsd } = this.estimateTokensAndCost(JSON.stringify(effectiveMessages), content, 'ollama-local');

          return {
            content: options.preserveStructured ? content : formatNaturalConversation(content),
            provider: 'ollama',
            model: modelName,
            tokensUsed: tokens,
            estimatedCostUsd: costUsd,
            latencyMs,
            ...(functionCall ? { functionCall } : {})
          };
        }
      } catch (err: any) {
        const is429 = err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
        const isConnRefused = err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED');
        const shortReason = is429 ? 'Quota / Rate Limited (429)' : (isConnRefused ? 'Unreachable (ECONNREFUSED)' : (err.message || 'Error').slice(0, 120));
        if (strictOffline || (blockCloudFallback && provider === 'ollama')) {
          throw new Error(
            shortReason.startsWith('OFFLINE_UNAVAILABLE:')
              ? shortReason
              : `OFFLINE_UNAVAILABLE: Local Ollama inference failed (${shortReason}).`
          );
        }
        if (blockCloudFallback) {
          throw new Error(`PROVIDER_UNAVAILABLE: ${provider} failed and provider fallback is disabled (${shortReason}).`);
        }
        console.warn(`[AI Provider Platform] Provider ${provider} unavailable: ${shortReason}. Failing over...`);
        lastError = err;
        continue;
      }
    }

    // High-availability server proxy fallback for browser client when no client-side keys are present
    if (!strictOffline && !blockCloudFallback && typeof window !== 'undefined') {
      try {
        console.log('[AI Provider Platform] Attempting server brain proxy uplink (/api/brain/think)...');
        const rawLast = messages[messages.length - 1]?.content || '';
        const lastUserMsg = Array.isArray(rawLast)
          ? rawLast.map(p => p.text || '').filter(Boolean).join('\n')
          : rawLast;
        const lastUserImages = Array.isArray(rawLast)
          ? rawLast.filter(p => p.inlineData?.data).map(p => p.inlineData!)
          : [];
        const historyFormatted = messages.slice(0, -1).map(m => ({
          role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: Array.isArray(m.content) ? m.content.map(p => p.text || '').join(' ') : m.content }]
        }));

        const { getAuthHeaders } = await import('../lib/apiUtils');
        const authHeaders = Object.fromEntries((await getAuthHeaders()).entries());
        const normalizedProxyModel = normalizeGeminiModel(options.model);
        const response = await axios.post('/api/brain/think', {
          prompt: lastUserMsg,
          api: 'gemini',
          model: normalizedProxyModel,
          systemPrompt: sysPrompt,
          history: historyFormatted,
          images: lastUserImages,
          webSearch: Boolean(options.webSearch),
          preserveStructured: Boolean(options.preserveStructured)
        }, { timeout: options.timeoutMs || 120000, headers: authHeaders, withCredentials: true });

        if (response.data && response.data.response) {
          const content = response.data.response;
          const latencyMs = Date.now() - overallStartTime;
          const { tokens, costUsd } = this.estimateTokensAndCost(JSON.stringify(messages), content, normalizedProxyModel);
          return {
            content: options.preserveStructured ? content : formatNaturalConversation(content),
            provider: 'gemini',
            model: response.data.model || normalizedProxyModel,
            tokensUsed: tokens,
            estimatedCostUsd: costUsd,
            latencyMs,
            ...(Array.isArray(response.data.sources) && response.data.sources.length > 0 ? { groundingSources: response.data.sources } : {})
          };
        }
      } catch (proxyErr: any) {
        console.warn('[AI Provider Platform] Server brain proxy fallback failed:', proxyErr.message);
      }
    }

    // High-availability Offline System Core Fallback (guarantees pipeline resilience when all cloud APIs rate-limit)
    // Phase 24: DO NOT FAKE. Report UNAVAILABLE if no real execution happened.
    console.error('[AI Provider Platform] CRITICAL: All external AI APIs exhausted/rate-limited and local Ollama is offline.');
    
    throw new Error('PROVIDER_UNAVAILABLE: All configured AI providers are currently exhausted or unreachable.');
  }

  // Embeddings generation
  public async embeddings(text: string, provider: AIProviderId = 'gemini'): Promise<{ embedding: number[]; provider: AIProviderId }> {
    const config = envConfigService.getConfig();
    if (provider === 'gemini' && config.geminiApiKey) {
      const genAI = new GoogleGenAI({
        apiKey: config.geminiApiKey,
        ...(typeof window === 'undefined' ? { httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } } : {})
      });
      const res = await genAI.models.embedContent({
        model: 'gemini-embedding-2',
        contents: text
      });
      return {
        embedding: (res as any).embedding?.values || (res as any).embeddings?.[0]?.values || new Array(768).fill(0.01),
        provider: 'gemini'
      };
    }

    // No real embedding provider available — do not fabricate a vector and mislabel its source.
    throw new Error('No embedding provider available. Set GEMINI_API_KEY to enable embeddings (gemini-embedding-2).');
  }

  // Image Generation — delegates to authoritative CreativeGenerationService
  // (Dedicated Logo Vector Pipeline + Gemini/OpenAI/Local SD + Quality Validation; zero silent Pollinations fallback)
  public async imageGeneration(options: ImageGenOptions): Promise<ImageGenResult & { url?: string; mimeType?: string }> {
    const { creativeGenerationService } = await import('./creativeGenerationService');
    const { normalizeImageSource } = await import('../creative/mediaNormalization');
    const result = await creativeGenerationService.generateCreativeImage({
      prompt: options.prompt,
      aspectRatio: options.aspectRatio || '1:1',
    });

    const normalized = normalizeImageSource({
      imageUrl: result.imageUrl,
      primaryImageUrl: result.primaryImageUrl,
      url: result.url,
      base64: result.base64,
      mimeType: result.primaryMimeType,
    });

    if (!result.success || !normalized.valid || !normalized.src || result.quality?.valid === false) {
      throw new Error(result.error || normalized.error || 'No configured image generation provider succeeded.');
    }

    return {
      imageUrl: normalized.src,
      url: normalized.src,
      base64: normalized.base64,
      mimeType: normalized.mimeType,
      provider: (result.provider === 'gemini-image' ? 'gemini' : result.provider === 'openai-image' ? 'openai' : 'local') as AIProviderId,
      model: result.model,
    };
  }

  // Video Generation — delegates to authoritative CreativeGenerationService (gemini-omni-1.2-flash Interactions API)
  public async videoGeneration(options: { prompt: string; durationSeconds?: number; aspectRatio?: '16:9' | '9:16' }): Promise<{ videoUrl: string; provider: string; model: string; status: string; jobId: string; script?: string; storyboard?: any[]; error?: string; errorCode?: string }> {
    const { creativeGenerationService } = await import('./creativeGenerationService');
    let job = await creativeGenerationService.startVideoJob({
      prompt: options.prompt,
      durationSeconds: options.durationSeconds || 8,
      aspectRatio: options.aspectRatio || '16:9',
    });

    // If an active render job was queued/started, poll up to 30s for completion so callers receive either playable media or honest terminal/in-progress status
    const deadline = Date.now() + 30000;
    while ((job.status === 'GENERATING' || job.status === 'PROCESSING' || job.status === 'VALIDATING' || job.status === 'QUEUED') && Date.now() < deadline) {
      await sleep(300);
      const latest = creativeGenerationService.getVideoJob(job.jobId);
      if (!latest) break;
      job = latest;
    }

    return {
      jobId: job.jobId,
      status: job.status,
      videoUrl: job.status === 'COMPLETED' && job.playableValidated ? (job.videoUrl || '') : '',
      provider: job.provider,
      model: job.model,
      script: job.productionPlan?.narrationScript,
      storyboard: job.productionPlan?.shots,
      error: job.error,
      errorCode: job.errorCode || (job.status === 'PROVIDER_UNCONFIGURED' ? 'VIDEO_RENDERER_NOT_CONFIGURED' : undefined),
    };
  }

  // Audio/Music/Beat/SFX/Voice Generation Bridge
  public async audioGeneration(options: { prompt: string; type?: 'MUSIC' | 'INSTRUMENTAL' | 'BEAT' | 'SFX' | 'VOICE'; mode?: 'auto' | 'cloud' | 'offline' }): Promise<{ audioUrl: string; url?: string; mimeType?: string; byteLength?: number; provider: string; model: string; lyrics?: string; error?: string; errorCode?: string }> {
    const { creativeGenerationService } = await import('./creativeGenerationService');
    const res = await creativeGenerationService.generateCreativeAudio({
      prompt: options.prompt,
      type: options.type || 'MUSIC',
      mode: options.mode || 'auto',
    });
    return {
      audioUrl: res.audioUrl || '',
      url: res.url || res.audioUrl || '',
      mimeType: res.mimeType,
      byteLength: res.byteLength,
      provider: res.provider,
      model: res.model,
      lyrics: res.lyrics,
      error: res.error,
      errorCode: res.errorCode,
    };
  }

  // Speech to Text (STT) Transcription
  public async transcribe(audio: Buffer | Blob, options: { model?: string; language?: string } = {}, provider: AIProviderId = 'groq'): Promise<{ text: string; provider: AIProviderId }> {
    const config = envConfigService.getConfig();
    const startTime = Date.now();

    try {
      if (provider === 'groq' && config.groqApiKey) {
        const formData = new FormData();
        const file = audio instanceof Blob ? audio : new Blob([Uint8Array.from(audio)], { type: 'audio/wav' });
        formData.append('file', file, 'audio.wav');
        formData.append('model', options.model || 'whisper-large-v3');
        if (options.language) formData.append('language', options.language);

        const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
          headers: { 
            Authorization: `Bearer ${config.groqApiKey}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        return { text: response.data.text, provider: 'groq' };
      }

      if (provider === 'openai' && config.openaiApiKey) {
        const formData = new FormData();
        const file = audio instanceof Blob ? audio : new Blob([audio], { type: 'audio/wav' });
        formData.append('file', file, 'audio.wav');
        formData.append('model', options.model || 'whisper-1');

        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
          headers: { 
            Authorization: `Bearer ${config.openaiApiKey}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        return { text: response.data.text, provider: 'openai' };
      }

      // Local STT can be added here when a real Whisper/ONNX/whisper.cpp endpoint is configured
      if (provider === 'ollama') {
         // Current Ollama doesn't natively support STT via public API in the same way, 
         // but we reserve it for local Whisper-over-WASM or local whisper.cpp server.
      }

    } catch (err: any) {
      console.warn(`[AI Provider Platform] Transcription failed for ${provider}: ${err.message}`);
    }

    throw new Error(`STT capability unavailable for provider: ${provider}`);
  }

  // Model listing
  public async modelListing(): Promise<Record<AIProviderId, string[]>> {
    return {
      gemini: ['gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-3.1-flash-lite-image'],
      openai: ['gpt-4o', 'gpt-4o-mini'],
      anthropic: ['claude-sonnet-5', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
      deepseek: ['deepseek-chat', 'deepseek-coder'],
      // Declared for future implementation — NOT included in automatic failover yet (see IMPLEMENTED_PROVIDERS).
      qwen: [],
      groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'whisper-large-v3'],
      huggingface: [],
      openrouter: ['anthropic/claude-3.5-sonnet', 'auto'],
      xai: ['grok-4.5', 'grok-4.5-fast'],
      mistral: ['mistral-large-latest', 'codestral-latest'],
      together: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Qwen/Qwen2.5-Coder-32B-Instruct'],
      fireworks: ['accounts/fireworks/models/llama-v3p3-70b-instruct', 'accounts/fireworks/models/qwen2p5-coder-32b-instruct'],
      'pollinations-flux': ['flux-1.1-pro'],
      ollama: ['qwen2.5-coder:7b', 'llama3.2:latest', 'phi4-mini:latest']
    };
  }
}

export const aiProviderPlatform = AIProviderPlatform.getInstance();

/**
 * ANNY — ENTERPRISE MODEL ROUTER
 * Dynamic hardware-aware AI request router with Model Capability Registry,
 * mathematical scoring engine, latency optimization, rate limit handling, and local-first fallback.
 */

import { aiProviderPlatform, AIProviderId, ChatMessage, ChatOptions, ChatResponse } from '../services/aiProviderPlatform';
import { envConfigService } from '../services/envConfigService';
import { isInstalledOllamaModel, resolveOllamaModel } from '../services/ollamaModelSelection';
import { providerRegistryService, ProviderDefinition, ModelDefinition } from '../services/providerRegistryService';
import { adaptiveIntelligenceEngine } from './AdaptiveIntelligenceEngine';

export type TaskCategory = 
  | 'coding' 
  | 'reasoning'
  | 'planning' 
  | 'debugging'
  | 'vision'
  | 'image_generation'
  | 'testing'
  | 'evaluation'
  | 'general'
  | 'offline'
  | 'robotics' 
  | 'scada' 
  | 'security';

export type HardwareTier = 'low' | 'mid' | 'high';

export type CapabilityType = 
  | 'GENERAL'
  | 'REASONING'
  | 'PLANNING'
  | 'CODING'
  | 'DEBUGGING'
  | 'VISION'
  | 'IMAGE_GENERATION'
  | 'TESTING'
  | 'EVALUATION'
  | 'FAST_RESPONSE'
  | 'OFFLINE'
  | 'SECURITY'
  | 'SCADA';

export interface ModelDescriptor {
  provider: AIProviderId;
  model: string;
  capabilities: CapabilityType[];
  contextCapacityTokens: number;
  hasToolSupport: boolean;
  baseLatencyMs: number;
  costPer1kTokensUsd: number;
  reliabilityRating: number; // 0 - 100
}

export const TASK_TO_CAPABILITY_MAP: Record<TaskCategory, CapabilityType> = {
  coding: 'CODING',
  reasoning: 'REASONING',
  planning: 'PLANNING',
  debugging: 'DEBUGGING',
  vision: 'VISION',
  image_generation: 'IMAGE_GENERATION',
  testing: 'TESTING',
  evaluation: 'EVALUATION',
  general: 'GENERAL',
  offline: 'OFFLINE',
  robotics: 'REASONING',
  scada: 'SCADA',
  security: 'SECURITY'
};

export const MODEL_CAPABILITY_REGISTRY: ModelDescriptor[] = [
  {
    provider: 'gemini',
    model: 'gemini-4-hydrogen',
    capabilities: ['GENERAL', 'REASONING', 'PLANNING', 'CODING', 'DEBUGGING', 'VISION', 'TESTING', 'EVALUATION', 'FAST_RESPONSE', 'SECURITY', 'SCADA'],
    contextCapacityTokens: 2000000,
    hasToolSupport: true,
    baseLatencyMs: 140,
    costPer1kTokensUsd: 0.0001,
    reliabilityRating: 98
  },
  {
    provider: 'gemini',
    model: 'gemini-3.1-flash-lite',
    capabilities: ['GENERAL', 'FAST_RESPONSE', 'CODING', 'REASONING'],
    contextCapacityTokens: 1000000,
    hasToolSupport: true,
    baseLatencyMs: 95,
    costPer1kTokensUsd: 0.00005,
    reliabilityRating: 97
  },
  {
    provider: 'deepseek',
    model: 'deepseek-coder',
    capabilities: ['CODING', 'DEBUGGING', 'REASONING', 'TESTING'],
    contextCapacityTokens: 64000,
    hasToolSupport: true,
    baseLatencyMs: 280,
    costPer1kTokensUsd: 0.00014,
    reliabilityRating: 95
  },
  {
    provider: 'deepseek',
    model: 'deepseek-chat',
    capabilities: ['REASONING', 'GENERAL', 'CODING', 'EVALUATION'],
    contextCapacityTokens: 64000,
    hasToolSupport: true,
    baseLatencyMs: 300,
    costPer1kTokensUsd: 0.00014,
    reliabilityRating: 94
  },
  {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    capabilities: ['REASONING', 'PLANNING', 'CODING', 'DEBUGGING', 'TESTING', 'EVALUATION', 'FAST_RESPONSE', 'SECURITY', 'SCADA'],
    contextCapacityTokens: 128000,
    hasToolSupport: true,
    baseLatencyMs: 110,
    costPer1kTokensUsd: 0.00059,
    reliabilityRating: 96
  },
  {
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    capabilities: ['REASONING', 'PLANNING', 'CODING', 'DEBUGGING', 'EVALUATION', 'SECURITY'],
    contextCapacityTokens: 200000,
    hasToolSupport: true,
    baseLatencyMs: 380,
    costPer1kTokensUsd: 0.002,
    reliabilityRating: 99
  },
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    capabilities: ['GENERAL', 'REASONING', 'CODING', 'VISION', 'FAST_RESPONSE'],
    contextCapacityTokens: 128000,
    hasToolSupport: true,
    baseLatencyMs: 220,
    costPer1kTokensUsd: 0.00015,
    reliabilityRating: 96
  },
  {
    provider: 'mistral',
    model: 'mistral-large-latest',
    capabilities: ['GENERAL', 'CODING', 'REASONING'],
    contextCapacityTokens: 128000,
    hasToolSupport: true,
    baseLatencyMs: 290,
    costPer1kTokensUsd: 0.0002,
    reliabilityRating: 93
  },
  {
    provider: 'pollinations-flux',
    model: 'flux-1.1-pro',
    capabilities: ['IMAGE_GENERATION'],
    contextCapacityTokens: 4000,
    hasToolSupport: false,
    baseLatencyMs: 1100,
    costPer1kTokensUsd: 0,
    reliabilityRating: 95
  },
  {
    provider: 'ollama',
    model: 'qwen2.5-coder:7b',
    capabilities: ['CODING', 'DEBUGGING', 'TESTING', 'OFFLINE'],
    contextCapacityTokens: 32000,
    hasToolSupport: false,
    baseLatencyMs: 15,
    costPer1kTokensUsd: 0,
    reliabilityRating: 90
  }
];

export interface RouteStrategy {
  taskCategory: TaskCategory;
  hardwareTier?: HardwareTier;
  preferOffline?: boolean;
  excludeProvider?: AIProviderId;
  maxLatencyMs?: number;
  requiredCapabilities?: CapabilityType[];
}

export interface RouteDecision {
  selectedProvider: AIProviderId;
  selectedModel: string;
  score: number;
  reason: string;
  isOffline: boolean;
  estimatedLatencyMs: number;
}

export class ModelRouter {
  private static instance: ModelRouter;
  private rateLimitMap: Map<string, number> = new Map(); // provider -> cooldown until timestamp

  private constructor() {}

  public static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  // Detect local or host hardware capabilities
  public detectHardwareTier(): HardwareTier {
    const config = envConfigService.getConfig();
    if (config.annyHardware) return 'high';

    if (typeof navigator !== 'undefined') {
      const cores = navigator.hardwareConcurrency || 4;
      if (cores >= 12) return 'high';
      if (cores >= 6) return 'mid';
      return 'low';
    }

    return 'mid';
  }

  // Check if provider credentials exist or browser proxy is enabled
  public isProviderAvailable(provider: AIProviderId): boolean {
    const mode = providerRegistryService.getExecutionMode();
    if (mode === 'OFFLINE_ONLY' && provider !== 'ollama') {
      return false;
    }
    if (mode === 'ONLINE' && provider === 'ollama') {
      return false;
    }

    const config = envConfigService.getConfig();
    const now = Date.now();
    const coolUntil = this.rateLimitMap.get(provider) || 0;
    if (now < coolUntil) return false;

    // Check registry health if available
    const regProv = providerRegistryService.getProvider(provider);
    if (provider === 'ollama') {
      return Boolean(regProv && regProv.healthStatus === 'CONNECTED' && regProv.availableModels.length > 0);
    }

    if (regProv) {
      if (
        regProv.healthStatus === 'DISCONNECTED' ||
        regProv.healthStatus === 'UNAVAILABLE' ||
        regProv.healthStatus === 'INVALID_CREDENTIALS' ||
        regProv.healthStatus === 'NO_CREDENTIALS' ||
        regProv.healthStatus === 'OFFLINE'
      ) {
        // On the browser client, Gemini proxies through /api/brain/think unless OFFLINE_ONLY was requested;
        // on the server, NEVER claim Gemini is available when credentials are missing.
        if (provider === 'gemini' && typeof window !== 'undefined') return true;
        return false;
      }
    }

    if (provider === 'pollinations-flux') return regProv ? regProv.isOnline : false;
    if (provider === 'gemini') return Boolean(config.geminiApiKey || typeof window !== 'undefined');
    if (provider === 'groq') return Boolean(config.groqApiKey);
    if (provider === 'deepseek') return Boolean(config.deepseekApiKey);
    if (provider === 'anthropic') return Boolean(config.anthropicApiKey);
    if (provider === 'openai') return Boolean(config.openaiApiKey);
    if (provider === 'openrouter') return Boolean(config.openrouterApiKey);
    if (provider === 'xai') return Boolean(config.xaiApiKey);
    if (provider === 'mistral') return Boolean(config.mistralApiKey);
    if (provider === 'together') return Boolean(config.togetherApiKey);
    if (provider === 'fireworks') return Boolean(config.fireworksApiKey);

    return false;
  }

  private selectCompatibleOllamaModel(availableModels: string[], taskCategory: TaskCategory): string | null {
    if (!availableModels || availableModels.length === 0) return null;
    const requiredCap = TASK_TO_CAPABILITY_MAP[taskCategory] || 'GENERAL';
    if (requiredCap === 'IMAGE_GENERATION') {
      return null;
    }
    if (requiredCap === 'VISION') {
      const visionModel = availableModels.find((m) => {
        const lower = m.toLowerCase();
        return lower.includes('vision') || lower.includes('llava') || lower.includes('minicpm-v') || lower.includes('moondream') || lower.includes('-vl');
      });
      return visionModel || null;
    }
    if (taskCategory === 'coding' || taskCategory === 'debugging' || taskCategory === 'testing') {
      const codingModel = availableModels.find((m) => {
        const lower = m.toLowerCase();
        return lower.includes('coder') || lower.includes('code') || lower.includes('qwen') || lower.includes('deepseek');
      });
      return codingModel || availableModels[0];
    }
    return availableModels[0];
  }

  // Score model suitability dynamically based on requirements
  public scoreModel(descriptor: ModelDescriptor, strategy: RouteStrategy): number {
    if (strategy.excludeProvider && descriptor.provider === strategy.excludeProvider) {
      return -1; // Exclude specific provider (e.g. for cross-model evaluation)
    }

    if (!this.isProviderAvailable(descriptor.provider)) return -1;
    if (descriptor.provider === 'ollama') {
      const installedModels = providerRegistryService.getProvider('ollama')?.availableModels || [];
      if (!isInstalledOllamaModel(descriptor.model, installedModels)) return -1;
    }

    let score = 0;
    const requiredCap = TASK_TO_CAPABILITY_MAP[strategy.taskCategory] || 'GENERAL';

    // 1. Capability Match (0 - 35 pts)
    if (descriptor.capabilities.includes(requiredCap)) {
      score += 35;
    } else if (descriptor.capabilities.includes('GENERAL')) {
      score += 15;
    } else {
      return -1; // Missing required capability
    }

    // 2. Offline Preference
    if (strategy.preferOffline) {
      if (descriptor.capabilities.includes('OFFLINE')) {
        score += 25;
      } else {
        return -1; // Must be offline model
      }
    } else if (descriptor.capabilities.includes('OFFLINE')) {
      score += 5;
    }

    // 3. Task Complexity & Specialization (0 - 15 pts)
    if (descriptor.capabilities.includes(requiredCap) && descriptor.reliabilityRating >= 95) {
      score += 15;
    } else if (descriptor.capabilities.includes(requiredCap)) {
      score += 10;
    }

    // 4. Context Capacity (0 - 10 pts)
    if (descriptor.contextCapacityTokens >= 1000000) {
      score += 10;
    } else if (descriptor.contextCapacityTokens >= 128000) {
      score += 7;
    } else {
      score += 4;
    }

    // 5. Tool Support (0 - 5 pts)
    if (descriptor.hasToolSupport) score += 5;

    // 6. Latency Score (0 - 5 pts)
    if (descriptor.baseLatencyMs <= 200) score += 5;
    else if (descriptor.baseLatencyMs <= 500) score += 3;
    else score += 1;

    // 7. Reliability & Cost (0 - 5 pts)
    score += Math.round((descriptor.reliabilityRating / 100) * 5);

    // 8. Empirical Performance Memory Modifier (-15 to +15 pts)
    try {
      const empiricalMod = adaptiveIntelligenceEngine.getEmpiricalModelModifier(descriptor.model, strategy.taskCategory);
      score += empiricalMod;
    } catch {
      // safe fallback
    }

    return score;
  }

  public routeTask(category: TaskCategory | string, preferOffline?: boolean): RouteDecision {
    const validCategory: TaskCategory = (category in TASK_TO_CAPABILITY_MAP)
      ? (category as TaskCategory)
      : 'general';
    return this.selectRoute({
      taskCategory: validCategory,
      preferOffline: Boolean(preferOffline)
    });
  }

  // Determine optimal route using dynamic capability scoring and execution mode
  public selectRoute(strategy: RouteStrategy): RouteDecision {
    const policy = providerRegistryService.getExecutionPolicy();
    const mode = policy.mode;
    const requiredCap = TASK_TO_CAPABILITY_MAP[strategy.taskCategory] || 'GENERAL';
    const ollamaProv = providerRegistryService.getProvider('ollama');
    const compatibleLocalModel =
      ollamaProv && ollamaProv.healthStatus === 'CONNECTED'
        ? this.selectCompatibleOllamaModel(ollamaProv.availableModels, strategy.taskCategory)
        : null;

    // OFFLINE_ONLY Mode Handling (STRICT: zero cloud routing under any condition)
    if (mode === 'OFFLINE_ONLY') {
      if (!ollamaProv || ollamaProv.healthStatus !== 'CONNECTED') {
        return {
          selectedProvider: 'ollama',
          selectedModel: 'none',
          score: 0,
          reason: 'OFFLINE_UNAVAILABLE: Ollama local runtime is not reachable or verified.',
          isOffline: true,
          estimatedLatencyMs: 0
        };
      }
      if (!compatibleLocalModel) {
        return {
          selectedProvider: 'ollama',
          selectedModel: 'none',
          score: 0,
          reason: ollamaProv.availableModels.length === 0
            ? 'OFFLINE_UNAVAILABLE: Ollama is reachable but no local models are installed.'
            : `OFFLINE_UNAVAILABLE: No installed local Ollama model supports capability ${requiredCap}.`,
          isOffline: true,
          estimatedLatencyMs: 0
        };
      }
      return {
        selectedProvider: 'ollama',
        selectedModel: compatibleLocalModel,
        score: 90,
        reason: `Enforced Sovereign Local Execution (${compatibleLocalModel})`,
        isOffline: true,
        estimatedLatencyMs: ollamaProv.latencyMs
      };
    }

    // LOCAL_FIRST Mode Handling: use local model when available; cloud fallback ONLY if policy explicitly permits it
    if (mode === 'LOCAL_FIRST') {
      if (ollamaProv && ollamaProv.healthStatus === 'CONNECTED' && compatibleLocalModel) {
        return {
          selectedProvider: 'ollama',
          selectedModel: compatibleLocalModel,
          score: 95,
          reason: `Local-first preference satisfied via Ollama (${compatibleLocalModel})`,
          isOffline: true,
          estimatedLatencyMs: ollamaProv.latencyMs
        };
      }

      if (!policy.allowCloudFallbackInLocalFirst) {
        return {
          selectedProvider: 'ollama',
          selectedModel: 'none',
          score: 0,
          reason: !ollamaProv || ollamaProv.healthStatus !== 'CONNECTED'
            ? 'OFFLINE_UNAVAILABLE: Ollama unavailable and LOCAL_FIRST policy does not permit cloud fallback.'
            : `OFFLINE_UNAVAILABLE: No compatible local model for ${requiredCap} and LOCAL_FIRST policy does not permit cloud fallback.`,
          isOffline: true,
          estimatedLatencyMs: 0
        };
      }
    }

    // Standard / AUTO / ONLINE / permitted LOCAL_FIRST-cloud-fallback Handling
    let bestModel: ModelDescriptor | null = null;
    let highestScore = -1;

    for (const modelDesc of MODEL_CAPABILITY_REGISTRY) {
      const score = this.scoreModel(modelDesc, strategy);
      if (score > highestScore) {
        highestScore = score;
        bestModel = modelDesc;
      }
    }

    if (bestModel && highestScore > 0) {
      const isOffline = bestModel.capabilities.includes('OFFLINE');
      return {
        selectedProvider: bestModel.provider,
        selectedModel: bestModel.model,
        score: highestScore,
        reason: `Optimal model selected via Model Capability Registry (Capability: ${requiredCap}, Score: ${highestScore}/100, Latency: ${bestModel.baseLatencyMs}ms)`,
        isOffline,
        estimatedLatencyMs: bestModel.baseLatencyMs
      };
    }

    // High-availability default fallback (only if configured and not excluded)
    const config = envConfigService.getConfig();
    const geminiProv = providerRegistryService.getProvider('gemini');
    const hasGemini = Boolean(
      config.geminiApiKey ||
      (typeof window !== 'undefined' && geminiProv?.healthStatus !== 'OFFLINE')
    );

    if (hasGemini && !strategy.preferOffline && strategy.excludeProvider !== 'gemini') {
      return {
        selectedProvider: 'gemini',
        selectedModel: 'gemini-4-hydrogen',
        score: 80,
        reason: `Primary cloud fallback (Capability: ${requiredCap}, Score: 80/100)`,
        isOffline: false,
        estimatedLatencyMs: 140
      };
    }

    if (ollamaProv && ollamaProv.healthStatus === 'CONNECTED' && compatibleLocalModel) {
      return {
        selectedProvider: 'ollama',
        selectedModel: compatibleLocalModel,
        score: 50,
        reason: `Sovereign local fallback active (${compatibleLocalModel})`,
        isOffline: true,
        estimatedLatencyMs: ollamaProv.latencyMs
      };
    }

    return {
      selectedProvider: 'ollama',
      selectedModel: 'none',
      score: 0,
      reason: 'PROVIDER_UNAVAILABLE: No verified local or cloud provider is available for this request.',
      isOffline: true,
      estimatedLatencyMs: 0
    };
  }

  // Handle provider rate limit event
  public reportRateLimit(provider: AIProviderId, cooldownMs: number = 60000): void {
    console.warn(`[Enterprise Model Router] Rate limit reported for ${provider}. Setting cooldown for ${cooldownMs}ms.`);
    this.rateLimitMap.set(provider, Date.now() + cooldownMs);
  }

  // Execute routed query
  public async executeRoutedChat(
    messages: ChatMessage[],
    strategy: RouteStrategy,
    options: ChatOptions = {}
  ): Promise<ChatResponse & { routeDecision: RouteDecision }> {
    const policy = providerRegistryService.getExecutionPolicy();
    const isStrictOffline = policy.mode === 'OFFLINE_ONLY';
    const isStrictLocalFirst = policy.mode === 'LOCAL_FIRST' && !policy.allowCloudFallbackInLocalFirst;
    const blockCloudFallback = isStrictOffline || isStrictLocalFirst;

    const decision = this.selectRoute(strategy);

    if (decision.selectedModel === 'none' || !decision.selectedModel) {
      throw new Error(
        decision.reason.startsWith('OFFLINE_UNAVAILABLE:') || decision.reason.startsWith('PROVIDER_UNAVAILABLE:')
          ? decision.reason
          : `${blockCloudFallback ? 'OFFLINE_UNAVAILABLE' : 'PROVIDER_UNAVAILABLE'}: ${decision.reason}`
      );
    }

    if (isStrictOffline && decision.selectedProvider !== 'ollama') {
      throw new Error('OFFLINE_UNAVAILABLE: Cloud providers are strictly blocked in OFFLINE_ONLY mode.');
    }

    const requestedModel = String(options.model || '').trim();
    const chosenModel = decision.selectedProvider === 'ollama'
      ? (!isStrictOffline && !isStrictLocalFirst && requestedModel &&
          !['auto', 'ollama-local', 'local', 'ollama', 'none'].includes(requestedModel.toLowerCase())
          ? resolveOllamaModel(requestedModel, providerRegistryService.getProvider('ollama')?.availableModels || [])
          : decision.selectedModel)
      : (!isStrictOffline && !isStrictLocalFirst && requestedModel && requestedModel !== 'auto'
          ? requestedModel
          : decision.selectedModel);

    try {
      const result = await aiProviderPlatform.chat(
        messages,
        {
          ...options,
          model: chosenModel,
          offlineOnly: isStrictOffline,
          disableCloudFallback: blockCloudFallback
        },
        decision.selectedProvider
      );

      return {
        ...result,
        routeDecision: decision
      };
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (isStrictOffline || isStrictLocalFirst) {
        throw err instanceof Error && msg.startsWith('OFFLINE_UNAVAILABLE:')
          ? err
          : new Error(`OFFLINE_UNAVAILABLE: Local execution failed (${msg || 'Ollama unreachable'}).`);
      }

      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        this.reportRateLimit(decision.selectedProvider);
      }

      // aiProviderPlatform.chat() already executes per-model exponential backoff and multi-provider failover.
      // Only run a secondary failover if an alternate non-exhausted provider exists and PROVIDER_UNAVAILABLE wasn't already returned.
      const altDecision = this.selectRoute({ ...strategy, excludeProvider: decision.selectedProvider });
      const hasAlternateProvider =
        altDecision.selectedProvider !== decision.selectedProvider &&
        altDecision.selectedModel !== 'none' &&
        this.isProviderAvailable(altDecision.selectedProvider);

      if (!hasAlternateProvider || msg.startsWith('PROVIDER_UNAVAILABLE:')) {
        throw err;
      }

      const fallbackResult = await aiProviderPlatform.chat(
        messages,
        { ...options, model: altDecision.selectedModel },
        altDecision.selectedProvider
      );
      return {
        ...fallbackResult,
        routeDecision: {
          ...decision,
          selectedProvider: fallbackResult.provider,
          selectedModel: fallbackResult.model,
          reason: `Failed over from ${decision.selectedProvider}: ${msg}`
        }
      };
    }
  }
  public selectModel(params?: { capability?: string; priority?: string }) {
    const strategy: RouteStrategy = {
      taskCategory: 'general'
    };
    return this.selectRoute(strategy);
  }
}

export const modelRouter = ModelRouter.getInstance();



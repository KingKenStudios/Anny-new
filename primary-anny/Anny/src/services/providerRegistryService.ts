/**
 * ANNY — AUTHORITATIVE PROVIDER & MODEL REGISTRY + HEALTH SERVICE
 * Provides unified, single-source-of-truth definitions for all AI Providers,
 * Model Definitions, Health Tracking, and Execution Modes.
 */

import axios from 'axios';
import { envConfigService } from './envConfigService';
import { isOllamaChatModel, ollamaDiscoveryService, type OllamaDiscoveryResult } from './ollamaService';
import { CapabilityType } from './enterpriseModelRouter';

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

export type ExecutionMode = 'LOCAL_FIRST' | 'OFFLINE_ONLY' | 'ONLINE' | 'AUTO';

export interface ExecutionPolicy {
  mode: ExecutionMode;
  allowCloudFallbackInLocalFirst: boolean;
}

export type HealthStatus = 
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'INVALID_CREDENTIALS'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'HEALTHY'
  | 'DEGRADED'
  | 'NO_CREDENTIALS'
  | 'OFFLINE';

export interface ProviderDefinition {
  providerId: AIProviderId;
  displayName: string;
  baseURL: string;
  authenticationMethod: 'API_KEY' | 'OAUTH' | 'LOCAL' | 'NONE';
  availableModels: string[];
  capabilities: CapabilityType[];
  isOnline: boolean;
  healthStatus: HealthStatus;
  priority: number;
  latencyMs: number;
  contextWindow: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsToolCalling: boolean;
  supportsStructuredOutput: boolean;
  supportsImageGeneration: boolean;
  lastSuccess?: string;
  lastFailure?: string;
  lastError?: string;
}

export interface ModelDefinition {
  id: string;
  provider: AIProviderId;
  modelName: string;
  capabilities: CapabilityType[];
  contextWindow: number;
  reasoningLevel: number; // 0 - 100
  codingLevel: number;    // 0 - 100
  visionLevel: number;    // 0 - 100
  speed: number;          // 0 - 100
  quality: number;        // 0 - 100
  costTier: 'FREE' | 'LOW' | 'MID' | 'HIGH';
  local: boolean;
  online: boolean;
  enabled: boolean;
}

export class ProviderRegistryService {
  private static instance: ProviderRegistryService;
  private currentMode: ExecutionMode = 'AUTO';
  private allowCloudFallbackInLocalFirst: boolean = false;
  private providerRegistry: Map<AIProviderId, ProviderDefinition> = new Map();
  private modelRegistry: Map<string, ModelDefinition> = new Map();

  private constructor() {
    const envMode = typeof process !== 'undefined' ? process.env?.ANNY_EXECUTION_MODE : undefined;
    if (envMode === 'OFFLINE_ONLY' || envMode === 'LOCAL_FIRST' || envMode === 'ONLINE' || envMode === 'AUTO') {
      this.currentMode = envMode;
    }
    this.allowCloudFallbackInLocalFirst =
      typeof process !== 'undefined' && process.env?.ANNY_LOCAL_FIRST_CLOUD_FALLBACK === 'true';
    this.initializeDefaults();
  }

  public static getInstance(): ProviderRegistryService {
    if (!ProviderRegistryService.instance) {
      ProviderRegistryService.instance = new ProviderRegistryService();
    }
    return ProviderRegistryService.instance;
  }

  public setExecutionMode(mode: ExecutionMode, options?: { allowCloudFallback?: boolean }) {
    this.currentMode = mode;
    if (typeof options?.allowCloudFallback === 'boolean') {
      this.allowCloudFallbackInLocalFirst = options.allowCloudFallback;
    }
  }

  public getExecutionMode(): ExecutionMode {
    return this.currentMode;
  }

  public setExecutionPolicy(policy: Partial<ExecutionPolicy>): ExecutionPolicy {
    if (policy.mode) {
      this.currentMode = policy.mode;
    }
    if (typeof policy.allowCloudFallbackInLocalFirst === 'boolean') {
      this.allowCloudFallbackInLocalFirst = policy.allowCloudFallbackInLocalFirst;
    }
    return this.getExecutionPolicy();
  }

  public getExecutionPolicy(): ExecutionPolicy {
    return {
      mode: this.currentMode,
      allowCloudFallbackInLocalFirst: this.allowCloudFallbackInLocalFirst
    };
  }

  private initializeDefaults() {
    // 1. Static Master Provider Registry Definitions
    const initialProviders: ProviderDefinition[] = [
      {
        providerId: 'gemini',
        displayName: 'Google Gemini',
        baseURL: 'https://generativelanguage.googleapis.com',
        authenticationMethod: 'API_KEY',
        availableModels: ['gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-3.1-flash-lite-image'],
        capabilities: ['GENERAL', 'REASONING', 'PLANNING', 'CODING', 'DEBUGGING', 'VISION', 'TESTING', 'EVALUATION', 'FAST_RESPONSE', 'SECURITY', 'SCADA'],
        isOnline: false,
        healthStatus: 'NO_CREDENTIALS',
        priority: 1,
        latencyMs: 0,
        contextWindow: 2000000,
        supportsStreaming: true,
        supportsVision: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        supportsImageGeneration: true
      },
      {
        providerId: 'deepseek',
        displayName: 'DeepSeek AI',
        baseURL: 'https://api.deepseek.com',
        authenticationMethod: 'API_KEY',
        availableModels: ['deepseek-chat', 'deepseek-coder'],
        capabilities: ['REASONING', 'CODING', 'DEBUGGING', 'TESTING', 'EVALUATION'],
        isOnline: true,
        healthStatus: 'UNAVAILABLE',
        priority: 2,
        latencyMs: 280,
        contextWindow: 64000,
        supportsStreaming: true,
        supportsVision: false,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        supportsImageGeneration: false
      },
      {
        providerId: 'groq',
        displayName: 'Groq LPU Acceleration',
        baseURL: 'https://api.groq.com/openai/v1',
        authenticationMethod: 'API_KEY',
        availableModels: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
        capabilities: ['FAST_RESPONSE', 'GENERAL', 'CODING', 'REASONING', 'PLANNING', 'TESTING'],
        isOnline: true,
        healthStatus: 'UNAVAILABLE',
        priority: 3,
        latencyMs: 110,
        contextWindow: 128000,
        supportsStreaming: true,
        supportsVision: false,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        supportsImageGeneration: false
      },
      {
        providerId: 'openai',
        displayName: 'OpenAI',
        baseURL: 'https://api.openai.com/v1',
        authenticationMethod: 'API_KEY',
        availableModels: ['gpt-4o', 'gpt-4o-mini'],
        capabilities: ['REASONING', 'CODING', 'VISION', 'GENERAL', 'FAST_RESPONSE'],
        isOnline: true,
        healthStatus: 'UNAVAILABLE',
        priority: 4,
        latencyMs: 220,
        contextWindow: 128000,
        supportsStreaming: true,
        supportsVision: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        supportsImageGeneration: true
      },
      {
        providerId: 'anthropic',
        displayName: 'Anthropic Claude',
        baseURL: 'https://api.anthropic.com/v1',
        authenticationMethod: 'API_KEY',
        availableModels: ['claude-sonnet-5', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
        capabilities: ['REASONING', 'CODING', 'PLANNING', 'EVALUATION', 'SECURITY'],
        isOnline: true,
        healthStatus: 'UNAVAILABLE',
        priority: 5,
        latencyMs: 380,
        contextWindow: 200000,
        supportsStreaming: true,
        supportsVision: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        supportsImageGeneration: false
      },
      {
        providerId: 'mistral',
        displayName: 'Mistral AI',
        baseURL: 'https://api.mistral.ai/v1',
        authenticationMethod: 'API_KEY',
        availableModels: ['mistral-large-latest', 'codestral-latest'],
        capabilities: ['GENERAL', 'CODING', 'REASONING'],
        isOnline: true,
        healthStatus: 'UNAVAILABLE',
        priority: 6,
        latencyMs: 290,
        contextWindow: 128000,
        supportsStreaming: true,
        supportsVision: false,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        supportsImageGeneration: false
      },
      {
        providerId: 'qwen',
        displayName: 'Qwen AI (Alibaba)',
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        authenticationMethod: 'API_KEY',
        availableModels: ['qwen-2.5-72b-instruct', 'qwen2.5-coder-32b'],
        capabilities: ['CODING', 'REASONING', 'GENERAL'],
        isOnline: true,
        healthStatus: 'UNAVAILABLE',
        priority: 7,
        latencyMs: 310,
        contextWindow: 128000,
        supportsStreaming: true,
        supportsVision: true,
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        supportsImageGeneration: false
      },
      {
        providerId: 'ollama',
        displayName: 'Ollama Sovereign Local',
        baseURL: 'http://127.0.0.1:11434',
        authenticationMethod: 'LOCAL',
        availableModels: [],
        capabilities: ['OFFLINE', 'CODING', 'REASONING', 'FAST_RESPONSE'],
        isOnline: false,
        healthStatus: 'OFFLINE',
        priority: 0,
        latencyMs: 15,
        contextWindow: 32000,
        supportsStreaming: true,
        supportsVision: false,
        supportsToolCalling: false,
        supportsStructuredOutput: false,
        supportsImageGeneration: false
      },
      {
        providerId: 'pollinations-flux',
        displayName: 'Pollinations / Flux Neural',
        baseURL: 'https://image.pollinations.ai',
        authenticationMethod: 'NONE',
        availableModels: ['flux-1.1-pro'],
        capabilities: ['IMAGE_GENERATION'],
        isOnline: false,
        healthStatus: 'UNAVAILABLE',
        priority: 8,
        latencyMs: 0,
        contextWindow: 4000,
        supportsStreaming: false,
        supportsVision: false,
        supportsToolCalling: false,
        supportsStructuredOutput: false,
        supportsImageGeneration: true
      }
    ];

    initialProviders.forEach((p) => this.providerRegistry.set(p.providerId, p));

    // 2. Initial Model Registry Definitions
    const initialModels: ModelDefinition[] = [
      {
        id: 'gemini:gemini-4-hydrogen',
        provider: 'gemini',
        modelName: 'gemini-4-hydrogen',
        capabilities: ['GENERAL', 'REASONING', 'PLANNING', 'CODING', 'DEBUGGING', 'VISION', 'TESTING', 'EVALUATION', 'FAST_RESPONSE', 'SECURITY', 'SCADA'],
        contextWindow: 2000000,
        reasoningLevel: 98,
        codingLevel: 98,
        visionLevel: 99,
        speed: 95,
        quality: 98,
        costTier: 'LOW',
        local: false,
        online: true,
        enabled: true
      },
      {
        id: 'deepseek:deepseek-coder',
        provider: 'deepseek',
        modelName: 'deepseek-coder',
        capabilities: ['CODING', 'DEBUGGING', 'REASONING', 'TESTING'],
        contextWindow: 64000,
        reasoningLevel: 94,
        codingLevel: 99,
        visionLevel: 0,
        speed: 85,
        quality: 97,
        costTier: 'LOW',
        local: false,
        online: true,
        enabled: true
      },
      {
        id: 'deepseek:deepseek-chat',
        provider: 'deepseek',
        modelName: 'deepseek-chat',
        capabilities: ['REASONING', 'GENERAL', 'CODING', 'EVALUATION'],
        contextWindow: 64000,
        reasoningLevel: 97,
        codingLevel: 92,
        visionLevel: 0,
        speed: 85,
        quality: 96,
        costTier: 'LOW',
        local: false,
        online: true,
        enabled: true
      },
      {
        id: 'groq:llama-3.3-70b-versatile',
        provider: 'groq',
        modelName: 'llama-3.3-70b-versatile',
        capabilities: ['REASONING', 'PLANNING', 'CODING', 'DEBUGGING', 'TESTING', 'EVALUATION', 'FAST_RESPONSE', 'SECURITY', 'SCADA'],
        contextWindow: 128000,
        reasoningLevel: 95,
        codingLevel: 94,
        visionLevel: 0,
        speed: 99,
        quality: 95,
        costTier: 'LOW',
        local: false,
        online: true,
        enabled: true
      },
      {
        id: 'openai:gpt-4o',
        provider: 'openai',
        modelName: 'gpt-4o',
        capabilities: ['REASONING', 'CODING', 'VISION', 'GENERAL', 'PLANNING'],
        contextWindow: 128000,
        reasoningLevel: 97,
        codingLevel: 96,
        visionLevel: 95,
        speed: 88,
        quality: 98,
        costTier: 'HIGH',
        local: false,
        online: true,
        enabled: true
      },
      {
        id: 'openai:gpt-4o-mini',
        provider: 'openai',
        modelName: 'gpt-4o-mini',
        capabilities: ['GENERAL', 'REASONING', 'CODING', 'VISION', 'FAST_RESPONSE'],
        contextWindow: 128000,
        reasoningLevel: 90,
        codingLevel: 89,
        visionLevel: 90,
        speed: 96,
        quality: 91,
        costTier: 'FREE',
        local: false,
        online: true,
        enabled: true
      },
      {
        id: 'anthropic:claude-sonnet-5',
        provider: 'anthropic',
        modelName: 'claude-sonnet-5',
        capabilities: ['REASONING', 'PLANNING', 'CODING', 'DEBUGGING', 'EVALUATION', 'SECURITY'],
        contextWindow: 200000,
        reasoningLevel: 99,
        codingLevel: 98,
        visionLevel: 94,
        speed: 82,
        quality: 99,
        costTier: 'MID',
        local: false,
        online: true,
        enabled: true
      },
      {
        id: 'mistral:mistral-large-latest',
        provider: 'mistral',
        modelName: 'mistral-large-latest',
        capabilities: ['GENERAL', 'CODING', 'REASONING'],
        contextWindow: 128000,
        reasoningLevel: 92,
        codingLevel: 91,
        visionLevel: 0,
        speed: 88,
        quality: 93,
        costTier: 'MID',
        local: false,
        online: true,
        enabled: true
      },
      {
        id: 'pollinations-flux:flux-1.1-pro',
        provider: 'pollinations-flux',
        modelName: 'flux-1.1-pro',
        capabilities: ['IMAGE_GENERATION'],
        contextWindow: 4000,
        reasoningLevel: 0,
        codingLevel: 0,
        visionLevel: 0,
        speed: 70,
        quality: 98,
        costTier: 'FREE',
        local: false,
        online: true,
        enabled: true
      }
    ];

    initialModels.forEach((m) => this.modelRegistry.set(m.id, m));
  }

  public getProviderRegistry(): ProviderDefinition[] {
    return Array.from(this.providerRegistry.values());
  }

  public getModelRegistry(): ModelDefinition[] {
    return Array.from(this.modelRegistry.values());
  }

  public getProvider(id: AIProviderId): ProviderDefinition | undefined {
    return this.providerRegistry.get(id);
  }

  /**
   * Health Check & Discovery Sync
   */
  public async auditAndRefreshHealth(): Promise<{
    providers: ProviderDefinition[];
    ollamaDiscovery: OllamaDiscoveryResult;
  }> {
    const config = envConfigService.getConfig();

    // 1. Audit Ollama via Discovery Service
    const ollamaDiscovery = await ollamaDiscoveryService.discoverAndTest();
    const ollamaProv = this.providerRegistry.get('ollama');

    // Remove stale dynamic Ollama model entries before syncing discovered state
    for (const key of Array.from(this.modelRegistry.keys())) {
      if (key.startsWith('ollama:')) {
        this.modelRegistry.delete(key);
      }
    }

    if (ollamaProv) {
      if (ollamaDiscovery.reachable) {
        const hasVerifiedModels = ollamaDiscovery.discoveredModels.length > 0 && ollamaDiscovery.inferenceTestPassed;
        ollamaProv.healthStatus = hasVerifiedModels ? 'CONNECTED' : 'DEGRADED';
        ollamaProv.isOnline = true;
        ollamaProv.baseURL = ollamaDiscovery.activeEndpoint || ollamaProv.baseURL;
        ollamaProv.availableModels = (ollamaDiscovery.chatModels ||
          ollamaDiscovery.discoveredModels.filter(model => isOllamaChatModel(model.name)).map(model => model.name));
        ollamaProv.latencyMs = ollamaDiscovery.latencyMs;
        ollamaProv.lastSuccess = new Date().toISOString();
        ollamaProv.lastError = hasVerifiedModels
          ? undefined
          : (ollamaDiscovery.discoveredModels.length === 0 ? 'No Ollama models installed.' : 'Ollama /api/tags reachable but /api/chat inference test failed.');

        // Dynamically register ONLY discovered Ollama models in ModelRegistry
        ollamaDiscovery.discoveredModels.forEach((m) => {
          const modelId = `ollama:${m.name}`;
          const lowerName = m.name.toLowerCase();
          const hasVision = lowerName.includes('vision') || lowerName.includes('llava') || lowerName.includes('minicpm-v') || lowerName.includes('moondream') || lowerName.includes('-vl');
          const caps: CapabilityType[] = hasVision
            ? ['OFFLINE', 'GENERAL', 'CODING', 'REASONING', 'VISION', 'FAST_RESPONSE']
            : ['OFFLINE', 'GENERAL', 'CODING', 'REASONING', 'DEBUGGING', 'TESTING', 'FAST_RESPONSE'];
          this.modelRegistry.set(modelId, {
            id: modelId,
            provider: 'ollama',
            modelName: m.name,
            capabilities: caps,
            contextWindow: 32000,
            reasoningLevel: 85,
            codingLevel: 88,
            visionLevel: hasVision ? 75 : 0,
            speed: 98,
            quality: 88,
            costTier: 'FREE',
            local: true,
            online: false,
            enabled: true
          });
        });
      } else {
        ollamaProv.healthStatus = 'OFFLINE';
        ollamaProv.isOnline = false;
        ollamaProv.availableModels = [];
        ollamaProv.lastFailure = new Date().toISOString();
        ollamaProv.lastError = ollamaDiscovery.error;
      }
    }

    // 2. Audit Cloud Providers (NEVER contact cloud endpoints when OFFLINE_ONLY is active)
    if (this.currentMode === 'OFFLINE_ONLY') {
      for (const prov of this.providerRegistry.values()) {
        if (prov.providerId !== 'ollama') {
          prov.healthStatus = 'OFFLINE';
          prov.lastError = 'Disabled in OFFLINE_ONLY mode';
        }
      }
      return {
        providers: this.getProviderRegistry(),
        ollamaDiscovery
      };
    }

    const checkTasks: { providerId: AIProviderId; key?: string; testFn: () => Promise<void> }[] = [
      {
        providerId: 'gemini',
        key: config.geminiApiKey,
        testFn: async () => {
          await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey}`, { timeout: 3500 });
        }
      },
      {
        providerId: 'deepseek',
        key: config.deepseekApiKey,
        testFn: async () => {
          await axios.get('https://api.deepseek.com/v1/models', { headers: { Authorization: `Bearer ${config.deepseekApiKey}` }, timeout: 3500 });
        }
      },
      {
        providerId: 'groq',
        key: config.groqApiKey,
        testFn: async () => {
          await axios.get('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${config.groqApiKey}` }, timeout: 3500 });
        }
      },
      {
        providerId: 'openai',
        key: config.openaiApiKey,
        testFn: async () => {
          await axios.get('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${config.openaiApiKey}` }, timeout: 3500 });
        }
      },
      {
        providerId: 'anthropic',
        key: config.anthropicApiKey,
        testFn: async () => {
          await axios.get('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': config.anthropicApiKey, 'anthropic-version': '2023-06-01' }, timeout: 3500 });
        }
      },
      {
        providerId: 'mistral',
        key: config.mistralApiKey,
        testFn: async () => {
          await axios.get('https://api.mistral.ai/v1/models', { headers: { Authorization: `Bearer ${config.mistralApiKey}` }, timeout: 3500 });
        }
      }
    ];

    await Promise.all(
      checkTasks.map(async (task) => {
        const prov = this.providerRegistry.get(task.providerId);
        if (!prov) return;

        if (!task.key) {
          prov.healthStatus = 'NO_CREDENTIALS';
          prov.isOnline = false;
          prov.lastError = 'API key missing';
          return;
        }

        const start = Date.now();
        try {
          await task.testFn();
          prov.healthStatus = 'CONNECTED';
          prov.isOnline = true;
          prov.latencyMs = Date.now() - start;
          prov.lastSuccess = new Date().toISOString();
          prov.lastError = undefined;
        } catch (err: any) {
          const status = err.response?.status;
          prov.healthStatus = status === 401 || status === 403 ? 'INVALID_CREDENTIALS' : 'DISCONNECTED';
          prov.isOnline = false;
          prov.lastFailure = new Date().toISOString();
          prov.lastError = status ? `HTTP ${status}` : err.message;
        }
      })
    );

    const pollProv = this.providerRegistry.get('pollinations-flux');
    if (pollProv) {
      if (this.getExecutionMode() === 'OFFLINE_ONLY') {
        pollProv.healthStatus = 'OFFLINE';
        pollProv.isOnline = false;
        pollProv.lastError = 'Disabled in OFFLINE_ONLY mode';
      } else {
        pollProv.healthStatus = 'AVAILABLE' as any;
        pollProv.isOnline = true;
      }
    }

    return {
      providers: this.getProviderRegistry(),
      ollamaDiscovery
    };
  }
}

export const providerRegistryService = ProviderRegistryService.getInstance();

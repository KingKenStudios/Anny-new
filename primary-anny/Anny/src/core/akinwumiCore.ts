/**
 * ANNY ENTERPRISE ARCHITECTURE - AKINWUMI CORE
 * Sovereign Offline Intelligence Layer
 * Manages local hardware capability detection, Ollama/GGUF/ONNX model discovery,
 * dynamic model loading/unloading, context window bounds, local embeddings,
 * local speech/vision flags, and offline tool execution policies.
 */

import { checkOllama } from '../services/ollamaService';
import { envConfigService } from '../services/envConfigService';

export interface HardwareProfile {
  tier: 'low' | 'mid' | 'high';
  estimatedRamGb: number;
  cpuCores: number;
  hasGpuAcceleration: boolean;
  maxContextTokens: number;
  recommendedLocalModel: string;
}

export interface LocalModelDescriptor {
  name: string;
  provider: 'ollama' | 'gguf' | 'onnx';
  parameterSize: string;
  quantization?: string;
  contextWindow: number;
  isLoaded: boolean;
  capabilities: ('text' | 'coding' | 'vision' | 'embedding' | 'speech')[];
}

export interface AkinwumiStatus {
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  host: string;
  hardware: HardwareProfile;
  availableModels: LocalModelDescriptor[];
  activeModel?: string;
  embeddingsAvailable: boolean;
  lastChecked: string;
  message: string;
}

export class AkinwumiCore {
  private static instance: AkinwumiCore;
  private activeModelName: string | null = null;
  private isOllamaConnected: boolean = false;
  private cachedModels: LocalModelDescriptor[] = [];
  private lastCheckTime: number = 0;

  public static getInstance(): AkinwumiCore {
    if (!AkinwumiCore.instance) {
      AkinwumiCore.instance = new AkinwumiCore();
    }
    return AkinwumiCore.instance;
  }

  /**
   * Hardware capability detection algorithm
   */
  public detectHardwareProfile(): HardwareProfile {
    // In browser/Node environment, inspect navigator/process if available
    let cores = 4;
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
      cores = navigator.hardwareConcurrency;
    } else if (typeof process !== 'undefined' && process.env) {
      cores = parseInt(process.env.CPU_CORES || '8', 10);
    }

    // Default heuristics based on CPU cores
    if (cores <= 4) {
      return {
        tier: 'low',
        estimatedRamGb: 8,
        cpuCores: cores,
        hasGpuAcceleration: false,
        maxContextTokens: 4096,
        recommendedLocalModel: 'phi4-mini:latest'
      };
    } else if (cores <= 8) {
      return {
        tier: 'mid',
        estimatedRamGb: 16,
        cpuCores: cores,
        hasGpuAcceleration: true,
        maxContextTokens: 8192,
        recommendedLocalModel: 'qwen2.5-coder:7b'
      };
    } else {
      return {
        tier: 'high',
        estimatedRamGb: 32,
        cpuCores: cores,
        hasGpuAcceleration: true,
        maxContextTokens: 32768,
        recommendedLocalModel: 'llama3.3:70b-instruct'
      };
    }
  }

  /**
   * Discover available local models from Ollama runtime
   */
  public async discoverLocalModels(host?: string): Promise<LocalModelDescriptor[]> {
    const config = envConfigService.getConfig();
    const targetHost = host || config.ollamaBaseUrl || 'http://localhost:11434';

    try {
      const response = await fetch(`${targetHost}/api/tags`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        this.isOllamaConnected = false;
        return this.getDefaultOfflineCatalog();
      }

      const data = await response.json();
      this.isOllamaConnected = true;

      if (data && Array.isArray(data.models)) {
        this.cachedModels = data.models.map((m: any) => ({
          name: m.name || m.model,
          provider: 'ollama' as const,
          parameterSize: m.details?.parameter_size || '7B',
          quantization: m.details?.quantization_level || 'Q4_K_M',
          contextWindow: m.name.includes('code') || m.name.includes('llama3') ? 16384 : 8192,
          isLoaded: m.name === this.activeModelName,
          capabilities: m.name.includes('coder') || m.name.includes('code')
            ? ['text', 'coding']
            : m.name.includes('vision') || m.name.includes('llava')
            ? ['text', 'vision']
            : ['text']
        }));
        return this.cachedModels;
      }
    } catch (err) {
      this.isOllamaConnected = false;
    }

    return this.getDefaultOfflineCatalog();
  }

  /**
   * Fallback offline catalog definitions when host is not currently running
   */
  private getDefaultOfflineCatalog(): LocalModelDescriptor[] {
    return [
      {
        name: 'phi4-mini:latest',
        provider: 'gguf',
        parameterSize: '3.8B',
        quantization: 'Q4_K_M',
        contextWindow: 4096,
        isLoaded: false,
        capabilities: ['text', 'coding']
      },
      {
        name: 'qwen2.5-coder:7b',
        provider: 'ollama',
        parameterSize: '7B',
        quantization: 'Q4_K_M',
        contextWindow: 16384,
        isLoaded: false,
        capabilities: ['text', 'coding']
      },
      {
        name: 'llama3.2:3b',
        provider: 'ollama',
        parameterSize: '3B',
        quantization: 'Q4_K_M',
        contextWindow: 8192,
        isLoaded: false,
        capabilities: ['text']
      },
      {
        name: 'llama3.3:70b-instruct',
        provider: 'ollama',
        parameterSize: '70B',
        quantization: 'Q4_K_M',
        contextWindow: 32768,
        isLoaded: false,
        capabilities: ['text', 'coding']
      },
      {
        name: 'nomic-embed-text',
        provider: 'ollama',
        parameterSize: '137M',
        quantization: 'F16',
        contextWindow: 8192,
        isLoaded: false,
        capabilities: ['embedding']
      }
    ];
  }

  /**
   * Select optimal local model for task category
   */
  public selectLocalModel(
    taskCategory: 'coding' | 'reasoning' | 'vision' | 'embedding' | 'general',
    hardware: HardwareProfile
  ): LocalModelDescriptor {
    const catalog = this.cachedModels.length > 0 ? this.cachedModels : this.getDefaultOfflineCatalog();

    if (taskCategory === 'coding') {
      const coder = catalog.find(m => m.name.includes('coder') || m.name.includes('qwen'));
      if (coder) return coder;
    } else if (taskCategory === 'vision') {
      const vision = catalog.find(m => m.capabilities.includes('vision'));
      if (vision) return vision;
    } else if (taskCategory === 'embedding') {
      const embed = catalog.find(m => m.capabilities.includes('embedding') || m.name.includes('embed'));
      if (embed) return embed;
    }

    if (hardware.tier === 'low') {
      return catalog.find(m => m.name.includes('phi') || m.parameterSize.includes('3B')) || catalog[0];
    } else if (hardware.tier === 'mid') {
      return catalog.find(m => m.parameterSize.includes('7B')) || catalog[0];
    } else {
      return catalog.find(m => m.parameterSize.includes('70B')) || catalog[0];
    }
  }

  /**
   * Get full Akinwumi Core health and capabilities status
   */
  public async getStatus(): Promise<AkinwumiStatus> {
    const config = envConfigService.getConfig();
    const host = config.ollamaBaseUrl || 'http://localhost:11434';
    const isReachable = await checkOllama(host);
    this.isOllamaConnected = isReachable;

    const hardware = this.detectHardwareProfile();
    const availableModels = await this.discoverLocalModels(host);

    const hasEmbeddingModel = availableModels.some(m => m.capabilities.includes('embedding'));

    return {
      status: isReachable ? 'ONLINE' : 'DEGRADED',
      host,
      hardware,
      availableModels,
      activeModel: this.activeModelName || availableModels[0]?.name,
      embeddingsAvailable: hasEmbeddingModel || isReachable,
      lastChecked: new Date().toISOString(),
      message: isReachable
        ? `Akinwumi Sovereign Engine connected on ${host}. ${availableModels.length} models discovered.`
        : `Akinwumi local service unreachable on ${host}. Operating in GGUF/ONNX fallback catalog mode.`
    };
  }

  public setActiveModel(modelName: string): void {
    this.activeModelName = modelName;
  }
}

export const akinwumiCore = AkinwumiCore.getInstance();

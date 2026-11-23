import axios from 'axios';
import { envConfigService } from './envConfigService';

export interface OllamaModelInfo {
  name: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface OllamaDiscoveryResult {
  reachable: boolean;
  activeEndpoint?: string;
  discoveredModels: OllamaModelInfo[];
  inferenceTestPassed: boolean;
  latencyMs: number;
  error?: string;
}

export class OllamaDiscoveryService {
  private static instance: OllamaDiscoveryService;
  private lastDiscovery: OllamaDiscoveryResult | null = null;
  private lastDiscoveryAt = 0;

  public static getInstance(): OllamaDiscoveryService {
    if (!OllamaDiscoveryService.instance) {
      OllamaDiscoveryService.instance = new OllamaDiscoveryService();
    }
    return OllamaDiscoveryService.instance;
  }

  public getLastDiscovery(maxAgeMs = 30_000): OllamaDiscoveryResult | null {
    if (!this.lastDiscovery || Date.now() - this.lastDiscoveryAt > maxAgeMs) return null;
    return this.lastDiscovery;
  }

  /**
   * Discover and test Ollama across candidates:
   * 1. Environment OLLAMA_BASE_URL (or process.env)
   * 2. Localhost defaults (http://127.0.0.1:11434, http://localhost:11434)
   */
  public async discoverAndTest(): Promise<OllamaDiscoveryResult> {
    const config = envConfigService.getConfig();
    const candidateEndpoints = Array.from(new Set([
      config.ollamaBaseUrl,
      'http://127.0.0.1:11434',
      'http://localhost:11434'
    ])).filter(Boolean).map(endpoint => endpoint.replace(/\/+$/, ''));

    for (const endpoint of candidateEndpoints) {
      const startTime = Date.now();
      try {
        const tagsRes = await axios.get(`${endpoint}/api/tags`, { timeout: 2500 });
        if (tagsRes.status === 200 && tagsRes.data) {
          const rawModels: any[] = tagsRes.data.models || [];
          const discoveredModels: OllamaModelInfo[] = rawModels.map((m) => ({
            name: m.name,
            modified_at: m.modified_at,
            size: m.size,
            digest: m.digest,
            details: m.details
          }));

          let inferencePassed = false;
          // If models exist, test inference with first available model
          if (discoveredModels.length > 0) {
            try {
              const testModel = discoveredModels[0].name;
              const chatRes = await axios.post(`${endpoint}/api/chat`, {
                model: testModel,
                messages: [{ role: 'user', content: 'Return the number 42.' }],
                stream: false
              }, { timeout: 30_000 });
              if (chatRes.data?.message?.content) {
                inferencePassed = true;
              }
            } catch (_e) {
              inferencePassed = false;
            }
          }

          const latencyMs = Date.now() - startTime;
          this.lastDiscovery = {
            reachable: true,
            activeEndpoint: endpoint,
            discoveredModels,
            inferenceTestPassed: inferencePassed,
            latencyMs,
            ...(!inferencePassed
              ? { error: discoveredModels.length > 0
                  ? 'Ollama endpoint is reachable, but the installed model did not complete the inference probe.'
                  : 'Ollama is reachable, but no local models are installed.' }
              : {})
          };
          this.lastDiscoveryAt = Date.now();
          return this.lastDiscovery;
        }
      } catch (err: any) {
        // Continue checking candidates
      }
    }

    this.lastDiscovery = {
      reachable: false,
      discoveredModels: [],
      inferenceTestPassed: false,
      latencyMs: 0,
      error: 'Ollama endpoint unreachable at candidate URLs. Set OLLAMA_BASE_URL to the remote/LAN Ollama IP if running outside the local host.'
    };
    this.lastDiscoveryAt = Date.now();
    return this.lastDiscovery;
  }
}

export const ollamaDiscoveryService = OllamaDiscoveryService.getInstance();

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

/**
 * Checks if local Ollama instance is reachable
 */
export async function checkOllama(host: string = "http://localhost:11434"): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

  try {
    const response = await fetch(`${host}/api/tags`, { 
      method: "GET",
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (e) {
    clearTimeout(timeoutId);
    // Silent fail for the periodic check to avoid console noise
    return false;
  }
}

/**
 * Streams generation from local Ollama instance
 */
export async function* chatOllamaStream(
  prompt: string,
  model: string = "llama3.2",
  systemPrompt?: string,
  host: string = "http://localhost:11434"
) {
  const payload = {
    model: model,
    prompt: prompt,
    stream: true,
    system: systemPrompt,
    options: {
      temperature: 0.7,
      num_predict: 1024,
    }
  };

  try {
    const response = await fetch(`${host}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.body) throw new Error("No response body from Ollama");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line) as OllamaResponse;
          if (json.response) yield json.response;
        } catch (e) {
          console.error("Error parsing Ollama stream chunk:", e);
        }
      }
    }
  } catch (e) {
    console.error("Ollama connection failed:", e);
    throw new Error("LOCAL_ENGINE_DISCONNECTED: Ensure Ollama is running on reachable endpoint");
  }
}


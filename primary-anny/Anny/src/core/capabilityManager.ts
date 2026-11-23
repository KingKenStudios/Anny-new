/**
 * ANNY — CAPABILITY MANAGER (VERSION 1.0)
 * Central OS Subsystem Registry tracking subsystem metadata, runtime providers,
 * preview providers, health metrics, capabilities, and verification reports.
 */

export type CapabilityStatus = 'online' | 'standby' | 'active' | 'disabled';


export interface CapabilityProbeResult {
  healthy: boolean;
  connected: boolean;
  detail: string;
  latencyMs?: number;
}

export type CapabilityProbe = () => Promise<CapabilityProbeResult> | CapabilityProbeResult;

export interface CapabilityProbeReport {
  id: string;
  outcome: 'verified' | 'failed' | 'timed_out' | 'no_probe';
  detail: string;
  latencyMs?: number;
  checkedAt: string;
}

export interface SubsystemCapability {
  id: string;
  name: string;
  category: 'engine' | 'runtime_provider' | 'preview_provider' | 'security' | 'storage';
  version: string;
  health: 'healthy' | 'degraded' | 'critical' | 'offline';
  status: 'online' | 'standby' | 'active' | 'disabled';
  isConnected: boolean;
  supportedCapabilities: string[];
  limitations: string[];
  lastVerified: string;
  metrics?: {
    cpuPct?: number;
    memoryMb?: number;
    latencyMs?: number;
  };
}

export class CapabilityManager {
  private static instance: CapabilityManager;
  private registry: Map<string, SubsystemCapability> = new Map();
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.registerCoreCapabilities();
  }

  public static getInstance(): CapabilityManager {
    if (!CapabilityManager.instance) {
      CapabilityManager.instance = new CapabilityManager();
    }
    return CapabilityManager.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('[CapabilityManager Error]', e); }
    });
  }

  private registerCoreCapabilities(): void {
    // Registration metadata is not proof of runtime health.
    const unverified = 'Not runtime-verified; registration metadata only';

    // 1. Core OS Engines
    this.register({
      id: 'eabp_engine',
      name: 'Enterprise Autonomous Builder Platform',
      category: 'engine',
      version: '1.0.0',
      health: 'degraded',
      status: 'standby',
      isConnected: false,
      supportedCapabilities: ['19-stage Pipeline', 'Requirements Extraction', 'Tech Stack Selection', 'Self-Healing AST Repair'],
      limitations: ['GCP deployment needs OAuth project credentials'],
      lastVerified: unverified
    });

    this.register({
      id: 'intent_router',
      name: 'Pre-LLM Intent Router Engine',
      category: 'engine',
      version: '1.0.0',
      health: 'degraded',
      status: 'standby',
      isConnected: false,
      supportedCapabilities: ['15 Execution Modes', 'Pre-generation Classification', 'Code Dump Shield'],
      limitations: ['Rule-based pattern heuristics fallback'],
      lastVerified: unverified
    });

    this.register({
      id: 'vfs_engine',
      name: 'Virtual FileSystem Engine',
      category: 'storage',
      version: '1.0.0',
      health: 'degraded',
      status: 'standby',
      isConnected: false,
      supportedCapabilities: ['In-Memory Tree', 'Storage Persistence', 'AST Diffing', 'Event Watchers'],
      limitations: ['Browser LocalStorage quota limits (~5-10MB)'],
      lastVerified: unverified
    });

    // 2. Runtime Providers
    this.register({
      id: 'provider_local_node',
      name: 'Local Node.js Runtime Provider',
      category: 'runtime_provider',
      version: (typeof process !== 'undefined' && process.versions?.node) || 'n/a (browser)',
      health: typeof process !== 'undefined' && !!process.versions?.node ? 'healthy' : 'offline',
      status: typeof process !== 'undefined' && !!process.versions?.node ? 'active' : 'disabled',
      isConnected: typeof process !== 'undefined' && !!process.versions?.node,
      supportedCapabilities: ['Direct ESM Execution (this server itself)'],
      limitations: ['Does not spawn separate child processes for generated projects — see universalExecutionAdapterEngine.ts'],
      lastVerified: unverified
    });

    this.register({
      id: 'provider_sandpack',
      name: 'Sandpack Browser Runtime Provider',
      category: 'runtime_provider',
      version: 'n/a',
      health: 'offline',
      status: 'disabled',
      isConnected: false,
      supportedCapabilities: ['In-browser bundler', 'React/Vue instant preview', 'Transpilation without Node backend'],
      limitations: ['No real Sandpack integration is implemented — this was previously pointing at a non-existent domain'],
      lastVerified: unverified
    });

    this.register({
      id: 'provider_docker',
      name: 'Docker Container Runtime Provider',
      category: 'runtime_provider',
      version: '24.0.7',
      health: 'offline',
      status: 'disabled',
      isConnected: false,
      supportedCapabilities: ['Full container process isolation', 'Multi-service docker-compose', 'Custom OS images'],
      limitations: ['Requires host socket daemon mounting (/var/run/docker.sock)'],
      lastVerified: unverified
    });

    this.register({
      id: 'provider_remote',
      name: 'Cloud Remote Execution Provider',
      category: 'runtime_provider',
      version: 'n/a',
      health: 'offline',
      status: 'disabled',
      isConnected: false,
      supportedCapabilities: ['Cloud Run Container Execution', 'Distributed Microservices', 'External API Proxying'],
      limitations: ['Not implemented — no real Cloud Run or remote execution integration exists'],
      lastVerified: unverified
    });

    // 3. Preview Providers
    this.register({
      id: 'preview_vite_iframe',
      name: 'Vite Ingress iFrame Preview',
      category: 'preview_provider',
      version: '5.1.0',
      health: 'degraded',
      status: 'standby',
      isConnected: false,
      supportedCapabilities: ['Port 3000 live preview', 'Responsive Device Viewport (Desktop/Tablet/Mobile)', 'Console Mirror'],
      limitations: ['iFrame same-origin API restriction policies'],
      lastVerified: unverified
    });

    this.register({
      id: 'preview_generic_http',
      name: 'Generic HTTP Proxy Preview',
      category: 'preview_provider',
      version: 'n/a',
      health: 'offline',
      status: 'disabled',
      isConnected: false,
      supportedCapabilities: ['Proxy any port to HTTP response stream', 'Raw REST endpoint debugging'],
      limitations: ['Not implemented — no real server is ever spawned at the referenced port, see runtimeBridge.ts'],
      lastVerified: unverified
    });
  }

  public register(capability: SubsystemCapability): void {
    this.registry.set(capability.id, capability);
    this.notify();
  }

  public updateStatus(id: string, updates: Partial<SubsystemCapability>): void {
    const existing = this.registry.get(id);
    if (existing) {
      this.registry.set(id, {
        ...existing,
        ...updates,
        lastVerified: new Date().toISOString()
      });
      this.notify();
    }
  }


  /**
   * Run a caller-supplied live probe. Registration metadata is never treated
   * as proof; only a successful probe can promote a capability to healthy.
   */
  public async verify(
    id: string,
    probe?: CapabilityProbe,
    timeoutMs = 5000
  ): Promise<CapabilityProbeReport> {
    const checkedAt = new Date().toISOString();
    const capability = this.registry.get(id);
    if (!capability) {
      return { id, outcome: 'failed', detail: 'Unknown capability', checkedAt };
    }
    if (!probe) {
      return { id, outcome: 'no_probe', detail: 'No live probe is registered; status remains unverified', checkedAt };
    }
    const started = Date.now();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        Promise.resolve().then(probe),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Capability probe timed out')), Math.max(1, timeoutMs));
        })
      ]);
      const latencyMs = result.latencyMs ?? Date.now() - started;
      this.updateStatus(id, {
        health: result.healthy ? 'healthy' : 'degraded',
        status: result.connected ? 'active' : 'standby',
        isConnected: result.connected,
        limitations: result.healthy
          ? capability.limitations.filter(item => !item.startsWith('Probe:'))
          : [...capability.limitations.filter(item => !item.startsWith('Probe:')), `Probe: ${result.detail}`]
      });
      return { id, outcome: result.healthy && result.connected ? 'verified' : 'failed', detail: result.detail, latencyMs, checkedAt };
    } catch (error) {
      const timedOut = error instanceof Error && error.message.includes('timed out');
      this.updateStatus(id, {
        health: timedOut ? 'critical' : 'degraded',
        status: 'standby',
        isConnected: false,
        limitations: [...capability.limitations.filter(item => !item.startsWith('Probe:')), `Probe: ${error instanceof Error ? error.message : String(error)}`]
      });
      return {
        id,
        outcome: timedOut ? 'timed_out' : 'failed',
        detail: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - started,
        checkedAt
      };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  /** Verify only capabilities for which the caller supplies real probes. */
  public async verifyAll(
    probes: Partial<Record<string, CapabilityProbe>>,
    timeoutMs = 5000
  ): Promise<CapabilityProbeReport[]> {
    return Promise.all(this.getAll().map(capability =>
      this.verify(capability.id, probes[capability.id], timeoutMs)
    ));
  }

  public getAll(): SubsystemCapability[] {
    return Array.from(this.registry.values());
  }

  public getByCategory(category: SubsystemCapability['category']): SubsystemCapability[] {
    return this.getAll().filter(c => c.category === category);
  }

  public getById(id: string): SubsystemCapability | undefined {
    return this.registry.get(id);
  }
}

export const capabilityManager = CapabilityManager.getInstance();

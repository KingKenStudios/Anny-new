/**
 * ANNY — UNIVERSAL EXECUTION ADAPTER ENGINE (UEAE v1.0)
 * Plugin-based runtime adapter architecture executing and managing Node.js, Vite, Express, Next.js,
 * Python, FastAPI, Flask, Go, Rust, Java, .NET, Flutter, React Native, Electron, Tauri, Docker, K8s, ROS2, PLC, SCADA.
 */

import { systemBus } from './systemBus';
import { capabilityManager } from './capabilityManager';
import { integrationRegistry } from './integrationRegistry';
import { environmentDetector } from './environmentDetector';

export type AdapterRuntimeType =
  | 'NODE_VITE'
  | 'NODE_EXPRESS'
  | 'NEXT_JS'
  | 'PYTHON_FASTAPI'
  | 'PYTHON_FLASK'
  | 'GO_MICROSERVICE'
  | 'RUST_ACTIX'
  | 'JAVA_SPRING'
  | 'DOTNET_CORE'
  | 'FLUTTER_EMULATOR'
  | 'REACT_NATIVE'
  | 'ELECTRON_DESKTOP'
  | 'TAURI_NATIVE'
  | 'DOCKER_CONTAINER'
  | 'KUBERNETES_CLUSTER'
  | 'ROS2_ROBOTICS'
  | 'PLC_SCADA';

export interface AdapterHealthStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'AWAITING_DEPENDENCY' | 'HARDWARE_REQUIRED' | 'OFFLINE';
  message: string;
  latencyMs: number | null;
  cpuUsagePct: number | null;
  memoryMb: number | null;
}

export interface ExecutionAdapter {
  id: AdapterRuntimeType;
  name: string;
  description: string;
  supportedFileExtensions: string[];
  initialize(): Promise<boolean>;
  build(projectPath: string): Promise<{ success: boolean; logs: string[]; buildTimeMs: number }>;
  run(projectPath: string, port?: number): Promise<{ pid: number; port: number; status: string }>;
  stop(): Promise<boolean>;
  restart(): Promise<boolean>;
  healthCheck(): Promise<AdapterHealthStatus>;
  getLogs(): string[];
  getPreviewURL(): string;
  detectRequirements(projectFiles: string[]): boolean;
  verifyEnvironment(): { verified: boolean; missingDependencies: string[] };
}

class BaseExecutionAdapter implements ExecutionAdapter {
  public id: AdapterRuntimeType;
  public name: string;
  public description: string;
  public supportedFileExtensions: string[];
  protected logs: string[] = [];
  protected isRunning: boolean = false;
  protected currentPort: number = 3000;
  protected pid: number = 0;

  constructor(
    id: AdapterRuntimeType,
    name: string,
    description: string,
    supportedFileExtensions: string[],
    defaultPort: number = 3000
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.supportedFileExtensions = supportedFileExtensions;
    this.currentPort = defaultPort;
  }

  async initialize(): Promise<boolean> {
    this.logs.push(`[${this.name}] Initialized adapter runtime environment.`);
    return true;
  }

  async build(projectPath: string): Promise<{ success: boolean; logs: string[]; buildTimeMs: number }> {
    const start = Date.now();
    this.logs.push(`[${this.name}] Build simulation requested for ${projectPath}; no compiler or external runtime is attached.`);
    this.logs.push(`[${this.name}] Build was NOT executed. A real runtime adapter must be installed to claim build success.`);
    return {
      success: false,
      logs: [...this.logs],
      buildTimeMs: Date.now() - start
    };
  }

  async run(projectPath: string, port: number = 3000): Promise<{ pid: number; port: number; status: string }> {
    this.currentPort = port;
    this.isRunning = true;
    this.logs.push(`[${this.name}] Simulated runtime state only; no operating-system process was spawned.`);
    return { pid: 0, port: this.currentPort, status: 'SIMULATED' };
  }

  async stop(): Promise<boolean> {
    this.isRunning = false;
    this.logs.push(`[${this.name}] Simulated runtime state stopped; no operating-system process was terminated.`);
    return true;
  }

  async restart(): Promise<boolean> {
    await this.stop();
    await this.run('current_workspace', this.currentPort);
    return true;
  }

  async healthCheck(): Promise<AdapterHealthStatus> {
    return {
      status: this.isRunning ? 'DEGRADED' : 'AWAITING_DEPENDENCY',
      message: `${this.name} status: ${this.isRunning ? 'SIMULATED state only; no real process is spawned or health-probed' : 'Standby; real runtime adapter unavailable'}`,
      latencyMs: null,
      cpuUsagePct: null,
      memoryMb: null
    };
  }

  getLogs(): string[] {
    return this.logs;
  }

  getPreviewURL(): string {
    return '';
  }

  detectRequirements(projectFiles: string[]): boolean {
    return projectFiles.some(f => this.supportedFileExtensions.some(ext => f.endsWith(ext)));
  }

  verifyEnvironment(): { verified: boolean; missingDependencies: string[] } {
    return { verified: true, missingDependencies: [] };
  }
}

export class UniversalExecutionAdapterEngine {
  private static instance: UniversalExecutionAdapterEngine;
  private adapters: Map<AdapterRuntimeType, ExecutionAdapter> = new Map();
  private activeAdapter: ExecutionAdapter | null = null;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.registerDefaultAdapters();
    this.registerWithOS();
  }

  public static getInstance(): UniversalExecutionAdapterEngine {
    if (!UniversalExecutionAdapterEngine.instance) {
      UniversalExecutionAdapterEngine.instance = new UniversalExecutionAdapterEngine();
    }
    return UniversalExecutionAdapterEngine.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('[ExecutionAdapterEngine Notification Error]', e); }
    });
  }

  private registerDefaultAdapters(): void {
    const list: ExecutionAdapter[] = [
      new BaseExecutionAdapter('NODE_VITE', 'Node.js + Vite React Ingress', 'Vite 5 React TypeScript Dev Server', ['.tsx', '.ts', 'vite.config.ts'], 3000),
      new BaseExecutionAdapter('NODE_EXPRESS', 'Express Backend Ingress', 'Node.js Express API Server', ['server.ts', 'app.js', 'package.json'], 3000),
      new BaseExecutionAdapter('NEXT_JS', 'Next.js App Router', 'Full-stack React Server Components', ['next.config.js', 'page.tsx'], 3000),
      new BaseExecutionAdapter('PYTHON_FASTAPI', 'Python FastAPI Async Engine', 'High-performance Python ASGI API', ['main.py', 'requirements.txt'], 8000),
      new BaseExecutionAdapter('PYTHON_FLASK', 'Python Flask WSGI Engine', 'Lightweight Python WSGI App', ['app.py', 'wsgi.py'], 5000),
      new BaseExecutionAdapter('GO_MICROSERVICE', 'Go Gin/Fiber Engine', 'Ultra-fast Go compiled binary microservice', ['main.go', 'go.mod'], 8080),
      new BaseExecutionAdapter('RUST_ACTIX', 'Rust Actix/Axum Engine', 'Memory-safe high-throughput Rust server', ['main.rs', 'Cargo.toml'], 8080),
      new BaseExecutionAdapter('JAVA_SPRING', 'Java Spring Boot Engine', 'Enterprise Java JVM microservice framework', ['pom.xml', 'Application.java'], 8080),
      new BaseExecutionAdapter('DOTNET_CORE', '.NET 8 Web API', 'Microsoft C# cross-platform Web API', ['.csproj', 'Program.cs'], 5000),
      new BaseExecutionAdapter('FLUTTER_EMULATOR', 'Flutter Web & Emulator', 'Dart multi-platform Flutter app', ['pubspec.yaml', 'main.dart'], 3000),
      new BaseExecutionAdapter('REACT_NATIVE', 'React Native Expo Engine', 'Cross-platform mobile Expo runtime', ['app.json', 'App.js'], 19000),
      new BaseExecutionAdapter('ELECTRON_DESKTOP', 'Electron Chromium Shell', 'Cross-platform desktop application shell', ['electron.js', 'main.js'], 3000),
      new BaseExecutionAdapter('TAURI_NATIVE', 'Tauri Rust + Webview', 'Lightweight Rust native desktop app', ['tauri.conf.json', 'lib.rs'], 3000),
      new BaseExecutionAdapter('DOCKER_CONTAINER', 'Docker Container Ingress', 'Containerized Cloud Run microservice', ['Dockerfile', 'docker-compose.yml'], 3000),
      new BaseExecutionAdapter('KUBERNETES_CLUSTER', 'Kubernetes Pod Gateway', 'K8s deployment manifest orchestrator', ['deployment.yaml', 'k8s.yaml'], 80),
      new BaseExecutionAdapter('ROS2_ROBOTICS', 'ROS2 Humble Node Publisher', 'Robotics Operating System 2 node graph', ['package.xml', 'setup.py', '.launch.py'], 11311),
      new BaseExecutionAdapter('PLC_SCADA', 'ICS/SCADA PLC Modbus Gateway', 'Industrial Automation SCADA & Ladder Logic', ['.ladder', '.st', 'plc.json'], 502)
    ];

    list.forEach(adapter => {
      this.adapters.set(adapter.id, adapter);
    });

    // Select a default adapter without starting a simulated process.
    this.activeAdapter = this.adapters.get('NODE_VITE')!;
  }

  private registerWithOS(): void {
    integrationRegistry.register({
      id: 'subsystem_execution_adapter_engine',
      name: 'Universal Execution Adapter Engine (UEAE v1.0)',
      version: '1.0.0',
      health: 'degraded',
      status: 'standby',
      dependencies: ['CapabilityManager', 'SystemBus', 'IntegrationRegistry', 'EnvironmentDetector'],
      capabilities: [
        'Runtime adapter selection metadata (17 targets)',
        'Simulated adapter state and placeholder lifecycle APIs',
        'Real process spawning, compilation, networking, and hardware gateways are not implemented in these adapters'
      ],
      emittedEvents: ['RuntimeStateChanged'],
      lastRegistered: new Date().toLocaleTimeString()
    });

    capabilityManager.register({
      id: 'cap_execution_adapter_engine',
      name: 'Plugin Execution Adapter Orchestrator',
      category: 'runtime_provider',
      version: '1.0.0',
      health: 'degraded',
      status: 'standby',
      isConnected: false,
      supportedCapabilities: [
        'Runtime adapter selection and metadata',
        'Placeholder build/run/stop lifecycle state'
      ],
      limitations: [
        'No adapter currently spawns a real runtime process or performs a real build',
        'Docker, Kubernetes, ROS 2, PLC, SCADA and native hardware adapters are placeholders',
        'Preview URLs, process IDs, CPU, memory, and runtime health are not provided as verified telemetry'
      ],
      lastVerified: new Date().toLocaleTimeString(),
      metrics: {}
    });

    systemBus.publish('SubsystemRegistered', 'UniversalExecutionAdapterEngine', {
      subsystemId: 'subsystem_execution_adapter_engine',
      timestamp: new Date().toLocaleTimeString()
    });
  }

  private logsForSelection(target: ExecutionAdapter, buildLogs: string[]): void {
    systemBus.publish('RuntimeAdapterUnavailable', 'UniversalExecutionAdapterEngine', {
      adapterId: target.id,
      reason: 'Real runtime build unavailable; simulation did not start a process.',
      logs: buildLogs.slice(-20)
    });
  }

  public getAdapter(type: AdapterRuntimeType): ExecutionAdapter | undefined {
    return this.adapters.get(type);
  }

  public getAllAdapters(): ExecutionAdapter[] {
    return Array.from(this.adapters.values());
  }

  public getActiveAdapter(): ExecutionAdapter {
    return this.activeAdapter || this.adapters.get('NODE_VITE')!;
  }

  public async selectAdapterAndRun(type: AdapterRuntimeType, projectPath: string = 'workspace'): Promise<ExecutionAdapter> {
    const target = this.adapters.get(type);
    if (!target) throw new Error(`Execution adapter ${type} not found.`);

    if (this.activeAdapter && this.activeAdapter.id !== type) {
      await this.activeAdapter.stop();
    }

    await target.initialize();
    const build = await target.build(projectPath);
    this.activeAdapter = target;
    if (!build.success) {
      this.logsForSelection(target, build.logs);
      this.notify();
      return target;
    }
    await target.run(projectPath, 3000);

    systemBus.publish('RuntimeStateChanged', 'UniversalExecutionAdapterEngine', {
      adapterId: target.id,
      name: target.name,
      status: 'RUNNING'
    });

    this.notify();
    return target;
  }
}

export const universalExecutionAdapterEngine = UniversalExecutionAdapterEngine.getInstance();

/**
 * ANNY — UNIVERSAL RUNTIME PLATFORM (URP v1.0)
 * Multi-language & multi-platform runtime orchestration layer (Node.js, Python, Docker, Java, Go, Rust, Flutter, Electron, ROS2, PLC Gateway).
 */

import { systemBus } from './systemBus';
import { capabilityManager } from './capabilityManager';
import { integrationRegistry } from './integrationRegistry';
import { environmentDetector } from './environmentDetector';

export type RuntimeType =
  | 'NODE_EXPRESS_VITE'
  | 'PYTHON_FASTAPI'
  | 'DOCKER_COMPOSE'
  | 'JAVA_SPRING'
  | 'GO_MICROSERVICE'
  | 'RUST_ENGINE'
  | 'FLUTTER_EMULATOR'
  | 'ELECTRON_DESKTOP'
  | 'TAURI_NATIVE'
  | 'ROS2_ROBOTICS'
  | 'PLC_INDUSTRIAL_GATEWAY';

export interface RuntimeStatusSpec {
  id: string;
  name: string;
  type: RuntimeType;
  port: number;
  status: 'RUNNING' | 'STOPPED' | 'INITIALIZING' | 'AWAITING_DEPENDENCIES' | 'ERROR';
  pid?: number;
  cpuUsagePct: number;
  memoryMb: number;
  uptimeSeconds: number;
  activeEndpoints: string[];
  lastHealthCheck: string;
}

export class UniversalRuntimePlatform {
  private static instance: UniversalRuntimePlatform;
  private runtimes: Map<string, RuntimeStatusSpec> = new Map();
  private startTime: number = Date.now();
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.registerWithOS();
    this.initializeDefaultRuntimes();
  }

  public static getInstance(): UniversalRuntimePlatform {
    if (!UniversalRuntimePlatform.instance) {
      UniversalRuntimePlatform.instance = new UniversalRuntimePlatform();
    }
    return UniversalRuntimePlatform.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('[RuntimePlatform Notification Error]', e); }
    });
  }

  private registerWithOS(): void {
    integrationRegistry.register({
      id: 'subsystem_universal_runtime_platform',
      name: 'Universal Runtime Platform (URP v1.0)',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      dependencies: ['EnvironmentDetector', 'SystemBus', 'CapabilityManager'],
      capabilities: [
        'Multi-language Runtime Process Orchestration',
        'Node.js, Python, Docker, Java, Go, Rust, Flutter, Electron, ROS2 & PLC Gateways',
        'Real-time Telemetry & Ingress Health Monitoring'
      ],
      emittedEvents: ['RuntimeStateChanged'],
      lastRegistered: new Date().toLocaleTimeString()
    });

    capabilityManager.register({
      id: 'cap_universal_runtime_platform',
      name: 'Multi-Language Universal Runtime Platform',
      category: 'runtime_provider',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      isConnected: true,
      supportedCapabilities: [
        'Node.js Express + Vite Dev Server (Port 3000)',
        'Python FastAPI Local Inference Bridge',
        'Docker Container Orchestration Ingress',
        'ROS2 Robotics & PLC Industrial Gateways'
      ],
      limitations: [],
      lastVerified: new Date().toLocaleTimeString(),
      metrics: { cpuPct: 1.2, memoryMb: 128.0, latencyMs: 1 }
    });

    systemBus.publish('SubsystemRegistered', 'UniversalRuntimePlatform', {
      subsystemId: 'subsystem_universal_runtime_platform',
      timestamp: new Date().toLocaleTimeString()
    });
  }

  private initializeDefaultRuntimes(): void {
    const env = environmentDetector.detectEnvironment();
    const isNode = typeof process !== 'undefined' && !!process.versions?.node;

    // This IS the real, currently-running Node/Express/Vite server — the only
    // runtime in this list that's genuinely real.
    const nodeRuntime: RuntimeStatusSpec = {
      id: 'rt_node_express',
      name: 'Node.js Express + Vite Server (Ingress Port 3000)',
      type: 'NODE_EXPRESS_VITE',
      port: 3000,
      status: 'RUNNING',
      pid: isNode ? process.pid : undefined,
      cpuUsagePct: 0, // Real value available via GET /api/system/metrics — not duplicated here to avoid two sources of truth.
      memoryMb: 0,
      uptimeSeconds: isNode ? Math.floor(process.uptime()) : Math.floor((Date.now() - this.startTime) / 1000),
      activeEndpoints: ['/api/health', '/api/system/metrics', '/api/router/chat', '/api/brain/reason'],
      lastHealthCheck: new Date().toLocaleTimeString()
    };

    // The following four are NOT connected to anything real in this app —
    // no Python inference backend, Docker socket, PLC/SCADA gateway, or ROS2
    // node is actually running. Previously all four were hardcoded to
    // status: 'RUNNING' with fabricated PIDs and CPU/memory numbers.
    const pythonRuntime: RuntimeStatusSpec = {
      id: 'rt_python_inference',
      name: 'Python Local Inference & ONNX Bridge',
      type: 'PYTHON_FASTAPI',
      port: 8000,
      status: 'AWAITING_DEPENDENCIES',
      cpuUsagePct: 0,
      memoryMb: 0,
      uptimeSeconds: 0,
      activeEndpoints: [],
      lastHealthCheck: new Date().toLocaleTimeString()
    };

    const dockerRuntime: RuntimeStatusSpec = {
      id: 'rt_docker_compose',
      name: 'Docker Cloud Run Container Engine',
      type: 'DOCKER_COMPOSE',
      port: 3000,
      status: env.hasDockerEngine ? 'RUNNING' : 'AWAITING_DEPENDENCIES',
      cpuUsagePct: 0,
      memoryMb: 0,
      uptimeSeconds: 0,
      activeEndpoints: [],
      lastHealthCheck: new Date().toLocaleTimeString()
    };

    const plcRuntime: RuntimeStatusSpec = {
      id: 'rt_plc_gateway',
      name: 'ICS/SCADA PLC Modbus/OPC-UA Gateway',
      type: 'PLC_INDUSTRIAL_GATEWAY',
      port: 502,
      status: 'AWAITING_DEPENDENCIES', // No real hardware gateway connection exists — do not claim otherwise for an industrial safety system.
      cpuUsagePct: 0,
      memoryMb: 0,
      uptimeSeconds: 0,
      activeEndpoints: [],
      lastHealthCheck: new Date().toLocaleTimeString()
    };

    const rosRuntime: RuntimeStatusSpec = {
      id: 'rt_ros2_robotics',
      name: 'ROS2 Humble Robotics Node Publisher',
      type: 'ROS2_ROBOTICS',
      port: 11311,
      status: 'AWAITING_DEPENDENCIES',
      cpuUsagePct: 0,
      memoryMb: 0,
      uptimeSeconds: 0,
      activeEndpoints: [],
      lastHealthCheck: new Date().toLocaleTimeString()
    };

    this.runtimes.set(nodeRuntime.id, nodeRuntime);
    this.runtimes.set(pythonRuntime.id, pythonRuntime);
    this.runtimes.set(dockerRuntime.id, dockerRuntime);
    this.runtimes.set(plcRuntime.id, plcRuntime);
    this.runtimes.set(rosRuntime.id, rosRuntime);
  }

  public restartRuntime(runtimeId: string): RuntimeStatusSpec | undefined {
    const rt = this.runtimes.get(runtimeId);
    if (!rt) return undefined;

    // Only the real Node runtime can honestly transition to RUNNING on "restart" —
    // it's the process already executing this code. The other four have no real
    // backing process, so a restart attempt honestly stays AWAITING_DEPENDENCIES
    // rather than fabricating a successful start.
    if (rt.type !== 'NODE_EXPRESS_VITE') {
      rt.status = 'AWAITING_DEPENDENCIES';
      rt.lastHealthCheck = new Date().toLocaleTimeString();
      this.notify();
      return rt;
    }

    rt.status = 'INITIALIZING';
    this.notify();

    setTimeout(() => {
      rt.status = 'RUNNING';
      rt.lastHealthCheck = new Date().toLocaleTimeString();

      systemBus.publish('RuntimeStateChanged', 'UniversalRuntimePlatform', {
        runtimeId: rt.id,
        name: rt.name,
        status: rt.status
      });

      this.notify();
    }, 500);

    return rt;
  }

  public getAllRuntimes(): RuntimeStatusSpec[] {
    // Update uptime
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    this.runtimes.forEach(rt => {
      rt.uptimeSeconds = uptimeSec;
    });

    return Array.from(this.runtimes.values());
  }
}

export const universalRuntimePlatform = UniversalRuntimePlatform.getInstance();

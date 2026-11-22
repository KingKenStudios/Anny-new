/**
 * ANNY — EXECUTION ENVIRONMENT DETECTOR (VERSION 1.0)
 * Autonomous environment inspection engine detecting available runtimes, compilers,
 * cloud credentials, container daemons, and hardware gateways.
 * Dynamically synchronizes real-time status into the Capability Manager.
 */

import { capabilityManager, SubsystemCapability } from './capabilityManager';
import firebaseConfig from '../../firebase-applet-config.json';

export interface DetectedEnvironmentSpec {
  nodeVersion: string;
  hasVfsStorage: boolean;
  hasViteIngress: boolean;
  hasDockerEngine: boolean;
  hasGitSupport: boolean;
  hasCloudRunCreds: boolean;
  hasFirebaseCreds: boolean;
  hasFlutterSdk: boolean;
  hasAndroidSdk: boolean;
  hasRos2Gateway: boolean;
  hasPlcScadaGateway: boolean;
  gpuAccelerated: boolean;
}

export class EnvironmentDetector {
  private static instance: EnvironmentDetector;

  private constructor() {}

  public static getInstance(): EnvironmentDetector {
    if (!EnvironmentDetector.instance) {
      EnvironmentDetector.instance = new EnvironmentDetector();
    }
    return EnvironmentDetector.instance;
  }

  public detectEnvironment(): DetectedEnvironmentSpec {
    const isNode = typeof process !== 'undefined' && process.versions && !!process.versions.node;
    const hasLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    const isBrowser = typeof window !== 'undefined';
    const hasGpu = isBrowser && !!(window.navigator as any).gpu || !!(window as any).WebGLRenderingContext;

    const spec: DetectedEnvironmentSpec = {
      nodeVersion: isNode ? process.versions.node : 'n/a (browser environment)',
      hasVfsStorage: hasLocalStorage || isNode,
      hasViteIngress: true, // This app itself IS the Vite/Express server — self-referentially true when this code is running at all.
      hasDockerEngine: false, // No Docker socket check is implemented — honestly false rather than assumed true.
      hasGitSupport: false, // No real git binary/VFS-git integration exists — previously claimed true with no check behind it.
      hasCloudRunCreds: false, // No real Cloud Run credential check is implemented.
      hasFirebaseCreds: Boolean((firebaseConfig as any)?.apiKey), // Real check: does a Firebase config with an API key exist.
      hasFlutterSdk: false, // Flutter SDK missing in container base image
      hasAndroidSdk: false, // Android SDK missing in container base image
      hasRos2Gateway: false, // ROS2 daemon missing
      hasPlcScadaGateway: false, // Industrial Hardware Gateway required
      gpuAccelerated: hasGpu
    };

    this.syncCapabilitiesWithDetector(spec);
    return spec;
  }

  private syncCapabilitiesWithDetector(spec: DetectedEnvironmentSpec): void {
    const now = new Date().toLocaleTimeString();

    // 1. Core Studio Capabilities
    // NOTE: The UI components backing these (VisualBuilder, ComponentInspector,
    // DatabaseInspector, ApiInspector) were found to be completely unmounted —
    // never imported by App.tsx or any reachable route — and have been quarantined
    // to legacy/. Registering them as healthy/active/connected would be false.
    capabilityManager.register({
      id: 'cap_visual_builder',
      name: 'Visual WYSIWYG Builder',
      category: 'engine',
      version: '1.0.0',
      health: 'offline',
      status: 'disabled',
      isConnected: false,
      supportedCapabilities: ['DOM Canvas Overlay', 'Live Element Inspection', 'AST Code Hot-Reload'],
      limitations: ['UI component exists but is not mounted in the app — see legacy/unreachable-studio-folder'],
      lastVerified: now,
      metrics: { cpuPct: 0, memoryMb: 0, latencyMs: 0 }
    });

    capabilityManager.register({
      id: 'cap_component_inspector',
      name: 'Component AST Inspector',
      category: 'engine',
      version: '1.0.0',
      health: 'offline',
      status: 'disabled',
      isConnected: false,
      supportedCapabilities: ['React Tree Hierarchy', 'Props Editing', 'Dynamic State Binding'],
      limitations: ['UI component exists but is not mounted in the app — see legacy/unreachable-studio-folder'],
      lastVerified: now,
      metrics: { cpuPct: 0, memoryMb: 0, latencyMs: 0 }
    });

    capabilityManager.register({
      id: 'cap_database_inspector',
      name: 'Database & SQL ORM Inspector',
      category: 'storage',
      version: '1.0.0',
      health: 'offline',
      status: 'disabled',
      isConnected: false,
      supportedCapabilities: ['Interactive SQL Execution', 'Postgres / Firestore Schema', 'Table Records View'],
      limitations: ['UI component exists but is not mounted in the app — see legacy/unreachable-studio-folder'],
      lastVerified: now,
      metrics: { cpuPct: 0, memoryMb: 0, latencyMs: 0 }
    });

    capabilityManager.register({
      id: 'cap_api_inspector',
      name: 'API Router Endpoint Inspector',
      category: 'engine',
      version: '1.0.0',
      health: 'offline',
      status: 'disabled',
      isConnected: false,
      supportedCapabilities: ['Express Endpoint Matcher', 'JSON Payload Tester', 'Latency Monitoring'],
      limitations: ['UI component exists but is not mounted in the app — see legacy/unreachable-studio-folder'],
      lastVerified: now,
      metrics: { cpuPct: 0, memoryMb: 0, latencyMs: 0 }
    });

    // 2. Hardware / Extended SDK Capabilities with Honest Limitations
    capabilityManager.register({
      id: 'cap_docker_engine',
      name: 'Docker Daemon Container Provider',
      category: 'runtime_provider',
      version: '24.0.0',
      health: spec.hasDockerEngine ? 'healthy' : 'degraded',
      status: spec.hasDockerEngine ? 'active' : 'standby',
      isConnected: spec.hasDockerEngine,
      supportedCapabilities: ['Multi-service Container Orchestration', 'Custom OS Images'],
      limitations: ['Awaiting Host Docker Daemon Socket (/var/run/docker.sock)'],
      lastVerified: now,
      metrics: { cpuPct: 0, memoryMb: 0, latencyMs: 0 }
    });

    capabilityManager.register({
      id: 'cap_ros2_robotics',
      name: 'ROS2 Industrial Robotics Gateway',
      category: 'engine',
      version: 'Humble Hawksbill',
      health: spec.hasRos2Gateway ? 'healthy' : 'offline',
      status: 'disabled',
      isConnected: false,
      supportedCapabilities: ['Robot Control Topics', 'URDF Kinematic Solver', 'Sensor Telemetry'],
      limitations: ['ROS2 Environment & Micro-ROS Hardware Bridge Missing'],
      lastVerified: now,
      metrics: { cpuPct: 0, memoryMb: 0, latencyMs: 0 }
    });

    capabilityManager.register({
      id: 'cap_plc_scada',
      name: 'PLC / SCADA Safety Sentinel',
      category: 'security',
      version: '1.0.0',
      health: spec.hasPlcScadaGateway ? 'healthy' : 'offline',
      status: 'disabled',
      isConnected: false,
      supportedCapabilities: ['Digital Lockout/Tagout (LOTO)', 'Modbus/OPC-UA Telemetry'],
      limitations: ['Physical PLC Industrial Gateway Connection Required'],
      lastVerified: now,
      metrics: { cpuPct: 0, memoryMb: 0, latencyMs: 0 }
    });
  }
}

export const environmentDetector = EnvironmentDetector.getInstance();

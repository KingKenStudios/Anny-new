/**
 * ANNY — INTEGRATION REGISTRY (PHASE 30)
 * Central subsystem registry tracking Version, Health, Dependencies,
 * Capabilities, Emitted Events, and Status for all OS components.
 */

import { systemBus } from './systemBus';

export interface RegisteredSubsystem {
  id: string;
  name: string;
  version: string;
  health: 'healthy' | 'degraded' | 'critical' | 'offline';
  status: 'online' | 'standby' | 'active' | 'disabled';
  dependencies: string[];
  capabilities: string[];
  emittedEvents: string[];
  lastRegistered: string;
}

export class IntegrationRegistry {
  private static instance: IntegrationRegistry;
  private subsystems: Map<string, RegisteredSubsystem> = new Map();
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.autoRegisterSubsystems();
  }

  public static getInstance(): IntegrationRegistry {
    if (!IntegrationRegistry.instance) {
      IntegrationRegistry.instance = new IntegrationRegistry();
    }
    return IntegrationRegistry.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('[IntegrationRegistry Error]', e); }
    });
  }

  private autoRegisterSubsystems(): void {
    const now = new Date().toLocaleTimeString();

    this.register({
      id: 'subsystem_vfs',
      name: 'Virtual FileSystem (VFS)',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      dependencies: ['LocalStorage'],
      capabilities: ['In-Memory Tree', 'Storage Sync', 'AST Diff'],
      emittedEvents: ['FilesGenerated', 'WorkspaceCreated'],
      lastRegistered: now
    });

    this.register({
      id: 'subsystem_workspace',
      name: 'Workspace Manager',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      dependencies: ['VFS'],
      capabilities: ['Lightweight bracket-structure validation (not a full AST/compiler)', 'Workspace isolation'],
      emittedEvents: ['WorkspaceOpened', 'BuildStarted'],
      lastRegistered: now
    });

    this.register({
      id: 'subsystem_eabp',
      name: 'Enterprise Autonomous Builder Platform',
      version: '1.0.0',
      health: 'degraded',
      status: 'standby',
      dependencies: ['VFS', 'Workspace', 'IntentRouter'],
      capabilities: ['Pipeline orchestration', 'Requirements extraction (verification varies)', 'Repair planning; actual edits require authorized transactions'],
      emittedEvents: ['ProjectGenerated', 'BuildCompleted', 'RepairStarted'],
      lastRegistered: now
    });

    this.register({
      id: 'subsystem_runtime_bridge',
      name: 'Runtime Bridge & Capability Manager',
      version: '1.0.0',
      health: 'degraded',
      status: 'standby',
      dependencies: [],
      capabilities: ['Runtime adapter selection metadata', 'Preview configuration selection', 'No verified process-spawning runtime adapter is connected'],
      emittedEvents: ['RuntimeAdapterUnavailable', 'RuntimeStateChanged'],
      lastRegistered: now
    });

    this.register({
      id: 'subsystem_intent_router',
      name: 'Pre-LLM Intent Router',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      dependencies: ['AI Brain'],
      capabilities: ['15 Execution Modes', 'Code Dump Shield'],
      emittedEvents: ['ModelSelected'],
      lastRegistered: now
    });

    this.register({
      id: 'subsystem_system_bus',
      name: 'Enterprise System Bus',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      dependencies: [],
      capabilities: ['Event Bus', 'Command Bus', 'Query Bus', 'Log Bus'],
      emittedEvents: ['SubsystemRegistered', 'SystemHealthCheck'],
      lastRegistered: now
    });

    this.register({
      id: 'subsystem_security',
      name: 'Security Sentinel Heuristics',
      version: '1.0.0',
      health: 'degraded',
      status: 'standby',
      dependencies: [],
      capabilities: ['Heuristic prompt-pattern checks', 'Basic credential redaction', 'Prompt-pattern heuristics only; no complete prompt-injection defense or sandbox'],
      emittedEvents: ['SecurityAlert'],
      lastRegistered: now
    });
  }

  public register(subsystem: RegisteredSubsystem): void {
    this.subsystems.set(subsystem.id, subsystem);
    systemBus.publish('SubsystemRegistered', 'IntegrationRegistry', {
      subsystemId: subsystem.id,
      name: subsystem.name
    });
    this.notify();
  }

  public getAll(): RegisteredSubsystem[] {
    return Array.from(this.subsystems.values());
  }

  public getById(id: string): RegisteredSubsystem | undefined {
    return this.subsystems.get(id);
  }
}

export const integrationRegistry = IntegrationRegistry.getInstance();

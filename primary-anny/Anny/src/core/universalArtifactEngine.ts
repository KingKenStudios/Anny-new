/**
 * ANNY — UNIVERSAL ARTIFACT ENGINE (UAE v1.0)
 * Central repository & graph manager for all engineering artifacts generated across Anny:
 * Web Apps, Mobile, Desktop, APIs, Databases, Documents, Images, 3D/CAD Assets, PLC Logic, ROS2 Packages, AI Models.
 */

import { systemBus } from './systemBus';
import { capabilityManager } from './capabilityManager';
import { integrationRegistry } from './integrationRegistry';
import { globalStateManager } from './globalStateManager';

export type ArtifactType =
  | 'REACT_APP'
  | 'HTML_WEBSITE'
  | 'NEXT_JS'
  | 'FLUTTER'
  | 'REACT_NATIVE'
  | 'ELECTRON'
  | 'TAURI'
  | 'NODE_API'
  | 'PYTHON_API'
  | 'DATABASE'
  | 'SQL'
  | 'FIRESTORE'
  | 'DOCUMENTATION'
  | 'MARKDOWN'
  | 'PDF'
  | 'IMAGE'
  | 'LOGO'
  | 'ICON'
  | 'VIDEO'
  | 'AUDIO'
  | 'GLB_3D'
  | 'STL_CAD'
  | 'OBJ_3D'
  | 'PLC_PROGRAM'
  | 'ROS2_PACKAGE'
  | 'FIRMWARE'
  | 'AI_MODEL'
  | 'DATASET';

export type PreviewType =
  | 'vite_iframe'
  | 'browser_preview'
  | 'image_viewer'
  | 'vector_viewer'
  | 'markdown_viewer'
  | 'pdf_viewer'
  | 'json_inspector'
  | 'spreadsheet_viewer'
  | 'media_player'
  | '3d_viewer'
  | 'cad_viewer'
  | 'emulator_preview'
  | 'simulation_view'
  | 'industrial_simulator'
  | 'code_editor';

export interface ArtifactRelationship {
  artifactId: string;
  relationType: 'depends_on' | 'generates' | 'renders' | 'imports' | 'deploys';
}

export interface Artifact {
  id: string;
  name: string;
  type: ArtifactType;
  version: string;
  metadata: Record<string, any>;
  dependencies: string[];
  workspaceLocation: string;
  previewType: PreviewType;
  executionState: 'IDLE' | 'RUNNING' | 'BUILDING' | 'ERROR' | 'COMPLETED';
  verificationStatus: 'VERIFIED' | 'AVAILABLE' | 'AWAITING_RUNTIME' | 'LIMITED' | 'HARDWARE_REQUIRED';
  auditStatus: 'PASSED' | 'WARNING' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  relationships: ArtifactRelationship[];
  checkpoints: string[];
}

export interface ArtifactGraph {
  nodes: Artifact[];
  edges: Array<{ source: string; target: string; label: string }>;
}

export class UniversalArtifactEngine {
  private static instance: UniversalArtifactEngine;
  private artifacts: Map<string, Artifact> = new Map();
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.registerWithOS();
    this.seedDefaultArtifacts();
  }

  public static getInstance(): UniversalArtifactEngine {
    if (!UniversalArtifactEngine.instance) {
      UniversalArtifactEngine.instance = new UniversalArtifactEngine();
    }
    return UniversalArtifactEngine.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('[ArtifactEngine Notification Error]', e); }
    });
  }

  private registerWithOS(): void {
    integrationRegistry.register({
      id: 'subsystem_artifact_engine',
      name: 'Universal Artifact Engine (UAE v1.0)',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      dependencies: ['SystemBus', 'CapabilityManager', 'IntegrationRegistry', 'GlobalStateManager'],
      capabilities: [
        'Universal Engineering Artifact Lifecycle Management',
        '28 Artifact Types Supported (Code, Assets, CAD, PLC, ROS2, Models)',
        'Artifact Relationship & Lineage Graph Engine',
        'Automated Preview Routing Map'
      ],
      emittedEvents: ['ArtifactCreated', 'ArtifactUpdated'],
      lastRegistered: new Date().toLocaleTimeString()
    });

    capabilityManager.register({
      id: 'cap_artifact_engine',
      name: 'Universal Artifact Management Engine',
      category: 'engine',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      isConnected: true,
      supportedCapabilities: [
        'Multi-format Artifact Indexing',
        'Artifact Dependency Graphing',
        'Versioned Asset Checkpoints',
        'Cross-discipline Engineering Metadata'
      ],
      limitations: [],
      lastVerified: new Date().toLocaleTimeString(),
      metrics: { cpuPct: 0.3, memoryMb: 18.0, latencyMs: 2 }
    });

    systemBus.publish('SubsystemRegistered', 'UniversalArtifactEngine', {
      subsystemId: 'subsystem_artifact_engine',
      timestamp: new Date().toLocaleTimeString()
    });
  }

  private seedDefaultArtifacts(): void {
    const mainApp: Artifact = {
      id: 'art_main_app',
      name: 'ANNY Master Application',
      type: 'REACT_APP',
      version: '1.0.0',
      metadata: { framework: 'React 18 + Vite', runtime: 'Node.js', entry: 'src/App.tsx' },
      dependencies: ['lucide-react', 'express', 'motion', 'tailwindcss'],
      workspaceLocation: 'src/App.tsx',
      previewType: 'vite_iframe',
      executionState: 'RUNNING',
      verificationStatus: 'VERIFIED',
      auditStatus: 'PASSED',
      createdAt: new Date().toLocaleTimeString(),
      updatedAt: new Date().toLocaleTimeString(),
      relationships: [],
      checkpoints: ['chk_init']
    };

    const logoAsset: Artifact = {
      id: 'art_logo_png',
      name: 'ANNY Neural Logo',
      type: 'LOGO',
      version: '1.0.0',
      metadata: { format: 'PNG', resolution: '512x512', transparent: true },
      dependencies: [],
      workspaceLocation: 'public/logo.png',
      previewType: 'image_viewer',
      executionState: 'COMPLETED',
      verificationStatus: 'VERIFIED',
      auditStatus: 'PASSED',
      createdAt: new Date().toLocaleTimeString(),
      updatedAt: new Date().toLocaleTimeString(),
      relationships: [{ artifactId: 'art_main_app', relationType: 'renders' }],
      checkpoints: ['chk_init']
    };

    const docSpec: Artifact = {
      id: 'art_constitution_doc',
      name: 'ANNY Master Constitution',
      type: 'MARKDOWN',
      version: '1.0.0',
      metadata: { format: 'Markdown', length: '16 Core Subsystems' },
      dependencies: [],
      workspaceLocation: 'AGENTS.md',
      previewType: 'markdown_viewer',
      executionState: 'COMPLETED',
      verificationStatus: 'VERIFIED',
      auditStatus: 'PASSED',
      createdAt: new Date().toLocaleTimeString(),
      updatedAt: new Date().toLocaleTimeString(),
      relationships: [{ artifactId: 'art_main_app', relationType: 'depends_on' }],
      checkpoints: ['chk_init']
    };

    this.artifacts.set(mainApp.id, mainApp);
    this.artifacts.set(logoAsset.id, logoAsset);
    this.artifacts.set(docSpec.id, docSpec);
  }

  public registerArtifact(spec: Partial<Artifact> & { name: string; type: ArtifactType; workspaceLocation: string }): Artifact {
    const id = spec.id || `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const artifact: Artifact = {
      id,
      name: spec.name,
      type: spec.type,
      version: spec.version || '1.0.0',
      metadata: spec.metadata || {},
      dependencies: spec.dependencies || [],
      workspaceLocation: spec.workspaceLocation,
      previewType: spec.previewType || this.inferPreviewType(spec.type),
      executionState: spec.executionState || 'COMPLETED',
      verificationStatus: spec.verificationStatus || 'VERIFIED',
      auditStatus: spec.auditStatus || 'PASSED',
      createdAt: new Date().toLocaleTimeString(),
      updatedAt: new Date().toLocaleTimeString(),
      relationships: spec.relationships || [],
      checkpoints: spec.checkpoints || [`chk_${Date.now()}`]
    };

    this.artifacts.set(id, artifact);

    systemBus.publish('ArtifactCreated', 'UniversalArtifactEngine', {
      artifactId: id,
      name: artifact.name,
      type: artifact.type,
      workspaceLocation: artifact.workspaceLocation
    });

    this.notify();
    return artifact;
  }

  public updateArtifact(id: string, updates: Partial<Artifact>): Artifact | undefined {
    const existing = this.artifacts.get(id);
    if (!existing) return undefined;

    const updated: Artifact = {
      ...existing,
      ...updates,
      updatedAt: new Date().toLocaleTimeString()
    };

    this.artifacts.set(id, updated);

    systemBus.publish('ArtifactUpdated', 'UniversalArtifactEngine', {
      artifactId: id,
      updates
    });

    this.notify();
    return updated;
  }

  public getArtifacts(): Artifact[] {
    return Array.from(this.artifacts.values());
  }

  public getArtifactById(id: string): Artifact | undefined {
    return this.artifacts.get(id);
  }

  public getArtifactsByType(type: ArtifactType): Artifact[] {
    return this.getArtifacts().filter(a => a.type === type);
  }

  public getArtifactGraph(): ArtifactGraph {
    const nodes = this.getArtifacts();
    const edges: Array<{ source: string; target: string; label: string }> = [];

    nodes.forEach(node => {
      node.relationships.forEach(rel => {
        edges.push({
          source: node.id,
          target: rel.artifactId,
          label: rel.relationType
        });
      });
    });

    return { nodes, edges };
  }

  public inferPreviewType(type: ArtifactType): PreviewType {
    switch (type) {
      case 'REACT_APP':
      case 'HTML_WEBSITE':
      case 'NEXT_JS':
        return 'vite_iframe';
      case 'IMAGE':
      case 'LOGO':
      case 'ICON':
        return 'image_viewer';
      case 'DOCUMENTATION':
      case 'MARKDOWN':
        return 'markdown_viewer';
      case 'PDF':
        return 'pdf_viewer';
      case 'DATABASE':
      case 'SQL':
      case 'FIRESTORE':
        return 'json_inspector';
      case 'GLB_3D':
      case 'OBJ_3D':
        return '3d_viewer';
      case 'STL_CAD':
        return 'cad_viewer';
      case 'PLC_PROGRAM':
      case 'ROS2_PACKAGE':
        return 'industrial_simulator';
      case 'FLUTTER':
      case 'REACT_NATIVE':
      case 'ELECTRON':
      case 'TAURI':
        return 'emulator_preview';
      case 'VIDEO':
      case 'AUDIO':
        return 'media_player';
      default:
        return 'code_editor';
    }
  }
}

export const universalArtifactEngine = UniversalArtifactEngine.getInstance();

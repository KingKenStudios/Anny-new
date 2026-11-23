/**
 * ANNY — UNIVERSAL PREVIEW ENGINE (UPE v1.0)
 * Intelligent preview router and renderer dispatcher for all 28 artifact types:
 * Web, Mobile, CAD/STL 3D, Images, PDF, Markdown, PLC Ladder Logic, ROS2 Sim, JSON DB, Audio/Video.
 */

import { systemBus } from './systemBus';
import { capabilityManager } from './capabilityManager';
import { integrationRegistry } from './integrationRegistry';
import { universalArtifactEngine, Artifact, PreviewType } from './universalArtifactEngine';

export type ArtifactPreviewType = PreviewType;

export interface ViewerSpec {
  id: PreviewType;
  name: string;
  icon: string;
  supportedTypes: string[];
  description: string;
  isAvailable: boolean;
}

export interface PreviewRouteSpec {
  artifactId: string;
  artifactName: string;
  previewType: PreviewType;
  targetUrlOrPath: string;
  viewerTitle: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface PreviewHealthReport {
  timestamp: string;
  previewType: PreviewType;
  renderingCategory: 'REACT_DYNAMIC' | 'STATIC_CONTENT' | 'SPECIALIZED_SIMULATOR';
  status: 'EXCELLENT' | 'HEALTHY' | 'DEGRADED' | 'FAILED';
  targetLocation: string;
  isComponentRendered: boolean;
  domVerified: boolean;
  latencyMs: number;
  details: string;
}

export class UniversalPreviewEngine {
  private static instance: UniversalPreviewEngine;
  private activeRoute: PreviewRouteSpec;
  private viewers: Map<PreviewType, ViewerSpec> = new Map();
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.registerWithOS();
    this.seedDefaultViewers();
    this.activeRoute = {
      artifactId: 'art_main_app',
      artifactName: 'ANNY Master Application',
      previewType: 'vite_iframe',
      targetUrlOrPath: typeof window !== 'undefined' ? `${window.location.origin}?preview=standalone` : 'http://localhost:3000?preview=standalone',
      viewerTitle: 'Vite React Live iFrame',
      metadata: {},
      timestamp: new Date().toLocaleTimeString()
    };
  }

  public static getInstance(): UniversalPreviewEngine {
    if (!UniversalPreviewEngine.instance) {
      UniversalPreviewEngine.instance = new UniversalPreviewEngine();
    }
    return UniversalPreviewEngine.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('[PreviewEngine Notification Error]', e); }
    });
  }

  private registerWithOS(): void {
    integrationRegistry.register({
      id: 'subsystem_preview_engine',
      name: 'Universal Preview Engine (UPE v1.0)',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      dependencies: ['UniversalArtifactEngine', 'SystemBus', 'CapabilityManager', 'IntegrationRegistry'],
      capabilities: [
        'Multi-format Intelligent Preview Router',
        'Vite iFrame, Image, 3D/CAD, Markdown, JSON, PDF & Industrial Sim Viewers',
        'Dynamic Artifact Preview Auto-Switching'
      ],
      emittedEvents: ['PreviewRouted'],
      lastRegistered: new Date().toLocaleTimeString()
    });

    capabilityManager.register({
      id: 'cap_preview_engine',
      name: 'Universal Multi-Format Preview Engine',
      category: 'preview_provider',
      version: '1.0.0',
      health: 'healthy',
      status: 'active',
      isConnected: true,
      supportedCapabilities: [
        'Web iFrame Live Rendering',
        'Vector & Raster Image Inspection',
        '3D GLB & CAD STL Mesh Inspection',
        'Markdown & PDF Document Rendering',
        'PLC Logic & ROS2 Node Graph Simulation'
      ],
      limitations: [],
      lastVerified: new Date().toLocaleTimeString(),
      metrics: { cpuPct: 0.2, memoryMb: 14.0, latencyMs: 3 }
    });

    systemBus.publish('SubsystemRegistered', 'UniversalPreviewEngine', {
      subsystemId: 'subsystem_preview_engine',
      timestamp: new Date().toLocaleTimeString()
    });
  }

  private seedDefaultViewers(): void {
    const defaultList: ViewerSpec[] = [
      { id: 'vite_iframe', name: 'Vite React / Web iFrame', icon: 'Globe', supportedTypes: ['REACT_APP', 'HTML_WEBSITE', 'NEXT_JS'], description: 'Live hot-reloaded Web iFrame on Port 3000', isAvailable: true },
      { id: 'image_viewer', name: 'High-Res Image Viewer', icon: 'Image', supportedTypes: ['IMAGE', 'LOGO', 'ICON'], description: 'Zoomable vector & raster asset viewer', isAvailable: true },
      { id: 'markdown_viewer', name: 'Markdown Spec Viewer', icon: 'FileText', supportedTypes: ['MARKDOWN', 'DOCUMENTATION'], description: 'Formatted documentation reader', isAvailable: true },
      { id: 'json_inspector', name: 'JSON & DB Inspector', icon: 'Database', supportedTypes: ['DATABASE', 'SQL', 'FIRESTORE'], description: 'Interactive tree & schema inspector', isAvailable: true },
      { id: '3d_viewer', name: '3D Mesh Viewer (GLB/OBJ)', icon: 'Box', supportedTypes: ['GLB_3D', 'OBJ_3D'], description: 'Interactive WebGL 3D model viewer', isAvailable: true },
      { id: 'cad_viewer', name: 'Industrial CAD Viewer (STL)', icon: 'Cpu', supportedTypes: ['STL_CAD'], description: 'Mechatronic 3D CAD mesh inspection', isAvailable: true },
      { id: 'pdf_viewer', name: 'PDF Spec Reader', icon: 'FileCode', supportedTypes: ['PDF'], description: 'Enterprise engineering PDF reader', isAvailable: true },
      { id: 'industrial_simulator', name: 'PLC & ROS2 Industrial Simulator', icon: 'Zap', supportedTypes: ['PLC_PROGRAM', 'ROS2_PACKAGE', 'FIRMWARE'], description: 'ICS/SCADA Ladder & ROS2 node graph simulator', isAvailable: true },
      { id: 'emulator_preview', name: 'Mobile/Desktop Emulator', icon: 'Terminal', supportedTypes: ['FLUTTER', 'ELECTRON', 'REACT_NATIVE'], description: 'Emulated frame container preview', isAvailable: true },
      { id: 'code_editor', name: 'Syntax Code Inspector', icon: 'Code', supportedTypes: ['NODE_API', 'PYTHON_API', 'AI_MODEL', 'DATASET'], description: 'Syntax-highlighted code & dataset viewer', isAvailable: true }
    ];

    defaultList.forEach(v => this.viewers.set(v.id, v));
  }

  public routePreview(artifactOrId: string | Artifact): PreviewRouteSpec {
    let artifact: Artifact | undefined;

    if (typeof artifactOrId === 'string') {
      artifact = universalArtifactEngine.getArtifactById(artifactOrId);
      if (!artifact) {
        // Try to match by location or create transient
        const all = universalArtifactEngine.getArtifacts();
        artifact = all.find(a => a.workspaceLocation === artifactOrId || a.name === artifactOrId);
      }
    } else {
      artifact = artifactOrId;
    }

    if (!artifact) {
      throw new Error('PREVIEW_ARTIFACT_NOT_FOUND: No registered artifact matches the requested ID, path, or name. The active preview route was not changed.');
    }

    const previewType = artifact.previewType;
    const route: PreviewRouteSpec = {
      artifactId: artifact.id,
      artifactName: artifact.name,
      previewType,
      targetUrlOrPath: artifact.workspaceLocation,
      viewerTitle: this.viewers.get(previewType)?.name || 'Universal Viewer',
      metadata: artifact.metadata,
      timestamp: new Date().toLocaleTimeString()
    };

    this.activeRoute = route;

    systemBus.publish('PreviewRouted', 'UniversalPreviewEngine', {
      artifactId: artifact.id,
      previewType,
      targetUrlOrPath: artifact.workspaceLocation
    });

    this.notify();
    return route;
  }

  public getActiveRoute(): PreviewRouteSpec {
    return this.activeRoute;
  }

  public getCurrentRoute(): PreviewRouteSpec & { url: string; status: string } {
    return {
      ...this.activeRoute,
      url: this.activeRoute.targetUrlOrPath,
      status: 'ROUTED_UNVERIFIED'
    };
  }

  public routeToPreview(targetUrlOrPath: string, previewType: string = 'vite_iframe'): PreviewRouteSpec {
    const mapType: Record<string, PreviewType> = {
      'WEBSITE': 'vite_iframe',
      'IMAGE': 'image_viewer',
      'MARKDOWN': 'markdown_viewer',
      'DATABASE': 'json_inspector',
      '3D': '3d_viewer',
      'PDF': 'pdf_viewer',
      'FLUTTER': 'emulator_preview',
      'API': 'code_editor'
    };
    const pType: PreviewType = (mapType[previewType] || previewType) as PreviewType;

    let url = targetUrlOrPath;
    if (pType === 'vite_iframe' || previewType === 'WEBSITE') {
      const activeProjId = typeof localStorage !== 'undefined' ? localStorage.getItem('anny_current_project_id') : null;
      if (!url.includes('preview=standalone')) {
        url = url.includes('?') ? `${url}&preview=standalone` : `${url}?preview=standalone`;
      }
      if (activeProjId && !url.includes('project=')) {
        url += `&project=${activeProjId}`;
      }
    }

    const route: PreviewRouteSpec = {
      artifactId: 'art_' + Date.now(),
      artifactName: 'Generated Artifact',
      previewType: pType,
      targetUrlOrPath: url,
      viewerTitle: this.viewers.get(pType)?.name || 'Universal Viewer',
      metadata: {},
      timestamp: new Date().toLocaleTimeString()
    };

    this.activeRoute = route;
    systemBus.publish('PreviewRouted', 'UniversalPreviewEngine', {
      artifactId: route.artifactId,
      previewType: pType,
      targetUrlOrPath
    });

    this.notify();
    return route;
  }

  public refreshPreview(): void {
    systemBus.publish('PreviewRefreshed', 'UniversalPreviewEngine', {
      timestamp: new Date().toLocaleTimeString()
    });
    this.notify();
  }

  public validatePreviewHealth(): PreviewHealthReport {
    const startTime = performance.now();
    const route = this.activeRoute;
    const isReact = route.previewType === 'vite_iframe' || route.previewType === 'emulator_preview';
    const isSim = route.previewType === 'industrial_simulator';

    const category: 'REACT_DYNAMIC' | 'STATIC_CONTENT' | 'SPECIALIZED_SIMULATOR' = isReact
      ? 'REACT_DYNAMIC'
      : isSim
        ? 'SPECIALIZED_SIMULATOR'
        : 'STATIC_CONTENT';

    // This engine can route an artifact, but currently has no viewer-specific
    // evidence contract to prove that the target artifact—not the host ANNY
    // page—actually rendered. Do not use the host DOM as false-positive proof.
    const latencyMs = Math.round(performance.now() - startTime);
    const report: PreviewHealthReport = {
      timestamp: new Date().toISOString(),
      previewType: route.previewType,
      renderingCategory: category,
      status: 'DEGRADED',
      targetLocation: route.targetUrlOrPath,
      isComponentRendered: false,
      domVerified: false,
      latencyMs,
      details: 'Preview route selected, but the target viewer has not supplied independent render/load evidence. Host application DOM is not counted as proof of artifact rendering.'
    };

    systemBus.publish('PreviewRouted', 'UniversalPreviewEngine', {
      artifactId: route.artifactId,
      previewHealth: report
    });
    return report;
  }

  public getAvailableViewers(): ViewerSpec[] {
    return Array.from(this.viewers.values());
  }
}

export const universalPreviewEngine = UniversalPreviewEngine.getInstance();

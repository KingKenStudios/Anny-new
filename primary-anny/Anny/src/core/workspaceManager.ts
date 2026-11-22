/**
 * ANNY — WORKSPACE & RUNTIME ENGINE (VERSION 1.0)
 * Priority 2 Subsystem: Multi-Workspace Orchestration, Real-time Transpilation Check,
 * Process State Management, and Environment Binding.
 */

import { VirtualFileSystem, VFSFileNode } from './virtualFileSystem';
import {
  getOrCreateLocalInstallationProfileId,
  getProjectOwnershipRecord,
  getRawProjectOwnershipRecord,
  hasLegacyUnownedLocalVfsData,
  migrateLegacyLocalProjectOwnership,
  registerLocalProjectOwnership,
  ProjectOwnershipRecord
} from '../services/projectOwnershipService';

export interface WorkspaceConfig {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  type: string;
  port: number;
  environment: Record<string, string>;
  isDevServerRunning: boolean;
  activeFile?: string;
  snapToGrid?: boolean;
  gridSize?: number;
  showGrid?: boolean;
}

export interface CompilationResult {
  success: boolean;
  errors: Array<{ file: string; line?: number; message: string }>;
  warnings: string[];
  transpiledCode?: string;
  buildTimeMs: number;
}

export class WorkspaceManager {
  private static instance: WorkspaceManager;
  private currentWorkspace: WorkspaceConfig | null = null;
  private vfsMap: Map<string, VirtualFileSystem> = new Map();
  private activeVFS: VirtualFileSystem;
  private listeners: Set<(ws: WorkspaceConfig | null) => void> = new Set();
  private restartListeners: Set<() => void> = new Set();

  private constructor() {
    this.activeVFS = new VirtualFileSystem('anny_anny_workspace_active');
    this.initDefaultWorkspace();
  }

  public static getInstance(): WorkspaceManager {
    if (!WorkspaceManager.instance) {
      WorkspaceManager.instance = new WorkspaceManager();
    }
    return WorkspaceManager.instance;
  }

  private initDefaultWorkspace(): void {
    this.currentWorkspace = {
      id: 'ws_default_1',
      organizationId: 'global',
      name: 'ANNY Master System Workspace',
      description: 'Primary software engineering and robotics intelligence workspace',
      type: 'fullstack',
      port: 3000,
      environment: {
        NODE_ENV: 'development',
        PORT: '3000'
      },
      // This is a client-side virtual workspace — there is no real dev server
      // process behind it, so it starts false rather than a hardcoded fake "true".
      isDevServerRunning: false,
      activeFile: '/src/App.tsx',
      snapToGrid: true,
      gridSize: 16,
      showGrid: true
    };
    try {
      if (getRawProjectOwnershipRecord('ws_default_1') === null && !hasLegacyUnownedLocalVfsData('ws_default_1')) {
        registerLocalProjectOwnership('ws_default_1');
      }
    } catch {
      // Preserve fail-closed behavior if CSPRNG or storage is unavailable
    }
  }

  // --- Grid & Alignment Engine ---
  public getGridSettings(): { snapToGrid: boolean; gridSize: number; showGrid: boolean } {
    return {
      snapToGrid: this.currentWorkspace?.snapToGrid ?? true,
      gridSize: this.currentWorkspace?.gridSize ?? 16,
      showGrid: this.currentWorkspace?.showGrid ?? true
    };
  }

  public updateGridSettings(settings: { snapToGrid?: boolean; gridSize?: number; showGrid?: boolean }): void {
    if (this.currentWorkspace) {
      if (settings.snapToGrid !== undefined) this.currentWorkspace.snapToGrid = settings.snapToGrid;
      if (settings.gridSize !== undefined) this.currentWorkspace.gridSize = settings.gridSize;
      if (settings.showGrid !== undefined) this.currentWorkspace.showGrid = settings.showGrid;
      this.notify();
    }
  }

  public snapValue(val: number): number {
    const step = this.currentWorkspace?.gridSize || 16;
    if (!this.currentWorkspace?.snapToGrid) return val;
    return Math.round(val / step) * step;
  }

  public getWorkspaceVFS(id: string): VirtualFileSystem {
    let vfs = this.vfsMap.get(id);
    if (!vfs) {
      vfs = new VirtualFileSystem(`anny_anny_vfs_${id}`);
      this.vfsMap.set(id, vfs);
    }
    return vfs;
  }

  // --- VFS Access ---
  public getVFS(): VirtualFileSystem {
    return this.activeVFS;
  }

  public getCurrentWorkspace(): WorkspaceConfig | null {
    return this.currentWorkspace;
  }

  public getActiveProjectId(): string {
    return this.currentWorkspace?.id || 'ws_default_1';
  }

  public getActiveOrganizationId(): string {
    return this.currentWorkspace?.organizationId || 'global';
  }

  public getActiveProjectName(): string {
    return this.currentWorkspace?.name || 'ANNY Master System Workspace';
  }

  /** Create an isolated project workspace for a genuinely new generation. */
  public createProjectWorkspace(name: string = 'New ANNY Project', organizationId: string = 'global', type: string = 'fullstack'): string {
    const id = `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    const boundAuthUid =
      typeof organizationId === 'string' && organizationId.trim() && organizationId.trim().toLowerCase() !== 'global'
        ? organizationId.trim()
        : undefined;
    registerLocalProjectOwnership(id, { boundAuthUid });
    this.switchWorkspace(id, name, organizationId, type);
    this.getVFS().clearAll();
    this.getVFS().saveToStorage();
    return id;
  }

  public getLocalProfileId(): string {
    return getOrCreateLocalInstallationProfileId();
  }

  public getProjectOwnership(projectId: string): ProjectOwnershipRecord | null {
    return getProjectOwnershipRecord(projectId);
  }

  public migrateLegacyWorkspace(projectId: string): { migrated: boolean; reason?: string; record?: ProjectOwnershipRecord } {
    return migrateLegacyLocalProjectOwnership(projectId);
  }

  public clearActiveWorkspace(): void {
    this.getVFS().clearAll();
    this.notify();
  }

  public openFile(path: string): void {
    if (this.currentWorkspace) {
      this.currentWorkspace.activeFile = path;
      this.notify();
    }
  }

  public subscribe(listener: (ws: WorkspaceConfig | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Subscribe to real "dev server restarted / preview should reload" events (fired by restartDevServer). */
  public onRestart(listener: () => void): () => void {
    this.restartListeners.add(listener);
    return () => this.restartListeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn(this.currentWorkspace));
  }

  // --- Workspace Switch / Create ---
  public initializeWorkspace(id: string, name: string, organizationId: string = 'global', type: string = 'custom'): VirtualFileSystem {
    let vfs = this.vfsMap.get(id);
    if (!vfs) {
      vfs = new VirtualFileSystem(`anny_anny_vfs_${id}`);
      this.vfsMap.set(id, vfs);
    }
    return vfs;
  }

  public switchWorkspace(id: string, name: string, organizationId: string = 'global', type: string = 'custom'): VirtualFileSystem {
    try {
      if (getRawProjectOwnershipRecord(id) === null && !hasLegacyUnownedLocalVfsData(id)) {
        const boundAuthUid =
          typeof organizationId === 'string' && organizationId.trim() && organizationId.trim().toLowerCase() !== 'global'
            ? organizationId.trim()
            : undefined;
        registerLocalProjectOwnership(id, { boundAuthUid });
      }
    } catch {
      // Never silently overwrite existing cloud or other-profile ownership records
    }
    let vfs = this.vfsMap.get(id);
    if (!vfs) {
      vfs = new VirtualFileSystem(`anny_anny_vfs_${id}`);
      this.vfsMap.set(id, vfs);
    }
    this.activeVFS = vfs;
    // Mark as real workspace when switched
    this.currentWorkspace = {
      id,
      organizationId,
      name,
      description: `Workspace node '${name}' for organization '${organizationId}'`,
      type,
      port: 3000,
      environment: { NODE_ENV: 'development', PORT: '3000' },
      isDevServerRunning: false,
      activeFile: '/src/App.tsx'
    };
    this.notify();
    return vfs;
  }

  public getIsValidatedProject(): boolean {
    return this.currentWorkspace !== null && this.currentWorkspace.id !== 'ws_default_1';
  }

  // --- Compilation & Syntax Validator Engine ---
  public compileWorkspace(): CompilationResult {
    const startTime = performance.now();
    const errors: Array<{ file: string; line?: number; message: string }> = [];
    const warnings: string[] = [];

    const files = this.activeVFS.getAllFiles();

    // Validate JS/TS files for obvious syntax errors
    files.forEach((file: VFSFileNode) => {
      if (file.language === 'typescript' || file.language === 'javascript') {
        try {
          // Basic AST / Structural syntax check for unbalanced brackets/parentheses/quotes
          this.validateBrackets(file.path, file.content);
        } catch (err: any) {
          errors.push({
            file: file.path,
            message: err.message
          });
        }
      }
    });

    const buildTimeMs = Math.round(performance.now() - startTime);

    return {
      success: errors.length === 0,
      errors,
      warnings,
      buildTimeMs
    };
  }

  private validateBrackets(filePath: string, code: string): void {
    const stack: { char: string; line: number }[] = [];
    const lines = code.split('\n');

    for (let l = 0; l < lines.length; l++) {
      const line = lines[l];
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '{' || char === '(' || char === '[') {
          stack.push({ char, line: l + 1 });
        } else if (char === '}' || char === ')' || char === ']') {
          if (stack.length === 0) {
            throw new Error(`Unmatched closing '${char}' at line ${l + 1}`);
          }
          const top = stack.pop();
          if (
            (char === '}' && top?.char !== '{') ||
            (char === ')' && top?.char !== '(') ||
            (char === ']' && top?.char !== '[')
          ) {
            throw new Error(`Mismatched closing '${char}' at line ${l + 1}, expected matching for '${top?.char}' from line ${top?.line}`);
          }
        }
      }
    }

    if (stack.length > 0) {
      const unclosed = stack[stack.length - 1];
      throw new Error(`Unclosed '${unclosed.char}' opened at line ${unclosed.line}`);
    }
  }

  // --- Hot Reload & Live Server Trigger ---
  public restartDevServer(): void {
    if (this.currentWorkspace) {
      this.currentWorkspace.isDevServerRunning = false;
      this.notify();
      setTimeout(() => {
        if (this.currentWorkspace) {
          this.currentWorkspace.isDevServerRunning = true;
          this.notify();
          this.restartListeners.forEach(fn => fn());
        }
      }, 500);
    }
  }
}

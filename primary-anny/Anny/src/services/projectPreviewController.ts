import { WorkspaceManager } from '../core/workspaceManager';
import { safeStorage } from '../lib/storage';
import { safeFetchJson } from '../lib/apiUtils';
import { auth } from '../lib/firebase';
import {
  registerCloudProjectOwnership,
  registerLocalProjectOwnership,
} from './projectOwnershipService';

export type ProjectBuildStatus = 'IDLE' | 'BUILDING' | 'READY' | 'FAILED';
export type ProjectPreviewStatus = 'IDLE' | 'STARTING' | 'RUNNING' | 'ERROR';

export interface ProjectBuildMetadata {
  projectId: string;
  name: string;
  version: number;
  projectType: string;
  fileCount: number;
  status: 'ready' | 'preview_starting' | 'failed';
  previewUrl?: string;
  previewId?: string;
  verificationScore?: number;
  isIncrementalEdit?: boolean;
  error?: string;
  updatedAt: string;
}

export interface ProjectPreviewControllerState {
  activeProjectId: string;
  projectName: string;
  version: number;
  projectType: string;
  files: Record<string, string>;
  buildStatus: ProjectBuildStatus;
  previewStatus: ProjectPreviewStatus;
  previewUrl?: string;
  previewId?: string;
  runtimeError: string | null;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  verificationScore?: number;
}

type ControllerListener = (state: ProjectPreviewControllerState) => void;

const SESSION_PROJECT_MAP_STORAGE_KEY = 'anny_session_project_map_v1';
const LAST_ACTIVE_PROJECT_STORAGE_KEY = 'anny_last_active_project_v1';

class ProjectPreviewController {
  private state: ProjectPreviewControllerState = {
    activeProjectId: '',
    projectName: 'anny-project',
    version: 1,
    projectType: 'website',
    files: {},
    buildStatus: 'IDLE',
    previewStatus: 'IDLE',
    previewUrl: undefined,
    previewId: undefined,
    runtimeError: null,
    hasUnsavedChanges: false,
    lastSavedAt: null,
    verificationScore: undefined,
  };

  private listeners = new Set<ControllerListener>();
  private sessionProjectMap = new Map<string, ProjectBuildMetadata>();

  constructor() {
    this.restorePersistedMappings();
  }

  private restorePersistedMappings(): void {
    try {
      const rawMap = safeStorage.getItem(SESSION_PROJECT_MAP_STORAGE_KEY);
      if (rawMap) {
        const parsed = JSON.parse(rawMap);
        if (parsed && typeof parsed === 'object') {
          for (const [sessionId, meta] of Object.entries(parsed)) {
            if (meta && typeof meta === 'object' && typeof (meta as any).projectId === 'string') {
              this.sessionProjectMap.set(sessionId, meta as ProjectBuildMetadata);
            }
          }
        }
      }
    } catch {
      // Ignore storage restoration errors
    }
  }

  private persistMappings(): void {
    try {
      const obj: Record<string, ProjectBuildMetadata> = {};
      for (const [sessionId, meta] of this.sessionProjectMap.entries()) {
        obj[sessionId] = meta;
      }
      safeStorage.setItem(SESSION_PROJECT_MAP_STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Ignore storage persistence errors
    }
  }

  public getState(): ProjectPreviewControllerState {
    return { ...this.state, files: { ...this.state.files } };
  }

  public subscribe(listener: ControllerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.warn('[ProjectPreviewController] Listener error:', err);
      }
    }
  }

  public ensureProjectOwnershipRegistered(projectId: string, ownerUserId?: string): void {
    const normalizedId = String(projectId || '').trim();
    if (!normalizedId || normalizedId === 'default-project') return;

    try {
      const signedInUid = auth?.currentUser?.uid;
      if (signedInUid && ownerUserId && ownerUserId !== 'global' && ownerUserId !== 'anonymous') {
        registerCloudProjectOwnership(normalizedId, ownerUserId);
      } else if (signedInUid && !ownerUserId) {
        registerCloudProjectOwnership(normalizedId, signedInUid);
      } else {
        registerLocalProjectOwnership(normalizedId);
      }
    } catch {
      // Do not overwrite an existing conflicting ownership record (preserves cross-user security boundaries)
    }
  }

  public getSessionProjectMeta(sessionId: string | null | undefined): ProjectBuildMetadata | null {
    if (!sessionId) return null;
    return this.sessionProjectMap.get(sessionId) || null;
  }

  public setSessionProjectMeta(sessionId: string | null | undefined, meta: ProjectBuildMetadata): void {
    if (!sessionId || !meta?.projectId) return;
    this.sessionProjectMap.set(sessionId, meta);
    this.persistMappings();
  }

  public extractFilesFromVFS(projectId?: string): Record<string, string> {
    const mgr = WorkspaceManager.getInstance();
    if (projectId && mgr.getActiveProjectId() !== projectId) {
      mgr.switchWorkspace(projectId, this.state.projectName || projectId);
    }
    const allFiles = mgr.getVFS().getAllFiles();
    const map: Record<string, string> = {};
    for (const f of allFiles) {
      const normalized = f.path.startsWith('/') ? f.path : `/${f.path}`;
      map[normalized] = f.content;
    }
    return map;
  }

  public activateProject(params: {
    projectId: string;
    name: string;
    version?: number;
    projectType?: string;
    files?: Record<string, string>;
    previewUrl?: string;
    previewId?: string;
    sessionId?: string | null;
    chatSessionId?: string | null;
    ownerUserId?: string;
    verificationScore?: number;
    buildStatus?: ProjectBuildStatus;
    status?: 'ready' | 'preview_starting' | 'failed';
  }): ProjectPreviewControllerState & { projectId: string; fileCount: number; status: 'ready' | 'preview_starting' | 'failed' } {
    const projectId = String(params.projectId || '').trim();
    const effectiveSessionId = params.sessionId ?? params.chatSessionId ?? null;
    if (!projectId) {
      const st = this.getState();
      return {
        ...st,
        projectId: st.activeProjectId,
        fileCount: Object.keys(st.files).length,
        status: 'ready',
      };
    }

    const name = params.name || this.state.projectName || 'Generated Application';
    const version = Number(params.version) || this.state.version || 1;
    const projectType = params.projectType || this.state.projectType || 'website';

    this.ensureProjectOwnershipRegistered(projectId, params.ownerUserId);

    const mgr = WorkspaceManager.getInstance();
    mgr.switchWorkspace(projectId, name);
    const vfs = mgr.getWorkspaceVFS(projectId);

    let resolvedFiles: Record<string, string> = {};
    if (params.files && Object.keys(params.files).length > 0) {
      for (const f of vfs.getAllFiles()) {
        if (typeof (vfs as any)._unsafe_delete === 'function') {
          (vfs as any)._unsafe_delete(f.path);
        }
      }
      for (const [rawPath, content] of Object.entries(params.files)) {
        if (typeof content !== 'string') continue;
        const normalized = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
        vfs._unsafe_writeFile(normalized, content);
        resolvedFiles[normalized] = content;
      }
      if (typeof (vfs as any).saveToStorage === 'function') {
        (vfs as any).saveToStorage();
      }
    } else {
      resolvedFiles = this.extractFilesFromVFS(projectId);
    }

    this.state = {
      ...this.state,
      activeProjectId: projectId,
      projectName: name,
      version,
      projectType,
      files: resolvedFiles,
      buildStatus: params.buildStatus || (Object.keys(resolvedFiles).length > 0 ? 'READY' : 'IDLE'),
      previewStatus: params.previewUrl ? 'RUNNING' : Object.keys(resolvedFiles).length > 0 ? 'STARTING' : 'IDLE',
      previewUrl: params.previewUrl ?? (this.state.activeProjectId === projectId ? this.state.previewUrl : undefined),
      previewId: params.previewId ?? (this.state.activeProjectId === projectId ? this.state.previewId : undefined),
      runtimeError: null,
      hasUnsavedChanges: false,
      lastSavedAt: new Date().toISOString(),
      verificationScore: params.verificationScore ?? this.state.verificationScore,
    };

    const buildMeta: ProjectBuildMetadata = {
      projectId,
      name,
      version,
      projectType,
      fileCount: Object.keys(resolvedFiles).length,
      status: params.status || 'ready',
      previewUrl: this.state.previewUrl,
      previewId: this.state.previewId,
      verificationScore: this.state.verificationScore,
      updatedAt: new Date().toISOString(),
    };

    if (effectiveSessionId) {
      this.setSessionProjectMeta(effectiveSessionId, buildMeta);
    }

    try {
      safeStorage.setItem(LAST_ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify(buildMeta));
    } catch {
      // ignore storage errors
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('anny_vfs_changed', {
          detail: { projectId, version, name },
        }),
      );
    }

    this.emit();
    const nextState = this.getState();
    return {
      ...nextState,
      projectId,
      fileCount: Object.keys(resolvedFiles).length,
      status: buildMeta.status,
    };
  }

  public getSessionProjectBuild(sessionId: string | null | undefined): ProjectBuildMetadata | null {
    return this.getSessionProjectMeta(sessionId);
  }

  public markUnsavedChanges(filesOrFlag?: Record<string, string> | boolean): void {
    const filesMap =
      filesOrFlag && typeof filesOrFlag === 'object'
        ? { ...filesOrFlag }
        : this.extractFilesFromVFS(this.state.activeProjectId || undefined);
    this.state = {
      ...this.state,
      files: filesMap,
      hasUnsavedChanges: typeof filesOrFlag === 'boolean' ? filesOrFlag : true,
    };
    this.emit();
  }

  public setRuntimeError(errorMessage: string | null): void {
    this.state = {
      ...this.state,
      runtimeError: errorMessage,
      previewStatus: errorMessage ? 'ERROR' : 'RUNNING',
    };
    this.emit();
  }

  public setPreviewRunning(previewUrl?: string, previewId?: string): void {
    this.state = {
      ...this.state,
      previewStatus: 'RUNNING',
      previewUrl: previewUrl || this.state.previewUrl,
      previewId: previewId || this.state.previewId,
      runtimeError: null,
    };
    this.emit();
  }

  public async ensurePreviewSession(projectId?: string): Promise<{ previewUrl?: string; previewId?: string }> {
    const targetId = projectId || this.state.activeProjectId;
    if (!targetId || targetId === 'default-project') return {};

    try {
      const res = await safeFetchJson('/api/preview/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: targetId }),
      });

      const session = res.data?.session;
      if (res.success && session?.previewUrl) {
        if (this.state.activeProjectId === targetId) {
          this.state = {
            ...this.state,
            previewUrl: session.previewUrl,
            previewId: session.previewId,
            previewStatus: 'RUNNING',
          };
          this.emit();
        }
        return {
          previewUrl: session.previewUrl,
          previewId: session.previewId,
        };
      }
    } catch (err) {
      console.warn('[ProjectPreviewController] Preview session creation warning:', err);
    }
    return {
      previewUrl: this.state.previewUrl,
      previewId: this.state.previewId,
    };
  }

  public async saveActiveProjectFiles(options?: {
    projectId?: string;
    files?: Record<string, string>;
    summary?: string;
    sessionId?: string | null;
  }): Promise<{
    success: boolean;
    version: number;
    previewUrl?: string;
    error?: string;
  }> {
    const targetProjectId =
      options?.projectId ||
      this.state.activeProjectId ||
      WorkspaceManager.getInstance().getActiveProjectId();

    if (!targetProjectId) {
      return { success: false, version: this.state.version, error: 'No active project to save.' };
    }

    const mgr = WorkspaceManager.getInstance();
    if (mgr.getActiveProjectId() !== targetProjectId) {
      mgr.switchWorkspace(targetProjectId, this.state.projectName || targetProjectId);
    }

    const vfs = mgr.getWorkspaceVFS(targetProjectId);
    const filesMap: Record<string, string> = {};

    if (options?.files && Object.keys(options.files).length > 0) {
      for (const [path, content] of Object.entries(options.files)) {
        const normalized = path.startsWith('/') ? path : `/${path}`;
        vfs._unsafe_writeFile(normalized, content);
        filesMap[normalized] = content;
      }
    } else {
      for (const f of vfs.getAllFiles()) {
        const normalized = f.path.startsWith('/') ? f.path : `/${f.path}`;
        filesMap[normalized] = f.content;
      }
    }

    if (typeof (vfs as any).saveToStorage === 'function') {
      (vfs as any).saveToStorage();
    }
    this.ensureProjectOwnershipRegistered(targetProjectId);

    let nextVersion = this.state.version;
    let nextPreviewUrl = this.state.previewUrl;

    if (targetProjectId.startsWith('proj_')) {
      const res = await safeFetchJson(
        `/api/anny/projects/${encodeURIComponent(targetProjectId)}/files`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: filesMap,
            summary: options?.summary || 'Updated project source files in ANNY Editor',
          }),
        },
      );

      if (!res.success) {
        return {
          success: false,
          version: this.state.version,
          error: res.error || 'Failed to save project files to server.',
        };
      }

      if (res.data?.project?.version) {
        nextVersion = Number(res.data.project.version);
      } else {
        nextVersion = this.state.version + 1;
      }

      if (res.data?.preview?.previewUrl) {
        nextPreviewUrl = res.data.preview.previewUrl;
      }
    } else {
      nextVersion = this.state.version + 1;
    }

    this.state = {
      ...this.state,
      activeProjectId: targetProjectId,
      version: nextVersion,
      files: filesMap,
      previewUrl: nextPreviewUrl,
      hasUnsavedChanges: false,
      lastSavedAt: new Date().toISOString(),
      buildStatus: 'READY',
    };

    if (options?.sessionId) {
      this.setSessionProjectMeta(options.sessionId, {
        projectId: targetProjectId,
        name: this.state.projectName,
        version: nextVersion,
        projectType: this.state.projectType,
        fileCount: Object.keys(filesMap).length,
        status: 'ready',
        previewUrl: nextPreviewUrl,
        previewId: this.state.previewId,
        verificationScore: this.state.verificationScore,
        updatedAt: new Date().toISOString(),
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('anny_vfs_changed', {
          detail: {
            projectId: targetProjectId,
            version: nextVersion,
          },
        }),
      );
    }

    this.emit();
    return {
      success: true,
      version: nextVersion,
      previewUrl: nextPreviewUrl,
    };
  }

  public async restoreProjectForSession(
    sessionIdOrMeta: string | ProjectBuildMetadata | null | undefined,
    messagesOrSessionId?: any[] | string | null,
  ): Promise<ProjectBuildMetadata | null> {
    let sessionId: string | null | undefined =
      typeof sessionIdOrMeta === 'string'
        ? sessionIdOrMeta
        : typeof messagesOrSessionId === 'string'
          ? messagesOrSessionId
          : null;
    let candidateMeta: ProjectBuildMetadata | null =
      sessionIdOrMeta && typeof sessionIdOrMeta === 'object' && 'projectId' in sessionIdOrMeta
        ? (sessionIdOrMeta as ProjectBuildMetadata)
        : this.getSessionProjectMeta(sessionId);

    const messages = Array.isArray(messagesOrSessionId) ? messagesOrSessionId : undefined;

    // Also inspect messages in reverse chronological order for attached projectBuild metadata
    if (!candidateMeta && Array.isArray(messages)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg?.projectBuild?.projectId && msg.projectBuild.status !== 'failed') {
          candidateMeta = msg.projectBuild as ProjectBuildMetadata;
          if (sessionId) {
            this.setSessionProjectMeta(sessionId, candidateMeta);
          }
          break;
        }
      }
    }

    if (!candidateMeta?.projectId) {
      return null;
    }

    const projectId = candidateMeta.projectId;
    const mgr = WorkspaceManager.getInstance();
    this.ensureProjectOwnershipRegistered(projectId);
    mgr.switchWorkspace(projectId, candidateMeta.name || 'Generated Application');
    let localFiles = this.extractFilesFromVFS(projectId);

    // If local VFS is empty (e.g. fresh browser session or storage cleared), hydrate from backend API
    if (Object.keys(localFiles).length === 0 && projectId.startsWith('proj_')) {
      try {
        const res = await safeFetchJson(`/api/anny/projects/${encodeURIComponent(projectId)}`);
        const loaded = res.data?.project;
        if (res.success && loaded && loaded.files && Object.keys(loaded.files).length > 0) {
          this.activateProject({
            projectId,
            name: loaded.name || candidateMeta.name,
            version: Number(loaded.version) || candidateMeta.version || 1,
            projectType: loaded.projectType || candidateMeta.projectType || 'website',
            files: loaded.files,
            previewUrl: res.data?.preview?.previewUrl || candidateMeta.previewUrl,
            previewId: res.data?.preview?.previewId || candidateMeta.previewId,
            sessionId,
            ownerUserId: loaded.ownerUserId,
            verificationScore: candidateMeta.verificationScore,
          });
          return this.getSessionProjectMeta(sessionId) || candidateMeta;
        }
      } catch (err) {
        console.warn('[ProjectPreviewController] Remote project restoration warning:', err);
      }
    }

    if (Object.keys(localFiles).length > 0) {
      this.activateProject({
        projectId,
        name: candidateMeta.name,
        version: candidateMeta.version,
        projectType: candidateMeta.projectType,
        files: localFiles,
        previewUrl: candidateMeta.previewUrl,
        previewId: candidateMeta.previewId,
        sessionId,
        verificationScore: candidateMeta.verificationScore,
      });
      return this.getSessionProjectMeta(sessionId) || candidateMeta;
    }

    return null;
  }
}

export const projectPreviewController = new ProjectPreviewController();

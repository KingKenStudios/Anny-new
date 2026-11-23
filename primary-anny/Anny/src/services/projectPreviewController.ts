import { WorkspaceManager } from '../core/workspaceManager';
import { safeStorage } from '../lib/storage';
import { safeFetchJson } from '../lib/apiUtils';
import { auth } from '../lib/firebase';
import {
  getProjectOwnershipRecord,
  registerCloudProjectOwnership,
  registerLocalProjectOwnership,
  sanitizePreviewProjectId,
} from './projectOwnershipService';

export type ProjectBuildStatus = 'IDLE' | 'BUILDING' | 'READY' | 'FAILED';
export type ProjectPreviewStatus = 'IDLE' | 'STARTING' | 'RUNNING' | 'ERROR';

export type PreviewLifecycleState =
  | 'missing_project_id'
  | 'restoring_project'
  | 'metadata_not_found'
  | 'no_entry_point'
  | 'authorization_denied'
  | 'compilation_failed'
  | 'rendered';

export type ProjectVfsSource = 'local-vfs' | 'controller-memory' | 'server-api' | 'none';

export interface PreviewHandoffDiagnostics {
  requestedProjectId: string;
  resolvedProjectId: string;
  activeWorkspaceId: string;
  ownershipResult: string;
  localVfsFileCount: number;
  controllerFileCount: number;
  restoredServerFileCount: number;
  selectedVfsSource: ProjectVfsSource;
  snapshotFileCount: number;
  handshakeAccepted: boolean | 'pending';
  compilationResult: string;
  hasEntryPoint?: boolean;
}

export interface ProjectRestorationResult {
  status:
    | 'restored'
    | 'no_entry_point'
    | 'metadata_not_found'
    | 'authorization_denied'
    | 'missing_project_id';
  projectId: string;
  files: Record<string, string>;
  metadata: ProjectBuildMetadata | null;
  source: ProjectVfsSource;
  hasEntryPoint: boolean;
  errorReason?: string;
  diagnostics: PreviewHandoffDiagnostics;
}

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
const PROJECT_META_INDEX_STORAGE_KEY = 'anny_project_meta_index_v1';
const LAST_ACTIVE_PROJECT_STORAGE_KEY = 'anny_last_active_project_v1';

const PLACEHOLDER_WORKSPACE_IDS = new Set([
  '',
  'ws_default_1',
  'default-project',
  'anny-project',
  'default-session',
]);

const ENTRY_POINT_CANDIDATES = [
  '/src/App.tsx',
  '/src/App.jsx',
  '/src/App.ts',
  '/src/App.js',
  '/App.tsx',
  '/App.jsx',
  '/App.ts',
  '/App.js',
  '/src/main.tsx',
  '/src/index.tsx',
  '/index.html',
  '/public/index.html',
];

export function hasApplicationEntryPoint(files: Record<string, string> | null | undefined): boolean {
  if (!files || typeof files !== 'object') return false;
  const normalizedKeys = Object.keys(files)
    .filter((k) => !k.startsWith('/__anny_') && typeof files[k] === 'string' && files[k].trim().length > 0)
    .map((k) => (k.startsWith('/') ? k : `/${k}`));
  if (normalizedKeys.length === 0) return false;

  const keySet = new Set(normalizedKeys);
  for (const candidate of ENTRY_POINT_CANDIDATES) {
    if (keySet.has(candidate)) {
      return true;
    }
  }

  return normalizedKeys.some(
    (p) =>
      p.endsWith('.tsx') ||
      p.endsWith('.jsx') ||
      p.endsWith('.html') ||
      p === '/main.js' ||
      p === '/src/main.js' ||
      p === '/index.js' ||
      p === '/src/index.js',
  );
}

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
  private projectMetaById = new Map<string, ProjectBuildMetadata>();
  private projectFilesById = new Map<string, Record<string, string>>();
  private lastDiagnostics: PreviewHandoffDiagnostics | null = null;

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
              const typedMeta = meta as ProjectBuildMetadata;
              this.sessionProjectMap.set(sessionId, typedMeta);
              if (typedMeta.projectId) {
                this.projectMetaById.set(typedMeta.projectId, typedMeta);
              }
            }
          }
        }
      }
    } catch {
      // Ignore storage restoration errors
    }

    try {
      const rawIndex = safeStorage.getItem(PROJECT_META_INDEX_STORAGE_KEY);
      if (rawIndex) {
        const parsedIndex = JSON.parse(rawIndex);
        if (parsedIndex && typeof parsedIndex === 'object') {
          for (const [projectId, meta] of Object.entries(parsedIndex)) {
            if (
              meta &&
              typeof meta === 'object' &&
              typeof (meta as any).projectId === 'string' &&
              (meta as any).projectId === projectId
            ) {
              this.projectMetaById.set(projectId, meta as ProjectBuildMetadata);
            }
          }
        }
      }
    } catch {
      // Ignore storage restoration errors
    }

    try {
      const rawLast = safeStorage.getItem(LAST_ACTIVE_PROJECT_STORAGE_KEY);
      if (rawLast) {
        const parsedLast = JSON.parse(rawLast);
        if (parsedLast && typeof parsedLast === 'object' && typeof parsedLast.projectId === 'string') {
          this.projectMetaById.set(parsedLast.projectId, parsedLast as ProjectBuildMetadata);
        }
      }
    } catch {
      // Ignore storage restoration errors
    }
  }

  private persistMappings(): void {
    try {
      const sessionObj: Record<string, ProjectBuildMetadata> = {};
      for (const [sessionId, meta] of this.sessionProjectMap.entries()) {
        sessionObj[sessionId] = meta;
      }
      safeStorage.setItem(SESSION_PROJECT_MAP_STORAGE_KEY, JSON.stringify(sessionObj));
    } catch {
      // Ignore storage persistence errors
    }

    try {
      const projectObj: Record<string, ProjectBuildMetadata> = {};
      for (const [projectId, meta] of this.projectMetaById.entries()) {
        projectObj[projectId] = meta;
      }
      safeStorage.setItem(PROJECT_META_INDEX_STORAGE_KEY, JSON.stringify(projectObj));
    } catch {
      // Ignore storage persistence errors
    }
  }

  public getState(): ProjectPreviewControllerState {
    return { ...this.state, files: { ...this.state.files } };
  }

  public getLastDiagnostics(): PreviewHandoffDiagnostics | null {
    return this.lastDiagnostics ? { ...this.lastDiagnostics } : null;
  }

  public logPreviewHandoffDiagnostics(partial: Partial<PreviewHandoffDiagnostics>): PreviewHandoffDiagnostics {
    const base: PreviewHandoffDiagnostics = this.lastDiagnostics || {
      requestedProjectId: '',
      resolvedProjectId: '',
      activeWorkspaceId: WorkspaceManager.getInstance().getActiveProjectId() || '',
      ownershipResult: 'UNVERIFIED',
      localVfsFileCount: 0,
      controllerFileCount: 0,
      restoredServerFileCount: 0,
      selectedVfsSource: 'none',
      snapshotFileCount: 0,
      handshakeAccepted: 'pending',
      compilationResult: 'pending',
    };

    const merged: PreviewHandoffDiagnostics = {
      ...base,
      ...partial,
      activeWorkspaceId:
        partial.activeWorkspaceId ?? (WorkspaceManager.getInstance().getActiveProjectId() || ''),
    };
    this.lastDiagnostics = merged;

    console.info('[ANNY Preview Handoff]', {
      requestedProjectId: merged.requestedProjectId,
      resolvedProjectId: merged.resolvedProjectId,
      activeWorkspaceId: merged.activeWorkspaceId,
      ownershipResult: merged.ownershipResult,
      localVfsFileCount: merged.localVfsFileCount,
      controllerFileCount: merged.controllerFileCount,
      restoredServerFileCount: merged.restoredServerFileCount,
      selectedVfsSource: merged.selectedVfsSource,
      snapshotFileCount: merged.snapshotFileCount,
      handshakeAccepted: merged.handshakeAccepted,
      compilationResult: merged.compilationResult,
    });

    return merged;
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

  public ensureProjectOwnershipRegistered(
    projectId: string,
    ownerUserId?: string | null,
    options?: { verifiedServerOwner?: boolean },
  ): void {
    const normalizedId = sanitizePreviewProjectId(projectId);
    if (!normalizedId || PLACEHOLDER_WORKSPACE_IDS.has(normalizedId)) return;

    try {
      const existing = getProjectOwnershipRecord(normalizedId);
      const signedInUid = auth?.currentUser?.uid ? String(auth.currentUser.uid).trim() : '';
      const cleanOwnerId = typeof ownerUserId === 'string' ? ownerUserId.trim() : '';

      // If an ownership record already exists in cloud mode, do not overwrite or downgrade it
      if (existing && existing.ownershipMode === 'cloud') {
        return;
      }

      // Only register cloud ownership when the server explicitly confirmed the signed-in user owns it
      if (
        options?.verifiedServerOwner &&
        signedInUid &&
        cleanOwnerId &&
        cleanOwnerId === signedInUid
      ) {
        registerCloudProjectOwnership(normalizedId, cleanOwnerId);
        return;
      }

      // Otherwise register local project ownership (which binds both localSessionId and boundAuthUid)
      registerLocalProjectOwnership(normalizedId);
    } catch {
      // Never overwrite an existing conflicting ownership record (preserves cross-user security boundaries)
    }
  }

  public getSessionProjectMeta(sessionId: string | null | undefined): ProjectBuildMetadata | null {
    if (!sessionId) return null;
    this.restorePersistedMappings();
    return this.sessionProjectMap.get(sessionId) || null;
  }

  public getProjectMetaById(projectId: string | null | undefined): ProjectBuildMetadata | null {
    const cleanId = sanitizePreviewProjectId(projectId);
    if (!cleanId) return null;
    this.restorePersistedMappings();
    const direct = this.projectMetaById.get(cleanId);
    if (direct && direct.projectId === cleanId) return direct;

    for (const meta of this.sessionProjectMap.values()) {
      if (meta.projectId === cleanId) {
        this.projectMetaById.set(cleanId, meta);
        return meta;
      }
    }
    return null;
  }

  public setSessionProjectMeta(sessionId: string | null | undefined, meta: ProjectBuildMetadata): void {
    if (!meta?.projectId) return;
    const cleanProjectId = sanitizePreviewProjectId(meta.projectId);
    if (!cleanProjectId) return;
    const normalizedMeta: ProjectBuildMetadata = {
      ...meta,
      projectId: cleanProjectId,
    };
    this.projectMetaById.set(cleanProjectId, normalizedMeta);
    if (sessionId) {
      this.sessionProjectMap.set(sessionId, normalizedMeta);
    }
    this.persistMappings();
  }

  /**
   * Reads files directly from the specified project's own workspace VFS after reloading
   * its persisted local storage. Does NOT mutate the global active workspace.
   */
  public extractFilesFromVFS(projectId?: string): Record<string, string> {
    const mgr = WorkspaceManager.getInstance();
    const targetId = sanitizePreviewProjectId(
      projectId || this.state.activeProjectId || mgr.getActiveProjectId(),
    );
    if (!targetId) return {};

    const vfs = mgr.getWorkspaceVFS(targetId);
    const writeBusy = typeof (vfs as any).isWriteInProgress === 'function' && (vfs as any).isWriteInProgress();
    if (!writeBusy && typeof vfs.reloadFromStorage === 'function') {
      vfs.reloadFromStorage();
    }
    const allFiles = vfs.getAllFiles();
    const map: Record<string, string> = {};
    for (const f of allFiles) {
      const normalized = f.path.startsWith('/') ? f.path : `/${f.path}`;
      if (normalized.startsWith('/__anny_')) continue;
      map[normalized] = f.content;
    }
    return map;
  }

  /**
   * Returns in-memory controller files verified to belong strictly to `projectId`.
   * Never returns files belonging to another project.
   */
  public getControllerFilesForProject(projectId: string | null | undefined): Record<string, string> {
    const cleanId = sanitizePreviewProjectId(projectId);
    if (!cleanId) return {};

    const cached = this.projectFilesById.get(cleanId);
    if (cached && Object.keys(cached).length > 0) {
      return { ...cached };
    }

    if (this.state.activeProjectId === cleanId && Object.keys(this.state.files).length > 0) {
      return { ...this.state.files };
    }

    return {};
  }

  /**
   * Writes files into the target project's isolated VFS without leaking into any other workspace.
   */
  private writeFilesToProjectVFS(projectId: string, files: Record<string, string>): Record<string, string> {
    const cleanId = sanitizePreviewProjectId(projectId);
    if (!cleanId) return {};

    const mgr = WorkspaceManager.getInstance();
    const vfs = mgr.getWorkspaceVFS(cleanId);
    const executeWrite = (): Record<string, string> => {
      if (typeof vfs.clearAll === 'function') {
        vfs.clearAll();
      } else {
        for (const f of vfs.getAllFiles()) {
          if (typeof vfs._unsafe_remove === 'function') {
            vfs._unsafe_remove(f.path);
          }
        }
      }

      // First normalize and prune any corrupted file-vs-directory conflicts (e.g. /package.json AND /package.json/name)
      const stagedFiles: Record<string, string> = {};
      for (const [rawPath, content] of Object.entries(files || {})) {
        if (typeof rawPath !== 'string' || !rawPath.trim()) continue;
        if (typeof content !== 'string') continue;
        const trimmed = rawPath.trim().replace(/\\/g, '/').replace(/^\.\/+/, '');
        const normalized = (trimmed.startsWith('/') ? trimmed : `/${trimmed}`).replace(/\/+/g, '/').replace(/\/$/, '');
        if (!normalized || normalized === '/' || normalized.startsWith('/__anny_')) continue;
        const segs = normalized.split('/').filter(Boolean);
        // Drop impossible child paths nested inside a JSON/config file (e.g. /package.json/name)
        const hasJsonAncestor = segs.slice(0, -1).some((s) => /\.(?:json|jsonc|webmanifest)$/i.test(s));
        if (hasJsonAncestor) continue;
        stagedFiles[normalized] = content;
      }

      const stagedKeys = Object.keys(stagedFiles);
      const stagedSet = new Set(stagedKeys);
      for (const p of stagedKeys) {
        const segs = p.split('/').filter(Boolean);
        let prefix = '';
        for (let i = 0; i < segs.length - 1; i++) {
          prefix += '/' + segs[i];
          if (stagedSet.has(prefix)) {
            if (/\.[a-z0-9]{1,10}$/i.test(segs[i]) && !segs[i].startsWith('.')) {
              delete stagedFiles[p];
            } else {
              delete stagedFiles[prefix];
            }
          }
        }
      }

      const resolvedFiles: Record<string, string> = {};
      for (const [normalized, content] of Object.entries(stagedFiles)) {
        vfs._unsafe_writeFile(normalized, content);
        resolvedFiles[normalized] = content;
      }

      if (typeof (vfs as any).saveToStorage === 'function') {
        (vfs as any).saveToStorage();
      }

      this.projectFilesById.set(cleanId, { ...resolvedFiles });
      return resolvedFiles;
    };

    if (typeof (vfs as any).withWriteLock === 'function') {
      return (vfs as any).withWriteLock(executeWrite);
    }
    return executeWrite();
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
    ownerUserId?: string | null;
    ownerUid?: string | null;
    verifiedServerOwner?: boolean;
    verificationScore?: number;
    buildStatus?: ProjectBuildStatus;
    status?: 'ready' | 'preview_starting' | 'failed';
    switchActiveWorkspace?: boolean;
  }): ProjectPreviewControllerState & {
    projectId: string;
    fileCount: number;
    status: 'ready' | 'preview_starting' | 'failed';
  } {
    const projectId = sanitizePreviewProjectId(params.projectId);
    const effectiveSessionId = params.sessionId ?? params.chatSessionId ?? null;
    if (!projectId) {
      const st = this.getState();
      return {
        ...st,
        projectId: st.activeProjectId,
        fileCount: Object.keys(st.files).length,
        status: 'failed',
      };
    }

    const existingMeta = this.getProjectMetaById(projectId);
    const name = params.name || existingMeta?.name || this.state.projectName || 'Generated Application';
    const version = Number(params.version) || existingMeta?.version || this.state.version || 1;
    const projectType = params.projectType || existingMeta?.projectType || this.state.projectType || 'website';
    const effectiveOwnerId = params.ownerUserId ?? params.ownerUid ?? null;

    this.ensureProjectOwnershipRegistered(projectId, effectiveOwnerId, {
      verifiedServerOwner: params.verifiedServerOwner,
    });

    const mgr = WorkspaceManager.getInstance();
    if (params.switchActiveWorkspace !== false) {
      mgr.switchWorkspace(projectId, name);
    }

    let resolvedFiles: Record<string, string> = {};
    if (params.files && Object.keys(params.files).length > 0) {
      resolvedFiles = this.writeFilesToProjectVFS(projectId, params.files);
    } else {
      resolvedFiles = this.extractFilesFromVFS(projectId);
      if (Object.keys(resolvedFiles).length === 0) {
        const controllerCached = this.getControllerFilesForProject(projectId);
        if (Object.keys(controllerCached).length > 0) {
          resolvedFiles = this.writeFilesToProjectVFS(projectId, controllerCached);
        }
      } else {
        this.projectFilesById.set(projectId, { ...resolvedFiles });
      }
    }

    const fileCount = Object.keys(resolvedFiles).length;
    const hasEntry = hasApplicationEntryPoint(resolvedFiles);

    this.state = {
      ...this.state,
      activeProjectId: projectId,
      projectName: name,
      version,
      projectType,
      files: resolvedFiles,
      buildStatus: params.buildStatus || (fileCount > 0 ? 'READY' : 'IDLE'),
      previewStatus: params.previewUrl ? 'RUNNING' : fileCount > 0 ? 'STARTING' : 'IDLE',
      previewUrl:
        params.previewUrl ??
        existingMeta?.previewUrl ??
        (this.state.activeProjectId === projectId ? this.state.previewUrl : undefined),
      previewId:
        params.previewId ??
        existingMeta?.previewId ??
        (this.state.activeProjectId === projectId ? this.state.previewId : undefined),
      runtimeError: null,
      hasUnsavedChanges: false,
      lastSavedAt: new Date().toISOString(),
      verificationScore:
        params.verificationScore ?? existingMeta?.verificationScore ?? this.state.verificationScore,
    };

    const buildMeta: ProjectBuildMetadata = {
      projectId,
      name,
      version,
      projectType,
      fileCount,
      status: params.status || (hasEntry ? 'ready' : fileCount > 0 ? 'ready' : 'failed'),
      previewUrl: this.state.previewUrl,
      previewId: this.state.previewId,
      verificationScore: this.state.verificationScore,
      updatedAt: new Date().toISOString(),
    };

    this.setSessionProjectMeta(effectiveSessionId, buildMeta);

    try {
      safeStorage.setItem(LAST_ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify(buildMeta));
    } catch {
      // ignore storage errors
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('anny_vfs_changed', {
          detail: { projectId, version, name, fileCount },
        }),
      );
    }

    this.emit();
    const nextState = this.getState();
    return {
      ...nextState,
      projectId,
      fileCount,
      status: buildMeta.status,
    };
  }

  public getSessionProjectBuild(sessionId: string | null | undefined): ProjectBuildMetadata | null {
    return this.getSessionProjectMeta(sessionId);
  }

  public markUnsavedChanges(filesOrFlag?: Record<string, string> | boolean): void {
    const activeId = this.state.activeProjectId;
    const filesMap =
      filesOrFlag && typeof filesOrFlag === 'object'
        ? { ...filesOrFlag }
        : this.extractFilesFromVFS(activeId || undefined);
    if (activeId && Object.keys(filesMap).length > 0) {
      this.projectFilesById.set(activeId, { ...filesMap });
    }
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
    const targetId = sanitizePreviewProjectId(projectId || this.state.activeProjectId);
    if (!targetId || PLACEHOLDER_WORKSPACE_IDS.has(targetId)) return {};

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
    const targetProjectId = sanitizePreviewProjectId(
      options?.projectId ||
        this.state.activeProjectId ||
        WorkspaceManager.getInstance().getActiveProjectId(),
    );

    if (!targetProjectId) {
      return { success: false, version: this.state.version, error: 'No active project to save.' };
    }

    const mgr = WorkspaceManager.getInstance();
    if (mgr.getActiveProjectId() !== targetProjectId) {
      mgr.switchWorkspace(targetProjectId, this.state.projectName || targetProjectId);
    }

    let filesMap: Record<string, string> = {};
    if (options?.files && Object.keys(options.files).length > 0) {
      filesMap = this.writeFilesToProjectVFS(targetProjectId, options.files);
    } else {
      filesMap = this.extractFilesFromVFS(targetProjectId);
      this.projectFilesById.set(targetProjectId, { ...filesMap });
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

    const updatedMeta: ProjectBuildMetadata = {
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
    };
    this.setSessionProjectMeta(options?.sessionId, updatedMeta);

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

  /**
   * Resolves and restores a specific project by its project ID before preview compilation.
   *
   * Execution sequence:
   * 1. Validate projectId format and reject placeholder/invalid IDs.
   * 2. Verify existing local ownership record does not belong to another user/session.
   * 3. Check the project's own isolated VFS (`getWorkspaceVFS(projectId)`) after `reloadFromStorage()`.
   * 4. Check controller in-memory files verified to belong strictly to `projectId`.
   * 5. If local files are absent, restore from `/api/anny/projects/:projectId` and verify returned `loaded.projectId === projectId`.
   * 6. Register ownership accurately, populate project VFS, and verify an application entry point exists.
   */
  public async restoreProjectById(
    rawProjectId: string | null | undefined,
    options?: {
      sessionId?: string | null;
      expectedMeta?: Partial<ProjectBuildMetadata> | null;
      switchActiveWorkspace?: boolean;
    },
  ): Promise<ProjectRestorationResult> {
    const requestedId = String(rawProjectId || '').trim();
    const mgr = WorkspaceManager.getInstance();
    const activeWorkspaceId = mgr.getActiveProjectId() || '';
    const sanitizedId = sanitizePreviewProjectId(requestedId);

    if (!sanitizedId || PLACEHOLDER_WORKSPACE_IDS.has(sanitizedId)) {
      const diagnostics = this.logPreviewHandoffDiagnostics({
        requestedProjectId: requestedId,
        resolvedProjectId: '',
        activeWorkspaceId,
        ownershipResult: 'MISSING_OR_INVALID_PROJECT_ID',
        localVfsFileCount: 0,
        controllerFileCount: 0,
        restoredServerFileCount: 0,
        selectedVfsSource: 'none',
        snapshotFileCount: 0,
      });
      return {
        status: 'missing_project_id',
        projectId: '',
        files: {},
        metadata: null,
        source: 'none',
        hasEntryPoint: false,
        errorReason: requestedId
          ? `Invalid or placeholder project ID "${requestedId}".`
          : 'No project ID specified.',
        diagnostics,
      };
    }

    // Check if expectedMeta explicitly conflicts with requested projectId
    if (
      options?.expectedMeta?.projectId &&
      sanitizePreviewProjectId(options.expectedMeta.projectId) !== sanitizedId
    ) {
      const diagnostics = this.logPreviewHandoffDiagnostics({
        requestedProjectId: requestedId,
        resolvedProjectId: sanitizedId,
        activeWorkspaceId,
        ownershipResult: 'PROJECT_ID_MISMATCH_REJECTED',
        localVfsFileCount: 0,
        controllerFileCount: 0,
        restoredServerFileCount: 0,
        selectedVfsSource: 'none',
        snapshotFileCount: 0,
      });
      return {
        status: 'authorization_denied',
        projectId: sanitizedId,
        files: {},
        metadata: null,
        source: 'none',
        hasEntryPoint: false,
        errorReason: 'Requested project ID does not match build metadata project ID.',
        diagnostics,
      };
    }

    // Check existing ownership record before touching local VFS so another user's project is never read
    const existingOwnership = getProjectOwnershipRecord(sanitizedId);
    const currentUid = auth?.currentUser?.uid ? String(auth.currentUser.uid).trim() : null;
    if (existingOwnership) {
      if (
        existingOwnership.ownershipMode === 'cloud' &&
        existingOwnership.ownerUserId !== currentUid
      ) {
        const diagnostics = this.logPreviewHandoffDiagnostics({
          requestedProjectId: requestedId,
          resolvedProjectId: sanitizedId,
          activeWorkspaceId,
          ownershipResult: 'CLOUD_PROJECT_OWNER_MISMATCH',
          localVfsFileCount: 0,
          controllerFileCount: 0,
          restoredServerFileCount: 0,
          selectedVfsSource: 'none',
          snapshotFileCount: 0,
        });
        return {
          status: 'authorization_denied',
          projectId: sanitizedId,
          files: {},
          metadata: null,
          source: 'none',
          hasEntryPoint: false,
          errorReason: 'Access denied: project belongs to a different authenticated user.',
          diagnostics,
        };
      }
      if (
        existingOwnership.ownershipMode === 'local-only' &&
        existingOwnership.boundAuthUid &&
        existingOwnership.boundAuthUid !== currentUid
      ) {
        const diagnostics = this.logPreviewHandoffDiagnostics({
          requestedProjectId: requestedId,
          resolvedProjectId: sanitizedId,
          activeWorkspaceId,
          ownershipResult: 'LOCAL_PROJECT_BOUND_USER_MISMATCH',
          localVfsFileCount: 0,
          controllerFileCount: 0,
          restoredServerFileCount: 0,
          selectedVfsSource: 'none',
          hasEntryPoint: false as any,
          snapshotFileCount: 0,
        });
        return {
          status: 'authorization_denied',
          projectId: sanitizedId,
          files: {},
          metadata: null,
          source: 'none',
          hasEntryPoint: false,
          errorReason: 'Access denied: local project is bound to a different user identity.',
          diagnostics,
        };
      }
    }

    const knownMeta = this.getProjectMetaById(sanitizedId);
    const mergedExpectedMeta: Partial<ProjectBuildMetadata> = {
      ...(knownMeta || {}),
      ...(options?.expectedMeta || {}),
      projectId: sanitizedId,
    };

    // Step 1: Check the project's own workspace VFS (after reloading persisted local storage)
    const localVfsFiles = this.extractFilesFromVFS(sanitizedId);
    const localVfsFileCount = Object.keys(localVfsFiles).length;

    // Step 2: Check controller in-memory files for this exact projectId
    const controllerFiles = this.getControllerFilesForProject(sanitizedId);
    const controllerFileCount = Object.keys(controllerFiles).length;

    let selectedFiles: Record<string, string> = {};
    let selectedSource: ProjectVfsSource = 'none';
    let restoredServerFileCount = 0;
    let verifiedServerOwnerId: string | null = null;
    let serverProjectFound = false;

    if (localVfsFileCount > 0) {
      selectedFiles = localVfsFiles;
      selectedSource = 'local-vfs';
    } else if (controllerFileCount > 0) {
      selectedFiles = this.writeFilesToProjectVFS(sanitizedId, controllerFiles);
      selectedSource = 'controller-memory';
    }

    // Step 3: If local VFS and controller memory are both empty, fetch from authenticated persistence API
    if (Object.keys(selectedFiles).length === 0 && sanitizedId.startsWith('proj_')) {
      try {
        const res = await safeFetchJson(`/api/anny/projects/${encodeURIComponent(sanitizedId)}`);
        if (!res.success) {
          if (res.status === 401 || res.status === 403) {
            const diagnostics = this.logPreviewHandoffDiagnostics({
              requestedProjectId: requestedId,
              resolvedProjectId: sanitizedId,
              activeWorkspaceId,
              ownershipResult: `SERVER_HTTP_${res.status}_DENIED`,
              localVfsFileCount,
              controllerFileCount,
              restoredServerFileCount: 0,
              selectedVfsSource: 'none',
              snapshotFileCount: 0,
            });
            return {
              status: 'authorization_denied',
              projectId: sanitizedId,
              files: {},
              metadata: null,
              source: 'none',
              hasEntryPoint: false,
              errorReason: res.error || 'Project access denied by server authorization policy.',
              diagnostics,
            };
          }
        } else if (res.data?.project) {
          const loaded = res.data.project;
          const loadedId = sanitizePreviewProjectId(loaded.projectId || loaded.id || sanitizedId);
          // Strictly verify that the server response actually belongs to the requested projectId
          if (loadedId !== sanitizedId) {
            const diagnostics = this.logPreviewHandoffDiagnostics({
              requestedProjectId: requestedId,
              resolvedProjectId: sanitizedId,
              activeWorkspaceId,
              ownershipResult: 'SERVER_PROJECT_ID_MISMATCH',
              localVfsFileCount,
              controllerFileCount,
              restoredServerFileCount: 0,
              selectedVfsSource: 'none',
              snapshotFileCount: 0,
            });
            return {
              status: 'authorization_denied',
              projectId: sanitizedId,
              files: {},
              metadata: null,
              source: 'none',
              hasEntryPoint: false,
              errorReason: `Server returned mismatched project ID "${loadedId}" for requested "${sanitizedId}".`,
              diagnostics,
            };
          }

          serverProjectFound = true;
          verifiedServerOwnerId = typeof loaded.ownerUserId === 'string' ? loaded.ownerUserId : null;
          mergedExpectedMeta.name = loaded.name || mergedExpectedMeta.name;
          mergedExpectedMeta.version = Number(loaded.version) || mergedExpectedMeta.version || 1;
          mergedExpectedMeta.projectType = loaded.projectType || mergedExpectedMeta.projectType || 'website';
          mergedExpectedMeta.previewUrl = res.data?.preview?.previewUrl || mergedExpectedMeta.previewUrl;
          mergedExpectedMeta.previewId = res.data?.preview?.previewId || mergedExpectedMeta.previewId;

          if (loaded.files && typeof loaded.files === 'object') {
            const serverFiles: Record<string, string> = {};
            for (const [k, v] of Object.entries(loaded.files)) {
              if (typeof v === 'string') {
                const norm = k.startsWith('/') ? k : `/${k}`;
                if (!norm.startsWith('/__anny_')) {
                  serverFiles[norm] = v;
                }
              }
            }
            restoredServerFileCount = Object.keys(serverFiles).length;
            if (restoredServerFileCount > 0) {
              selectedFiles = this.writeFilesToProjectVFS(sanitizedId, serverFiles);
              selectedSource = 'server-api';
            }
          }
        }
      } catch (err) {
        console.warn('[ProjectPreviewController] Server project fetch warning:', err);
      }
    }

    const totalFileCount = Object.keys(selectedFiles).length;
    const hasEntry = hasApplicationEntryPoint(selectedFiles);

    if (totalFileCount === 0 && !serverProjectFound && !knownMeta && !options?.expectedMeta?.name) {
      const diagnostics = this.logPreviewHandoffDiagnostics({
        requestedProjectId: requestedId,
        resolvedProjectId: sanitizedId,
        activeWorkspaceId,
        ownershipResult: existingOwnership ? 'OWNERSHIP_PRESENT_NO_DATA' : 'PROJECT_NOT_FOUND',
        localVfsFileCount,
        controllerFileCount,
        restoredServerFileCount,
        selectedVfsSource: 'none',
        snapshotFileCount: 0,
      });
      return {
        status: 'metadata_not_found',
        projectId: sanitizedId,
        files: {},
        metadata: null,
        source: 'none',
        hasEntryPoint: false,
        errorReason: `Project "${sanitizedId}" was not found in local workspace storage or server persistence.`,
        diagnostics,
      };
    }

    // Activate and register ownership for the verified project
    this.activateProject({
      projectId: sanitizedId,
      name: mergedExpectedMeta.name || 'Generated Application',
      version: Number(mergedExpectedMeta.version) || 1,
      projectType: mergedExpectedMeta.projectType || 'website',
      files: selectedFiles,
      previewUrl: mergedExpectedMeta.previewUrl,
      previewId: mergedExpectedMeta.previewId,
      sessionId: options?.sessionId,
      ownerUserId: verifiedServerOwnerId,
      verifiedServerOwner: Boolean(verifiedServerOwnerId),
      verificationScore: mergedExpectedMeta.verificationScore,
      switchActiveWorkspace: options?.switchActiveWorkspace !== false,
    });

    const finalMeta = this.getProjectMetaById(sanitizedId);

    if (!hasEntry) {
      const diagnostics = this.logPreviewHandoffDiagnostics({
        requestedProjectId: requestedId,
        resolvedProjectId: sanitizedId,
        activeWorkspaceId: WorkspaceManager.getInstance().getActiveProjectId() || '',
        ownershipResult: 'AUTHORIZED',
        localVfsFileCount,
        controllerFileCount,
        restoredServerFileCount,
        selectedVfsSource: selectedSource,
        snapshotFileCount: totalFileCount,
        compilationResult: 'NO_ENTRY_POINT',
      });
      return {
        status: 'no_entry_point',
        projectId: sanitizedId,
        files: selectedFiles,
        metadata: finalMeta,
        source: selectedSource,
        hasEntryPoint: false,
        errorReason:
          totalFileCount === 0
            ? `Project "${sanitizedId}" contains 0 source files.`
            : `Project "${sanitizedId}" was restored (${totalFileCount} file(s)) but has no application entry point (/src/App.tsx or /index.html).`,
        diagnostics,
      };
    }

    const diagnostics = this.logPreviewHandoffDiagnostics({
      requestedProjectId: requestedId,
      resolvedProjectId: sanitizedId,
      activeWorkspaceId: WorkspaceManager.getInstance().getActiveProjectId() || '',
      ownershipResult: 'AUTHORIZED',
      localVfsFileCount,
      controllerFileCount,
      restoredServerFileCount,
      selectedVfsSource: selectedSource,
      snapshotFileCount: totalFileCount,
    });

    return {
      status: 'restored',
      projectId: sanitizedId,
      files: selectedFiles,
      metadata: finalMeta,
      source: selectedSource,
      hasEntryPoint: true,
      diagnostics,
    };
  }

  public async restoreProjectForSession(
    sessionIdOrMeta: string | ProjectBuildMetadata | null | undefined,
    messagesOrSessionId?: any[] | string | null,
  ): Promise<ProjectBuildMetadata | null> {
    const sessionId: string | null | undefined =
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

    // Inspect messages in reverse chronological order for the latest attached projectBuild metadata
    if (Array.isArray(messages)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg?.projectBuild?.projectId && msg.projectBuild.status !== 'failed') {
          const msgMeta = msg.projectBuild as ProjectBuildMetadata;
          if (!candidateMeta || (msgMeta.version || 0) >= (candidateMeta.version || 0)) {
            candidateMeta = msgMeta;
          }
          if (sessionId && candidateMeta) {
            this.setSessionProjectMeta(sessionId, candidateMeta);
          }
          break;
        }
      }
    }

    if (!candidateMeta?.projectId) {
      return null;
    }

    const result = await this.restoreProjectById(candidateMeta.projectId, {
      sessionId,
      expectedMeta: candidateMeta,
      switchActiveWorkspace: true,
    });

    if (result.status === 'restored') {
      return result.metadata || this.getSessionProjectMeta(sessionId) || candidateMeta;
    }

    return null;
  }
}

export const projectPreviewController = new ProjectPreviewController();

export function resolveBestProjectId(sessionId?: string | null, fallbackId?: string | null): string {
  const cleanFallback = String(fallbackId || '').trim();
  if (cleanFallback.startsWith('proj_')) return cleanFallback;

  const cleanSession = String(sessionId || '').trim();
  if (cleanSession) {
    const sessionMeta = projectPreviewController.getSessionProjectMeta(cleanSession);
    if (sessionMeta?.projectId && sessionMeta.projectId.startsWith('proj_')) {
      return sessionMeta.projectId;
    }
  }

  const controllerActive = projectPreviewController.getState().activeProjectId;
  if (controllerActive && controllerActive.startsWith('proj_')) {
    return controllerActive;
  }

  const activeMgr = WorkspaceManager.getInstance().getActiveProjectId();
  if (activeMgr && activeMgr.startsWith('proj_')) {
    return activeMgr;
  }

  if (cleanSession && cleanSession.startsWith('proj_')) {
    return cleanSession;
  }

  return cleanFallback || 'ws_default_1';
}

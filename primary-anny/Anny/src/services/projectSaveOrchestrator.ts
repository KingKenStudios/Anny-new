/**
 * ANNY — PROJECT SAVE ORCHESTRATION SERVICE (VERSION 1.0)
 * Encapsulates production save orchestration, target project identification,
 * serialized per-project save queues, dirty tracking, and error recovery.
 */

import { projectPreviewController } from './projectPreviewController';
import { WorkspaceManager } from '../core/workspaceManager';
import { fetchWithAuth } from '../lib/apiUtils';

export interface ProjectSaveResult {
  success: boolean;
  version?: number;
  previewUrl?: string | null;
  error?: string;
}

export class ProjectSaveOrchestrator {
  private static instance: ProjectSaveOrchestrator;
  private savingProjects: Set<string> = new Set();
  private dirtyProjects: Map<string, boolean> = new Map();

  public static getInstance(): ProjectSaveOrchestrator {
    if (!ProjectSaveOrchestrator.instance) {
      ProjectSaveOrchestrator.instance = new ProjectSaveOrchestrator();
    }
    return ProjectSaveOrchestrator.instance;
  }

  public isSaving(projectId: string): boolean {
    return this.savingProjects.has(projectId);
  }

  public isDirty(projectId: string): boolean {
    return this.dirtyProjects.get(projectId) || false;
  }

  public markDirty(projectId: string): void {
    this.dirtyProjects.set(projectId, true);
  }

  public async saveProjectFiles(
    targetProjectId: string,
    fallbackProjectName: string = 'Generated Website',
    customFetch?: (url: string, init?: RequestInit) => Promise<any>
  ): Promise<ProjectSaveResult> {
    if (!targetProjectId || targetProjectId === 'ws_default_1') {
      return { success: false, error: 'INVALID_PROJECT_ID' };
    }

    const fetchImpl = customFetch || fetchWithAuth;

    if (this.savingProjects.has(targetProjectId)) {
      this.dirtyProjects.set(targetProjectId, true);
      return { success: false, error: 'SAVE_IN_PROGRESS_QUEUED' };
    }

    this.savingProjects.add(targetProjectId);

    try {
      do {
        this.dirtyProjects.set(targetProjectId, false);

        // Authoritative VFS extraction (supports empty {} snapshots natively)
        const vfsFilesMap = projectPreviewController.extractFilesFromVFS(targetProjectId);
        const cleanFiles: Record<string, string> = {};
        for (const [k, v] of Object.entries(vfsFilesMap) as [string, string][]) {
          if (!k.startsWith('/__anny_')) {
            cleanFiles[k] = v;
          }
        }

        const knownMeta = projectPreviewController.getProjectMetaById(targetProjectId);
        const targetProjectName = knownMeta?.name || fallbackProjectName;

        const res = await fetchImpl(`/api/anny/projects/${encodeURIComponent(targetProjectId)}/files`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: cleanFiles, name: targetProjectName }),
        });

        const data = typeof res.json === 'function' ? await res.json().catch(() => null) : res;
        const ok = res.ok !== undefined ? res.ok : true;

        if (ok && (data?.success || res.status === 200 || data?.project)) {
          const newVersion = data?.project?.version || 1;
          const previewUrl = data?.preview?.previewUrl || null;
          return {
            success: true,
            version: newVersion,
            previewUrl,
          };
        } else {
          const errorMsg = data?.error || `HTTP ${res.status || 500}`;
          throw new Error(errorMsg);
        }
      } while (this.dirtyProjects.get(targetProjectId));

      return { success: true };
    } catch (err: any) {
      this.dirtyProjects.set(targetProjectId, true);
      return { success: false, error: err?.message || 'Failed to save project files' };
    } finally {
      this.savingProjects.delete(targetProjectId);
    }
  }
}

export const projectSaveOrchestrator = ProjectSaveOrchestrator.getInstance();

/**
 * ANNY — Unified Creative Artifact & Revision Store
 *
 * Manages generated creative assets across:
 *  - Graphics Studio (Logos, Brand Kits, Images, Edited Images)
 *  - Video Studio (Generated Videos, Storyboards, Revisions, Extensions)
 *  - Music Studio (Audio Tracks, Lyrics, Production Specs)
 *  - Website Design Studio (Generated Websites & Full-Stack Apps)
 *  - Main ANNY Chat Workspace
 *
 * Rules:
 *  - Zero hardcoded seed/demo artifacts. Every record comes from a real generation event.
 *  - Preserves revision chains (parentArtifactId, revisionNumber) for iterative conversational edits.
 */

import type { ActiveArtifactContext, CreativeArtifactRecord, StudioProject } from './types';

const STORAGE_KEY_ARTIFACTS = 'anny_creative_artifacts_v1';
const STORAGE_KEY_PROJECTS = 'anny_studio_projects_v1';

class CreativeArtifactStore {
  private static instance: CreativeArtifactStore;
  private artifacts: CreativeArtifactRecord[] = [];
  private projects: StudioProject[] = [];
  private activeContext: ActiveArtifactContext | undefined;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.hydrateFromStorage();
  }

  public static getInstance(): CreativeArtifactStore {
    if (!CreativeArtifactStore.instance) {
      CreativeArtifactStore.instance = new CreativeArtifactStore();
    }
    return CreativeArtifactStore.instance;
  }

  private hydrateFromStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const rawArtifacts = window.localStorage.getItem(STORAGE_KEY_ARTIFACTS);
      if (rawArtifacts) {
        const parsed = JSON.parse(rawArtifacts);
        if (Array.isArray(parsed)) this.artifacts = parsed;
      }
      const rawProjects = window.localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (rawProjects) {
        const parsed = JSON.parse(rawProjects);
        if (Array.isArray(parsed)) this.projects = parsed;
      }
    } catch {
      // Ignore storage errors in restricted environments
    }
  }

  private persist(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      // Cap persisted storage to most recent 40 records to stay well within localStorage quota
      window.localStorage.setItem(STORAGE_KEY_ARTIFACTS, JSON.stringify(this.artifacts.slice(0, 40)));
      window.localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(this.projects.slice(0, 20)));
    } catch {
      // Ignore quota errors gracefully
    }
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // Ignore subscriber errors
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public ensureProject(name = 'King Ken Studios Workspace', organization = 'King Ken Studios'): StudioProject {
    const existing = this.projects.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    const now = new Date().toISOString();
    const created: StudioProject = {
      id: `studio_proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      organization,
      createdAt: now,
      updatedAt: now,
      artifactIds: [],
    };
    this.projects.unshift(created);
    this.persist();
    return created;
  }

  public listProjects(): StudioProject[] {
    return [...this.projects];
  }

  public saveArtifact(record: CreativeArtifactRecord): CreativeArtifactRecord {
    const idx = this.artifacts.findIndex((a) => a.id === record.id);
    if (idx >= 0) {
      this.artifacts[idx] = record;
    } else {
      this.artifacts.unshift(record);
    }

    const project = this.projects.find((p) => p.id === record.projectId) || this.ensureProject();
    if (!project.artifactIds.includes(record.id)) {
      project.artifactIds.unshift(record.id);
    }
    project.updatedAt = new Date().toISOString();

    this.activeContext = {
      artifactId: record.id,
      domain: record.domain,
      category: record.category,
      prompt: record.prompt,
      brandName: record.metadata?.brandName || record.metadata?.logoPlan?.brandName,
      logoPlan: record.metadata?.logoPlan,
      videoInteractionId: record.metadata?.interactionId,
      videoJobId: record.metadata?.jobId,
      hasVfsProject: record.domain === 'APPLICATION' ? true : this.activeContext?.hasVfsProject,
    };

    this.persist();
    return record;
  }

  public getArtifactById(id: string): CreativeArtifactRecord | undefined {
    return this.artifacts.find((a) => a.id === id);
  }

  public listArtifacts(filter?: {
    studio?: CreativeArtifactRecord['studio'];
    domain?: CreativeArtifactRecord['domain'];
    projectId?: string;
  }): CreativeArtifactRecord[] {
    return this.artifacts.filter((a) => {
      if (filter?.studio && a.studio !== filter.studio) return false;
      if (filter?.domain && a.domain !== filter.domain) return false;
      if (filter?.projectId && a.projectId !== filter.projectId) return false;
      return true;
    });
  }

  public getRevisionHistory(artifactId: string): CreativeArtifactRecord[] {
    const chain: CreativeArtifactRecord[] = [];
    let current = this.getArtifactById(artifactId);
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.push(current);
      current = current.parentArtifactId ? this.getArtifactById(current.parentArtifactId) : undefined;
    }
    return chain;
  }

  public deleteArtifact(id: string): void {
    this.artifacts = this.artifacts.filter((a) => a.id !== id);
    this.projects.forEach((p) => {
      p.artifactIds = p.artifactIds.filter((aid) => aid !== id);
    });
    if (this.activeContext?.artifactId === id) {
      this.activeContext = undefined;
    }
    this.persist();
  }

  public getActiveContext(): ActiveArtifactContext | undefined {
    return this.activeContext ? { ...this.activeContext } : undefined;
  }

  public setActiveContext(ctx: ActiveArtifactContext | undefined): void {
    this.activeContext = ctx ? { ...ctx } : undefined;
  }

  public clearAll(): void {
    this.artifacts = [];
    this.projects = [];
    this.activeContext = undefined;
    this.persist();
  }
}

export const creativeArtifactStore = CreativeArtifactStore.getInstance();

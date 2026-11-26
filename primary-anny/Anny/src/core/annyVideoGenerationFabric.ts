/**
 * ANNY — Repaired Video Generation & Storyboard Fabric (Client/Shared Facade)
 *
 * REPAIRS APPLIED:
 *  - Eliminated dishonest behavior where empty videoUrl ('') was marked status: 'GENERATED'.
 *  - Connects to the real server-side /api/creative/video/* job lifecycle backed by
 *    gemini-omni-1.2-flash (Interactions API) with real MP4 playability validation.
 *  - Clearly distinguishes COMPLETED (verified playable video), STORYBOARD_PLAN_ONLY,
 *    PROVIDER_UNCONFIGURED, GENERATING, and FAILED states.
 *  - Preserves backwards-compatible signatures & fields for existing kernel/reality suites
 *    without ever faking GENERATED video URLs.
 */

import type { VideoIntentCategory, VideoJobRecord, VideoJobStatus, VideoProductionPlan } from '../creative/types';
import { fetchWithAuth } from '../lib/apiUtils';

export interface CinematicPipelineRequest {
  jobId?: string;
  projectId?: string;
  organizationId?: string;
  organizationScope?: string;
  targetOrganization?: string;
  operation?: string;
  userId?: string;
  prompt?: string;
  conceptPrompt?: string;
  category?: VideoIntentCategory;
  mode?: VideoJobRecord['mode'];
  aspectRatio?: '16:9' | '9:16';
  durationSeconds?: number;
  targetDurationSeconds?: number;
  fps?: number;
  resolution?: '720p' | '1080p' | '4k';
  classification?: string;
  currentStage?: string;
  stagesCompleted?: string[];
  referenceImages?: Array<{ mimeType: string; data: string; name?: string }>;
  referenceVideo?: { mimeType: string; data: string; name?: string };
  parentJobId?: string;
  previousInteractionId?: string;
  planOnly?: boolean;
}

export interface LegacyCompatibleStoryboardPlan extends VideoProductionPlan {
  scenes: VideoProductionPlan['shots'];
  script: string;
  directorNotes: string;
}

export interface VideoGenerationPipelineResult {
  jobId: string;
  status: VideoJobStatus | 'GENERATED' | 'HARDWARE_INSUFFICIENT' | 'UNAUTHENTICATED' | 'PROVIDER_OFFLINE';
  videoUrl: string;
  playableValidated: boolean;
  provider: string;
  model: string;
  interactionId?: string;
  productionPlan?: VideoProductionPlan;
  storyboard?: VideoProductionPlan['shots'];
  hardwareCheck: {
    vramAvailableGb: number;
    isSufficient: boolean;
    delegatedToCloud: boolean;
  };
  stageMessage: string;
  diagnostics: string[];
  error?: string;
  recoveryGuidance?: string;
}

export type VideoGenerationResult = VideoGenerationPipelineResult;

export function normalizeRequestedVideoResolution(value: unknown): '720p' | '1080p' | '4k' {
  if (value === '4k') return '4k';
  if (value === '1080p') return '1080p';
  return '720p';
}

class AnnyVideoGenerationFabric {
  private static instance: AnnyVideoGenerationFabric;
  private recentJobs: Map<string, VideoJobRecord> = new Map();

  private constructor() {}

  public static getInstance(): AnnyVideoGenerationFabric {
    if (!AnnyVideoGenerationFabric.instance) {
      AnnyVideoGenerationFabric.instance = new AnnyVideoGenerationFabric();
    }
    return AnnyVideoGenerationFabric.instance;
  }

  public async startVideoPipeline(request: CinematicPipelineRequest): Promise<VideoGenerationPipelineResult> {
    const prompt = (request.prompt || request.conceptPrompt || '').trim();
    const durationSeconds = request.durationSeconds || request.targetDurationSeconds || 8;
    // Preserve the requested quality tier. The server/provider must report unsupported
    // resolutions explicitly; silently downgrading 4K to 1080p is misleading.
    const resolution = normalizeRequestedVideoResolution(request.resolution);

    const response = await fetchWithAuth('/api/creative/video/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        prompt,
        durationSeconds,
        resolution,
      }),
    });

    const job: VideoJobRecord = await response.json();
    if (!job?.jobId) {
      throw new Error((job as any)?.error || `Video job submission failed (${response.status}).`);
    }

    this.recentJobs.set(job.jobId, job);
    return this.toResult(job);
  }

  public async pollVideoJob(jobId: string): Promise<VideoGenerationPipelineResult> {
    const response = await fetchWithAuth(`/api/creative/video/jobs/${encodeURIComponent(jobId)}`);
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail?.error || `Failed to query video job status (${response.status}).`);
    }
    const job: VideoJobRecord = await response.json();
    this.recentJobs.set(job.jobId, job);
    return this.toResult(job);
  }

  public async generateStoryboardPlan(request: CinematicPipelineRequest): Promise<LegacyCompatibleStoryboardPlan> {
    const prompt = (request.prompt || request.conceptPrompt || '').trim();
    const durationSeconds = request.durationSeconds || request.targetDurationSeconds || 8;
    const response = await fetchWithAuth('/api/creative/video/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, prompt, durationSeconds }),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail?.error || 'Storyboard planning failed.');
    }
    const data = await response.json();
    const plan: VideoProductionPlan = data.plan;
    return {
      ...plan,
      scenes: plan.shots,
      script: plan.narrationScript || plan.conceptSummary,
      directorNotes: plan.musicAndSoundDirection,
    };
  }

  /**
   * Backwards-compatible aliases — NEVER fabricate GENERATED status on empty video URLs.
   */
  public async planCinematicStoryboard(
    promptOrRequest: string | CinematicPipelineRequest,
    durationSeconds?: number,
    organizationId?: string
  ): Promise<LegacyCompatibleStoryboardPlan> {
    const req: CinematicPipelineRequest =
      typeof promptOrRequest === 'string'
        ? { prompt: promptOrRequest, durationSeconds, organizationId }
        : promptOrRequest;
    return this.generateStoryboardPlan(req);
  }

  public async executeVideoJob(promptOrRequest: string | CinematicPipelineRequest): Promise<VideoGenerationPipelineResult> {
    const req: CinematicPipelineRequest =
      typeof promptOrRequest === 'string' ? { prompt: promptOrRequest } : promptOrRequest;
    return this.startVideoPipeline(req);
  }

  public async orchestrateCinematicPipeline(
    promptOrRequest: string | CinematicPipelineRequest,
    _legacyArg?: any
  ): Promise<VideoGenerationPipelineResult> {
    const req: CinematicPipelineRequest =
      typeof promptOrRequest === 'string' ? { prompt: promptOrRequest } : promptOrRequest;
    return this.startVideoPipeline(req);
  }

  public async listJobs(): Promise<VideoJobRecord[]> {
    try {
      const response = await fetchWithAuth('/api/creative/video/jobs');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.jobs)) {
          data.jobs.forEach((j: VideoJobRecord) => this.recentJobs.set(j.jobId, j));
          return data.jobs;
        }
      }
    } catch {
      // Fallback to local cache
    }
    return Array.from(this.recentJobs.values());
  }

  private toResult(job: VideoJobRecord): VideoGenerationPipelineResult {
    // STRICT TRUTH GUARD: Never expose a videoUrl unless the backend verified playability and COMPLETED status.
    const verifiedUrl = job.status === 'COMPLETED' && job.playableValidated && job.videoUrl ? job.videoUrl : '';
    return {
      jobId: job.jobId,
      status: job.status,
      videoUrl: verifiedUrl,
      playableValidated: Boolean(job.playableValidated && verifiedUrl),
      provider: job.provider,
      model: job.model,
      interactionId: job.interactionId,
      productionPlan: job.productionPlan,
      storyboard: job.productionPlan?.shots,
      hardwareCheck: {
        vramAvailableGb: 0,
        isSufficient: false,
        delegatedToCloud: job.provider === 'gemini-omni-video',
      },
      stageMessage: job.stageMessage,
      diagnostics: [job.stageMessage, ...(job.error ? [job.error] : [])],
      error: job.error,
      recoveryGuidance: job.recoveryGuidance,
    };
  }
}

export const annyVideoGenerationFabric = AnnyVideoGenerationFabric.getInstance();

/**
 * ANNY — TEMPORAL SCENE MEMORY
 * Bounded sliding-window memory of recent motion, tracked entities, scene changes,
 * and AI observations. Prevents unbounded memory growth and produces concise,
 * truthful temporal context for ANNY's chat, voice, and spatial reasoning.
 */

import type {
  AiDetectedObject,
  AiVisionObservation,
  MotionAnalysisResult,
  TrackedEntity,
  TrackingEvent,
  VisionInputSource,
} from './types';

export interface TemporalMemoryOptions {
  maxEvents?: number;
  maxObservations?: number;
  maxMotionSamples?: number;
  staleAfterMs?: number;
}

export interface TemporalMotionSample {
  timestamp: number;
  motionScore: number;
  cameraMoving: boolean;
  objectMotionActive: boolean;
  sceneChanged: boolean;
  regionCount: number;
}

export class TemporalSceneMemory {
  private readonly maxEvents: number;
  private readonly maxObservations: number;
  private readonly maxMotionSamples: number;
  private readonly staleAfterMs: number;

  private events: TrackingEvent[] = [];
  private observations: AiVisionObservation[] = [];
  private motionSamples: TemporalMotionSample[] = [];
  private activeTracks: TrackedEntity[] = [];
  private lastUpdatedAt = 0;

  constructor(options: TemporalMemoryOptions = {}) {
    this.maxEvents = Math.max(10, options.maxEvents ?? 80);
    this.maxObservations = Math.max(3, options.maxObservations ?? 20);
    this.maxMotionSamples = Math.max(10, options.maxMotionSamples ?? 60);
    this.staleAfterMs = Math.max(2000, options.staleAfterMs ?? 15_000);
  }

  recordFramePerception(
    motion: MotionAnalysisResult,
    tracks: TrackedEntity[],
    trackingEvents: TrackingEvent[]
  ): void {
    this.lastUpdatedAt = motion.timestamp;
    this.activeTracks = tracks.map((t) => ({ ...t }));

    this.motionSamples.push({
      timestamp: motion.timestamp,
      motionScore: motion.motionScore,
      cameraMoving: motion.cameraMoving,
      objectMotionActive: motion.objectMotionActive,
      sceneChanged: motion.sceneChanged,
      regionCount: motion.regions.length,
    });
    if (this.motionSamples.length > this.maxMotionSamples) {
      this.motionSamples.splice(0, this.motionSamples.length - this.maxMotionSamples);
    }

    if (motion.sceneChanged) {
      this.pushEvent({
        id: `scene_${motion.frameIndex}_${motion.timestamp}`,
        type: 'scene_changed',
        timestamp: motion.timestamp,
        summary: `Significant scene change detected (delta ${Math.round(motion.sceneChangeMagnitude * 100)}%)`,
        magnitude: motion.sceneChangeMagnitude,
      });
    } else if (motion.cameraMoving) {
      const last = this.events[this.events.length - 1];
      const shouldRecordCam =
        !last || last.type !== 'camera_motion' || motion.timestamp - last.timestamp > 2500;
      if (shouldRecordCam) {
        this.pushEvent({
          id: `cam_${motion.frameIndex}_${motion.timestamp}`,
          type: 'camera_motion',
          timestamp: motion.timestamp,
          summary: `Camera moving ${motion.cameraMotion.direction}`,
          magnitude: motion.cameraMotion.magnitude,
        });
      }
    }

    for (const evt of trackingEvents) {
      this.pushEvent(evt);
    }
  }

  recordAiObservation(observation: AiVisionObservation): void {
    this.lastUpdatedAt = Math.max(this.lastUpdatedAt, observation.timestamp);
    this.observations.push(observation);
    if (this.observations.length > this.maxObservations) {
      this.observations.splice(0, this.observations.length - this.maxObservations);
    }
  }

  private pushEvent(event: TrackingEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
  }

  isStale(now = Date.now()): boolean {
    if (this.lastUpdatedAt === 0) return true;
    return now - this.lastUpdatedAt > this.staleAfterMs;
  }

  getLatestObservation(): AiVisionObservation | null {
    return this.observations.length > 0 ? this.observations[this.observations.length - 1] : null;
  }

  getRecentEvents(limit = 10): TrackingEvent[] {
    return this.events.slice(-Math.max(1, limit));
  }

  getActiveTracks(): TrackedEntity[] {
    return this.activeTracks;
  }

  getRecentObjects(): AiDetectedObject[] {
    const latest = this.getLatestObservation();
    return latest ? latest.objects : [];
  }

  getCounts(): { events: number; observations: number; motionSamples: number; tracks: number } {
    return {
      events: this.events.length,
      observations: this.observations.length,
      motionSamples: this.motionSamples.length,
      tracks: this.activeTracks.length,
    };
  }

  /**
   * Builds a concise, truthful temporal perception summary for LLM chat/voice context.
   * Explicitly states when vision is inactive or stale rather than guessing.
   */
  buildPromptContext(options: {
    active: boolean;
    source: VisionInputSource | null;
    provider: string;
    now?: number;
  }): string {
    const now = options.now ?? Date.now();
    if (!options.active) {
      return 'LIVE VISION STATUS: Inactive (camera/video stream is currently off). Do not claim to see the user or their environment unless they attach an image or start Vision.';
    }

    const stale = this.isStale(now);
    const latestObs = this.getLatestObservation();
    const recentMotion = this.motionSamples.slice(-8);
    const anyCameraMove = recentMotion.some((s) => s.cameraMoving);
    const anyObjMove = recentMotion.some((s) => s.objectMotionActive);
    const recentEvts = this.events.slice(-6);

    const lines: string[] = [
      `LIVE VISION STATUS: Active (${options.source || 'camera'}, provider: ${options.provider || 'local'}${stale ? ', WARNING: feed data is stale' : ''}).`,
    ];

    if (latestObs) {
      const ageSec = Math.max(0, Math.round((now - latestObs.timestamp) / 1000));
      lines.push(
        `LATEST AI SCENE OBSERVATION (${ageSec}s ago via ${latestObs.provider}/${latestObs.model}, mode=${latestObs.rawMode}): ${latestObs.description}`
      );
      if (latestObs.objects.length > 0) {
        const objSummary = latestObs.objects
          .slice(0, 10)
          .map((o) => `${o.label} (${Math.round(o.confidence * 100)}%)`)
          .join(', ');
        lines.push(`AI-IDENTIFIED OBJECTS: ${objSummary}`);
      }
    } else {
      lines.push(
        'LATEST AI SCENE OBSERVATION: None yet (only local pixel motion/tracking is running; do not invent semantic object identities beyond what is listed).'
      );
    }

    if (this.activeTracks.length > 0) {
      const trackList = this.activeTracks
        .slice(0, 8)
        .map(
          (t) =>
            `${t.trackId}: ${t.label} [${t.source}, dir=${t.velocity.direction}, age=${t.ageFrames}f, pos=(${t.centroid.x.toFixed(2)},${t.centroid.y.toFixed(2)})]`
        )
        .join('; ');
      lines.push(`ACTIVE TRACKED REGIONS/ENTITIES: ${trackList}`);
    } else {
      lines.push('ACTIVE TRACKED REGIONS/ENTITIES: None currently moving or tracked.');
    }

    lines.push(
      `MOTION STATE: camera=${anyCameraMove ? 'moving' : 'stable'}, independent_object_motion=${anyObjMove ? 'detected' : 'quiet'}.`
    );

    if (recentEvts.length > 0) {
      const evtText = recentEvts
        .map((e) => {
          const ago = Math.max(0, Math.round((now - e.timestamp) / 1000));
          return `-${ago}s: ${e.summary}`;
        })
        .join(' | ');
      lines.push(`RECENT VISUAL EVENTS: ${evtText}`);
    }

    return lines.join('\n');
  }

  clear(): void {
    this.events = [];
    this.observations = [];
    this.motionSamples = [];
    this.activeTracks = [];
    this.lastUpdatedAt = 0;
  }
}

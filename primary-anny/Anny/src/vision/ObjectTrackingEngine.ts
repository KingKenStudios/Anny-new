/**
 * ANNY — MULTI-FRAME OBJECT & MOTION TRACKING ENGINE
 * Associates detections/regions across consecutive frames using IoU + centroid proximity,
 * maintains persistent track IDs, computes smoothed velocity & direction vectors,
 * and emits honest appearance, movement, and disappearance events.
 */

import { buildMotionVector } from './MotionAnalysisEngine';
import type {
  AiDetectedObject,
  LocalPoseResult,
  MotionRegion,
  NormalizedBox,
  TrackedEntity,
  TrackingEvent,
} from './types';

export interface TrackingObservation {
  label: string;
  source: 'local_motion' | 'local_pose' | 'ai_vision';
  box: NormalizedBox;
  confidence: number;
}

export interface ObjectTrackingOptions {
  /** Frames a track can be missing before exiting (default 6) */
  maxMissedFrames?: number;
  /** Maximum normalized distance between predicted centroid and candidate observation */
  maxMatchDistance?: number;
  /** Minimum IoU bonus match */
  minIouMatch?: number;
  /** Position smoothing factor (0..1, higher follows new observation faster) */
  alpha?: number;
  /** Velocity smoothing factor */
  beta?: number;
  /** Maximum concurrent active tracks */
  maxActiveTracks?: number;
}

export function computeBoxIoU(a: NormalizedBox, b: NormalizedBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const interArea = interW * interH;
  if (interArea <= 0) return 0;
  const areaA = Math.max(1e-6, a.w * a.h);
  const areaB = Math.max(1e-6, b.w * b.h);
  return interArea / (areaA + areaB - interArea);
}

function boxCentroid(box: NormalizedBox): { x: number; y: number } {
  return {
    x: Number((box.x + box.w / 2).toFixed(4)),
    y: Number((box.y + box.h / 2).toFixed(4)),
  };
}

export class ObjectTrackingEngine {
  private tracks = new Map<string, TrackedEntity>();
  private nextTrackNum = 1;
  private nextEventNum = 1;
  private readonly maxMissedFrames: number;
  private readonly maxMatchDistance: number;
  private readonly minIouMatch: number;
  private readonly alpha: number;
  private readonly beta: number;
  private readonly maxActiveTracks: number;

  constructor(options: ObjectTrackingOptions = {}) {
    this.maxMissedFrames = Math.max(2, options.maxMissedFrames ?? 6);
    this.maxMatchDistance = options.maxMatchDistance ?? 0.24;
    this.minIouMatch = options.minIouMatch ?? 0.08;
    this.alpha = options.alpha ?? 0.55;
    this.beta = options.beta ?? 0.45;
    this.maxActiveTracks = Math.max(4, options.maxActiveTracks ?? 16);
  }

  /**
   * Advances tracker with current frame observations (local motion regions and/or pose).
   */
  update(
    observations: TrackingObservation[],
    timestamp = Date.now()
  ): { tracks: TrackedEntity[]; events: TrackingEvent[] } {
    const events: TrackingEvent[] = [];
    const activeTrackIds = Array.from(this.tracks.keys());
    const matchedTrackIds = new Set<string>();
    const matchedObsIndices = new Set<number>();

    // Build candidate pairs scored by IoU + proximity to velocity-predicted centroid
    const pairs: Array<{ trackId: string; obsIdx: number; score: number }> = [];

    for (const trackId of activeTrackIds) {
      const trk = this.tracks.get(trackId)!;
      const predX = trk.centroid.x + trk.velocity.dx;
      const predY = trk.centroid.y + trk.velocity.dy;

      for (let i = 0; i < observations.length; i++) {
        const obs = observations[i];
        const obsC = boxCentroid(obs.box);
        const dist = Math.hypot(obsC.x - predX, obsC.y - predY);
        const iou = computeBoxIoU(trk.box, obs.box);

        if (iou >= this.minIouMatch || dist <= this.maxMatchDistance) {
          // Higher score is better
          const sourceBonus = trk.source === obs.source ? 0.12 : 0;
          const score = iou * 1.4 + Math.max(0, 1 - dist / this.maxMatchDistance) + sourceBonus;
          pairs.push({ trackId, obsIdx: i, score });
        }
      }
    }

    // Greedy optimal matching by highest score
    pairs.sort((a, b) => b.score - a.score);
    for (const pair of pairs) {
      if (matchedTrackIds.has(pair.trackId) || matchedObsIndices.has(pair.obsIdx)) continue;
      matchedTrackIds.add(pair.trackId);
      matchedObsIndices.add(pair.obsIdx);

      const trk = this.tracks.get(pair.trackId)!;
      const obs = observations[pair.obsIdx];
      const obsC = boxCentroid(obs.box);

      const rawDx = obsC.x - trk.centroid.x;
      const rawDy = obsC.y - trk.centroid.y;

      const smoothDx = this.beta * rawDx + (1 - this.beta) * trk.velocity.dx;
      const smoothDy = this.beta * rawDy + (1 - this.beta) * trk.velocity.dy;

      const smoothedBox: NormalizedBox = {
        x: Number((this.alpha * obs.box.x + (1 - this.alpha) * trk.box.x).toFixed(4)),
        y: Number((this.alpha * obs.box.y + (1 - this.alpha) * trk.box.y).toFixed(4)),
        w: Number((this.alpha * obs.box.w + (1 - this.alpha) * trk.box.w).toFixed(4)),
        h: Number((this.alpha * obs.box.h + (1 - this.alpha) * trk.box.h).toFixed(4)),
      };

      const nextVelocity = buildMotionVector(smoothDx, smoothDy, 0.008);
      const prevDir = trk.velocity.direction;

      // Preserve semantic label if previously enriched by AI or pose
      const nextLabel =
        obs.source === 'ai_vision' || obs.source === 'local_pose'
          ? obs.label
          : trk.source === 'ai_vision'
            ? trk.label
            : obs.label;

      trk.box = smoothedBox;
      trk.centroid = boxCentroid(smoothedBox);
      trk.velocity = nextVelocity;
      trk.label = nextLabel;
      trk.confidence = Number(Math.max(trk.confidence * 0.7, obs.confidence).toFixed(3));
      trk.lastSeenAt = timestamp;
      trk.ageFrames += 1;
      trk.missedFrames = 0;
      trk.state = 'active';

      // Emit movement event when direction changes significantly or strong sustained motion occurs
      if (
        trk.ageFrames >= 2 &&
        nextVelocity.magnitude >= 0.025 &&
        (prevDir === 'stationary' || prevDir !== nextVelocity.direction)
      ) {
        events.push({
          id: `evt_${this.nextEventNum++}`,
          type: 'moved',
          timestamp,
          trackId: trk.trackId,
          label: trk.label,
          summary: `${trk.label} (${trk.trackId}) moving ${nextVelocity.direction}`,
          box: trk.box,
          magnitude: nextVelocity.magnitude,
        });
      }
    }

    // Create new tracks for unmatched observations
    for (let i = 0; i < observations.length; i++) {
      if (matchedObsIndices.has(i)) continue;
      if (this.tracks.size >= this.maxActiveTracks) break;

      const obs = observations[i];
      const trackId = `trk_${this.nextTrackNum++}`;
      const centroid = boxCentroid(obs.box);
      const entity: TrackedEntity = {
        trackId,
        label: obs.label,
        source: obs.source,
        box: obs.box,
        centroid,
        velocity: buildMotionVector(0, 0),
        confidence: Number(obs.confidence.toFixed(3)),
        firstSeenAt: timestamp,
        lastSeenAt: timestamp,
        ageFrames: 1,
        missedFrames: 0,
        state: 'active',
      };
      this.tracks.set(trackId, entity);
      events.push({
        id: `evt_${this.nextEventNum++}`,
        type: 'appeared',
        timestamp,
        trackId,
        label: entity.label,
        summary: `${entity.label} (${trackId}) entered view`,
        box: entity.box,
      });
    }

    // Age unmatched tracks and prune expired ones
    for (const trackId of activeTrackIds) {
      if (matchedTrackIds.has(trackId)) continue;
      const trk = this.tracks.get(trackId)!;
      trk.missedFrames += 1;
      // Decay velocity while occluded
      trk.velocity = buildMotionVector(trk.velocity.dx * 0.65, trk.velocity.dy * 0.65, 0.008);

      if (trk.missedFrames > this.maxMissedFrames) {
        trk.state = 'exited';
        this.tracks.delete(trackId);
        if (trk.ageFrames >= 2) {
          events.push({
            id: `evt_${this.nextEventNum++}`,
            type: 'disappeared',
            timestamp,
            trackId: trk.trackId,
            label: trk.label,
            summary: `${trk.label} (${trk.trackId}) left view`,
            box: trk.box,
          });
        }
      } else {
        trk.state = 'occluded';
      }
    }

    return {
      tracks: Array.from(this.tracks.values()),
      events,
    };
  }

  /**
   * Helper converting MotionRegion[] and optional LocalPoseResult into TrackingObservation[].
   */
  static fromLocalInputs(
    regions: MotionRegion[],
    pose?: LocalPoseResult | null
  ): TrackingObservation[] {
    const obs: TrackingObservation[] = [];

    if (pose?.detected && pose.box) {
      obs.push({
        label: 'Person (Pose)',
        source: 'local_pose',
        box: pose.box,
        confidence: pose.confidence,
      });
    }

    for (const reg of regions) {
      // Avoid duplicate box directly on top of an already detected person pose
      if (pose?.detected && pose.box && computeBoxIoU(pose.box, reg.box) > 0.45) {
        continue;
      }
      obs.push({
        label: 'Moving Region',
        source: 'local_motion',
        box: reg.box,
        confidence: Math.min(0.95, Math.max(0.35, reg.intensity * 1.4)),
      });
    }
    return obs;
  }

  /**
   * Enriches matching existing tracks with semantic labels returned by online/local VLM AI.
   */
  enrichWithAiObjects(aiObjects: AiDetectedObject[], timestamp = Date.now()): TrackedEntity[] {
    for (const obj of aiObjects) {
      if (!obj.box || !obj.label) continue;
      let bestTrack: TrackedEntity | null = null;
      let bestScore = 0;
      const objC = boxCentroid(obj.box);

      for (const trk of this.tracks.values()) {
        const iou = computeBoxIoU(trk.box, obj.box);
        const dist = Math.hypot(trk.centroid.x - objC.x, trk.centroid.y - objC.y);
        const score = iou * 2 + Math.max(0, 1 - dist / 0.35);
        if ((iou > 0.1 || dist < 0.25) && score > bestScore) {
          bestScore = score;
          bestTrack = trk;
        }
      }

      if (bestTrack) {
        bestTrack.label = obj.label;
        bestTrack.source = 'ai_vision';
        bestTrack.confidence = Math.max(bestTrack.confidence, obj.confidence);
        bestTrack.lastSeenAt = timestamp;
      }
    }
    return Array.from(this.tracks.values());
  }

  getActiveTracks(): TrackedEntity[] {
    return Array.from(this.tracks.values());
  }

  reset(): void {
    this.tracks.clear();
    this.nextTrackNum = 1;
    this.nextEventNum = 1;
  }
}

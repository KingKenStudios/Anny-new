/**
 * ANNY — WORLD MODEL FOUNDATION
 * Evidence-based environmental representation with multi-organization scoping.
 */

import { hardwareIntelligenceEngine } from './annyHardwareIntelligence.ts';
import { OrganizationScope } from './CanonicalExecutionContext.ts';

export interface WorldObservation {
  id: string;
  organizationId: OrganizationScope;
  category: 'hardware' | 'runtime' | 'project' | 'network' | 'storage';
  key: string;
  value: any;
  source: string;
  timestamp: string;
  confidence: number;
  freshnessSeconds: number;
}

export class WorldModelEngine {
  private static instance: WorldModelEngine;
  private observations: Map<string, WorldObservation> = new Map();

  private constructor() {
    this.seedBaseline();
  }

  public static getInstance(): WorldModelEngine {
    if (!WorldModelEngine.instance) {
      WorldModelEngine.instance = new WorldModelEngine();
    }
    return WorldModelEngine.instance;
  }

  private seedBaseline(): void {
    const now = new Date().toISOString();
    this.observations.set('obs_global_os', {
      id: 'obs_global_os',
      organizationId: 'global',
      category: 'hardware',
      key: 'platform',
      value: typeof navigator !== 'undefined' ? navigator.platform : 'Linux Container',
      source: 'environment_detector',
      timestamp: now,
      confidence: 1.0,
      freshnessSeconds: 0
    });
  }

  public observe(obs: WorldObservation): void {
    this.observations.set(obs.id, obs);
  }

  public getObservation(id: string, requesterOrg: OrganizationScope = 'global'): WorldObservation | undefined {
    const obs = this.observations.get(id);
    if (!obs) return undefined;
    if (obs.organizationId !== 'global' && obs.organizationId !== requesterOrg) {
      return undefined;
    }
    return obs;
  }
}

export const worldModelEngine = WorldModelEngine.getInstance();

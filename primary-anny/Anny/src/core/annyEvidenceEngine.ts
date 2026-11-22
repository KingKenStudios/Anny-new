/**
 * ANNY — EVIDENCE & CONFIDENCE ENGINE
 * Epistemic classification distinguishing observed facts, retrieved knowledge, model inferences,
 * untested assumptions, and verified results with organization scoping.
 */

import { OrganizationScope } from './CanonicalExecutionContext.ts';

export type EvidenceType = 'observed_fact' | 'retrieved_knowledge' | 'model_inference' | 'untested_assumption' | 'verified_result';

export interface EvidenceItem {
  id: string;
  organizationId: OrganizationScope;
  type: EvidenceType;
  statement: string;
  source: string;
  confidence: number;
  provenance: string;
  verifiedAt?: string;
  isContradicted: boolean;
}

export class EvidenceEngine {
  private static instance: EvidenceEngine;
  private evidenceStore: Map<string, EvidenceItem> = new Map();

  private constructor() {}

  public static getInstance(): EvidenceEngine {
    if (!EvidenceEngine.instance) {
      EvidenceEngine.instance = new EvidenceEngine();
    }
    return EvidenceEngine.instance;
  }

  public registerEvidence(item: EvidenceItem): void {
    this.evidenceStore.set(item.id, item);
  }

  public getEvidence(id: string, requesterOrg: OrganizationScope = 'global'): EvidenceItem | undefined {
    const item = this.evidenceStore.get(id);
    if (!item) return undefined;
    if (item.organizationId !== 'global' && item.organizationId !== requesterOrg) {
      return undefined;
    }
    return item;
  }
}

export const evidenceEngine = EvidenceEngine.getInstance();

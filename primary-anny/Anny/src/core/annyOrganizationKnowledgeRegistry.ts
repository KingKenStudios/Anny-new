/**
 * ANNY — ORGANIZATION KNOWLEDGE REGISTRY & REALITY FABRIC
 * Authoritative registry for organizations (King Ken Studios, Keda, University, Technology Company,
 * and dynamic future ventures), provenance tracking, knowledge fact ingestion, and conflict resolution.
 */

import { OrganizationScope } from './CanonicalExecutionContext';

export type OrganizationType = 'COMPANY' | 'STUDIO' | 'PLATFORM' | 'UNIVERSITY' | 'PRODUCT' | 'PROJECT' | 'VENTURE' | 'SUBSIDIARY' | 'DEPARTMENT' | 'TEAM' | 'BANK' | 'FINTECH' | 'STARTUP' | 'HARDWARE' | 'ENGINEERING' | 'RESEARCH' | 'CREATIVE' | 'OTHER';

export type EvidenceStatus = 'VERIFIED' | 'SUPPORTED' | 'INFERRED' | 'UNVERIFIED' | 'CONTRADICTED' | 'UNKNOWN' | 'NOT_YET_INGESTED' | 'STALE';

export interface KnowledgeFact {
  factId: string;
  organizationId: OrganizationScope;
  subject: string;
  predicate: string;
  object: string;
  key?: string;
  value?: string;
  sourceType: string;
  sourceId: string;
  sourceLocation: string;
  provenance?: string;
  evidenceIds?: string[];
  confidence: number; // 0 - 1
  evidenceStatus: EvidenceStatus;
  discoveredAt: string;
  lastVerifiedAt: string;
  version: number;
}

export interface OrganizationRecord {
  organizationId: OrganizationScope;
  canonicalName: string;
  aliases: string[];
  description: string;
  mission: string;
  vision: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BOOTSTRAPPING' | 'UNKNOWN';
  organizationType: OrganizationType;
  products: string[];
  projects: string[];
  services: string[];
  technologies: string[];
  provenanceStatus: EvidenceStatus;
  createdAt: string;
  updatedAt: string;
}

export class OrganizationKnowledgeRegistry {
  private static instance: OrganizationKnowledgeRegistry;
  private organizations: Map<string, OrganizationRecord> = new Map();
  private knowledgeFacts: Map<string, KnowledgeFact[]> = new Map(); // orgId -> facts

  private constructor() {
    this.bootstrapFoundationalOrganizations();
  }

  public static getInstance(): OrganizationKnowledgeRegistry {
    if (!OrganizationKnowledgeRegistry.instance) {
      OrganizationKnowledgeRegistry.instance = new OrganizationKnowledgeRegistry();
    }
    return OrganizationKnowledgeRegistry.instance;
  }

  private bootstrapFoundationalOrganizations(): void {
    const now = new Date().toISOString();

    // 1. King Ken Studios
    this.registerOrganization({
      organizationId: 'king_ken_studios',
      canonicalName: 'King Ken Studios',
      aliases: ['KingKen', 'KKS'],
      description: 'Creative and technical studio and venture incubator.',
      mission: 'Build extraordinary software, media, and digital experiences.',
      vision: 'Pioneer next-generation autonomous systems and creative tools.',
      status: 'ACTIVE',
      organizationType: 'STUDIO',
      products: [],
      projects: ['AnnyOS', 'CreativeWorkflows'],
      services: ['Autonomous Media & Tech'],
      technologies: ['TypeScript', 'Python', 'React', 'AIOS'],
      provenanceStatus: 'VERIFIED',
      createdAt: now,
      updatedAt: now
    });

    // 2. Keda
    this.registerOrganization({
      organizationId: 'keda',
      canonicalName: 'Keda',
      aliases: ['KedaPlatform', 'KedaOS'],
      description: 'Autonomous platform and execution environment.',
      mission: 'Streamline automated infrastructure and intelligent pipelines.',
      vision: 'Autonomous reliability and scale for modern services.',
      status: 'ACTIVE',
      organizationType: 'PLATFORM',
      products: ['KedaEngine'],
      projects: ['keda_automation'],
      services: ['Pipeline Automation'],
      technologies: ['TypeScript', 'Node.js', 'Docker'],
      provenanceStatus: 'VERIFIED',
      createdAt: now,
      updatedAt: now
    });

    // 3. University
    this.registerOrganization({
      organizationId: 'university',
      canonicalName: 'The University',
      aliases: ['AcademicInstitution'],
      description: 'Academic research and educational institution.',
      mission: 'Advance research, learning, and intelligent systems.',
      vision: 'Empowering future minds through applied AI and rigorous scholarship.',
      status: 'ACTIVE',
      organizationType: 'UNIVERSITY',
      products: [],
      projects: ['ResearchLab'],
      services: ['Higher Education'],
      technologies: ['Research Systems'],
      provenanceStatus: 'SUPPORTED',
      createdAt: now,
      updatedAt: now
    });

    // 4. Technology Company
    this.registerOrganization({
      organizationId: 'technology_company',
      canonicalName: 'Technology Company',
      aliases: ['TechCo'],
      description: 'Commercial technology products and enterprise engineering.',
      mission: 'Deliver robust production-grade enterprise software.',
      vision: 'Scale intelligent developer tools worldwide.',
      status: 'ACTIVE',
      organizationType: 'COMPANY',
      products: ['EnterpriseSuite'],
      projects: ['CoreBackend'],
      services: ['Cloud SaaS'],
      technologies: ['TypeScript', 'PostgreSQL', 'Express'],
      provenanceStatus: 'VERIFIED',
      createdAt: now,
      updatedAt: now
    });
  }

  public registerOrganization(org: OrganizationRecord): void {
    this.organizations.set(org.organizationId, org);
    if (!this.knowledgeFacts.has(org.organizationId)) {
      this.knowledgeFacts.set(org.organizationId, []);
    }
  }

  public getOrganization(organizationId: string): OrganizationRecord | undefined {
    return this.organizations.get(organizationId);
  }

  public listOrganizations(): OrganizationRecord[] {
    return Array.from(this.organizations.values());
  }

  public createOrganization(
    organizationId: string,
    canonicalName: string,
    organizationType: OrganizationType,
    description: string = 'Dynamically created organization'
  ): OrganizationRecord {
    const now = new Date().toISOString();
    const newOrg: OrganizationRecord = {
      organizationId,
      canonicalName,
      aliases: [],
      description,
      mission: 'NOT_YET_INGESTED',
      vision: 'NOT_YET_INGESTED',
      status: 'BOOTSTRAPPING',
      organizationType,
      products: [],
      projects: [],
      services: [],
      technologies: [],
      provenanceStatus: 'UNVERIFIED',
      createdAt: now,
      updatedAt: now
    };
    this.registerOrganization(newOrg);
    return newOrg;
  }

  public addFact(
    organizationId: string,
    keyOrSubject: string,
    valueOrObject: string,
    confidence: number = 1.0,
    provenanceOrSourceType: string = 'MANUAL',
    evidenceIds: string[] = []
  ): KnowledgeFact {
    const orgFacts = this.knowledgeFacts.get(organizationId) || [];
    const now = new Date().toISOString();

    // Check for existing facts by key or subject
    const existingIndex = orgFacts.findIndex(
      f => f.key === keyOrSubject || (f.subject === keyOrSubject && f.predicate === 'has_property') || f.subject === keyOrSubject
    );

    const fact: KnowledgeFact = {
      factId: `fact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: organizationId as any,
      subject: keyOrSubject,
      predicate: 'has_property',
      object: valueOrObject,
      key: keyOrSubject,
      value: valueOrObject,
      sourceType: provenanceOrSourceType,
      sourceId: provenanceOrSourceType,
      sourceLocation: 'knowledge_registry',
      provenance: provenanceOrSourceType,
      evidenceIds: evidenceIds.length > 0 ? evidenceIds : [`ev_${Date.now()}`],
      confidence,
      evidenceStatus: confidence >= 0.8 ? 'VERIFIED' : 'SUPPORTED',
      discoveredAt: now,
      lastVerifiedAt: now,
      version: 1
    };

    if (existingIndex >= 0) {
      const existing = orgFacts[existingIndex];
      // If new fact has higher confidence, override or resolve conflict
      if (confidence >= existing.confidence) {
        fact.version = existing.version + 1;
        orgFacts[existingIndex] = fact;
      } else {
        fact.evidenceStatus = 'CONTRADICTED';
        orgFacts.push(fact);
      }
    } else {
      orgFacts.push(fact);
    }

    this.knowledgeFacts.set(organizationId, orgFacts);
    return fact;
  }

  public getFact(organizationId: string, keyOrSubject: string): KnowledgeFact | undefined {
    const facts = this.knowledgeFacts.get(organizationId) || [];
    // Return the latest/highest-confidence fact matching the key
    const matching = facts.filter(f => f.key === keyOrSubject || f.subject === keyOrSubject);
    if (matching.length === 0) return undefined;
    return matching.sort((a, b) => b.confidence - a.confidence)[0];
  }

  public ingestFact(fact: KnowledgeFact): void {
    const orgFacts = this.knowledgeFacts.get(fact.organizationId) || [];
    if (!fact.evidenceIds) {
      fact.evidenceIds = [];
    }
    // Check for conflicts
    const existingIndex = orgFacts.findIndex(f => f.subject === fact.subject && f.predicate === fact.predicate);
    if (existingIndex >= 0) {
      const existing = orgFacts[existingIndex];
      if (existing.object !== fact.object) {
        // Conflict detected!
        fact.evidenceStatus = 'CONTRADICTED';
      }
    }
    orgFacts.push(fact);
    this.knowledgeFacts.set(fact.organizationId, orgFacts);
  }

  public getFacts(organizationId: string): KnowledgeFact[] {
    return this.knowledgeFacts.get(organizationId) || [];
  }
}

export const organizationKnowledgeRegistry = OrganizationKnowledgeRegistry.getInstance();

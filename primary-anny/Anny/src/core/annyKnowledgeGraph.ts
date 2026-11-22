/**
 * ANNY — KNOWLEDGE GRAPH FOUNDATION (PHASE 11B)
 * Structured entity-relationship graph with multi-organization scoping (King Ken Studios, Keda, University, Technology Company).
 */

import { OrganizationScope } from './CanonicalExecutionContext.ts';

export type EntityType = 'project' | 'file' | 'component' | 'service' | 'dependency' | 'concept' | 'system' | 'database';

export interface GraphEntity {
  id: string;
  type: EntityType;
  name: string;
  organizationId: OrganizationScope;
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type RelationshipType = 'contains' | 'imports' | 'calls' | 'depends_on' | 'implements' | 'associated_with' | 'secures';

export interface GraphRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  weight: number;
  organizationId: OrganizationScope;
  properties: Record<string, any>;
}

export class KnowledgeGraphEngine {
  private static instance: KnowledgeGraphEngine;
  private entities: Map<string, GraphEntity> = new Map();
  private relationships: Map<string, GraphRelationship> = new Map();

  private constructor() {
    this.seedDefaultEntities();
  }

  public static getInstance(): KnowledgeGraphEngine {
    if (!KnowledgeGraphEngine.instance) {
      KnowledgeGraphEngine.instance = new KnowledgeGraphEngine();
    }
    return KnowledgeGraphEngine.instance;
  }

  private seedDefaultEntities(): void {
    this.addEntity({
      id: 'sys_anny',
      type: 'system',
      name: 'ANNY OS Global Intelligence',
      organizationId: 'global',
      properties: { version: '3.0', domain: 'autonomous_engineering' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  public addEntity(entity: GraphEntity): void {
    this.entities.set(entity.id, entity);
  }

  public getEntity(id: string, requesterOrg: OrganizationScope = 'global'): GraphEntity | undefined {
    const entity = this.entities.get(id);
    if (!entity) return undefined;
    if (entity.organizationId !== 'global' && entity.organizationId !== requesterOrg) {
      return undefined; // Strict isolation: block cross-org knowledge access
    }
    return entity;
  }

  public addRelationship(rel: GraphRelationship): void {
    this.relationships.set(rel.id, rel);
  }

  public queryGraph(queryText: string, requesterOrg: OrganizationScope = 'global'): GraphEntity[] {
    const lower = queryText.toLowerCase();
    const matched: GraphEntity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.organizationId === 'global' || entity.organizationId === requesterOrg) {
        if (entity.name.toLowerCase().includes(lower) || entity.type.toLowerCase().includes(lower)) {
          matched.push(entity);
        }
      }
    }
    return matched;
  }
}

export const knowledgeGraphEngine = KnowledgeGraphEngine.getInstance();

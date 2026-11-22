/**
 * ANNY — CANONICAL EXECUTION CONTEXT
 * Represents the execution state for a build pipeline,
 * managing the project, session, and VFS transaction lifecycle.
 */
import { MultimodalSessionState, annyMultimodalSessionManager } from './annyMultimodalSession';

export type TransactionStatus = 'CREATED' | 'LOCKED' | 'ACTIVE' | 'COMMITTED' | 'ROLLED_BACK' | 'RELEASED';
export type OrganizationScope = 'global' | 'king_ken_studios' | 'keda' | 'university' | 'technology_company' | string;

export interface CanonicalExecutionContext {
  projectId: string;
  sessionId: string;
  organizationId?: OrganizationScope;
  permissions?: string[];
  securityScope?: 'public' | 'internal' | 'confidential' | 'restricted';
  dataAccessScope?: string[];
  transactionId?: string;
  status: TransactionStatus;
  
  // Phase 16: Multimodal Session Context
  multimodalState?: MultimodalSessionState;

  // Phase 23: Canonical Trace Support
  taskType?: string;
  intentConfidence?: number;
}

export class ExecutionContextFactory {
  public static create(projectId: string, sessionId: string, organizationId: OrganizationScope = 'global'): CanonicalExecutionContext {
    return {
      projectId,
      sessionId,
      organizationId,
      permissions: ['READ_FILES', 'WRITE_FILES'],
      securityScope: 'internal',
      dataAccessScope: [organizationId, 'global'],
      status: 'CREATED',
      multimodalState: annyMultimodalSessionManager.getSessionState(sessionId)
    };
  }
}

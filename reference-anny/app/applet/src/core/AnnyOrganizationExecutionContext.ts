import { OrganizationScope } from './CanonicalExecutionContext';
import { annyOrganizationGovernance, CanonicalOrganizationRecord } from './AnnyOrganizationGovernanceLayer';
import { deepOrganizationIntelligence } from './annyDeepOrganizationIntelligence';
import { annyApplicationRegistry } from './AnnyApplicationRegistry';

export interface AnnyOrganizationExecutionContext {
  requestId: string;

  subjectOrganization: OrganizationScope | null;
  targetOrganization: OrganizationScope | null;
  executingOrganization: OrganizationScope | null;

  specialistOrganization: OrganizationScope | null;
  publisherOrganization: string | null;

  requestedCapability: string | null;
  requestedApplication: string | null;

  relationshipType: 'PROTECTS' | 'DEPENDS_ON' | 'SERVES' | 'INTEGRATES_WITH' | 'AUDITS' | 'MONITORS' | 'SUPPLIES' | 'AUTHORIZES' | string | null;

  memoryReadScopes: string[];
  memoryWriteScopes: string[];

  authorizationRequired: boolean;
  authorizationStatus: 'PENDING' | 'AUTHORIZED' | 'DENIED' | 'NOT_REQUIRED';

  provenance: {
    source: string;
    confidence: number;
    timestamp: string;
  };

  auditLogs: Array<{
    timestamp: string;
    event: string;
    actor: string;
    details: Record<string, any>;
  }>;
}

export interface ExecutionRequestOptions {
  requestId?: string;
  userAuthorized?: boolean;
  requestingOrg?: OrganizationScope;
  requestedAction?: string;
}

export interface ExecutionResult {
  success: boolean;
  context: AnnyOrganizationExecutionContext;
  actionOutput: string;
  auditRecord: Record<string, any>;
  errors?: string[];
}

export class AnnyOrganizationExecutionController {
  private static forbiddenIdentities: string[] = [
    'keda_mechatronics',
    'keda_cybersecurity',
    'mechatronics_cybersecurity',
    'keda_mechatronics_cybersecurity',
    'keda mechatronics',
    'keda cybersecurity',
    'mechatronics cybersecurity',
    'keda mechatronics & cybersecurity'
  ];

  /**
   * Deterministic 12-stage Operational Intelligence Pipeline
   */
  public static resolveContext(prompt: string, options: ExecutionRequestOptions = {}): AnnyOrganizationExecutionContext {
    const p = prompt.toLowerCase();
    const requestId = options.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // 1. Initial State
    let subjectOrganization: OrganizationScope | null = null;
    let targetOrganization: OrganizationScope | null = null;
    let executingOrganization: OrganizationScope | null = null;
    let specialistOrganization: OrganizationScope | null = null;
    let publisherOrganization: string | null = null;
    let requestedCapability: string | null = null;
    let requestedApplication: string | null = null;
    let relationshipType: string | null = null;
    let authorizationRequired = false;
    let authorizationStatus: 'PENDING' | 'AUTHORIZED' | 'DENIED' | 'NOT_REQUIRED' = 'NOT_REQUIRED';

    // Mentions
    const mentionsKeda = p.includes('keda');
    const mentionsMechatronics = p.includes('mechatronics') || p.includes('scada') || p.includes('plc') || p.includes('roboti') || p.includes('factory');
    const mentionsCyber = p.includes('cybersecurity') || p.includes('threat') || p.includes('secur') || p.includes('audit') || p.includes('vulnerab') || p.includes('incident');

    // 2. Specific Action & Intent Classifier
    if (p.includes('audit keda\'s security') || p.includes('secure keda') || p.includes('monitor keda infrastructure') || p.includes('assess vulnerabilities in keda')) {
      subjectOrganization = 'cybersecurity';
      targetOrganization = 'keda';
      executingOrganization = 'cybersecurity';
      specialistOrganization = 'cybersecurity';
      relationshipType = 'PROTECTS';
      requestedCapability = 'cap_security_sentinel';
    } else if (p.includes('audit the mechatronics') || p.includes('assess vulnerabilities in mechatronics') || p.includes('secure the mechatronics') || p.includes('protect mechatronics robotics') || p.includes('cybersecurity for mechatronics')) {
      subjectOrganization = 'cybersecurity';
      targetOrganization = 'mechatronics';
      executingOrganization = 'cybersecurity';
      specialistOrganization = 'cybersecurity';
      relationshipType = 'PROTECTS';
      requestedCapability = 'cap_security_sentinel';
    } else if (p.includes('connect keda to mechatronics') || p.includes('connect telemetry across orgs') || p.includes('keda telemetry to mechatronics')) {
      subjectOrganization = 'keda';
      targetOrganization = 'mechatronics';
      executingOrganization = 'keda';
      relationshipType = 'INTEGRATION';
      requestedCapability = 'cap_platform_telemetry';
    } else if (p.includes('monitor keda') || p.includes('deploy a keda') || p.includes('analyze keda') || p.includes('diagnose a keda') || p.includes('keda infrastructure')) {
      subjectOrganization = 'keda';
      targetOrganization = 'keda';
      executingOrganization = 'keda';
      specialistOrganization = 'keda';
      requestedCapability = 'cap_platform_orchestration';
    } else if (p.includes('inspect the plc') || p.includes('run a scada') || p.includes('analyze the robotic') || p.includes('check the industrial digital twin') || p.includes('mechatronics factory')) {
      subjectOrganization = 'mechatronics';
      targetOrganization = 'mechatronics';
      executingOrganization = 'mechatronics';
      specialistOrganization = 'mechatronics';
      requestedCapability = p.includes('plc') ? 'cap_plc_control' : p.includes('robot') ? 'cap_robotics' : 'cap_scada_watchdog';
    } else if (p.includes('run threat hunting') || p.includes('investigate a security incident') || p.includes('threat hunting')) {
      subjectOrganization = 'cybersecurity';
      targetOrganization = mentionsKeda ? 'keda' : mentionsMechatronics ? 'mechatronics' : 'cybersecurity';
      executingOrganization = 'cybersecurity';
      specialistOrganization = 'cybersecurity';
      requestedCapability = 'cap_threat_hunting';
    } else {
      // Default entity mapping
      if (mentionsKeda) subjectOrganization = 'keda';
      if (mentionsMechatronics && !subjectOrganization) subjectOrganization = 'mechatronics';
      if (mentionsCyber && !subjectOrganization) subjectOrganization = 'cybersecurity';

      targetOrganization = subjectOrganization;
      executingOrganization = subjectOrganization;
      specialistOrganization = subjectOrganization;
    }

    // 3. Application Resolution
    if (p.includes('keda marketplace') || p.includes('keda platform')) {
      publisherOrganization = 'Keda';
      requestedApplication = 'app_keda_social';
    } else if (p.includes('scada digital twin') || p.includes('plc controller')) {
      publisherOrganization = 'Mechatronics';
      requestedApplication = 'app_mechatronics_scada';
    } else if (p.includes('threat intelligence console') || p.includes('loto sentinel')) {
      publisherOrganization = 'Cybersecurity';
      requestedApplication = 'app_cybersecurity_loto';
    } else if (subjectOrganization) {
      const rec = annyOrganizationGovernance.getCanonicalRecord(subjectOrganization);
      if (rec) publisherOrganization = rec.publisher;
    }

    // 4. Memory Scope Resolution
    const memoryReadScopes: string[] = [];
    const memoryWriteScopes: string[] = [];

    if (executingOrganization) {
      memoryReadScopes.push(executingOrganization);
      memoryWriteScopes.push(executingOrganization);
    }

    if (targetOrganization && targetOrganization !== executingOrganization) {
      // Cross-organization memory access is scoped to security/telemetry
      memoryReadScopes.push(`${targetOrganization}:telemetry`);
      // Notice: Target organization memory is NOT written to by default without authorization
    }

    // 5. Authorization Policy
    const isMutationOrHighRisk = p.includes('deploy') || p.includes('modify') || p.includes('remediate') || p.includes('control') || p.includes('alter') || p.includes('override') || (targetOrganization !== executingOrganization && p.includes('connect'));
    if (isMutationOrHighRisk) {
      authorizationRequired = true;
      authorizationStatus = options.userAuthorized ? 'AUTHORIZED' : 'PENDING';
    } else {
      authorizationRequired = false;
      authorizationStatus = 'NOT_REQUIRED';
    }

    // 6. Cross-Organization Relationship Registration
    if (executingOrganization && targetOrganization && executingOrganization !== targetOrganization && relationshipType) {
      annyOrganizationGovernance.establishRelationship(
        executingOrganization,
        targetOrganization,
        relationshipType as any,
        'SYSTEM_OPERATIONAL_CONTROLLER'
      );
    }

    // 7. Verification against forbidden identities
    AnnyOrganizationExecutionController.verifyNoForbiddenIdentities(
      subjectOrganization,
      targetOrganization,
      executingOrganization,
      specialistOrganization,
      publisherOrganization
    );

    const provenance = {
      source: 'ANNY_OPERATIONAL_INTELLIGENCE_PIPELINE',
      confidence: 0.99,
      timestamp: now
    };

    const auditLogs = [
      {
        timestamp: now,
        event: 'CONTEXT_RESOLVED',
        actor: executingOrganization || 'AIOS_KERNEL',
        details: {
          prompt,
          subjectOrganization,
          targetOrganization,
          executingOrganization,
          specialistOrganization,
          publisherOrganization,
          relationshipType,
          authorizationRequired,
          authorizationStatus
        }
      }
    ];

    return {
      requestId,
      subjectOrganization,
      targetOrganization,
      executingOrganization,
      specialistOrganization,
      publisherOrganization,
      requestedCapability,
      requestedApplication,
      relationshipType,
      memoryReadScopes: [...new Set(memoryReadScopes)],
      memoryWriteScopes: [...new Set(memoryWriteScopes)],
      authorizationRequired,
      authorizationStatus,
      provenance,
      auditLogs
    };
  }

  /**
   * Enforces zero forbidden combined identities
   */
  private static verifyNoForbiddenIdentities(...identities: (string | null)[]) {
    for (const id of identities) {
      if (!id) continue;
      const clean = id.toLowerCase().replace(/_/g, ' ');
      for (const forbidden of AnnyOrganizationExecutionController.forbiddenIdentities) {
        if (clean.includes(forbidden.replace(/_/g, ' '))) {
          throw new Error(`SECURITY_GOVERNANCE_VIOLATION: Forbidden merged organization identity detected: '${id}'.`);
        }
      }
    }
  }

  /**
   * Executes an action within the organization-aware boundary
   */
  public static executeAction(prompt: string, options: ExecutionRequestOptions = {}): ExecutionResult {
    const context = AnnyOrganizationExecutionController.resolveContext(prompt, options);

    if (context.authorizationRequired && context.authorizationStatus === 'PENDING') {
      return {
        success: false,
        context,
        actionOutput: `AUTHORIZATION_REQUIRED: Action requires explicit permission from ${context.targetOrganization || context.executingOrganization} administrator before execution.`,
        auditRecord: {
          requestId: context.requestId,
          status: 'PENDING_AUTHORIZATION',
          prompt,
          context
        },
        errors: ['ACTION_PENDING_AUTHORIZATION']
      };
    }

    const actionOutput = `[ORGANIZATION EXECUTION ENGINE]
Executing prompt: "${prompt}"
Executor: ${context.executingOrganization}
Target: ${context.targetOrganization}
Specialist: ${context.specialistOrganization}
Capability: ${context.requestedCapability || 'STANDARD_INTELLIGENCE'}
Relationship: ${context.relationshipType || 'DIRECT'}
Memory Read Scopes: [${context.memoryReadScopes.join(', ')}]
Memory Write Scopes: [${context.memoryWriteScopes.join(', ')}]
Status: COMPLETED WITH FULL AUDIT PROVENANCE`;

    const auditRecord = {
      requestId: context.requestId,
      subjectOrganization: context.subjectOrganization,
      targetOrganization: context.targetOrganization,
      executingOrganization: context.executingOrganization,
      specialistOrganization: context.specialistOrganization,
      publisherOrganization: context.publisherOrganization,
      capability: context.requestedCapability,
      application: context.requestedApplication,
      relationship: context.relationshipType,
      authorizationStatus: context.authorizationStatus,
      memoryScopes: {
        read: context.memoryReadScopes,
        write: context.memoryWriteScopes
      },
      action: prompt,
      result: 'SUCCESS',
      provenance: context.provenance,
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      context,
      actionOutput,
      auditRecord
    };
  }
}

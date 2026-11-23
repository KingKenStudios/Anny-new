import { OrganizationScope } from './CanonicalExecutionContext';

export interface CrossOrganizationRelationship {
  id: string;
  sourceOrganizationId: OrganizationScope;
  targetOrganizationId: OrganizationScope;
  relationshipType: 'INTEGRATION' | 'PROTECTS' | 'SERVICE_PROVIDER' | 'COLLABORATES' | 'DEPENDENCY';
  createdAt: string;
  provenance: {
    origin: string;
    trustScore: number;
    authorizedBy: string;
  };
}

export interface OrganizationIdentityProvenance {
  identitySource: string;
  identityConfidence: number;
  verifiedAt: string;
  verifiedBy: string;
}

export interface CanonicalOrganizationRecord {
  orgId: OrganizationScope;
  canonicalName: string;
  identityRole: string;
  primaryIndustry: string;
  domains: string[];
  allowedAliases: string[];
  capabilities: string[];
  agentOwner: string;
  publisher: string;
  provenance: OrganizationIdentityProvenance;
}

export interface GovernanceValidationResult {
  valid: boolean;
  reason?: string;
  errorCode?: string;
}

export interface OperationalRoleContext {
  subjectOrganization: OrganizationScope | null;
  targetOrganization: OrganizationScope | null;
  executingOrganization: OrganizationScope | null;
  specialistOrganization: OrganizationScope | null;
  publisherOrganization: OrganizationScope | null;
  relationship: string | null;
}

export class AnnyOrganizationGovernanceLayer {
  private static instance: AnnyOrganizationGovernanceLayer;

  private forbiddenIdentities: Set<string> = new Set([
    'keda_mechatronics',
    'keda_cybersecurity',
    'mechatronics_cybersecurity',
    'keda_mechatronics_cybersecurity',
    'keda_mechatronics_cybersecurity_company',
    'keda mechatronics',
    'keda cybersecurity',
    'keda mechatronics & cybersecurity',
    'keda mechatronics and cybersecurity',
    'keda industrial cybersecurity',
    'mechatronics cybersecurity company',
    'keda mechatronics cybersecurity',
  ]);

  private canonicalRegistry: Map<OrganizationScope, CanonicalOrganizationRecord> = new Map();
  private relationships: Map<string, CrossOrganizationRelationship> = new Map();

  private constructor() {
    this.seedCanonicalRegistry();
  }

  public static getInstance(): AnnyOrganizationGovernanceLayer {
    if (!AnnyOrganizationGovernanceLayer.instance) {
      AnnyOrganizationGovernanceLayer.instance = new AnnyOrganizationGovernanceLayer();
    }
    return AnnyOrganizationGovernanceLayer.instance;
  }

  private seedCanonicalRegistry() {
    const bootstrapProv: OrganizationIdentityProvenance = {
      identitySource: 'ANNY_MASTER_CONSTITUTION',
      identityConfidence: 1.0,
      verifiedAt: '2026-08-16T00:00:00Z',
      verifiedBy: 'AKINWUMI_GROUP_KERNEL',
    };

    // 0. Akinwumi Group (Parent Owner Organization)
    this.canonicalRegistry.set('akinwumi_group', {
      orgId: 'akinwumi_group',
      canonicalName: 'Akinwumi Group',
      identityRole: 'Sovereign Parent Organization & Technology Holding Group',
      primaryIndustry: 'AI Systems & Enterprise Technology',
      domains: [
        'sovereign_ai',
        'enterprise_governance',
        'aios_kernel',
        'multi_org_orchestration',
        'universal_languages',
      ],
      allowedAliases: ['Akinwumi Group', 'Akinwumi Kehinde / Akinwumi Group', 'Akinwumi'],
      capabilities: [
        'cap_aios_governance',
        'cap_universal_intelligence',
        'cap_multi_org_orchestration',
      ],
      agentOwner: 'AnnyCoreAgent',
      publisher: 'Akinwumi Group',
      provenance: bootstrapProv,
    });

    // 1. Keda
    this.canonicalRegistry.set('keda', {
      orgId: 'keda',
      canonicalName: 'Keda',
      identityRole: 'Technology Platform / Autonomous Digital Ecosystem',
      primaryIndustry: 'Social & E-Commerce',
      domains: [
        'platform_orchestration',
        'ecosystem_operations',
        'social_systems',
        'marketplace',
        'wallet',
        'platform_infrastructure',
        'telemetry',
        'devops',
      ],
      allowedAliases: ['Keda', 'KEDA', 'Keda Platform', 'Keda Ecosystem'],
      capabilities: [
        'cap_feed_recommendation',
        'cap_escrow_management',
        'cap_marketplace_orchestration',
        'cap_platform_telemetry',
      ],
      agentOwner: 'KedaAgent',
      publisher: 'Keda',
      provenance: bootstrapProv,
    });

    // 2. Mechatronics
    this.canonicalRegistry.set('mechatronics', {
      orgId: 'mechatronics',
      canonicalName: 'Mechatronics',
      identityRole: 'Independent Industrial Engineering & Automation Organization',
      primaryIndustry: 'Industrial Automation',
      domains: [
        'plc',
        'scada',
        'robotics',
        'industrial_automation',
        'sensors',
        'actuators',
        'digital_twins',
        'industrial_control',
        'loto_safety',
      ],
      allowedAliases: ['Mechatronics', 'Mechatronics Company', 'Mechatronics Systems', 'Mechatronics Industrial'],
      capabilities: [
        'cap_robotics',
        'cap_scada_watchdog',
        'cap_plc_control',
        'cap_digital_twin',
      ],
      agentOwner: 'MechatronicsSafetyAgent',
      publisher: 'Mechatronics',
      provenance: bootstrapProv,
    });

    // 3. Cybersecurity
    this.canonicalRegistry.set('cybersecurity', {
      orgId: 'cybersecurity',
      canonicalName: 'Cybersecurity',
      identityRole: 'Independent Digital Security Organization',
      primaryIndustry: 'Cybersecurity',
      domains: [
        'threat_hunting',
        'security_auditing',
        'vulnerability_assessment',
        'incident_response',
        'digital_forensics',
        'security_monitoring',
        'security_architecture',
      ],
      allowedAliases: ['Cybersecurity', 'Cyber Security', 'Cybersecurity Company', 'Cyber Security Org'],
      capabilities: [
        'cap_security_sentinel',
        'cap_threat_hunting',
        'cap_vulnerability_audit',
        'cap_forensics',
      ],
      agentOwner: 'ScadaAuditorAgent',
      publisher: 'Cybersecurity',
      provenance: bootstrapProv,
    });

    // 4. King Ken Studios
    this.canonicalRegistry.set('king_ken_studios', {
      orgId: 'king_ken_studios',
      canonicalName: 'King Ken Studios',
      identityRole: 'Creative Production, Media & Interactive Software Studio',
      primaryIndustry: 'Creative Media & Digital Production',
      domains: [
        'audio_production',
        'video_production',
        'image_generation',
        'broadcast_media',
        'creative_direction',
      ],
      allowedAliases: ['King Ken Studios', 'King Ken Studio', 'KKS'],
      capabilities: [
        'cap_creative_studio',
        'cap_media_synthesis',
        'cap_broadcast_pipeline',
      ],
      agentOwner: 'CreativeStudioAgent',
      publisher: 'King Ken Studios',
      provenance: bootstrapProv,
    });

    // Seed baseline canonical relationships
    this.establishRelationship('cybersecurity', 'keda', 'PROTECTS', 'AKINWUMI_GROUP_KERNEL');
    this.establishRelationship('cybersecurity', 'mechatronics', 'PROTECTS', 'AKINWUMI_GROUP_KERNEL');
  }

  public validateOrganizationRegistration(
    orgId: string,
    canonicalName: string,
    aliases: string[] = []
  ): GovernanceValidationResult {
    const lowerId = String(orgId || '').toLowerCase().trim();
    const lowerName = String(canonicalName || '').toLowerCase().trim();

    if (!lowerId || !lowerName) {
      return {
        valid: false,
        reason: 'Organization ID and canonical name are required.',
        errorCode: 'MISSING_FIELDS',
      };
    }

    for (const forbidden of this.forbiddenIdentities) {
      const normalizedForbiddenId = forbidden.replace(/[&\s]+/g, '_');
      if (
        lowerId === normalizedForbiddenId ||
        lowerId.includes(normalizedForbiddenId) ||
        lowerName.includes(forbidden)
      ) {
        return {
          valid: false,
          reason: 'IDENTITY_COLLISION_WARNING: Attempted to register a forbidden merged organization identity.',
          errorCode: 'FORBIDDEN_COMBINED_IDENTITY',
        };
      }

      for (const alias of aliases) {
        if (String(alias || '').toLowerCase().includes(forbidden)) {
          return {
            valid: false,
            reason: 'ALIAS_SAFETY_VIOLATION: Attempted to register a forbidden merged alias.',
            errorCode: 'FORBIDDEN_COMBINED_ALIAS',
          };
        }
      }
    }

    if (this.canonicalRegistry.has(lowerId as OrganizationScope)) {
      const existing = this.canonicalRegistry.get(lowerId as OrganizationScope)!;
      if (existing.canonicalName !== canonicalName) {
        return {
          valid: false,
          reason: `IDENTITY_COLLISION: Organization ID '${lowerId}' is already permanently registered as '${existing.canonicalName}'.`,
          errorCode: 'ID_COLLISION',
        };
      }
    }

    for (const record of this.canonicalRegistry.values()) {
      if (record.allowedAliases.some((a) => a.toLowerCase() === lowerName)) {
        if (record.orgId !== lowerId) {
          return {
            valid: false,
            reason: `ALIAS_COLLISION: '${canonicalName}' is an established alias for existing organization '${record.canonicalName}'.`,
            errorCode: 'ALIAS_COLLISION',
          };
        }
      }
    }

    return { valid: true };
  }

  public registerOrganization(
    orgId: string,
    canonicalName: string,
    identityRole: string,
    primaryIndustry: string,
    domains: string[],
    aliases: string[],
    provenance: OrganizationIdentityProvenance
  ): GovernanceValidationResult {
    const validation = this.validateOrganizationRegistration(orgId, canonicalName, aliases);
    if (!validation.valid) {
      return validation;
    }

    const cleanOrgId = orgId.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '_') as OrganizationScope;
    const newRecord: CanonicalOrganizationRecord = {
      orgId: cleanOrgId,
      canonicalName: canonicalName.trim(),
      identityRole: identityRole.trim() || 'Registered Organization',
      primaryIndustry: primaryIndustry.trim() || 'Technology',
      domains: domains.map((d) => d.trim()).filter(Boolean),
      allowedAliases: [...new Set([canonicalName.trim(), ...aliases.map((a) => a.trim()).filter(Boolean)])],
      capabilities: [],
      agentOwner: `${canonicalName.trim().replace(/\s+/g, '')}Agent`,
      publisher: canonicalName.trim(),
      provenance,
    };

    this.canonicalRegistry.set(cleanOrgId, newRecord);
    return { valid: true };
  }

  public isDomain(term: string): boolean {
    const t = term.toLowerCase().trim();
    for (const record of this.canonicalRegistry.values()) {
      if (record.domains.some((d) => d.toLowerCase() === t || d.replace(/_/g, ' ') === t)) {
        return true;
      }
    }
    const generalDomains = [
      'robotics',
      'scada',
      'plc',
      'industrial automation',
      'threat hunting',
      'security',
      'marketplace',
      'social platform',
    ];
    return generalDomains.includes(t);
  }

  public isOrganization(term: string): boolean {
    const t = term.toLowerCase().trim();
    for (const record of this.canonicalRegistry.values()) {
      if (record.orgId.toLowerCase() === t || record.canonicalName.toLowerCase() === t) {
        return true;
      }
      if (record.allowedAliases.some((a) => a.toLowerCase() === t)) {
        return true;
      }
    }
    return false;
  }

  public getCanonicalRecord(orgId: OrganizationScope): CanonicalOrganizationRecord | undefined {
    return this.canonicalRegistry.get(orgId);
  }

  public listCanonicalRecords(): CanonicalOrganizationRecord[] {
    return Array.from(this.canonicalRegistry.values());
  }

  public getProvenance(orgId: OrganizationScope): OrganizationIdentityProvenance | undefined {
    return this.canonicalRegistry.get(orgId)?.provenance;
  }

  public establishRelationship(
    source: OrganizationScope,
    target: OrganizationScope,
    type: 'INTEGRATION' | 'PROTECTS' | 'SERVICE_PROVIDER' | 'COLLABORATES' | 'DEPENDENCY',
    authorizedBy: string
  ): CrossOrganizationRelationship {
    for (const existing of this.relationships.values()) {
      if (
        existing.sourceOrganizationId === source &&
        existing.targetOrganizationId === target &&
        existing.relationshipType === type
      ) {
        return existing;
      }
    }
    const id = `rel_${source}_${target}_${type.toLowerCase()}_${Date.now()}`;
    const rel: CrossOrganizationRelationship = {
      id,
      sourceOrganizationId: source,
      targetOrganizationId: target,
      relationshipType: type,
      createdAt: new Date().toISOString(),
      provenance: {
        origin: 'SYSTEM_GOVERNANCE_ROUTER',
        trustScore: 1.0,
        authorizedBy,
      },
    };
    this.relationships.set(id, rel);
    return rel;
  }

  public listAllRelationships(): CrossOrganizationRelationship[] {
    return Array.from(this.relationships.values());
  }

  public getRelationships(orgId: OrganizationScope): CrossOrganizationRelationship[] {
    const result: CrossOrganizationRelationship[] = [];
    for (const rel of this.relationships.values()) {
      if (rel.sourceOrganizationId === orgId || rel.targetOrganizationId === orgId) {
        result.push(rel);
      }
    }
    return result;
  }

  public resolveOperationalRoles(prompt: string): OperationalRoleContext {
    const p = prompt.toLowerCase();
    let subjectOrganization: OrganizationScope | null = null;
    let targetOrganization: OrganizationScope | null = null;
    let executingOrganization: OrganizationScope | null = null;
    let specialistOrganization: OrganizationScope | null = null;
    let publisherOrganization: OrganizationScope | null = null;
    let relationship: string | null = null;

    const mentionsKeda = p.includes('keda');
    const mentionsMechatronics = p.includes('mechatronics') || p.includes('scada') || p.includes('plc') || p.includes('roboti');
    const mentionsCyber = p.includes('cybersecurity') || p.includes('threat') || p.includes('secur') || p.includes('audit');
    const mentionsStudios = p.includes('king ken') || p.includes('studio') || p.includes('broadcast');

    if (p.includes('secure keda') || p.includes('cybersecurity for keda') || p.includes("audit keda's security")) {
      targetOrganization = 'keda';
      specialistOrganization = 'cybersecurity';
      executingOrganization = 'cybersecurity';
      relationship = 'PROTECTS';
    } else if (
      p.includes('secure the mechatronics') ||
      p.includes('cybersecurity for mechatronics') ||
      p.includes('cybersecurity audit of the mechatronics')
    ) {
      targetOrganization = 'mechatronics';
      specialistOrganization = 'cybersecurity';
      executingOrganization = 'cybersecurity';
      relationship = 'PROTECTS';
    } else if (p.includes('connect keda') && p.includes('mechatronics')) {
      subjectOrganization = 'keda';
      targetOrganization = 'mechatronics';
      relationship = 'INTEGRATION';
    } else {
      if (mentionsKeda) subjectOrganization = 'keda';
      if (mentionsMechatronics && !subjectOrganization) subjectOrganization = 'mechatronics';
      if (mentionsCyber && !subjectOrganization) subjectOrganization = 'cybersecurity';
      if (mentionsStudios && !subjectOrganization) subjectOrganization = 'king_ken_studios';
    }

    if (p.includes('keda marketplace')) publisherOrganization = 'keda';
    if (p.includes('scada digital twin') || p.includes('plc controller')) publisherOrganization = 'mechatronics';
    if (p.includes('threat intelligence console')) publisherOrganization = 'cybersecurity';
    if (p.includes('king ken')) publisherOrganization = 'king_ken_studios';

    return {
      subjectOrganization,
      targetOrganization,
      executingOrganization,
      specialistOrganization,
      publisherOrganization,
      relationship,
    };
  }
}

export const annyOrganizationGovernance = AnnyOrganizationGovernanceLayer.getInstance();

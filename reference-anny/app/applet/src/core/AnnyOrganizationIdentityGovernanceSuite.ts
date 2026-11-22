import { AnnyBehavioralIdentityRouter } from './AnnyBehavioralIdentityRouter';
import { annyOrganizationGovernance } from './AnnyOrganizationGovernanceLayer';
import { deepOrganizationIntelligence } from './annyDeepOrganizationIntelligence';
import { annyOrganizationIntelligence } from './AnnyOrganizationIntelligence';
import { annyApplicationRegistry } from './AnnyApplicationRegistry';

export class AnnyOrganizationIdentityGovernanceSuite {
  public static runTests(): { passed: number; total: number; logs: string[] } {
    let passed = 0;
    const total = 20;
    const logs: string[] = [];

    const assert = (condition: boolean, message: string) => {
      if (condition) {
        passed++;
        logs.push(`✅ PASS: ${message}`);
      } else {
        logs.push(`❌ FAIL: ${message}`);
      }
    };

    try {
      // 1. Keda remains Keda (Canonical Identity Uniqueness)
      const kedaRec = annyOrganizationGovernance.getCanonicalRecord('keda');
      assert(kedaRec?.canonicalName === 'Keda' && kedaRec?.orgId === 'keda', 'Keda remains Keda.');

      // 2. Mechatronics remains Mechatronics
      const mechaRec = annyOrganizationGovernance.getCanonicalRecord('mechatronics');
      assert(mechaRec?.canonicalName === 'Mechatronics' && mechaRec?.orgId === 'mechatronics', 'Mechatronics remains Mechatronics.');

      // 3. Cybersecurity remains Cybersecurity
      const cyberRec = annyOrganizationGovernance.getCanonicalRecord('cybersecurity');
      assert(cyberRec?.canonicalName === 'Cybersecurity' && cyberRec?.orgId === 'cybersecurity', 'Cybersecurity remains Cybersecurity.');

      // 4. No merged organization can be registered (Forbidden Identity Detection)
      const invalidReg1 = annyOrganizationGovernance.validateOrganizationRegistration('keda_mechatronics', 'Keda Mechatronics');
      assert(invalidReg1.valid === false && invalidReg1.errorCode === 'FORBIDDEN_COMBINED_IDENTITY', 'No merged organization can be registered.');

      // 5. No forbidden alias can be registered (Alias Safety)
      const invalidAlias = annyOrganizationGovernance.validateOrganizationRegistration('test_org', 'Test Org', ['Keda Mechatronics & Cybersecurity']);
      assert(invalidAlias.valid === false && invalidAlias.errorCode === 'FORBIDDEN_COMBINED_ALIAS', 'No forbidden alias can be registered.');

      // 6. Domain cannot automatically become an organization
      const isPlcDomain = annyOrganizationGovernance.isDomain('plc');
      const isPlcOrg = annyOrganizationGovernance.isOrganization('plc');
      assert(isPlcDomain === true && isPlcOrg === false, 'Domain cannot automatically become an organization.');

      // 7. Specialist organization can operate on another without becoming that organization (Subject/Target/Specialist)
      const roles = annyOrganizationGovernance.resolveOperationalRoles('Secure the Mechatronics PLC network');
      assert(roles.targetOrganization === 'mechatronics' && roles.specialistOrganization === 'cybersecurity', 'Specialist organization operates on target without merging.');

      // 8. Cross-organization relationships preserve both identities
      const rel = annyOrganizationGovernance.establishRelationship('cybersecurity', 'keda', 'PROTECTS', 'SECURITY_AUDITOR');
      assert(rel.sourceOrganizationId === 'cybersecurity' && rel.targetOrganizationId === 'keda' && rel.relationshipType === 'PROTECTS', 'Cross-organization relationships preserve both identities.');

      // 9. Applications retain publisher ownership
      const kedaApp = annyApplicationRegistry.getApp('app_keda_social');
      const mechaApp = annyApplicationRegistry.getApp('app_mechatronics_scada');
      const cyberApp = annyApplicationRegistry.getApp('app_cybersecurity_loto');
      assert(kedaApp?.publisher === 'Keda' && mechaApp?.publisher === 'Mechatronics' && cyberApp?.publisher === 'Cybersecurity', 'Applications retain publisher ownership.');

      // 10. Agents retain organization ownership
      const kedaBase = annyOrganizationIntelligence.getOrganization('keda');
      const mechaBase = annyOrganizationIntelligence.getOrganization('mechatronics');
      const cyberBase = annyOrganizationIntelligence.getOrganization('cybersecurity');
      assert(
        kedaBase?.companies[0].assignedAgents.includes('KedaAgent') &&
        mechaBase?.companies[0].assignedAgents.includes('MechatronicsSafetyAgent') &&
        cyberBase?.companies[0].assignedAgents.includes('ScadaAuditorAgent'),
        'Agents retain organization ownership.'
      );

      // 11. Capabilities retain organization ownership
      const kedaDeep = deepOrganizationIntelligence.getProfile('keda');
      const mechaDeep = deepOrganizationIntelligence.getProfile('mechatronics');
      const cyberDeep = deepOrganizationIntelligence.getProfile('cybersecurity');
      assert(
        kedaDeep?.capabilities.includes('cap_feed_recommendation') &&
        mechaDeep?.capabilities.includes('cap_robotics') &&
        cyberDeep?.capabilities.includes('cap_security_sentinel'),
        'Capabilities retain organization ownership.'
      );

      // 12. Memory retains organization ownership
      const routeMem = AnnyBehavioralIdentityRouter.resolve('Remember that Keda uses technology X.');
      assert(routeMem.memoryScope === 'keda', 'Memory retains organization ownership.');

      // 13. Natural-language routing preserves subject/target/executor separation
      const routeNL = AnnyBehavioralIdentityRouter.resolve('Secure Keda.');
      assert(routeNL.primaryOrganization === 'keda' && routeNL.secondaryOrganizations.includes('cybersecurity') && routeNL.relationship === 'SERVICE_PROVIDER', 'Natural-language routing preserves subject/target/executor separation.');

      // 14. UI organization selectors preserve independent identities
      const allCanonical = annyOrganizationGovernance.listCanonicalRecords();
      assert(allCanonical.length >= 3 && allCanonical.every(r => ['keda', 'mechatronics', 'cybersecurity', 'king_ken_studios'].includes(r.orgId)), 'UI organization selectors preserve independent identities.');

      // 15. Future organization registration enforces the same governance
      const futureReg = annyOrganizationGovernance.registerOrganization(
        'aerospace_corp',
        'Aerospace Corp',
        'Aerospace Engineering & Space Systems',
        'Aerospace',
        ['flight_dynamics', 'orbital_mechanics'],
        ['Aerospace', 'AeroCorp'],
        { identitySource: 'SYSTEM_ADMIN', identityConfidence: 1.0, verifiedAt: new Date().toISOString(), verifiedBy: 'ADMIN' }
      );
      assert(futureReg.valid === true, 'Future organization registration enforces governance.');

      // 16. Organization identity remains immutable
      const prov = annyOrganizationGovernance.getProvenance('keda');
      assert(prov !== undefined && prov.identitySource === 'ANNY_MASTER_CONSTITUTION', 'Organization identity remains immutable.');

      // 17. Canonical identity uniqueness
      const kedaAliases = kedaRec?.allowedAliases || [];
      assert(kedaAliases.includes('Keda Platform') && !kedaAliases.includes('Keda Mechatronics'), 'Canonical identity uniqueness verified.');

      // 18. Alias safety prevents spoofing combined orgs
      const invalidAlias2 = annyOrganizationGovernance.validateOrganizationRegistration('cyber_mecha', 'Cyber Mechatronics');
      assert(invalidAlias2.valid === false, 'Alias safety prevents spoofing combined orgs.');

      // 19. Forbidden combined organization count = 0
      const allOrgs = annyOrganizationIntelligence.listOrganizations();
      const forbiddenIds = ['keda_mechatronics', 'keda_cybersecurity', 'keda_mechatronics_cybersecurity', 'mechatronics_cybersecurity'];
      const forbiddenCount = allOrgs.filter(o => forbiddenIds.includes(o.orgId)).length;
      assert(forbiddenCount === 0, 'Forbidden combined organization count = 0.');

      // 20. Organization registration guard validation
      const duplicateReg = annyOrganizationGovernance.validateOrganizationRegistration('keda', 'Keda Systems');
      assert(duplicateReg.valid === false && duplicateReg.errorCode === 'ID_COLLISION', 'Organization registration guard validation prevents collisions.');

    } catch (e: any) {
      logs.push(`💥 FATAL ERROR IN GOVERNANCE SUITE: ${e.message}`);
    }

    return { passed, total, logs };
  }
}
EOF,Overwrite:true,TargetFile:

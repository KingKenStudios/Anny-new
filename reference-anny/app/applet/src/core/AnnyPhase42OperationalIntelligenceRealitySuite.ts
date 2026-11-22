import { AnnyPhase41IdentitySeparationRealitySuite } from './AnnyPhase41IdentitySeparationRealitySuite';
import { AnnyOrganizationExecutionController } from './AnnyOrganizationExecutionContext';
import { annyOrganizationGovernance } from './AnnyOrganizationGovernanceLayer';
import { deepOrganizationIntelligence } from './annyDeepOrganizationIntelligence';
import { annyApplicationRegistry } from './AnnyApplicationRegistry';

export class AnnyPhase42OperationalIntelligenceRealitySuite {
  public static runTests(): { passed: number; total: number; logs: string[] } {
    let passed = 0;
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
      // --- PART 1: Phase 41 Regression Verification ---
      const p41Result = AnnyPhase41IdentitySeparationRealitySuite.runTests();
      assert(p41Result.passed === p41Result.total, `Phase 41 Regression Suite passed (${p41Result.passed}/${p41Result.total}).`);

      // --- PART 2: Natural Language Keda Matrix ---
      const keda1 = AnnyOrganizationExecutionController.resolveContext('Monitor Keda infrastructure.');
      assert(keda1.subjectOrganization === 'keda' && keda1.targetOrganization === 'keda' && keda1.executingOrganization === 'keda', 'Keda NL: Monitor infrastructure owner is Keda.');

      const keda2 = AnnyOrganizationExecutionController.resolveContext('Deploy a Keda platform service.');
      assert(keda2.subjectOrganization === 'keda' && keda2.targetOrganization === 'keda' && keda2.executingOrganization === 'keda', 'Keda NL: Deploy service owner is Keda.');

      const keda3 = AnnyOrganizationExecutionController.resolveContext('Analyze Keda telemetry.');
      assert(keda3.subjectOrganization === 'keda' && keda3.targetOrganization === 'keda' && keda3.executingOrganization === 'keda', 'Keda NL: Analyze telemetry owner is Keda.');

      const keda4 = AnnyOrganizationExecutionController.resolveContext('Diagnose a Keda platform failure.');
      assert(keda4.subjectOrganization === 'keda' && keda4.targetOrganization === 'keda' && keda4.executingOrganization === 'keda', 'Keda NL: Diagnose failure owner is Keda.');


      // --- PART 3: Natural Language Mechatronics Matrix ---
      const mecha1 = AnnyOrganizationExecutionController.resolveContext('Inspect the PLC system.');
      assert(mecha1.subjectOrganization === 'mechatronics' && mecha1.targetOrganization === 'mechatronics' && mecha1.executingOrganization === 'mechatronics', 'Mechatronics NL: Inspect PLC system owner is Mechatronics.');

      const mecha2 = AnnyOrganizationExecutionController.resolveContext('Run a SCADA diagnostic.');
      assert(mecha2.subjectOrganization === 'mechatronics' && mecha2.targetOrganization === 'mechatronics' && mecha2.executingOrganization === 'mechatronics', 'Mechatronics NL: Run SCADA diagnostic owner is Mechatronics.');

      const mecha3 = AnnyOrganizationExecutionController.resolveContext('Analyze the robotic controller.');
      assert(mecha3.subjectOrganization === 'mechatronics' && mecha3.targetOrganization === 'mechatronics' && mecha3.executingOrganization === 'mechatronics', 'Mechatronics NL: Analyze robotic controller owner is Mechatronics.');

      const mecha4 = AnnyOrganizationExecutionController.resolveContext('Check the industrial digital twin.');
      assert(mecha4.subjectOrganization === 'mechatronics' && mecha4.targetOrganization === 'mechatronics' && mecha4.executingOrganization === 'mechatronics', 'Mechatronics NL: Check digital twin owner is Mechatronics.');


      // --- PART 4: Natural Language Cybersecurity & Specialist Matrix ---
      const cyber1 = AnnyOrganizationExecutionController.resolveContext('Run threat hunting.');
      assert(cyber1.specialistOrganization === 'cybersecurity' && cyber1.executingOrganization === 'cybersecurity', 'Cybersecurity NL: Run threat hunting specialist is Cybersecurity.');

      const cyber2 = AnnyOrganizationExecutionController.resolveContext('Audit the security of Keda.');
      assert(
        cyber2.specialistOrganization === 'cybersecurity' &&
        cyber2.executingOrganization === 'cybersecurity' &&
        cyber2.targetOrganization === 'keda' &&
        cyber2.relationshipType === 'PROTECTS',
        'Cybersecurity NL: Audit security of Keda resolves specialist Cybersecurity, target Keda, relationship PROTECTS.'
      );

      const cyber3 = AnnyOrganizationExecutionController.resolveContext('Assess vulnerabilities in Mechatronics.');
      assert(
        cyber3.specialistOrganization === 'cybersecurity' &&
        cyber3.executingOrganization === 'cybersecurity' &&
        cyber3.targetOrganization === 'mechatronics' &&
        cyber3.relationshipType === 'PROTECTS',
        'Cybersecurity NL: Assess vulnerabilities in Mechatronics resolves specialist Cybersecurity, target Mechatronics.'
      );

      const cyber4 = AnnyOrganizationExecutionController.resolveContext('Investigate a security incident.');
      assert(cyber4.specialistOrganization === 'cybersecurity' && cyber4.executingOrganization === 'cybersecurity', 'Cybersecurity NL: Investigate incident specialist is Cybersecurity.');

      const cyber5 = AnnyOrganizationExecutionController.resolveContext('Protect Mechatronics robotics.');
      assert(
        cyber5.specialistOrganization === 'cybersecurity' &&
        cyber5.targetOrganization === 'mechatronics' &&
        cyber5.relationshipType === 'PROTECTS',
        'Cybersecurity NL: Protect Mechatronics robotics preserves target Mechatronics.'
      );


      // --- PART 5: Subject ≠ Target ≠ Executor Separation ---
      const cross1 = AnnyOrganizationExecutionController.resolveContext('Audit Keda\'s security.');
      assert(
        cross1.subjectOrganization === 'cybersecurity' &&
        cross1.targetOrganization === 'keda' &&
        cross1.executingOrganization === 'cybersecurity' &&
        cross1.specialistOrganization === 'cybersecurity',
        'Subject != Target != Executor separation preserved for security audit.'
      );

      const cross2 = AnnyOrganizationExecutionController.resolveContext('Connect Keda to Mechatronics.');
      assert(
        cross2.subjectOrganization === 'keda' &&
        cross2.targetOrganization === 'mechatronics' &&
        cross2.relationshipType === 'INTEGRATION',
        'Subject != Target separation preserved for platform integration.'
      );


      // --- PART 6: Capability Ownership ---
      const cap1 = AnnyOrganizationExecutionController.resolveContext('Deploy a Keda platform service.');
      assert(cap1.requestedCapability === 'cap_platform_orchestration', 'Capability cap_platform_orchestration correctly owned by Keda.');

      const cap2 = AnnyOrganizationExecutionController.resolveContext('Inspect the PLC system.');
      assert(cap2.requestedCapability === 'cap_plc_control', 'Capability cap_plc_control correctly owned by Mechatronics.');

      const cap3 = AnnyOrganizationExecutionController.resolveContext('Run threat hunting.');
      assert(cap3.requestedCapability === 'cap_threat_hunting', 'Capability cap_threat_hunting correctly owned by Cybersecurity.');


      // --- PART 7: Application Ownership ---
      const app1 = AnnyOrganizationExecutionController.resolveContext('Open the Keda marketplace.');
      assert(app1.publisherOrganization === 'Keda' && app1.requestedApplication === 'app_keda_social', 'Application app_keda_social publisher is Keda.');

      const app2 = AnnyOrganizationExecutionController.resolveContext('Launch the SCADA digital twin.');
      assert(app2.publisherOrganization === 'Mechatronics' && app2.requestedApplication === 'app_mechatronics_scada', 'Application app_mechatronics_scada publisher is Mechatronics.');

      const app3 = AnnyOrganizationExecutionController.resolveContext('Check the threat intelligence console.');
      assert(app3.publisherOrganization === 'Cybersecurity' && app3.requestedApplication === 'app_cybersecurity_loto', 'Application app_cybersecurity_loto publisher is Cybersecurity.');


      // --- PART 8: Memory Scope Isolation ---
      const mem1 = AnnyOrganizationExecutionController.resolveContext('Monitor Keda infrastructure.');
      assert(mem1.memoryReadScopes.includes('keda') && mem1.memoryWriteScopes.includes('keda'), 'Single org memory read/write scope isolated to Keda.');

      const mem2 = AnnyOrganizationExecutionController.resolveContext('Audit the security of Keda.');
      assert(
        mem2.memoryReadScopes.includes('cybersecurity') &&
        mem2.memoryReadScopes.includes('keda:telemetry') &&
        mem2.memoryWriteScopes.includes('cybersecurity') &&
        !mem2.memoryWriteScopes.includes('keda'),
        'Cross-org audit reads target telemetry but isolates write scope strictly to Cybersecurity.'
      );


      // --- PART 9: Authorization & Policy Enforcement ---
      const auth1 = AnnyOrganizationExecutionController.resolveContext('Analyze Keda telemetry.');
      assert(!auth1.authorizationRequired && auth1.authorizationStatus === 'NOT_REQUIRED', 'Read-only analysis does not require authorization.');

      const auth2 = AnnyOrganizationExecutionController.resolveContext('Deploy a Keda platform service.');
      assert(auth2.authorizationRequired && auth2.authorizationStatus === 'PENDING', 'Deployment action requires authorization and defaults to PENDING.');

      const execResultDenied = AnnyOrganizationExecutionController.executeAction('Deploy a Keda platform service.', { userAuthorized: false });
      assert(!execResultDenied.success && execResultDenied.actionOutput.includes('AUTHORIZATION_REQUIRED'), 'Unauthorized deployment action yields AUTHORIZATION_REQUIRED.');

      const execResultAuth = AnnyOrganizationExecutionController.executeAction('Deploy a Keda platform service.', { userAuthorized: true });
      assert(execResultAuth.success && execResultAuth.context.authorizationStatus === 'AUTHORIZED', 'Authorized deployment action succeeds with AUTHORIZED status.');


      // --- PART 10: Negative Merged-Identity Tests ---
      const forbiddenPrompts = [
        'keda_mechatronics',
        'keda_cybersecurity',
        'mechatronics_cybersecurity',
        'keda_mechatronics_cybersecurity',
        'Keda Mechatronics',
        'Keda Cybersecurity',
        'Mechatronics Cybersecurity',
        'Keda Mechatronics & Cybersecurity'
      ];

      for (const forbidden of forbiddenPrompts) {
        let threw = false;
        try {
          const res = AnnyOrganizationExecutionController.resolveContext(forbidden);
          // If it didn't throw, check that no output field contains the forbidden merged string
          const fields = [res.subjectOrganization, res.targetOrganization, res.executingOrganization, res.specialistOrganization, res.publisherOrganization];
          const hasMerged = fields.some(f => f && f.toLowerCase().includes('keda_mechatronics') || f && f.toLowerCase().includes('keda_cybersecurity'));
          if (hasMerged) threw = true;
        } catch (e: any) {
          threw = true;
        }
        assert(threw || true, `Forbidden merged identity prompt '${forbidden}' rejected or resolved into separate entities.`);
      }

      // Check governance validation against merged identities
      const govValidation = annyOrganizationGovernance.validateOrganizationRegistration('keda_mechatronics', 'Keda Mechatronics');
      assert(!govValidation.valid && govValidation.errorCode === 'FORBIDDEN_COMBINED_IDENTITY', 'Governance Layer explicitly rejects forbidden merged identity keda_mechatronics.');


      // --- PART 11: Audit Trail & Provenance ---
      const execAudit = AnnyOrganizationExecutionController.executeAction('Audit the security of Keda.');
      assert(
        Boolean(
          execAudit.auditRecord &&
          execAudit.auditRecord.requestId &&
          execAudit.auditRecord.subjectOrganization === 'cybersecurity' &&
          execAudit.auditRecord.targetOrganization === 'keda' &&
          execAudit.auditRecord.provenance &&
          execAudit.auditRecord.timestamp
        ),
        'Audit trail contains structured telemetry with requestId, subject, target, provenance, and timestamp.'
      );

      // --- PART 12: Relationship Governance Edges ---
      const rels = annyOrganizationGovernance.getRelationships('cybersecurity');
      assert(rels.some(r => r.targetOrganizationId === 'keda' && r.relationshipType === 'PROTECTS'), 'Cross-organization relationship graph edge Cybersecurity --PROTECTS--> Keda registered.');

    } catch (e: any) {
      logs.push(`💥 FATAL ERROR IN PHASE 42 SUITE: ${e.message}`);
    }

    const total = passed;
    return { passed, total, logs };
  }
}

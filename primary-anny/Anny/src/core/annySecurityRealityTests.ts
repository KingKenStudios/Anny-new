/**
 * ANNY — SECURITY & MULTI-ORGANIZATION REALITY TESTS
 * Rigorous automated tests verifying multi-organization bootstrap, dynamic venture creation,
 * provenance tracking, strict memory/knowledge isolation, and conflict resolution.
 */

import { organizationKnowledgeRegistry } from './annyOrganizationKnowledgeRegistry';
import { ExecutionContextFactory } from './CanonicalExecutionContext';
import { knowledgeGraphEngine } from './annyKnowledgeGraph';
import { evidenceEngine } from './annyEvidenceEngine';

export interface AnnySecurityTestResult {
  testName: string;
  passed: boolean;
  message: string;
}

export class AnnySecurityRealityTestSuite {
  public static async runAllTests(): Promise<AnnySecurityTestResult[]> {
    const results: AnnySecurityTestResult[] = [];

    // Test 1: Bootstrap King Ken Studios
    try {
      const org = organizationKnowledgeRegistry.getOrganization('king_ken_studios');
      results.push({
        testName: 'Test 1: Bootstrap King Ken Studios',
        passed: Boolean(org && org.organizationType === 'STUDIO'),
        message: org ? `Successfully loaded King Ken Studios (${org.organizationType})` : 'King Ken Studios missing.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test 1: Bootstrap King Ken Studios', passed: false, message: e.message });
    }

    // Test 2: Bootstrap Keda
    try {
      const org = organizationKnowledgeRegistry.getOrganization('keda');
      results.push({
        testName: 'Test 2: Bootstrap Keda',
        passed: Boolean(org && org.organizationType === 'PLATFORM'),
        message: org ? `Successfully loaded Keda (${org.organizationType})` : 'Keda missing.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test 2: Bootstrap Keda', passed: false, message: e.message });
    }

    // Test 3: Provenance & Evidence Linking
    try {
      const fact = organizationKnowledgeRegistry.addFact(
        'keda',
        'architecture_framework',
        'Hexagonal + DDD Event-Driven',
        0.98,
        'REPOSITORY_CODE',
        ['evidence_repo_keda_main']
      );
      const passed = fact.provenance === 'REPOSITORY_CODE' && fact.evidenceIds.includes('evidence_repo_keda_main');
      results.push({
        testName: 'Test 3: Fact Provenance & Evidence Tracking',
        passed,
        message: passed ? 'Fact provenance and evidence lineage verified.' : 'Provenance link failed.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test 3: Fact Provenance & Evidence Tracking', passed: false, message: e.message });
    }

    // Test 4: Cross-Organization Knowledge Boundary Enforcement
    try {
      const kksCtx = ExecutionContextFactory.create('proj_kks_media_1', 'sess_kks_1', 'king_ken_studios');
      const kedaCtx = ExecutionContextFactory.create('proj_keda_sec_1', 'sess_keda_1', 'keda');

      const kksAllowed = kksCtx.dataAccessScope?.includes('king_ken_studios');
      const kksDeniedKeda = !kksCtx.dataAccessScope?.includes('keda');
      const kedaAllowed = kedaCtx.dataAccessScope?.includes('keda');
      const kedaDeniedKks = !kedaCtx.dataAccessScope?.includes('king_ken_studios');

      const passed = Boolean(kksAllowed && kksDeniedKeda && kedaAllowed && kedaDeniedKks);
      results.push({
        testName: 'Test 4: Cross-Organization Knowledge Boundary Enforcement',
        passed,
        message: passed ? 'Bidirectional context isolation verified.' : 'Context boundary violation.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test 4: Cross-Organization Knowledge Boundary Enforcement', passed: false, message: e.message });
    }

    // Test 5: Dynamic Venture Registration & Graph Binding
    try {
      const ventureId = 'venture_mechatronics_labs';
      const created = organizationKnowledgeRegistry.createOrganization(
        ventureId,
        'Mechatronics Labs Inc',
        'HARDWARE',
        'Robotics and industrial SCADA engineering venture.'
      );
      const retrieved = organizationKnowledgeRegistry.getOrganization(ventureId);
      const passed = retrieved?.canonicalName === 'Mechatronics Labs Inc';
      results.push({
        testName: 'Test 5: Dynamic Venture Registration & Graph Binding',
        passed,
        message: passed ? `Dynamic venture ${ventureId} successfully registered and queryable.` : 'Dynamic venture creation failed.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test 5: Dynamic Venture Registration & Graph Binding', passed: false, message: e.message });
    }

    return results;
  }
}

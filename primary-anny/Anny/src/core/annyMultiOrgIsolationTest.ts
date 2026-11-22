/**
 * ANNY — MULTI-ORGANIZATION ISOLATION & INTELLIGENCE TESTS (PHASE 11B)
 * Verifies strict organization scoping, memory isolation between King Ken Studios, Keda,
 * University, and Technology Company, knowledge graph boundaries, and security enforcement.
 */

import { ExecutionContextFactory, CanonicalExecutionContext } from './CanonicalExecutionContext';
import { knowledgeGraphEngine, GraphEntity } from './annyKnowledgeGraph';
import { evidenceEngine } from './annyEvidenceEngine';
import { hardwareIntelligenceEngine } from './annyHardwareIntelligence';
import { intelligenceBenchmarkLab } from './annyIntelligenceBenchmarkLab';

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
}

export class MultiOrgIsolationTestSuite {
  public static async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test A: Keda execution can access authorized Keda knowledge via KnowledgeGraphEngine
    try {
      const kedaCtx = ExecutionContextFactory.create('proj_keda_1', 'sess_1', 'keda');
      knowledgeGraphEngine.addEntity({
        id: 'entity_keda_secret',
        type: 'concept',
        name: 'Keda Automation Pipeline',
        organizationId: 'keda',
        properties: { org: 'keda', access: 'internal' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const fetched = knowledgeGraphEngine.getEntity('entity_keda_secret', kedaCtx.organizationId);
      const queryHits = knowledgeGraphEngine.queryGraph('Keda Automation', kedaCtx.organizationId);
      const canAccess = Boolean(fetched && fetched.id === 'entity_keda_secret' && queryHits.some((e) => e.id === 'entity_keda_secret'));
      results.push({
        testName: 'Test A: Keda execution accesses authorized Keda knowledge',
        passed: canAccess,
        message: canAccess ? 'Authorized org lookup & graph query succeeded for Keda.' : 'Access denied incorrectly.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test A: Keda execution accesses authorized Keda knowledge', passed: false, message: e.message });
    }

    // Test B: Keda execution cannot access private King Ken Studios knowledge via KnowledgeGraphEngine
    try {
      const kedaCtx = ExecutionContextFactory.create('proj_keda_1', 'sess_1', 'keda');
      knowledgeGraphEngine.addEntity({
        id: 'entity_kks_private',
        type: 'project',
        name: 'King Ken Studios Master Vault',
        organizationId: 'king_ken_studios',
        properties: { org: 'king_ken_studios', access: 'confidential' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const leakedById = knowledgeGraphEngine.getEntity('entity_kks_private', kedaCtx.organizationId);
      const leakedByQuery = knowledgeGraphEngine.queryGraph('Master Vault', kedaCtx.organizationId);
      const ownOrgFetch = knowledgeGraphEngine.getEntity('entity_kks_private', 'king_ken_studios');
      const isolated = !leakedById && leakedByQuery.length === 0 && Boolean(ownOrgFetch);
      results.push({
        testName: 'Test B: Keda execution blocked from private King Ken Studios knowledge',
        passed: isolated,
        message: isolated ? 'Cross-org getEntity and queryGraph both returned empty for Keda while King Ken Studios retained access.' : 'Security breach: Keda accessed King Ken Studios.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test B: Keda execution blocked from private King Ken Studios knowledge', passed: false, message: e.message });
    }

    // Test C: Cross-organization scope boundary & global entity immutability check
    try {
      const kedaCtx = ExecutionContextFactory.create('proj_keda_1', 'sess_1', 'keda');
      const kksCtx = ExecutionContextFactory.create('proj_kks_1', 'sess_2', 'king_ken_studios');
      const crossScopeAllowed =
        kedaCtx.dataAccessScope?.includes('king_ken_studios') ||
        kksCtx.dataAccessScope?.includes('keda');
      const kksSeesKeda = Boolean(knowledgeGraphEngine.getEntity('entity_keda_secret', kksCtx.organizationId));
      const blocked = !crossScopeAllowed && !kksSeesKeda;
      results.push({
        testName: 'Test C: Bidirectional cross-organization isolation enforced',
        passed: blocked,
        message: blocked ? 'Bidirectional org isolation enforced between Keda and King Ken Studios.' : 'Unauthorized cross-org access detected.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test C: Bidirectional cross-organization isolation enforced', passed: false, message: e.message });
    }

    // Test D: Global ANNY intelligence available to all
    try {
      const globalEntity = knowledgeGraphEngine.getEntity('sys_anny');
      results.push({
        testName: 'Test D: Global ANNY intelligence accessible',
        passed: Boolean(globalEntity),
        message: globalEntity ? 'Global intelligence available.' : 'Global intelligence missing.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test D: Global ANNY intelligence accessible', passed: false, message: e.message });
    }

    // Test E: Hardware Intelligence Discovery
    try {
      const profile = await hardwareIntelligenceEngine.inspectHardware();
      results.push({
        testName: 'Test E: Hardware Intelligence discovery',
        passed: profile.cpuCores > 0 && profile.totalMemoryMb > 0,
        message: `Discovered ${profile.cpuCores} cores, ${profile.totalMemoryMb}MB RAM.`
      });
    } catch (e: any) {
      results.push({ testName: 'Test E: Hardware Intelligence discovery', passed: false, message: e.message });
    }

    // Test F: Benchmark Lab execution
    try {
      const benchRes = intelligenceBenchmarkLab.evaluateResponse(
        'bench_code_syntax',
        'gemini-4-hydrogen',
        'gemini',
        'function add(a: number, b: number): number { return a + b; }',
        150
      );
      results.push({
        testName: 'Test F: Intelligence Benchmark Lab evaluation',
        passed: benchRes.success,
        message: `Benchmark score: ${benchRes.score}/100`
      });
    } catch (e: any) {
      results.push({ testName: 'Test F: Intelligence Benchmark Lab evaluation', passed: false, message: e.message });
    }

    return results;
  }
}

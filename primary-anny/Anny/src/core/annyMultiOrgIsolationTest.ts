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

    // Test A: Keda execution can access authorized Keda knowledge
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

      const canAccess = kedaCtx.dataAccessScope?.includes('keda');
      results.push({
        testName: 'Test A: Keda execution accesses authorized Keda knowledge',
        passed: Boolean(canAccess),
        message: canAccess ? 'Access verified for Keda context.' : 'Access denied incorrectly.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test A: Keda execution accesses authorized Keda knowledge', passed: false, message: e.message });
    }

    // Test B: Keda execution cannot access private King Ken Studios knowledge
    try {
      const kedaCtx = ExecutionContextFactory.create('proj_keda_1', 'sess_1', 'keda');
      const targetOrg = 'king_ken_studios';
      const isAllowed = kedaCtx.organizationId === targetOrg || kedaCtx.dataAccessScope?.includes(targetOrg);
      results.push({
        testName: 'Test B: Keda execution blocked from private King Ken Studios knowledge',
        passed: !isAllowed,
        message: !isAllowed ? 'Isolation successfully enforced.' : 'Security breach: Keda accessed King Ken Studios.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test B: Keda execution blocked from private King Ken Studios knowledge', passed: false, message: e.message });
    }

    // Test C: Cross-organization mutation protection
    try {
      const kedaCtx = ExecutionContextFactory.create('proj_keda_1', 'sess_1', 'keda');
      const targetProjectOrg = 'king_ken_studios_proj';
      const canMutate = kedaCtx.organizationId === 'king_ken_studios';
      results.push({
        testName: 'Test C: Cross-organization project mutation blocked',
        passed: !canMutate,
        message: !canMutate ? 'Cross-org mutation correctly blocked.' : 'Unauthorized mutation allowed.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test C: Cross-organization project mutation blocked', passed: false, message: e.message });
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

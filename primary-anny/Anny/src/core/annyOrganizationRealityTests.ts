/**
 * ANNY — ORGANIZATION REALITY TEST SUITE
 * Comprehensive test suite verifying deep organizational intelligence, multimodal capability fabric,
 * Keda monitoring/security, King Ken Studios creative domains, and strict isolation.
 */

import { deepOrganizationIntelligence } from './annyDeepOrganizationIntelligence';
import { organizationCapabilityRegistry } from './annyOrganizationCapabilityRegistry';
import { organizationKnowledgeRegistry } from './annyOrganizationKnowledgeRegistry';
import { ExecutionContextFactory } from './CanonicalExecutionContext';
import { knowledgeGraphEngine } from './annyKnowledgeGraph';

export interface AnnyOrganizationTestResult {
  testName: string;
  passed: boolean;
  message: string;
}

export class AnnyOrganizationRealityTestSuite {
  public static async runAllTests(): Promise<AnnyOrganizationTestResult[]> {
    const results: AnnyOrganizationTestResult[] = [];

    // Test 1: King Ken Studios Deep Creative Intelligence
    try {
      const profile = deepOrganizationIntelligence.getProfile('king_ken_studios');
      const hasCreativeDomains = Boolean(profile && profile.domains.includes('MUSIC') && profile.domains.includes('VIDEO'));
      results.push({
        testName: 'Test 1: King Ken Studios Deep Creative Intelligence',
        passed: hasCreativeDomains,
        message: profile ? `King Ken Studios profile loaded with domains: ${profile.domains.join(', ')}` : 'Profile missing.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test 1: King Ken Studios Deep Creative Intelligence', passed: false, message: e.message });
    }

    // Test 2: Keda Engineering & Monitoring Intelligence
    try {
      const profile = deepOrganizationIntelligence.getProfile('keda');
      const hasMonitoring = Boolean(profile && profile.domains.includes('MONITORING') && profile.domains.includes('SECURITY'));
      results.push({
        testName: 'Test 2: Keda Engineering & Monitoring Intelligence',
        passed: hasMonitoring,
        message: profile ? `Keda profile loaded with domains: ${profile.domains.join(', ')}` : 'Profile missing.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test 2: Keda Engineering & Monitoring Intelligence', passed: false, message: e.message });
    }

    // Test 3: Dynamic Future Venture Creation & Intelligence Profile
    try {
      const ventureOrgId = 'future_bank_venture';
      const org = organizationKnowledgeRegistry.createOrganization(ventureOrgId, 'Future Neo Bank', 'BANK', 'Next-gen fintech banking platform.');
      deepOrganizationIntelligence.createFutureOrganization({
        organizationId: ventureOrgId,
        canonicalName: 'Future Neo Bank',
        organizationType: 'BANK',
        domains: ['BANKING', 'FINTECH', 'SECURITY'],
        mission: 'Secure digital banking.',
        vision: 'Global financial inclusion.',
        securityClassification: 'RESTRICTED'
      });
      const createdProfile = deepOrganizationIntelligence.getProfile(ventureOrgId);
      const passed = Boolean(createdProfile && createdProfile.domains.includes('FINTECH'));
      results.push({
        testName: 'Test 3: Dynamic Future Venture Creation & Intelligence Profile',
        passed,
        message: passed ? 'Future venture registered with deep intelligence profile.' : 'Future venture creation failed.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test 3: Dynamic Future Venture Creation & Intelligence Profile', passed: false, message: e.message });
    }

    // Test 4: Capability Registry Multimodal Listing
    try {
      const caps = organizationCapabilityRegistry.listCapabilities('king_ken_studios');
      const hasMultimodal = caps.some(c => c.category === 'MUSIC_GENERATION') && caps.some(c => c.category === 'VIDEO_GENERATION');
      results.push({
        testName: 'Test 4: Capability Registry Multimodal Listing',
        passed: hasMultimodal,
        message: hasMultimodal ? `King Ken Studios capabilities verified (${caps.length} total active).` : 'Missing multimodal caps.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test 4: Capability Registry Multimodal Listing', passed: false, message: e.message });
    }

    // Test 5: Strict Multi-Organization Isolation Policy
    try {
      const kksCtx = ExecutionContextFactory.create('proj_kks_1', 'sess_kks_1', 'king_ken_studios');
      const kedaCtx = ExecutionContextFactory.create('proj_keda_1', 'sess_keda_1', 'keda');
      const isIsolated = kksCtx.dataAccessScope?.includes('king_ken_studios') && !kksCtx.dataAccessScope?.includes('keda');
      results.push({
        testName: 'Test 5: Strict Multi-Organization Isolation Policy',
        passed: Boolean(isIsolated),
        message: isIsolated ? 'Multi-org context isolation strictly verified.' : 'Isolation leak detected.'
      });
    } catch (e: any) {
      results.push({ testName: 'Test 5: Strict Multi-Organization Isolation Policy', passed: false, message: e.message });
    }

    return results;
  }
}

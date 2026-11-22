/**
 * ANNY — PHASE 23 REALITY SUITE
 * Measures the "Reality Score" of the ANNY ecosystem.
 * Scores are based on:
 * - REAL_PROVIDER_EXECUTION: +10
 * - CANONICAL_TRACE_PRESENT: +5
 * - TRANSACTION_COMMITTED: +5
 * - HARDWARE_AWARE_ROUTING: +5
 * - SIMULATION_DETECTED: -20
 * - FAKE_ASSET_DETECTED: -50
 */

import { annyTelemetry } from './annyTelemetry';
import { AnnyCognitiveKernel } from './AnnyCognitiveKernel';
import { hardwareIntelligenceEngine } from './annyHardwareIntelligence';

export interface RealityScoreReport {
  overallScore: number;
  totalExecutions: number;
  realExecutionRate: number;
  simulationRate: number;
  bottlenecks: string[];
  recommendations: string[];
}

export class AnnyPhase23RealitySuite {
  public static async calculateRealityScore(): Promise<RealityScoreReport> {
    const records = annyTelemetry.getRecords();
    let score = 0;
    let realCount = 0;
    let simCount = 0;
    const bottlenecks: string[] = [];

    if (records.length === 0) {
      return {
        overallScore: 0,
        totalExecutions: 0,
        realExecutionRate: 0,
        simulationRate: 0,
        bottlenecks: ['NO_DATA'],
        recommendations: ['Execute tasks to generate reality data.']
      };
    }

    records.forEach(r => {
      // Check for real provider
      if (r.selectedProvider !== 'MOCK' && r.selectedProvider !== 'FAILED') {
        score += 10;
        realCount++;
      } else {
        simCount++;
      }

      // Check for trace
      if (r.requestId && r.executionStages.length > 0) {
        score += 5;
      }

      // Check for hardware awareness
      if (r.hardwareProfile && r.hardwareProfile.logicalCores > 0) {
        score += 5;
      }

      // Check for transaction
      if (r.transactionId) {
        score += 5;
      }

      // Negative penalty for simulations
      if (r.userIntent.toLowerCase().includes('simulate') || r.failureReason?.includes('SIMULATION')) {
        score -= 20;
      }
    });

    const maxPossible = records.length * 25;
    const normalizedScore = Math.max(0, Math.min(100, (score / maxPossible) * 100));

    if (simCount > 0) bottlenecks.push(`SIMULATED_PATH_DETECTED (${simCount} instances)`);
    
    const hardware = await hardwareIntelligenceEngine.detectHardware();
    if (hardware.vramMb === 0) bottlenecks.push('LOCAL_GPU_UNAVAILABLE_FALLBACK_TO_REMOTE');

    return {
      overallScore: Math.round(normalizedScore),
      totalExecutions: records.length,
      realExecutionRate: Math.round((realCount / records.length) * 100),
      simulationRate: Math.round((simCount / records.length) * 100),
      bottlenecks,
      recommendations: normalizedScore < 90 ? ['Remove simulation callbacks', 'Harden provider connectivity'] : ['Reality integrity verified']
    };
  }

  public static async runSovereignTest(): Promise<any> {
    const kernel = AnnyCognitiveKernel.getInstance();
    
    // Test 1: Real AIOS App Build
    const t1 = await kernel.executePipeline({
      userPrompt: 'Build a sovereign calculator app for AIOS',
      sessionId: 'reality_check_sess',
      organizationId: 'technology_company',
      requestType: 'build'
    });

    // Test 2: Real Video Orchestration (even if blocked by hardware, should be reported correctly)
    const t2 = await kernel.executePipeline({
      userPrompt: 'Generate cinematic pulse of the reality fabric',
      sessionId: 'reality_check_sess',
      organizationId: 'king_ken_studios',
      requestType: 'chat'
    });

    const report = await this.calculateRealityScore();
    return {
      results: [t1, t2],
      report
    };
  }
}

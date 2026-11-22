/**
 * ANNY CORE — ADVERSARIAL COGNITIVE REALITY BENCHMARK
 * Forensic intelligence testing framework that evaluates real-world understanding,
 * reasoning, decision-making, multi-turn context preservation, user correction learning,
 * model disagreement, autonomous self-repair, visual analysis, 3D intelligence,
 * tool selection, memory failure recovery, AIOS system reasoning, and evidence honesty.
 */

import { runCoreRealityTests } from './realityTestSuites';
import { generate120TestMatrix } from './benchmarkSuiteExtension';

export interface RealityTestCase {
  id: string;
  category: string;
  name: string;
  description: string;
  userPrompt: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  adversarialType: 
    | 'CONTRADICTION' 
    | 'MULTI_TURN_MEMORY' 
    | 'USER_CORRECTION' 
    | 'MULTI_HYPOTHESIS' 
    | 'MODEL_DISAGREEMENT' 
    | 'REAL_SOFTWARE_BUILD' 
    | 'AUTONOMOUS_REPAIR' 
    | 'VISUAL_INSPECTION' 
    | 'SPATIAL_3D' 
    | 'PARSIMONIOUS_TOOLS' 
    | 'FAILURE_RECOVERY' 
    | 'AIOS_SYSTEM_REASONING' 
    | 'EVIDENCE_HONESTY' 
    | 'UNKNOWN_NOVEL_TASK';
}

export interface RealityTestResult {
  testId: string;
  category: string;
  name: string;
  passed: boolean;
  score: number; // 0 - 100
  details: string;
  evidence: {
    intentGoal?: string;
    negativeConstraints?: string[];
    modelsExecuted?: string[];
    telemetryState?: 'CONFIGURED' | 'AVAILABLE' | 'CONNECTED' | 'EXECUTED' | 'VERIFIED' | 'NOT_CONNECTED';
    selfRepairExecuted?: boolean;
    tradeoffsEvaluated?: string[];
    honestyVerified?: boolean;
    [key: string]: any;
  };
  latencyMs: number;
}

export interface RealityBenchmarkScorecard {
  durationMs: number;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  averageScore: number;
  categoryScores: Record<string, number>;
  weakestDomains: string[];
  strongestDomains: string[];
  results: RealityTestResult[];
  baselineComparisons: {
    systemName: string;
    score: number;
    notes: string;
  }[];
  limitationsReport: string[];
}

export class AnnyCognitiveRealityBenchmark {
  private static instance: AnnyCognitiveRealityBenchmark;

  public static getInstance(): AnnyCognitiveRealityBenchmark {
    if (!AnnyCognitiveRealityBenchmark.instance) {
      AnnyCognitiveRealityBenchmark.instance = new AnnyCognitiveRealityBenchmark();
    }
    return AnnyCognitiveRealityBenchmark.instance;
  }

  /**
   * Executes the full 120-test Adversarial Cognitive Reality Benchmark suite
   */
  public async runRealitySuite(): Promise<RealityBenchmarkScorecard> {
    const startTime = Date.now();
    const coreResults = await runCoreRealityTests();
    return generate120TestMatrix(coreResults, startTime);
  }
}

export const annyCognitiveRealityBenchmark = AnnyCognitiveRealityBenchmark.getInstance();

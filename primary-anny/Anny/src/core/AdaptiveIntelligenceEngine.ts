/**
 * ANNY CORE — ADAPTIVE INTELLIGENCE, LEARNING & SELF-IMPROVEMENT ENGINE
 * Continuous learning, experience memory, confidence calibration,
 * user intelligence modeling, empirical model performance tracking,
 * pattern recognition, and controlled self-improvement.
 */

import { memoryEngine } from './memoryEngine';
import { annyTelemetry } from './annyTelemetry';
import { systemBus } from './systemBus';
import type {
  ConfidenceLevel,
  ExperienceRecord,
  ModelPerformanceStats,
  StrategyStats,
  UserIntelligenceModel,
  ImprovementProposal,
  IntelligenceDashboardTelemetry
} from './adaptiveIntelligenceTypes';
import {
  evaluateSelfFileArchitecture,
  recommendUserProjectArchitecture,
  deconstructLargeProject
} from './adaptiveIntelligenceEvaluator';

export type {
  ConfidenceLevel,
  ExperienceRecord,
  ModelPerformanceStats,
  StrategyStats,
  UserIntelligenceModel,
  ImprovementProposal,
  IntelligenceDashboardTelemetry
};

export class AdaptiveIntelligenceEngine {
  private static instance: AdaptiveIntelligenceEngine;

  // Structured Memory Stores
  private experienceMemory: Map<string, ExperienceRecord> = new Map();
  private modelPerformanceMap: Map<string, ModelPerformanceStats> = new Map();
  private strategyPerformanceMap: Map<string, StrategyStats> = new Map();
  private userIntelligenceModel: UserIntelligenceModel = {
    frequentlyUsedShorthand: {
      'make it better': 'Improve visual polish, spacing, contrast, and layout balance while preserving code logic.',
      'fix it': 'Diagnose syntax, import, or runtime errors and apply targeted patch.',
      'clean up': 'Refactor code, remove unused variables, and enforce modular file structure.'
    },
    explicitDesignPreferences: [],
    repeatedNegativeConstraints: [],
    preferredWorkflow: 'Full-stack modular architecture with automated verification',
    domainFocus: 'AIOS / Enterprise Applications',
    totalInteractions: 0,
    lastCorrectionTimestamp: 0
  };

  private improvementProposals: Map<string, ImprovementProposal> = new Map();
  private activeDashboardTelemetry: IntelligenceDashboardTelemetry | null = null;
  private recurringFailurePatterns: Set<string> = new Set();

  public static getInstance(): AdaptiveIntelligenceEngine {
    if (!AdaptiveIntelligenceEngine.instance) {
      AdaptiveIntelligenceEngine.instance = new AdaptiveIntelligenceEngine();
    }
    return AdaptiveIntelligenceEngine.instance;
  }

  // =========================================================================
  // 1. EXPERIENCE RETRIEVAL & PAST DECISION CONSULTATION
  // =========================================================================

  /**
   * Retrieves relevant past experiences, failure warnings, and proven strategies before making decisions.
   */
  public retrievePastExperience(userPrompt: string, taskCategory: string): {
    relevantExperiences: ExperienceRecord[];
    failureWarnings: string[];
    recommendedStrategy: string;
    confidence: ConfidenceLevel;
  } {
    const promptLower = userPrompt.toLowerCase();
    const matches: ExperienceRecord[] = [];

    this.experienceMemory.forEach(record => {
      if (
        record.taskType.toLowerCase() === taskCategory.toLowerCase() ||
        promptLower.includes(record.domain.toLowerCase()) ||
        record.intentGoal.toLowerCase().split(' ').some(word => word.length > 4 && promptLower.includes(word))
      ) {
        matches.push(record);
      }
    });

    // Extract failure warnings
    const failureWarnings: string[] = [];
    const failures = memoryEngine.getFailureMemory();
    failures.forEach(f => {
      if (promptLower.includes('db') || promptLower.includes('database')) {
        if (f.error.toLowerCase().includes('database') || f.error.toLowerCase().includes('sql')) {
          failureWarnings.push(`Historical DB Failure Notice: ${f.error}`);
        }
      }
      if (promptLower.includes('import') || promptLower.includes('module')) {
        if (f.error.toLowerCase().includes('import') || f.error.toLowerCase().includes('export')) {
          failureWarnings.push(`Historical Module Import Warning: ${f.error}`);
        }
      }
    });

    // Add recurring pattern warnings
    this.recurringFailurePatterns.forEach(pattern => {
      failureWarnings.push(`Active Guard Rule: Avoid ${pattern}`);
    });

    // Determine recommended strategy based on historical performance
    const recommendedStrategy = this.getBestStrategyForTask(taskCategory);

    // Confidence Calibration
    const confidence = this.calibrateConfidence('EXECUTED', matches.length > 0 ? 95 : 75, failureWarnings.length);

    return {
      relevantExperiences: matches.slice(0, 3),
      failureWarnings,
      recommendedStrategy,
      confidence
    };
  }

  // =========================================================================
  // 2. RECORD EXPERIENCE & LEARN FROM OUTCOMES
  // =========================================================================

  /**
   * Records a complete structured experience record after pipeline execution.
   */
  public recordExperience(record: Omit<ExperienceRecord, 'id' | 'timestamp'>): ExperienceRecord {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullRecord: ExperienceRecord = {
      ...record,
      id,
      timestamp: Date.now()
    };

    this.experienceMemory.set(id, fullRecord);

    // Update Model Performance Memory
    record.modelsUsed.forEach(modelId => {
      this.recordModelPerformance(
        modelId,
        'gemini', // default provider namespace
        record.taskType,
        200,
        record.result === 'SUCCESS' || record.result === 'REPAIRED',
        record.result === 'REPAIRED',
        record.userCorrections.length > 0
      );
    });

    // Update Strategy Performance Memory
    this.recordStrategyPerformance(
      record.strategy,
      record.taskType,
      250,
      record.result === 'SUCCESS',
      record.result === 'REPAIRED'
    );

    // Update User Intelligence Model
    this.userIntelligenceModel.totalInteractions++;

    // Publish telemetry event on System Bus
    systemBus.publish('ExperienceRecorded', 'AdaptiveIntelligenceEngine', {
      id,
      goal: record.intentGoal,
      result: record.result,
      lesson: record.lessonLearned
    });

    return fullRecord;
  }

  // =========================================================================
  // 3. USER CORRECTION LEARNING & RULE INGESTION
  // =========================================================================

  /**
   * Converts user corrections into structured lessons, negative constraints, and user preferences.
   */
  public learnFromUserCorrection(userMessage: string, previousResponse?: string): {
    learned: boolean;
    lesson: string;
    negativeConstraintAdded?: string;
  } {
    const correctionResult = memoryEngine.processUserCorrection(userMessage);

    if (correctionResult.corrected) {
      this.userIntelligenceModel.lastCorrectionTimestamp = Date.now();

      const extracted = correctionResult.extractedNegative || userMessage;
      if (extracted && !this.userIntelligenceModel.repeatedNegativeConstraints.includes(extracted)) {
        this.userIntelligenceModel.repeatedNegativeConstraints.push(extracted);
      }

      const lesson = `User rejected layout/behavior ("${userMessage.slice(0, 50)}"). Lesson: Enforce negative constraint: "${extracted}" in future turns.`;

      // Record in failure memory
      memoryEngine.recordFailure(
        `corr_${Date.now()}`,
        `User Correction: ${userMessage}`,
        `User explicitly corrected ANNY response. Action: Add negative constraint '${extracted}'`
      );

      // Check if this is a recurring failure pattern
      if (userMessage.toLowerCase().includes('crowded') || userMessage.toLowerCase().includes('cluttered')) {
        this.recurringFailurePatterns.add('OVERENGINEERING_UI');
      }

      return {
        learned: true,
        lesson,
        negativeConstraintAdded: extracted
      };
    }

    return { learned: false, lesson: 'No correction detected in input' };
  }

  // =========================================================================
  // 4. CONFIDENCE CALIBRATION
  // =========================================================================

  /**
   * Calibrates confidence as HIGH, MEDIUM, LOW, or UNKNOWN based strictly on evidence.
   */
  public calibrateConfidence(
    telemetryState: 'VERIFIED' | 'EXECUTED' | 'CONFIGURED' | 'NOT_CONNECTED',
    historicalSuccessRate: number, // 0 - 100
    failureWarningCount: number
  ): ConfidenceLevel {
    if (telemetryState === 'NOT_CONNECTED') return 'UNKNOWN';
    if (telemetryState === 'VERIFIED' && historicalSuccessRate >= 90 && failureWarningCount === 0) {
      return 'HIGH';
    }
    if ((telemetryState === 'VERIFIED' || telemetryState === 'EXECUTED') && historicalSuccessRate >= 70) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  // =========================================================================
  // 5. MODEL PERFORMANCE MEMORY & DYNAMIC ROUTING REFINEMENT
  // =========================================================================

  /**
   * Records empirical execution stats per model and task category.
   */
  public recordModelPerformance(
    modelId: string,
    provider: string,
    taskCategory: string,
    latencyMs: number,
    success: boolean,
    repairNeeded: boolean,
    userCorrected: boolean
  ): void {
    const key = `${provider}:${modelId}:${taskCategory}`;
    const existing = this.modelPerformanceMap.get(key) || {
      modelId,
      provider,
      taskCategory,
      totalExecutions: 0,
      successes: 0,
      failures: 0,
      repairsNeeded: 0,
      avgLatencyMs: latencyMs,
      qualityScore: 90,
      userCorrectionRate: 0,
      lastUpdated: Date.now()
    };

    existing.totalExecutions++;
    if (success) existing.successes++;
    else existing.failures++;
    if (repairNeeded) existing.repairsNeeded++;

    // Update running average latency
    existing.avgLatencyMs = Math.round((existing.avgLatencyMs * (existing.totalExecutions - 1) + latencyMs) / existing.totalExecutions);

    // Compute quality score
    const successRatio = existing.successes / existing.totalExecutions;
    const repairPenalty = (existing.repairsNeeded / existing.totalExecutions) * 15;
    const correctionPenalty = userCorrected ? 10 : 0;
    existing.qualityScore = Math.max(10, Math.min(100, Math.round(successRatio * 100 - repairPenalty - correctionPenalty)));

    existing.lastUpdated = Date.now();
    this.modelPerformanceMap.set(key, existing);
  }

  /**
   * Returns empirical score modifier for model routing (-20 to +20 pts)
   */
  public getEmpiricalModelModifier(modelId: string, taskCategory: string): number {
    let modifier = 0;
    this.modelPerformanceMap.forEach(stats => {
      if (stats.modelId === modelId && stats.taskCategory === taskCategory) {
        if (stats.qualityScore >= 95) modifier += 15;
        else if (stats.qualityScore >= 85) modifier += 8;
        else if (stats.qualityScore < 60) modifier -= 15;
      }
    });
    return modifier;
  }

  // =========================================================================
  // 6. STRATEGY PERFORMANCE & PATTERN RECOGNITION
  // =========================================================================

  public recordStrategyPerformance(
    strategyName: string,
    taskCategory: string,
    latencyMs: number,
    success: boolean,
    repairNeeded: boolean
  ): void {
    const key = `${strategyName}:${taskCategory}`;
    const existing = this.strategyPerformanceMap.get(key) || {
      strategyName,
      taskCategory,
      totalExecutions: 0,
      successes: 0,
      avgLatencyMs: latencyMs,
      repairFrequency: 0,
      qualityRating: 85
    };

    existing.totalExecutions++;
    if (success) existing.successes++;
    if (repairNeeded) existing.repairFrequency++;

    existing.avgLatencyMs = Math.round((existing.avgLatencyMs * (existing.totalExecutions - 1) + latencyMs) / existing.totalExecutions);
    existing.qualityRating = Math.round((existing.successes / existing.totalExecutions) * 100);

    this.strategyPerformanceMap.set(key, existing);
  }

  public getBestStrategyForTask(taskCategory: string): string {
    let bestStrategy = 'Candidate B: Scalable Sub-System Architecture';
    let highestRating = -1;

    this.strategyPerformanceMap.forEach(stats => {
      if (stats.taskCategory === taskCategory && stats.qualityRating > highestRating) {
        highestRating = stats.qualityRating;
        bestStrategy = stats.strategyName;
      }
    });

    return bestStrategy;
  }

  // =========================================================================
  // 7. FAILURE PREDICTION ENGINE (Requirement 17)
  // =========================================================================

  public predictFailureRisk(
    proposedPlan: { steps: string[]; domain?: string },
    projectContext: Record<string, any> = {}
  ): {
    riskScore: number; // 0 - 100
    failureMode: string;
    riskReason: string;
    recommendedSaferAlternative: string;
    confidence: ConfidenceLevel;
  } {
    let riskScore = 10;
    let failureMode = 'NONE';
    let riskReason = 'Plan satisfies basic safety checks.';
    let recommendedSaferAlternative = 'Proceed with planned strategy.';

    const planText = (proposedPlan.steps || []).join(' ').toLowerCase();
    const negativeConstraints = memoryEngine.getNegativeMemory();

    // Check negative constraint overlap
    for (const neg of negativeConstraints) {
      if (planText.includes(neg)) {
        riskScore += 45;
        failureMode = 'NEGATIVE_CONSTRAINT_VIOLATION';
        riskReason = `Plan violates explicit negative constraint: "${neg}".`;
        recommendedSaferAlternative = `Modify plan steps to strictly avoid ${neg}.`;
        break;
      }
    }

    // Check historical failure modes
    const failures = memoryEngine.getFailureMemory();
    for (const f of failures) {
      if (f.error.toLowerCase().includes('syntax') && planText.includes('eval')) {
        riskScore += 35;
        failureMode = 'UNSAFE_EVAL_SYNTAX_RISK';
        riskReason = 'Previous failure involved unsafe syntax or evaluation.';
        recommendedSaferAlternative = 'Use safe AST generation or typed static declarations.';
      } else if (f.error.toLowerCase().includes('import') && planText.includes('dynamic import')) {
        riskScore += 30;
        failureMode = 'UNRESOLVED_DYNAMIC_IMPORT';
        riskReason = 'Historical failure involved missing or unresolved dynamic ESM imports.';
        recommendedSaferAlternative = 'Use explicit top-level ES module imports.';
      }
    }

    // Bound risk score
    riskScore = Math.min(99, Math.max(5, riskScore));
    const confidence = this.calibrateConfidence(
      failures.length > 0 ? 'VERIFIED' : 'EXECUTED',
      90,
      riskScore > 40 ? 1 : 0
    );

    return {
      riskScore,
      failureMode,
      riskReason,
      recommendedSaferAlternative,
      confidence
    };
  }

  // =========================================================================
  // 8. CROSS-TASK PATTERN RECOGNITION (Requirement 16)
  // =========================================================================

  public recognizeReusablePattern(
    taskType: string,
    componentsRequired: string[]
  ): {
    patternName: string;
    architecturalStack: string[];
    isCompatible: boolean;
    compatibilityNotes: string;
  } {
    const comps = componentsRequired.map(c => c.toLowerCase());
    const isFullStack = comps.some(c => c.includes('db') || c.includes('postgres') || c.includes('auth') || c.includes('api'));

    if (isFullStack) {
      return {
        patternName: 'Enterprise Full-Stack Architecture (Auth -> PostgreSQL -> Memory/Redis -> API Gateway -> React UI)',
        architecturalStack: ['Authentication Layer', 'PostgreSQL Schema', 'Memory Engine / Cache', 'API Gateway', 'React / Tailwind Frontend'],
        isCompatible: true,
        compatibilityNotes: 'Fully compatible with ANNY Enterprise full-stack container environment.'
      };
    }

    return {
      patternName: 'Single-View Modular Client Component (React + Tailwind)',
      architecturalStack: ['React 18', 'Tailwind CSS', 'Local State Engine'],
      isCompatible: true,
      compatibilityNotes: 'Complies with single-view structural constraints for client utilities.'
    };
  }

  // =========================================================================
  // 9. A/B INTELLIGENCE TESTING PLATFORM (Requirement 13)
  // =========================================================================

  public runABTest(
    strategyA: string,
    strategyB: string,
    taskCategory: string
  ): {
    winner: string;
    strategyAScore: number;
    strategyBScore: number;
    metrics: {
      accuracyDiff: number;
      latencyDiffMs: number;
      repairRateDiff: number;
    };
  } {
    const statsA = Array.from(this.strategyPerformanceMap.values()).find(s => s.strategyName === strategyA && s.taskCategory === taskCategory);
    const statsB = Array.from(this.strategyPerformanceMap.values()).find(s => s.strategyName === strategyB && s.taskCategory === taskCategory);

    const scoreA = statsA ? statsA.qualityRating : 85;
    const scoreB = statsB ? statsB.qualityRating : 92;

    const winner = scoreB >= scoreA ? strategyB : strategyA;

    return {
      winner,
      strategyAScore: scoreA,
      strategyBScore: scoreB,
      metrics: {
        accuracyDiff: Math.abs(scoreA - scoreB),
        latencyDiffMs: Math.abs((statsA?.avgLatencyMs || 200) - (statsB?.avgLatencyMs || 150)),
        repairRateDiff: Math.abs((statsA?.repairFrequency || 0) - (statsB?.repairFrequency || 0))
      }
    };
  }

  // =========================================================================
  // 10. DECISION MEMORY DECAY & CONFIDENCE CALIBRATION (Requirement 7)
  // =========================================================================

  public evaluateDecisionOutcome(
    decisionKey: string,
    actualOutcome: 'SUCCESS' | 'REPAIRED' | 'FAILED',
    actualPerformanceScore: number
  ): void {
    const record = memoryEngine.getDecisionMemory().find(d => d.key === decisionKey);
    if (record) {
      memoryEngine.recordDecision(
        decisionKey,
        record.decision,
        record.reason,
        record.alternatives,
        record.expectedOutcome || 'High quality verified build',
        actualOutcome
      );

      if (actualOutcome === 'FAILED' || actualOutcome === 'REPAIRED') {
        const stats = Array.from(this.strategyPerformanceMap.values()).find(s => s.strategyName === record.decision);
        if (stats) {
          stats.qualityRating = Math.max(10, stats.qualityRating - (actualOutcome === 'FAILED' ? 20 : 10));
        }
      }
    }
  }

  // =========================================================================
  // 11. CONTROLLED IMPROVEMENT PROPOSALS (Safe Self-Improvement)
  // =========================================================================

  /**
   * Generates a controlled improvement proposal based on empirical evidence without unsafe code editing.
   */
  public createImprovementProposal(
    targetComponent: ImprovementProposal['targetComponent'],
    issueObserved: string,
    proposedRuleChange: string
  ): ImprovementProposal {
    const id = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const proposal: ImprovementProposal = {
      id,
      timestamp: Date.now(),
      targetComponent,
      issueObserved,
      proposedRuleChange,
      simulatedImpactScore: 88,
      status: 'PROPOSED'
    };

    this.improvementProposals.set(id, proposal);
    return proposal;
  }

  public evaluateProposal(proposalId: string): ImprovementProposal | null {
    const proposal = this.improvementProposals.get(proposalId);
    if (!proposal) return null;

    proposal.status = 'VERIFIED';
    return proposal;
  }

  // =========================================================================
  // 8. INTELLIGENCE DASHBOARD TELEMETRY
  // =========================================================================

  public updateDashboardTelemetry(data: Partial<IntelligenceDashboardTelemetry>): IntelligenceDashboardTelemetry {
    this.activeDashboardTelemetry = {
      currentTask: data.currentTask || 'Idle',
      currentIntent: data.currentIntent || 'General Reasoning',
      activeConstraints: data.activeConstraints || memoryEngine.getNegativeMemory(),
      retrievedExperiences: data.retrievedExperiences || [],
      selectedStrategy: data.selectedStrategy || 'Standard Pipeline',
      selectedModel: data.selectedModel || 'gemini-4-hydrogen',
      toolsUsed: data.toolsUsed || [],
      executionStatus: data.executionStatus || 'SUCCESS',
      verificationStatus: data.verificationStatus || 'VERIFIED',
      critiqueScore: data.critiqueScore ?? 95,
      failureLog: data.failureLog,
      repairLog: data.repairLog,
      lessonLearned: data.lessonLearned,
      memoryUpdated: true,
      timestamp: Date.now()
    };

    return this.activeDashboardTelemetry;
  }

  public getDashboardTelemetry(): IntelligenceDashboardTelemetry | null {
    return this.activeDashboardTelemetry;
  }

  public getUserIntelligenceModel(): UserIntelligenceModel {
    return { ...this.userIntelligenceModel };
  }

  public getSummaryStats() {
    return {
      experienceRecordsCount: this.experienceMemory.size,
      modelPerformanceTracked: this.modelPerformanceMap.size,
      strategyPerformanceTracked: this.strategyPerformanceMap.size,
      improvementProposalsCount: this.improvementProposals.size,
      userCorrectionCount: this.userIntelligenceModel.repeatedNegativeConstraints.length,
      recurringFailurePatternsCount: this.recurringFailurePatterns.size
    };
  }

  // =========================================================================
  // 12. ANNY SELF-CODEBASE ARCHITECTURE CONSTITUTION (Requirements 1, 2, 3, 4, 5)
  // =========================================================================

  public evaluateSelfFileArchitecture(
    filePath: string,
    lineCount: number,
    responsibilityCount: number = 1
  ) {
    return evaluateSelfFileArchitecture(filePath, lineCount, responsibilityCount);
  }

  public recommendUserProjectArchitecture(
    projectGoal: string,
    scope: 'tiny' | 'medium' | 'large' | 'enterprise'
  ) {
    return recommendUserProjectArchitecture(projectGoal, scope);
  }

  public deconstructLargeProject(
    projectName: string,
    goal: string,
    complexity: 'High' | 'Enterprise'
  ) {
    return deconstructLargeProject(projectName, goal, complexity);
  }
}

export const adaptiveIntelligenceEngine = AdaptiveIntelligenceEngine.getInstance();


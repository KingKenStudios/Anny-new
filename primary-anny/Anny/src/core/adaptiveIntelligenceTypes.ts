/**
 * ANNY CORE — ADAPTIVE INTELLIGENCE TYPES
 */

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface ExperienceRecord {
  id: string;
  timestamp: number;
  projectId: string;
  userPrompt: string;
  intentGoal: string;
  taskType: 'build' | 'conversation' | 'repair' | 'refactor' | 'question' | 'creative';
  domain: string;
  modelsUsed: string[];
  toolsUsed: string[];
  strategy: string;
  result: 'SUCCESS' | 'REPAIRED' | 'FAILED';
  errorLogs: string[];
  repairsApplied: string[];
  userCorrections: string[];
  verificationScore: number;
  lessonLearned: string;
  confidenceLevel: ConfidenceLevel;
}

export interface ModelPerformanceStats {
  modelId: string;
  provider: string;
  taskCategory: string;
  totalExecutions: number;
  successes: number;
  failures: number;
  repairsNeeded: number;
  avgLatencyMs: number;
  qualityScore: number;
  userCorrectionRate: number;
  lastUpdated: number;
}

export interface StrategyStats {
  strategyName: string;
  taskCategory: string;
  totalExecutions: number;
  successes: number;
  avgLatencyMs: number;
  repairFrequency: number;
  qualityRating: number;
}

export interface UserIntelligenceModel {
  frequentlyUsedShorthand: Record<string, string>;
  explicitDesignPreferences: string[];
  repeatedNegativeConstraints: string[];
  preferredWorkflow: string;
  domainFocus: string;
  totalInteractions: number;
  lastCorrectionTimestamp: number;
}

export interface ImprovementProposal {
  id: string;
  timestamp: number;
  targetComponent: 'ModelRouter' | 'CognitiveCritic' | 'IntentEngine' | 'Orchestrator' | 'RepairEngine';
  issueObserved: string;
  proposedRuleChange: string;
  simulatedImpactScore: number;
  status: 'PROPOSED' | 'SIMULATED' | 'BENCHMARKED' | 'VERIFIED' | 'DEPLOYED';
}

export interface IntelligenceDashboardTelemetry {
  currentTask: string;
  currentIntent: string;
  activeConstraints: string[];
  retrievedExperiences: string[];
  selectedStrategy: string;
  selectedModel: string;
  toolsUsed: string[];
  executionStatus: string;
  verificationStatus: string;
  critiqueScore: number;
  failureLog?: string;
  repairLog?: string;
  lessonLearned?: string;
  memoryUpdated: boolean;
  timestamp: number;
}

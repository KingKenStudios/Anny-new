/**
 * ANNY — UNIFIED SHARED COGNITIVE STATE ENGINE
 * Centralized, singular source of truth for the ANNY Unified Multi-Model Brain.
 * Every model, worker, and orchestrator reads from and contributes findings to this state.
 */

import { systemBus } from './systemBus';

export interface ModelFinding {
  id: string;
  sourceModel: string;
  workerRole: string;
  category: 'context' | 'intent' | 'architecture' | 'vfs' | 'syntax' | 'runtime' | 'verification';
  observation: string;
  suggestedAction?: string;
  confidenceScore: number;
  timestamp: string;
}

export interface SpecialistFinding {
  specialistName: string;
  capability: string;
  affectedFiles: string[];
  findings: string[];
  constraintsToEnforce: string[];
  timestamp: string;
}

export interface ExecutionDecision {
  decisionId: string;
  goal: string;
  primaryModelUsed: string;
  participatingWorkers: string[];
  selectedStrategy: string;
  reasoningTrace: string[];
  negativeConstraints: string[];
  timestamp: string;
}

export interface VerificationResult {
  verified: boolean;
  typecheckPassed: boolean;
  vfsSynced: boolean;
  buildPassed: boolean;
  details: string;
  errors: string[];
  timestamp: string;
}

export interface AnnyCognitiveState {
  sessionId: string;
  projectId: string;
  conversationHistory: Array<{ role: 'user' | 'bot'; content: string }>;
  currentUserMessage: string;
  resolvedIntent: string;
  taskRelationship: string;
  currentTask: {
    taskId: string;
    description: string;
    status: 'IDLE' | 'ANALYZING' | 'BUILDING' | 'VERIFYING' | 'COMPLETED' | 'HALTED' | 'FAILED';
    startedAt: number;
  } | null;
  previousTask: {
    taskId: string;
    description: string;
    status: string;
  } | null;
  activeBuildState: {
    isBuilding: boolean;
    currentStage: string;
    activeFile?: string;
    completedFiles: string[];
    failedFiles: string[];
  };
  projectIdentity: {
    id: string;
    name: string;
    domain: string;
  };
  vfsState: {
    fileCount: number;
    modifiedFiles: string[];
    recentlyTouchedFiles: string[];
  };
  selectedUIElement?: string;
  currentEditorState?: {
    activeFile?: string;
    cursorPosition?: { line: number; column: number };
  };
  userConstraints: Record<string, boolean>;
  preservationRequirements: string[];
  previousCorrections: string[];
  previousFailures: string[];
  successfulStrategies: string[];
  modelFindings: ModelFinding[];
  specialistFindings: SpecialistFinding[];
  latestDecision: ExecutionDecision | null;
  latestVerification: VerificationResult | null;
  learningContext: {
    patternsLearnedCount: number;
    lastFailureAnalysis?: string;
  };
}

export class AnnyCognitiveStateEngine {
  private static instance: AnnyCognitiveStateEngine;
  private state: AnnyCognitiveState;

  private constructor() {
    this.state = this.getInitialState();
  }

  public static getInstance(): AnnyCognitiveStateEngine {
    if (!AnnyCognitiveStateEngine.instance) {
      AnnyCognitiveStateEngine.instance = new AnnyCognitiveStateEngine();
    }
    return AnnyCognitiveStateEngine.instance;
  }

  private getInitialState(): AnnyCognitiveState {
    return {
      sessionId: 'default_session',
      projectId: 'default_project',
      conversationHistory: [],
      currentUserMessage: '',
      resolvedIntent: 'UNKNOWN',
      taskRelationship: 'NEW_TASK',
      currentTask: null,
      previousTask: null,
      activeBuildState: {
        isBuilding: false,
        currentStage: 'IDLE',
        completedFiles: [],
        failedFiles: []
      },
      projectIdentity: {
        id: 'default_project',
        name: 'ANNY Workspace',
        domain: 'General'
      },
      vfsState: {
        fileCount: 0,
        modifiedFiles: [],
        recentlyTouchedFiles: []
      },
      userConstraints: {},
      preservationRequirements: [],
      previousCorrections: [],
      previousFailures: [],
      successfulStrategies: [],
      modelFindings: [],
      specialistFindings: [],
      latestDecision: null,
      latestVerification: null,
      learningContext: {
        patternsLearnedCount: 0
      }
    };
  }

  public getState(): Readonly<AnnyCognitiveState> {
    return this.state;
  }

  public updateState(partial: Partial<AnnyCognitiveState>): void {
    this.state = {
      ...this.state,
      ...partial
    };
    systemBus.publish('TaskStateUpdated', 'CognitiveStateEngine', { state: this.state });
  }

  public addModelFinding(finding: Omit<ModelFinding, 'id' | 'timestamp'>): void {
    const fullFinding: ModelFinding = {
      ...finding,
      id: `mfind_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    this.state.modelFindings.unshift(fullFinding);
    if (this.state.modelFindings.length > 30) {
      this.state.modelFindings = this.state.modelFindings.slice(0, 30);
    }
  }

  public addSpecialistFinding(finding: Omit<SpecialistFinding, 'timestamp'>): void {
    const fullFinding: SpecialistFinding = {
      ...finding,
      timestamp: new Date().toISOString()
    };
    this.state.specialistFindings.unshift(fullFinding);
    if (this.state.specialistFindings.length > 30) {
      this.state.specialistFindings = this.state.specialistFindings.slice(0, 30);
    }
  }

  public recordDecision(decision: ExecutionDecision): void {
    this.state.latestDecision = decision;
  }

  public recordVerification(verification: VerificationResult): void {
    this.state.latestVerification = verification;
    if (!verification.verified && verification.details) {
      this.state.previousFailures.unshift(verification.details);
      if (this.state.previousFailures.length > 10) {
        this.state.previousFailures = this.state.previousFailures.slice(0, 10);
      }
    }
  }

  public setTask(taskId: string, description: string): void {
    if (this.state.currentTask) {
      this.state.previousTask = {
        taskId: this.state.currentTask.taskId,
        description: this.state.currentTask.description,
        status: this.state.currentTask.status
      };
    }
    this.state.currentTask = {
      taskId,
      description,
      status: 'ANALYZING',
      startedAt: Date.now()
    };
    this.state.activeBuildState = {
      isBuilding: false,
      currentStage: 'ANALYZING',
      completedFiles: [],
      failedFiles: []
    };
    systemBus.publish('TaskStatusChanged', 'CognitiveStateEngine', {
      taskId,
      status: 'ANALYZING',
      description
    });
  }

  public setTaskStatus(
    status: 'IDLE' | 'ANALYZING' | 'BUILDING' | 'VERIFYING' | 'COMPLETED' | 'HALTED' | 'FAILED',
    currentStage?: string
  ): void {
    if (this.state.currentTask) {
      this.state.currentTask.status = status;
    }
    this.state.activeBuildState.isBuilding = status === 'BUILDING' || status === 'VERIFYING';
    this.state.activeBuildState.currentStage = currentStage || status;
    systemBus.publish('TaskStatusChanged', 'CognitiveStateEngine', {
      taskId: this.state.currentTask?.taskId,
      status,
      stage: this.state.activeBuildState.currentStage
    });
  }

  public setActiveBuildStage(stage: string, isBuilding: boolean = true): void {
    this.state.activeBuildState.currentStage = stage;
    this.state.activeBuildState.isBuilding = isBuilding;
    systemBus.publish('TaskStateUpdated', 'CognitiveStateEngine', { state: this.state });
  }

  public recordTaskFile(filePath: string, outcome: 'completed' | 'failed'): void {
    this.state.activeBuildState.activeFile = filePath;
    if (outcome === 'completed') {
      if (!this.state.activeBuildState.completedFiles.includes(filePath)) {
        this.state.activeBuildState.completedFiles.push(filePath);
      }
    } else {
      if (!this.state.activeBuildState.failedFiles.includes(filePath)) {
        this.state.activeBuildState.failedFiles.push(filePath);
      }
    }
  }

  public completeTask(): void {
    if (this.state.currentTask) {
      this.state.currentTask.status = 'COMPLETED';
    }
    this.state.activeBuildState.isBuilding = false;
    this.state.activeBuildState.currentStage = 'COMPLETED';
    systemBus.publish('TaskStatusChanged', 'CognitiveStateEngine', {
      taskId: this.state.currentTask?.taskId,
      status: 'COMPLETED'
    });
  }

  public failTask(reason?: string): void {
    if (this.state.currentTask) {
      this.state.currentTask.status = 'FAILED';
    }
    this.state.activeBuildState.isBuilding = false;
    this.state.activeBuildState.currentStage = 'FAILED';
    if (reason) {
      this.state.previousFailures.unshift(reason);
      if (this.state.previousFailures.length > 10) {
        this.state.previousFailures = this.state.previousFailures.slice(0, 10);
      }
    }
    systemBus.publish('TaskStatusChanged', 'CognitiveStateEngine', {
      taskId: this.state.currentTask?.taskId,
      status: 'FAILED',
      reason
    });
  }

  public haltTask(reason?: string): void {
    if (this.state.currentTask) {
      this.state.currentTask.status = 'HALTED';
    }
    this.state.activeBuildState.isBuilding = false;
    this.state.activeBuildState.currentStage = 'HALTED';
    systemBus.publish('TaskStatusChanged', 'CognitiveStateEngine', {
      taskId: this.state.currentTask?.taskId,
      status: 'HALTED',
      reason
    });
  }

  public addPreservationRequirement(req: string): void {
    if (!this.state.preservationRequirements.includes(req)) {
      this.state.preservationRequirements.push(req);
    }
  }

  public addCorrection(corr: string): void {
    this.state.previousCorrections.unshift(corr);
    if (this.state.previousCorrections.length > 20) {
      this.state.previousCorrections = this.state.previousCorrections.slice(0, 20);
    }
  }
}

export const annyCognitiveStateEngine = AnnyCognitiveStateEngine.getInstance();

/**
 * ANNY CORE — COGNITIVE TASK STATE MANAGER
 * Maintains explicit, persistent, session-aware cognitive task state (CURRENT_TASK)
 * to prevent losing task continuity during conversation or active execution.
 */

import { systemBus } from './systemBus';

export interface CurrentCognitiveTask {
  id: string;
  userGoal: string;
  originalPrompt: string;
  interpretedIntent: string;
  projectId: string;
  sessionId: string;
  activePlan: string[];
  completedSteps: string[];
  pendingSteps: string[];
  failedSteps: string[];
  skippedSteps: string[];
  modifiedFiles: string[];
  targetFiles: string[];
  targetComponents: string[];
  constraints: Record<string, boolean | string>;
  currentOperation: string;
  executionId: string;
  status: 'idle' | 'analyzing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

export class TaskStateManager {
  private static instance: TaskStateManager;
  private tasksBySession: Map<string, CurrentCognitiveTask> = new Map();

  private constructor() {
    systemBus.subscribe('BuildCancelled', (event) => {
      const payload = event.payload || {};
      const targetSessionId = typeof payload.sessionId === 'string' ? payload.sessionId : undefined;
      const targetExecutionId = typeof payload.executionId === 'string' ? payload.executionId : undefined;
      const targetTaskId = typeof payload.taskId === 'string' ? payload.taskId : undefined;
      const isTargeted = Boolean(targetSessionId || targetExecutionId || targetTaskId);

      for (const [sessionId, task] of this.tasksBySession.entries()) {
        const isActive = task.status === 'analyzing' || task.status === 'running' || task.status === 'paused';
        const matchesTarget = !isTargeted || (
          (!targetSessionId || task.sessionId === targetSessionId) &&
          (!targetExecutionId || task.executionId === targetExecutionId) &&
          (!targetTaskId || task.id === targetTaskId)
        );
        if (isActive && matchesTarget) this.cancelTask(sessionId);
      }
    });
  }

  public static getInstance(): TaskStateManager {
    if (!TaskStateManager.instance) {
      TaskStateManager.instance = new TaskStateManager();
    }
    return TaskStateManager.instance;
  }

  /**
   * Retrieves active task for given session ID
   */
  public getTask(sessionId: string = 'default_session'): CurrentCognitiveTask | null {
    return this.tasksBySession.get(sessionId) || null;
  }

  /**
   * Creates new task or updates existing active task
   */
  public createOrUpdateTask(params: {
    sessionId: string;
    projectId: string;
    userPrompt: string;
    interpretedIntent: string;
    planSteps?: string[];
    targetFiles?: string[];
    targetComponents?: string[];
    constraints?: Record<string, boolean | string>;
    executionId?: string;
    isRefinement?: boolean;
  }): CurrentCognitiveTask {
    const {
      sessionId,
      projectId,
      userPrompt,
      interpretedIntent,
      planSteps = [],
      targetFiles = [],
      targetComponents = [],
      constraints = {},
      executionId = 'ANNY_TASK_' + Date.now().toString(36),
      isRefinement = false
    } = params;

    const existing = this.getTask(sessionId);

    if (existing && isRefinement && (existing.status === 'running' || existing.status === 'analyzing' || existing.status === 'paused')) {
      // Mid-build refinement: Update existing task rather than overwriting
      console.log(`[TaskStateManager] Mid-build refinement received for session ${sessionId}. Merging constraints & steps.`);
      
      const mergedConstraints = { ...existing.constraints, ...constraints };
      const mergedTargetFiles = Array.from(new Set([...existing.targetFiles, ...targetFiles]));
      const mergedTargetComponents = Array.from(new Set([...existing.targetComponents, ...targetComponents]));
      
      existing.userGoal = `${existing.userGoal} | Refinement: ${userPrompt}`;
      existing.constraints = mergedConstraints;
      existing.targetFiles = mergedTargetFiles;
      existing.targetComponents = mergedTargetComponents;
      existing.updatedAt = Date.now();

      if (planSteps.length > 0) {
        existing.activePlan = Array.from(new Set([...existing.activePlan, ...planSteps]));
        existing.pendingSteps = Array.from(new Set([...existing.pendingSteps, ...planSteps]))
          .filter(step => !existing.completedSteps.includes(step) && !existing.failedSteps.includes(step));
      }

      this.tasksBySession.set(sessionId, existing);
      systemBus.publish('TaskStateUpdated', 'TaskStateManager', existing);
      return existing;
    }

    // Initialize new task
    const newTask: CurrentCognitiveTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userGoal: userPrompt,
      originalPrompt: userPrompt,
      interpretedIntent,
      projectId,
      sessionId,
      activePlan: planSteps,
      completedSteps: [],
      pendingSteps: [...planSteps],
      failedSteps: [],
      skippedSteps: [],
      modifiedFiles: [],
      targetFiles,
      targetComponents,
      constraints: { ...constraints },
      currentOperation: 'Initializing Cognitive Task',
      executionId,
      status: 'analyzing',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.tasksBySession.set(sessionId, newTask);
    systemBus.publish('TaskCreated', 'TaskStateManager', newTask);
    console.log(`[TaskStateManager] Created new cognitive task [${newTask.id}] for session ${sessionId}`);
    return newTask;
  }

  /**
   * Adds positive or negative constraint to active task (e.g. PRESERVE_NAVIGATION = true)
   */
  public addConstraint(sessionId: string, key: string, value: boolean | string): void {
    const task = this.getTask(sessionId);
    if (task) {
      task.constraints[key] = value;
      task.updatedAt = Date.now();
      console.log(`[TaskStateManager] Added constraint [${key} = ${value}] to task ${task.id}`);
      systemBus.publish('TaskStateUpdated', 'TaskStateManager', task);
    }
  }

  /**
   * Marks step as completed and records modified files
   */
  public markStepCompleted(sessionId: string, stepName: string, modifiedFile?: string): void {
    const task = this.getTask(sessionId);
    if (!task) return;

    if (!task.completedSteps.includes(stepName)) {
      task.completedSteps.push(stepName);
    }
    task.pendingSteps = task.pendingSteps.filter(s => s !== stepName);

    if (modifiedFile && !task.modifiedFiles.includes(modifiedFile)) {
      task.modifiedFiles.push(modifiedFile);
    }

    task.updatedAt = Date.now();
    systemBus.publish('TaskStepCompleted', 'TaskStateManager', { taskId: task.id, stepName, modifiedFile });
  }

  /**
   * Marks step as failed
   */
  public markStepFailed(sessionId: string, stepName: string, errorMsg?: string): void {
    const task = this.getTask(sessionId);
    if (!task) return;

    if (!task.failedSteps.includes(stepName)) {
      task.failedSteps.push(stepName);
    }
    task.pendingSteps = task.pendingSteps.filter(step => step !== stepName);
    task.status = 'failed';
    task.currentOperation = `Step failed: ${stepName} (${errorMsg || 'Error'})`;
    task.updatedAt = Date.now();

    systemBus.publish('TaskStepFailed', 'TaskStateManager', { taskId: task.id, stepName, errorMsg });
  }

  /**
   * Updates operational status
   */
  public updateStatus(
    sessionId: string,
    status: CurrentCognitiveTask['status'],
    currentOperation?: string
  ): void {
    const task = this.getTask(sessionId);
    if (!task) return;

    task.status = status;
    if (currentOperation) task.currentOperation = currentOperation;
    task.updatedAt = Date.now();

    systemBus.publish('TaskStatusChanged', 'TaskStateManager', { taskId: task.id, status, currentOperation });
  }

  /**
   * Cancels task safely
   */
  public cancelTask(sessionId: string): void {
    const task = this.getTask(sessionId);
    if (!task) return;

    task.status = 'cancelled';
    task.currentOperation = 'Task cancelled by user request.';
    task.updatedAt = Date.now();

    console.log(`[TaskStateManager] Task ${task.id} cancelled for session ${sessionId}`);
    systemBus.publish('TaskCancelled', 'TaskStateManager', { taskId: task.id });
  }

  public completeTask(sessionId: string, currentOperation: string = 'Task completed.'): void {
    const task = this.getTask(sessionId);
    if (!task) return;

    task.status = 'completed';
    task.currentOperation = currentOperation;
    task.updatedAt = Date.now();
    systemBus.publish('TaskStatusChanged', 'TaskStateManager', { taskId: task.id, status: 'completed', currentOperation });
  }

  /**
   * Clears completed or cancelled task
   */
  public clearTask(sessionId: string): void {
    this.tasksBySession.delete(sessionId);
  }
}

export const taskStateManager = TaskStateManager.getInstance();

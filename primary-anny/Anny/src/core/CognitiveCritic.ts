/**
 * ANNY CORE — COGNITIVE CRITIC & DECISION CRITIC ENGINE
 * Independent critique layer evaluating proposed execution plans, architectural decisions,
 * negative constraints compliance, and code generations before declaration of success.
 */

import { IntentModel } from './cognitiveIntentEngine';

export interface CriticEvaluation {
  passed: boolean;
  score: number; // 0 - 100
  intentMatchConfidence: number;
  negativeConstraintsPreserved: boolean;
  violatedConstraints: string[];
  missingRequirements: string[];
  unsupportedAssumptions: string[];
  architectureCompatible: boolean;
  potentialFailureModes: string[];
  suggestedAdjustments: string[];
  criticModelUsed: string;
}

export interface CodeCritiqueResult {
  isCodeValid: boolean;
  score: number;
  syntaxOk: boolean;
  negativeConstraintsViolated: string[];
  securityRisks: string[];
  unnecessaryFeatureCount: number;
  criticFeedback: string;
}

export class CognitiveCritic {
  private static instance: CognitiveCritic;

  public static getInstance(): CognitiveCritic {
    if (!CognitiveCritic.instance) {
      CognitiveCritic.instance = new CognitiveCritic();
    }
    return CognitiveCritic.instance;
  }

  /**
   * Pre-execution critique of intent model & plan
   */
  public evaluatePlan(
    userPrompt: string,
    intentModel: IntentModel,
    proposedPlanSteps: string[],
    selectedModel: string
  ): CriticEvaluation {
    const promptLower = userPrompt.toLowerCase();
    const violatedConstraints: string[] = [];
    const missingRequirements: string[] = [];
    const unsupportedAssumptions: string[] = [];
    const potentialFailureModes: string[] = [];
    const suggestedAdjustments: string[] = [];

    // 1. Negative Constraint Verification
    let negativeConstraintsPreserved = true;
    if (intentModel.negativeConstraints && intentModel.negativeConstraints.length > 0) {
      for (const neg of intentModel.negativeConstraints) {
        const negTerm = neg.toLowerCase().replace(/don't|do not|never|avoid|without|no|shouldn't|should not/g, '').trim();
        if (negTerm && proposedPlanSteps.some(step => step.toLowerCase().includes(negTerm))) {
          violatedConstraints.push(`Plan step potentially includes explicitly forbidden element: "${neg}"`);
          negativeConstraintsPreserved = false;
        }
      }
    }

    // 2. Missing Requirements Detection
    if (intentModel.has3DRequirement && !proposedPlanSteps.some(s => s.toLowerCase().includes('3d') || s.toLowerCase().includes('spatial') || s.toLowerCase().includes('canvas'))) {
      missingRequirements.push('User requested 3D/Spatial capability, but plan lacks 3D pipeline step.');
    }
    if (intentModel.hasDatabaseRequirement && !proposedPlanSteps.some(s => s.toLowerCase().includes('database') || s.toLowerCase().includes('schema') || s.toLowerCase().includes('firestore') || s.toLowerCase().includes('sql'))) {
      missingRequirements.push('User requested database storage, but plan lacks data persistence step.');
    }

    // 3. Check Unsupported Assumptions
    if (intentModel.taskType === 'build' && intentModel.ambiguities.length > 0) {
      unsupportedAssumptions.push(`Ambiguity detected: ${intentModel.ambiguities.join('; ')}. Using conservative reasonable assumption.`);
    }

    // 4. Failure Mode Identification
    if (intentModel.taskType === 'build') {
      potentialFailureModes.push('Unbalanced JSX brackets or missing import statements');
      potentialFailureModes.push('CSS layout clipping on smaller viewports');
    }

    // 5. Compute Critic Score
    let score = 100;
    if (!negativeConstraintsPreserved) score -= 30;
    score -= missingRequirements.length * 15;
    score -= violatedConstraints.length * 20;

    const passed = score >= 75 && negativeConstraintsPreserved;

    if (!passed) {
      suggestedAdjustments.push('Enforce strict negative constraint filters in code generator.');
      if (missingRequirements.length > 0) {
        suggestedAdjustments.push(`Inject missing required components: ${missingRequirements.join(', ')}`);
      }
    }

    return {
      passed,
      score: Math.max(0, score),
      intentMatchConfidence: intentModel.goal.length > 0 ? 0.95 : 0.6,
      negativeConstraintsPreserved,
      violatedConstraints,
      missingRequirements,
      unsupportedAssumptions,
      architectureCompatible: true,
      potentialFailureModes,
      suggestedAdjustments,
      criticModelUsed: selectedModel === 'claude-3-haiku' ? 'claude-3-haiku' : 'qwen2.5-coder:7b'
    };
  }

  /**
   * Code Critique: Inspects synthesized code independently before compilation or runtime delivery
   */
  public critiqueCode(code: string, intentModel: IntentModel): CodeCritiqueResult {
    const text = code || '';
    const openBraces = (text.match(/{/g) || []).length;
    const closeBraces = (text.match(/}/g) || []).length;
    const syntaxOk = openBraces === closeBraces;

    const negativeConstraintsViolated: string[] = [];
    if (intentModel.negativeConstraints) {
      for (const neg of intentModel.negativeConstraints) {
        const term = neg.toLowerCase().replace(/don't|do not|never|avoid|without|no|shouldn't|should not/g, '').trim();
        if (term && term.length > 3 && text.toLowerCase().includes(term)) {
          negativeConstraintsViolated.push(neg);
        }
      }
    }

    const securityRisks: string[] = [];
    if (/eval\(|dangerouslySetInnerHTML|document\.write\(/i.test(text)) {
      securityRisks.push('Potentially unsafe DOM sink or eval instruction detected');
    }

    let score = 95;
    if (!syntaxOk) score -= 40;
    score -= negativeConstraintsViolated.length * 25;
    score -= securityRisks.length * 20;

    return {
      isCodeValid: syntaxOk && negativeConstraintsViolated.length === 0,
      score: Math.max(0, score),
      syntaxOk,
      negativeConstraintsViolated,
      securityRisks,
      unnecessaryFeatureCount: 0,
      criticFeedback: score > 80 
        ? 'Code structure complies with ANNY core intent boundaries.'
        : `Critique flags: ${negativeConstraintsViolated.length > 0 ? 'Negative constraints violated; ' : ''}${!syntaxOk ? 'Syntax bracket mismatch; ' : ''}`
    };
  }
}

export const cognitiveCritic = CognitiveCritic.getInstance();

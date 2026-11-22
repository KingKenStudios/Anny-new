/**
 * ANNY CORE — DECISION CLASSIFIER & CLARIFICATION ENGINE (PHASE 32)
 * Categorizes decisions in user prompts as SAFE_TO_ASSUME vs USER_DECISION_REQUIRED.
 * Autonomously executes safe decisions while generating clear, structured user questions
 * when multiple materially different deliverables/architectures exist.
 */

import { projectGraphEngine } from './projectGraphEngine';

export type DecisionCategory = 'SAFE_TO_ASSUME' | 'USER_DECISION_REQUIRED';

export interface DecisionClassification {
  category: DecisionCategory;
  reasoning: string;
  questionPrompt?: string;
  options?: string[];
  safeAssumptions: string[];
}

export class DecisionClassifierEngine {
  private static instance: DecisionClassifierEngine;

  public static getInstance(): DecisionClassifierEngine {
    if (!DecisionClassifierEngine.instance) {
      DecisionClassifierEngine.instance = new DecisionClassifierEngine();
    }
    return DecisionClassifierEngine.instance;
  }

  /**
   * Evaluates prompt & history to determine if important user clarification is required.
   */
  public classifyUserPrompt(
    prompt: string,
    history: any[] = [],
    projectId: string = 'default'
  ): DecisionClassification {
    const trimmed = prompt.trim();
    const lower = trimmed.toLowerCase();

    // Check if graph is paused for a pending user decision
    const graph = projectGraphEngine.getGraph(projectId);
    if (graph && graph.isPaused && graph.pauseReason) {
      const question = graph.pauseReason;
      const options = graph.pauseOptions || [];
      const choiceLower = lower.trim();

      let matchedChoice = prompt;
      if (choiceLower === '1' || choiceLower.includes('first') || choiceLower.includes('rendered') || choiceLower.includes('image')) {
        matchedChoice = options[0] || '1. Rendered 3D visual image';
      } else if (choiceLower === '2' || choiceLower.includes('second') || choiceLower.includes('interactive') || choiceLower.includes('3d model') || choiceLower.includes('webgl')) {
        matchedChoice = options[1] || '2. Interactive 3D WebGL model';
      } else if (choiceLower === '3' || choiceLower.includes('third') || choiceLower.includes('both')) {
        matchedChoice = options[2] || '3. Both';
      }

      projectGraphEngine.recordUserDecisionInGraph(projectId, question, matchedChoice);

      return {
        category: 'SAFE_TO_ASSUME',
        reasoning: `User answered pending decision question "${question}" with choice: "${matchedChoice}".`,
        safeAssumptions: [`User selected: ${matchedChoice}`]
      };
    }

    // Check if user already provided a decision choice recently in history
    if (graph && graph.userDecisions && graph.userDecisions.length > 0) {
      const lastDecision = graph.userDecisions[graph.userDecisions.length - 1];
      if (Date.now() - new Date(lastDecision.timestamp).getTime() < 300000) {
        return {
          category: 'SAFE_TO_ASSUME',
          reasoning: `User recently selected choice "${lastDecision.userChoice}" for question: "${lastDecision.question}".`,
          safeAssumptions: [`User choice: ${lastDecision.userChoice}`]
        };
      }
    }

    // 1. Ambiguous 3D Deliverable Check (e.g., "Create a 3D chair")
    if (/\b3d\b/i.test(lower) && /\b(chair|car|house|character|object|asset|room|product|avatar)\b/i.test(lower)) {
      if (!/\b(image|picture|render|interactive|three\.js|webgl|model)\b/i.test(lower)) {
        return {
          category: 'USER_DECISION_REQUIRED',
          reasoning: 'The 3D asset request can mean multiple materially different deliverables (rendered image vs interactive WebGL model).',
          questionPrompt: `I noticed you requested a 3D deliverable (${trimmed}). Which format would you like me to build?`,
          options: [
            '1. Rendered 3D visual image (High-resolution AI visual image)',
            '2. Interactive 3D WebGL model (Three.js interactive Canvas component)',
            '3. Both (Interactive 3D model with background AI rendered visuals)'
          ],
          safeAssumptions: []
        };
      }
    }

    // 2. Authentication System Ambiguity
    if (/\b(auth|login|signup|user system|authentication)\b/i.test(lower) && !/\b(firebase|jwt|oauth|auth0)\b/i.test(lower)) {
      if (lower.startsWith('build an auth') || lower.startsWith('create authentication')) {
        return {
          category: 'USER_DECISION_REQUIRED',
          reasoning: 'Multiple materially different authentication mechanisms exist.',
          questionPrompt: 'Which authentication strategy would you prefer for this system?',
          options: [
            '1. Firebase Authentication + OAuth (Google / GitHub login)',
            '2. Custom JWT + PostgreSQL session store',
            '3. Local-first authentication service (only when explicitly configured)'
          ],
          safeAssumptions: []
        };
      }
    }

    // 3. Database Selection Ambiguity
    if (/\b(database|storage|backend db)\b/i.test(lower) && !/\b(postgres|postgresql|firestore|sqlite|mongo)\b/i.test(lower)) {
      if (lower.startsWith('add database') || lower.startsWith('create database')) {
        return {
          category: 'USER_DECISION_REQUIRED',
          reasoning: 'Multiple database engines are available (Relational PostgreSQL vs NoSQL Firestore).',
          questionPrompt: 'Which database engine would you like to use for persistent storage?',
          options: [
            '1. Cloud SQL / PostgreSQL (Relational schema with Drizzle ORM)',
            '2. Firebase Firestore (NoSQL document store)',
            '3. Client-side IndexedDB / LocalStorage (Transient offline prototype)'
          ],
          safeAssumptions: []
        };
      }
    }

    // Default to SAFE_TO_ASSUME for standard or well-defined requests
    const safeAssumptions: string[] = [
      'Use React 18 + Vite with TypeScript',
      'Use Tailwind CSS for styling and layout',
      'Follow single-view layout constraints unless multi-view is requested',
      'Use Lucide-React icons for UI icons'
    ];

    return {
      category: 'SAFE_TO_ASSUME',
      reasoning: 'The prompt specifies sufficient context or aligns with standard project conventions.',
      safeAssumptions
    };
  }
}

export const decisionClassifierEngine = DecisionClassifierEngine.getInstance();

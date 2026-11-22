/**
 * ANNY CORE — COGNITIVE INTENT ENGINE & UNDERSTANDING PIPELINE
 * Provides structured intent modeling, multi-stage reasoning, ambiguity detection,
 * decision engine, and execution verification.
 */

import { MultimodalSessionState } from './annyMultimodalSession';

export interface IntentModel {
  goal: string;
  domain: string;
  taskType: 'build' | 'conversation' | 'repair' | 'refactor' | 'question' | 'creative';
  requestedOutput: string;
  constraints: string[];
  negativeConstraints: string[];
  preferences: string[];
  context: Record<string, any>;
  dependencies: string[];
  requiredCapabilities: string[];
  ambiguities: string[];
  assumptions: Array<{ assumption: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' }>;
  successCriteria: string[];
  has3DRequirement: boolean;
  hasImageRequirement: boolean;
  hasDatabaseRequirement: boolean;
  hasApiRequirement: boolean;
  isScadaRequest?: boolean;
  // 10 Core Semantic Understanding Dimensions
  whatUserWants: string;
  whyTheyWantIt: string;
  whatAlreadyExists: string;
  whatMustRemainUnchanged: string;
  whatNeedsToChange: string;
  relevantFiles: string[];
  relevantHistorySummary: string;
  relevantAssets: string[];
  requiredToolsAndModels: string[];
  expectedFinalResult: string;
  confidence: number;
}

export interface DecisionModel {
  actionToTake: string;
  justification: string;
  thingsToAvoid: string[];
  requiredTools: string[];
  requiredModels: {
    reasoning?: string;
    coding?: string;
    vision?: string;
    image?: string;
  };
  stepSequence: string[];
  potentialRisks: string[];
  verificationCriteria: string[];
}

export class CognitiveIntentEngine {
  private static instance: CognitiveIntentEngine;

  public static getInstance(): CognitiveIntentEngine {
    if (!CognitiveIntentEngine.instance) {
      CognitiveIntentEngine.instance = new CognitiveIntentEngine();
    }
    return CognitiveIntentEngine.instance;
  }

  /**
   * Distinguishes literal request from actual goal, constraints, preferences, and negative constraints
   */
  public buildIntentModel(
    userPrompt: string, 
    history: any[] = [], 
    projectContext: Record<string, any> = {},
    multimodalContext?: MultimodalSessionState
  ): IntentModel {
    const trimmed = (userPrompt || '').trim();
    const lower = trimmed.toLowerCase();
    const priorUserMessages = Array.isArray(history) ? history.filter((m: any) => m?.role === 'user').slice(-6) : [];
    const priorAssistantMessages = Array.isArray(history) ? history.filter((m: any) => m?.role === 'assistant' || m?.role === 'model').slice(-4) : [];
    const latestPriorUser = priorUserMessages.at(-1)?.content || '';
    const explicitTopicShift = /^(change topic|different topic|unrelated|forget that|instead|separate question|another question|something else)\b/i.test(lower);
    const continuationIntent = /^(continue|keep going|go on|proceed|do it|do that|yes|okay|ok|then|now|next)\b/i.test(lower) || /\b(continue|as before|what we discussed|the previous|it|that|this|same project|current project)\b/i.test(lower);
    const contextualProjectLanguage = /\b(the app|the website|the project|the code|the backend|the frontend|the page|the component|the preview|the build|the 3d|the model)\b/i.test(lower);
    const topicShift = explicitTopicShift || (/^(what|why|how|can you explain|tell me|advise|should i|do you think)\b/i.test(lower) && !contextualProjectLanguage);

    // Multimodal context analysis
    const hasImageInput = multimodalContext?.inputs.some(i => i.type === 'IMAGE') || false;
    const hasAudioInput = multimodalContext?.inputs.some(i => i.type === 'AUDIO') || false;
    const hasUrlInput = multimodalContext?.inputs.some(i => i.type === 'URL') || false;

    // Negative constraints parsing
    const negativeConstraints: string[] = [];
    const negMatches = trimmed.match(/(?:don't|do not|never|avoid|without|no|shouldn't|should not|does not|doesn't)\s+([^\.,;\n]+)/gi);
    if (negMatches) {
      negMatches.forEach(m => negativeConstraints.push(m.trim()));
    }

    // Accumulate negative constraints from conversation history
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        if (msg && msg.role === 'user' && typeof msg.content === 'string') {
          const histMatches = msg.content.match(/(?:don't|do not|never|avoid|without|no|shouldn't|should not|does not|doesn't)\s+([^\.,;\n]+)/gi);
          if (histMatches) {
            histMatches.forEach(m => {
              const cleaned = m.trim();
              if (!negativeConstraints.includes(cleaned)) {
                negativeConstraints.push(cleaned);
              }
            });
          }
        }
      }
    }

    // Constraints parsing
    const constraints: string[] = [];
    if (/responsive/i.test(lower)) constraints.push('Must be fully mobile-responsive');
    if (/dark mode|dark theme/i.test(lower)) constraints.push('Must support dark mode');
    if (/light mode|light theme/i.test(lower)) constraints.push('Must use light theme layout');
    if (/offline/i.test(lower)) constraints.push('Must operate offline-first');

    // Requirement flags
    const has3DRequirement = /\b(3d|three\.js|r3f|canvas|modly|spatial|model)\b/i.test(lower);
    const hasImageRequirement = /\b(image|picture|banner|photo|thumbnail|avatar|gallery)\b/i.test(lower) || hasImageInput;
    const hasDatabaseRequirement = /\b(database|db|postgres|postgresql|firestore|sql|crud|data storage|schema|tables|migration)\b/i.test(lower);
    const hasApiRequirement = /\b(api|backend|rest|endpoint|server|express)\b/i.test(lower);
    const hasVoiceRequirement = /\b(voice|speech|speak|stt|tts|audio)\b/i.test(lower) || hasAudioInput;

    // Task Type
    let taskType: IntentModel['taskType'] = 'conversation';
    if (topicShift) {
      taskType = /^(what|why|how|can you explain|tell me|advise|should i|do you think)/i.test(lower) ? 'question' : 'conversation';
    } else if (continuationIntent && contextualProjectLanguage && priorUserMessages.length > 0) {
      taskType = /\b(fix|repair|change|modify|update|add|remove|refactor|improve|make|edit)\b/i.test(lower) ? 'repair' : 'build';
    } else if (
      /\b(build|create|generate|develop|design|make|add|update|modify|fix)\b/i.test(lower) ||
      /\b(i need|i want|can you|would like|give me)\s+(?:a|an|the|some)?\s*(?:page|app|ui|login|dashboard|component|website|interface|button|form|feature)\b/i.test(lower) ||
      has3DRequirement ||
      hasImageRequirement ||
      hasUrlInput
    ) {
      taskType = 'build';
    } else if (/\b(how|what|why|explain|tell|describe)\b/i.test(lower) && !has3DRequirement) {
      taskType = 'question';
    }

    // Ambiguity detection
    const ambiguities: string[] = [];
    const isVeryShort = trimmed.split(/\s+/).length < 4;
    if (isVeryShort && /\b(make it|fix it|do it|change it|more|bigger|smaller)\b/i.test(lower)) {
      ambiguities.push('Pronoun reference "it" requires conversation or project context mapping.');
    }

    // Assumptions
    const assumptions: IntentModel['assumptions'] = [
      { assumption: 'User expects clean TypeScript & React component structure.', confidence: 'HIGH' },
      { assumption: 'User requires responsive glassmorphism/modern Tailwind styling.', confidence: 'HIGH' }
    ];

    if (!has3DRequirement) {
      assumptions.push({ assumption: 'Standard 2D web app architecture is preferred over 3D canvas.', confidence: 'HIGH' });
    }

    return {
      goal: trimmed,
      domain: has3DRequirement ? '3D Interactive App' : hasDatabaseRequirement ? 'Full-Stack Data App' : 'Modern Web Application',
      taskType,
      requestedOutput: taskType === 'build' ? 'Production UI & Functional Code' : 'Structured Cognitive Answer',
      constraints,
      negativeConstraints,
      preferences: ['Clean typography pairing', 'High visual contrast', 'Fluid transitions'],
      context: projectContext,
      dependencies: has3DRequirement ? ['three', '@react-three/fiber'] : [],
      requiredCapabilities: [
        taskType === 'build' ? 'CODING' : 'REASONING',
        ...(has3DRequirement ? ['3D'] : []),
        ...(hasImageRequirement ? ['IMAGE_GENERATION'] : []),
        ...(hasImageInput ? ['VISION'] : []),
        ...(hasAudioInput ? ['AUDIO_UNDERSTANDING'] : []),
        ...(hasUrlInput ? ['URL_UNDERSTANDING'] : []),
        ...(hasVoiceRequirement ? ['SPEECH_TO_TEXT'] : [])
      ],
      ambiguities,
      assumptions,
      successCriteria: [
        'Complete functional fulfillment without placeholders',
        'Satisfies all positive & negative constraints',
        'Pristine visual presentation with high WCAG contrast',
        ...(hasUrlInput ? ['Accurately reflects content of provided URL'] : []),
        ...(hasImageInput ? ['Accurately reflects layout/design of provided image'] : [])
      ],
      has3DRequirement,
      hasImageRequirement,
      hasDatabaseRequirement,
      hasApiRequirement,
      whatUserWants: `User wants to ${trimmed}${hasUrlInput ? ' based on provided URL' : ''}${hasImageInput ? ' based on provided image' : ''}`,
      whyTheyWantIt: `To achieve functional fulfillment of ${taskType} goal with high polish and responsive interactivity.`,
      whatAlreadyExists: projectContext?.summary || 'Existing project workspace and VFS state.',
      whatMustRemainUnchanged: negativeConstraints.join(', ') || 'Core structural integrity and existing layout unless specified.',
      whatNeedsToChange: taskType === 'build' ? 'Application components or code implementation according to prompt.' : 'No code modifications required.',
      relevantFiles: projectContext?.files || ['src/App.tsx'],
      relevantHistorySummary: [latestPriorUser, priorAssistantMessages.at(-1)?.content || ''].filter(Boolean).join(' | ').slice(0, 500) || 'None',
      relevantAssets: multimodalContext?.inputs.map(i => i.url || i.id) || [],
      requiredToolsAndModels: [
        ...(taskType === 'build' ? ['code_synthesizer', 'vite_builder', 'linter_verifier'] : ['gemini-4-hydrogen']),
        ...(hasImageInput ? ['vision_model'] : []),
        ...(hasUrlInput ? ['vision_model'] : [])
      ],
      expectedFinalResult: taskType === 'build' ? 'Verified production-ready React / Tailwind application.' : 'Cognitive executive response.',
      confidence: 0.95
    };
  }

  /**
   * Decision Engine — maps intent model to concrete action plan & model selection
   */
  public evaluateDecision(intent: IntentModel): DecisionModel {
    const requiredTools: string[] = [];
    if (intent.taskType === 'build') {
      requiredTools.push('code_synthesizer', 'vite_builder', 'linter_verifier');
    }
    if (intent.has3DRequirement) {
      requiredTools.push('modly_3d_engine');
    }
    if (intent.hasImageRequirement) {
      requiredTools.push('creative_image_engine');
    }

    const stepSequence: string[] = [];
    if (intent.taskType === 'build') {
      stepSequence.push('Analyze positive & negative constraints');
      stepSequence.push('Formulate component hierarchy & state architecture');
      if (intent.has3DRequirement) stepSequence.push('Configure 3D viewport canvas');
      stepSequence.push('Synthesize clean TypeScript / Tailwind component code');
      stepSequence.push('Perform autonomous compilation & semantic verification');
    } else {
      stepSequence.push('Analyze core prompt & contextual references');
      stepSequence.push('Formulate structured executive response');
    }

    return {
      actionToTake: intent.taskType === 'build' ? 'Autonomous Full-Stack Build' : 'Executive Cognitive Advisory',
      justification: `User requested ${intent.domain} with goal: "${intent.goal.slice(0, 60)}"`,
      thingsToAvoid: [
        'Do not introduce unrequested features or cluttered tabs',
        'Do not leave TODO comments or placeholder stubs',
        'Do not violate negative constraints: ' + (intent.negativeConstraints.join(', ') || 'None')
      ],
      requiredTools,
      requiredModels: {
        reasoning: 'gemini-4-hydrogen',
        coding: intent.has3DRequirement ? 'gemini-4-hydrogen' : 'gemini-4-neon',
        image: 'gemini-3.1-flash-lite-image'
      },
      stepSequence,
      potentialRisks: intent.ambiguities.length > 0 ? ['Ambiguous prompt references'] : [],
      verificationCriteria: intent.successCriteria
    };
  }
}

export const cognitiveIntentEngine = CognitiveIntentEngine.getInstance();

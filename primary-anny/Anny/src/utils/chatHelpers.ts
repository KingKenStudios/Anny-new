/** Conversation and build-intent helpers shared by every ANNY text model path. */

export interface WebsiteOrAppIntentResult {
  isBuildRequest: boolean;
  isProjectEdit: boolean;
  intentKind: 'website_build' | 'website_edit' | 'chat';
  reason: string;
}

const PURE_INFO_QUESTION_REGEX =
  /^(?:please\s+)?(?:what(?:'s| is| are)|why(?:'s| is| do| does)|how\s+(?:do|does|did|to|can|should|much|many)|explain|tell me(?:\s+about)?|define|who\s+is|when\s+(?:did|was|is)|where\s+is|compare|difference between|should\s+i|do\s+you\s+think|help\s+me\s+understand|teach\s+me)\b/i;

const POLITE_REQUEST_PREFIX_REGEX =
  /^(?:(?:hey|hi|hello)\s+(?:anny[,!.\s]+)?|(?:please|can\s+you|could\s+you|would\s+you|will\s+you|help\s+me(?:\s+to)?)\s+)+/i;

const BUILD_ACTION_VERB_REGEX =
  /\b(build|create|generate|make|develop|design|construct|scaffold|code|implement|launch|put together|spin up|set up|craft)\b/i;

const APP_OR_WEBSITE_TARGET_REGEX =
  /\b(web\s*site|website|web\s*page|webpage|web\s*app(?:lication)?|webapp|application|full[- ]?stack|online\s+store|e-?commerce|storefront|marketplace|saas|dashboard|admin\s+panel|portal|inventory(?:\s+management)?\s+(?:app|system)|crm|erp|booking\s+system|portfolio(?:\s+site|\s+website)?|landing\s+page|business\s+site|company\s+site|social\s+media(?:\s+platform|\s+network|\s+app|\s+site)?|community\s+platform|mobile\s*(?:app|ui)|platform|management\s+system|school\s+portal|pos\s+system|3d\s+(?:app|scene|world|model|studio|viewer)|simulator|game|kanban|todo\s+app|calculator|blog|forum)\b/i;

const PURE_MEDIA_ONLY_REGEX =
  /\b(website\s+mockup|web\s+mockup|landing\s+page\s+mockup|app\s+mockup|ui\s+mockup|mockup\s+image|static\s+mockup|wireframe\s+image|dribbble\s+shot|render\s+of\s+a\s+ui|logo|wordmark|monogram|favicon|app\s+icon|album\s+cover|poster|flyer|thumbnail|portrait|headshot|music\s+video|animated\s+logo|logo\s+intro|video\s+intro|sound\s+effect|beat|instrumental|song|voiceover)\b/i;

export function detectWebsiteOrAppIntent(
  promptText: string,
  options: {
    hasActiveProject?: boolean;
    creativeDomain?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'APPLICATION' | 'CONVERSATION';
    explicitTopicShift?: boolean;
  } = {}
): WebsiteOrAppIntentResult {
  if (!promptText || typeof promptText !== 'string') {
    return { isBuildRequest: false, isProjectEdit: false, intentKind: 'chat', reason: 'Empty prompt' };
  }

  const trimmed = promptText.trim();
  const lower = trimmed.toLowerCase();

  // Creative media domains (Image/Logo/Video/Audio) stay in their specialized workflows
  if (
    options.creativeDomain === 'IMAGE' ||
    options.creativeDomain === 'VIDEO' ||
    options.creativeDomain === 'AUDIO'
  ) {
    return { isBuildRequest: false, isProjectEdit: false, intentKind: 'chat', reason: `Routed to ${options.creativeDomain}` };
  }

  // Greetings or explicit non-build topic shifts stay conversational
  const isGreeting =
    /^(hello|hi|hey|how are you|what'?s up|yo|good morning|good afternoon|good evening|test|ping)\b/i.test(lower) &&
    lower.length < 50;
  if (isGreeting || options.explicitTopicShift) {
    return { isBuildRequest: false, isProjectEdit: false, intentKind: 'chat', reason: 'Greeting or topic shift' };
  }

  // Pure media prompts without software target must never trigger app generation
  if (PURE_MEDIA_ONLY_REGEX.test(lower) && !/\b(website\s+for|web\s*app|storefront|landing\s+page|e-?commerce|social\s+media\s+platform)\b/i.test(lower)) {
    return { isBuildRequest: false, isProjectEdit: false, intentKind: 'chat', reason: 'Creative media request' };
  }

  // Strip polite conversational opener ("Could you...", "Can you please...", "Hey ANNY...")
  const strippedCore = lower.replace(POLITE_REQUEST_PREFIX_REGEX, '').trim();

  // Pure informational questions ("What is a website?", "How does an e-commerce store work?", "Should I use React?")
  if (PURE_INFO_QUESTION_REGEX.test(strippedCore) && !BUILD_ACTION_VERB_REGEX.test(strippedCore)) {
    return { isBuildRequest: false, isProjectEdit: false, intentKind: 'chat', reason: 'Informational question' };
  }

  // Explicit "Should I..." or "Can you explain..." even with target nouns
  if (
    /^(?:can\s+you\s+explain|could\s+you\s+explain|tell\s+me\s+how|how\s+does|what\s+makes|why\s+do|should\s+i|compare)\b/i.test(lower) &&
    !/\b(build\s+me|create\s+me|make\s+me|build\s+an?|create\s+an?|develop\s+an?)\b/i.test(lower)
  ) {
    return { isBuildRequest: false, isProjectEdit: false, intentKind: 'chat', reason: 'Explanation or advice question' };
  }

  // Context-aware edits on an active project
  const contextContinuation =
    /^(continue|keep going|go on|proceed|do it|do that|yes|okay|ok|then|now|next)\b/i.test(lower) ||
    /\b(the site|the website|the app|the project|the code|the backend|the frontend|the page|the homepage|the component|the preview|the build|current project)\b/i.test(lower);

  const editVerb =
    /\b(fix|repair|change|modify|update|edit|add|remove|delete|rename|refactor|improve|make|continue|finish|complete|connect|implement|restyle|redesign|adjust|replace|swap|center|align)\b/i.test(lower);

  const editUiTarget =
    /\b(page|section|background|color|colors|theme|font|hero|header|navbar|navigation|menu|footer|sidebar|button|form|contact\s+form|about\s+page|pricing|cart|checkout|modal|layout|responsive|mobile|modern|dark\s+mode|light\s+mode|error|bug|build|preview)\b/i.test(lower);

  const explicitNewBuildVerb =
    /\b(build|create|generate|develop|design|construct|scaffold|make\s+me|i\s+want\s+(?:a|an)|i\s+need\s+(?:a|an))\b/i.test(strippedCore) ||
    /\b(build|create|generate|develop|design|construct|scaffold)\s+(?:me\s+)?(?:a|an|my|our|the)?\b/i.test(lower);

  const startsFreshProject =
    /^(?:now\s+)?(?:start\s+over|new\s+project|build\s+(?:me\s+)?(?:a|an)\s+new|create\s+(?:me\s+)?(?:a|an)\s+new)/i.test(strippedCore) ||
    (explicitNewBuildVerb && APP_OR_WEBSITE_TARGET_REGEX.test(lower) && !/\b(to the|in the|on the|of the|current|existing)\b/i.test(lower) && !options.hasActiveProject);

  if (options.hasActiveProject && !startsFreshProject && (editVerb || contextContinuation) && (editUiTarget || contextContinuation || options.creativeDomain === 'APPLICATION')) {
    return {
      isBuildRequest: true,
      isProjectEdit: true,
      intentKind: 'website_edit',
      reason: 'Iterative modification on active website/application project',
    };
  }

  if (options.creativeDomain === 'APPLICATION' || (explicitNewBuildVerb && APP_OR_WEBSITE_TARGET_REGEX.test(lower))) {
    return {
      isBuildRequest: true,
      isProjectEdit: false,
      intentKind: 'website_build',
      reason: 'Detected website or web-application generation intent',
    };
  }

  return { isBuildRequest: false, isProjectEdit: false, intentKind: 'chat', reason: 'Standard conversational message' };
}

export const isAppWebsiteOr3DRequest = (promptText: string): boolean => {
  if (!promptText || typeof promptText !== 'string') return false;
  const detected = detectWebsiteOrAppIntent(promptText);
  if (detected.isBuildRequest) return true;
  const prompt = promptText.trim().toLowerCase();
  const stripped = prompt.replace(POLITE_REQUEST_PREFIX_REGEX, '').trim();
  if (PURE_INFO_QUESTION_REGEX.test(stripped) && !BUILD_ACTION_VERB_REGEX.test(stripped)) return false;
  if (PURE_MEDIA_ONLY_REGEX.test(prompt) && !APP_OR_WEBSITE_TARGET_REGEX.test(prompt)) return false;
  return BUILD_ACTION_VERB_REGEX.test(prompt) && APP_OR_WEBSITE_TARGET_REGEX.test(prompt);
};

export function userExplicitlyRequestedStructure(text: string): boolean {
  return /\b(code|source code|json|yaml|xml|markdown|table|tables|list|steps|checklist|api|schema|sql|terminal|command|file tree|folder structure|architecture|report|documentation|technical specification)\b/i.test(text);
}

export function isStructuredOrTechnicalContent(content: string): boolean {
  if (!content) return false;
  return /```[\s\S]*?```/.test(content) || /(^|\n)\s*\|.+\|\s*\n\s*\|\s*[-:]+/m.test(content) || /^\s*[\[{][\s\S]*[\]}]\s*$/.test(content);
}

/**
 * Removes decorative Markdown from normal conversation while preserving real
 * code, URLs, paths, tables and structured output when the user requested it.
 */
export function formatNaturalConversation(content: string, options: { preserveStructured?: boolean } = {}): string {
  if (!content) return content;
  const preserve = options.preserveStructured ?? isStructuredOrTechnicalContent(content);
  if (preserve) return content.trim();

  const protectedTokens: string[] = [];
  const protect = (value: string) => {
    const id = `__ANNY_PROTECTED_${protectedTokens.length}__`;
    protectedTokens.push(value);
    return id;
  };

  let text = content.replace(/```[\s\S]*?```/g, (m) => protect(m));
  text = text.replace(/`[^`\n]+`/g, (m) => protect(m));
  text = text.replace(/https?:\/\/\S+|www\.\S+/gi, (m) => protect(m));
  text = text.replace(/(?:^|\s)(\/[^\s]+|[A-Za-z]:\\[^\s]+)/g, (m) => m[0] === ' ' ? ` ${protect(m.trim())}` : protect(m));

  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  text = text.replace(/^\s*(?:---+|___+|\*\*\*+)\s*$/gm, '');
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  text = text.replace(/__([^_\n]+)__/g, '$1');
  text = text.replace(/\*([^*\n]+)\*/g, '$1');
  text = text.replace(/_([^_\n]+)_/g, '$1');
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+[.)]\s+/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.replace(/\s+([,.;!?])/g, '$1');
  text = text.trim();

  protectedTokens.forEach((value, index) => {
    text = text.replaceAll(`__ANNY_PROTECTED_${index}__`, value);
  });
  return text;
}

export function cleanChatBubbleContent(content: string, isSoftware = false): string {
  if (!content) return content;
  if (!isSoftware) return formatNaturalConversation(content);

  const withoutCode = content.replace(/```(?:tsx|jsx|html|typescript|javascript|react)?[\s\S]*?```/gi, '').trim();
  const cleaned = formatNaturalConversation(withoutCode);
  const notice = 'The source code and project files are available in the Code workspace, and the generated application runs in the Preview panel.';
  return cleaned ? `${cleaned}\n\n${notice}` : notice;
}

export function isSynthesisOrPlaceholderContent(content?: string): boolean {
  if (!content || typeof content !== 'string') return false;
  const lower = content.toLowerCase().trim();
  return lower.includes('synthesizing') ||
    lower.includes('initializing autonomous build sequence') ||
    lower.includes('anny neural engine synthesizing') ||
    lower.includes('analyzing intent and recovering project context') ||
    lower.startsWith('⚡ stage:') ||
    lower.startsWith('⚙️ progress:');
}

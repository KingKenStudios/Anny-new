/** Conversation and build-intent helpers shared by every ANNY text model path. */

export const isAppWebsiteOr3DRequest = (promptText: string): boolean => {
  if (!promptText || typeof promptText !== 'string') return false;
  const prompt = promptText.trim().toLowerCase();

  const question = /^(hello|hi|hey|bawo|se daadaa|kedu|sannu|yaya|wetin|how far|what|why|how|explain|tell me|can you explain|describe|is there|does|who|when|where|compare|difference|help me understand|teach me|how do i|what is)\b/i.test(prompt);
  if (question && !/\b(build|create|generate|make|develop|design|construct|scaffold|kọ|meere|rụpụta|kera|gina)\b/i.test(prompt)) return false;

  const pureImage = /^(generate|create|draw|make|render|show|design|paint)\s+(an?\s+)?(image|picture|photo|portrait|illustration|drawing|artwork|logo|banner|icon|graphic|wallpaper|avatar)\b/i.test(prompt) &&
    !/\b(app|website|site|page|landing|portal|3d|model|canvas|game|software|dashboard|store|ui|builder|component|os|operating system)\b/i.test(prompt);
  if (pureImage) return false;

  const creation = /\b(build|create|generate|make|develop|design|construct|scaffold|setup|craft|write|code|kọ|kọ́|ṣe|meere|rụpụta|kera|gina|haɗa|dey build)\b/i.test(prompt);
  const target = /\b(app|application|website|web app|site|page|landing|portal|dashboard|platform|system|operating system|os|tool|store|e-commerce|ecommerce|shop|calculator|todo|kanban|portfolio|game|simulator|3d|model|ui|interface|prototype|component|software|bot|crm|erp|scada|finance|banking|chat|editor|widget|fullstack|backend|api|webụsaịtị|gidan yanar gizo)\b/i.test(prompt);
  return (creation && target) || /\b(build an?|create an?|make an?|generate an?)\b/i.test(prompt);
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

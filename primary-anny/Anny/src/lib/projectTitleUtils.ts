/**
 * Project Title Utility
 * Extracts and formats real, professional project titles from user prompts
 * replacing generic mockup titles.
 */

const GENERIC_STALE_TITLES = new Set([
  'task & planner app',
  'task and planner app',
  'generated website',
  'generated application',
  'modern web showcase',
  'modern website',
  'custom application studio',
  'anny master system workspace',
  'anny website builder',
  'default project',
  'new anny project',
  'vite-react-app',
  'my-app',
  'react-app',
]);

export function isGenericPlaceholderProjectTitle(name?: string | null): boolean {
  if (!name || !name.trim()) return true;
  const lower = name.trim().toLowerCase();
  return GENERIC_STALE_TITLES.has(lower) || lower.startsWith('proj_');
}

export function generateRealProjectTitle(prompt: string): string {
  if (!prompt || !prompt.trim()) return 'Custom Application';

  const p = prompt.trim();

  // If this is an upgrade/update request, preserve existing active project name ONLY if it is a real project name
  const isUpgradeRequest = /^(upgrade|update|modify|add|change|fix|enhance|improve|refactor|redesign)\b/i.test(p) ||
    /with images|add images|new features|better styling|upgrade site|upgrade app/i.test(p);

  if (isUpgradeRequest && typeof localStorage !== 'undefined') {
    const existingName = localStorage.getItem('anny_current_project_name');
    if (
      existingName &&
      existingName.trim().length > 2 &&
      !isGenericPlaceholderProjectTitle(existingName) &&
      !existingName.toLowerCase().includes('upgrade') &&
      !existingName.toLowerCase().includes('update')
    ) {
      return existingName.trim();
    }
  }

  // First check if the user specified an explicit name in the prompt
  const explicitNameMatch = p.match(/(?:named|called|title[d]?|name\s+it|for)\s+["']?([A-Z][a-zA-Z0-9&\-\s]{1,36}?)["']?(?:\s+(?:app|application|website|web\s+app|landing\s+page|portal|store|dashboard|system|platform|studio|company|group|inc|ltd)|$|,|\.)/);
  if (explicitNameMatch && explicitNameMatch[1].trim().length > 1) {
    const raw = explicitNameMatch[1].trim();
    if (!isGenericPlaceholderProjectTitle(raw)) {
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
  }

  // Dynamic Clean Extraction for any arbitrary prompt — preserve what is actually being built
  const suffixMatch = p.match(/\b(website|web app|mobile app|dashboard|storefront|e-commerce store|store|portal|platform|crm|erp|portfolio|landing page|game|api|calculator|blog|marketplace|studio)\b/i);
  const detectedSuffix = suffixMatch
    ? suffixMatch[1].split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : '';

  let cleaned = p
    .replace(/^(please\s+)?(can\s+you\s+)?(build|create|generate|make|develop|design|construct|upgrade|update|modify|add|change|fix|refactor|enhance|improve)\s+(me\s+)?(an?\s+)?(modern\s+|professional\s+|complete\s+|full[- ]?stack\s+|responsive\s+)?/i, '')
    .replace(/\b(with|using|featuring|including|that has|that includes)\b[\s\S]*$/i, '')
    .replace(/[^\w\s&\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 2) {
    cleaned = p
      .replace(/^(please\s+)?(build|create|generate|make|develop|design)\s+/i, '')
      .replace(/[^\w\s&\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => {
      if (w.toUpperCase() === w && w.length <= 5) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    });

  let result = words.join(' ').trim();
  if (result.length > 42) {
    result = result.substring(0, 42).trim();
  }

  if (!result || result.length < 2) {
    return detectedSuffix || 'Custom Application';
  }

  if (detectedSuffix && !result.toLowerCase().includes(detectedSuffix.toLowerCase())) {
    const combined = `${result} ${detectedSuffix}`;
    return combined.length <= 46 ? combined : result;
  }

  return result;
}

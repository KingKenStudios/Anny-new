/**
 * Project Title Utility
 * Extracts and formats real, professional project titles from user prompts
 * replacing generic mockup titles.
 */

export function generateRealProjectTitle(prompt: string): string {
  if (!prompt || !prompt.trim()) return 'Custom Application Studio';

  const p = prompt.trim();
  const lower = p.toLowerCase();

  // If this is an upgrade/update request, try preserving existing active project name
  const isUpgradeRequest = /^(upgrade|update|modify|add|change|fix|enhance|improve|refactor|redesign)\b/i.test(p) ||
    /with images|add images|new features|better styling|upgrade site|upgrade app/i.test(p);

  if (isUpgradeRequest && typeof localStorage !== 'undefined') {
    const existingName = localStorage.getItem('anny_current_project_name');
    if (existingName && existingName.length > 2 && !existingName.toLowerCase().includes('upgrade') && !existingName.toLowerCase().includes('update')) {
      return existingName;
    }
  }

  // First check if the user specified an explicit name in the prompt
  const explicitNameMatch = p.match(/(?:named|called|title[d]?|name\s+it)\s+["']?([a-zA-Z0-9\s_]+?)["']?(?:\s+(?:app|website|landing|portal|store|dashboard|system|platform)|$|,|\.)/i);
  if (explicitNameMatch && explicitNameMatch[1].trim().length > 1) {
    const raw = explicitNameMatch[1].trim();
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  // Domain / Subject clean extraction
  if (/3d|robot|mesh|car|torus|sphere/i.test(p)) {
    if (/robot/i.test(p)) return '3D Robot Model';
    if (/car|vehicle/i.test(p)) return '3D Automotive Visualizer';
    if (/planet|solar|orbit/i.test(p)) return '3D Planetary Simulator';
    return '3D WebGL Studio';
  }

  if (/e-commerce|ecommerce|store|shop|shoe|sneaker|cart/i.test(p)) {
    if (/shoe|sneaker/i.test(p)) return 'Sneaker & Footwear Store';
    if (/fashion|clothing/i.test(p)) return 'Apparel Boutique';
    if (/electronic|tech|gadget/i.test(p)) return 'Electronics Store';
    return 'E-Commerce Marketplace';
  }

  if (/todo|task|kanban|planner|notes|schedule|list/i.test(p)) {
    if (/kanban/i.test(p)) return 'Kanban Workflow Board';
    if (/notes|journal/i.test(p)) return 'Note & Task Journal';
    return 'Task & Planner App';
  }

  if (/calculator|finance|budget|converter|unit/i.test(p)) {
    if (/finance|budget/i.test(p)) return 'Financial Dashboard';
    if (/currency/i.test(p)) return 'Currency Converter';
    return 'Calculator';
  }

  if (/dashboard|analytics|admin|telemetry|metrics/i.test(p)) {
    if (/weather|climate/i.test(p)) return 'Climate Telemetry Dashboard';
    if (/crypto|coin/i.test(p)) return 'Crypto Market Intelligence Dashboard';
    return 'Enterprise Analytics Dashboard';
  }

  if (/api|rest|express|backend|endpoint/i.test(p)) {
    return 'High-Performance REST API Service';
  }

  if (/scada|plc|industrial|sensor|modbus|loto/i.test(p)) {
    return 'SCADA Industrial Telemetry Monitor';
  }

  if (/website|landing|portfolio|agency|blog|showcase/i.test(p)) {
    if (/portfolio/i.test(p)) return 'Professional Developer Portfolio';
    if (/agency|business/i.test(p)) return 'Enterprise Business Agency';
    if (/restaurant|food|menu/i.test(p)) return 'Gourmet Culinary Showcase';
    return 'Modern Web Showcase';
  }

  if (/chat|messaging|forum|community/i.test(p)) {
    return 'Real-Time Neural Chat Platform';
  }

  if (/game|arcade|puzzle/i.test(p)) {
    return 'Interactive Web Game Studio';
  }

  // 2. Dynamic Title Extraction for Arbitrary Prompts
  let cleaned = p
    .replace(/^(please\s+)?(can\s+you\s+)?(build|create|generate|make|develop|design|construct|upgrade|update|modify|add|change|fix|refactor|enhance|improve)\s+(me\s+)?(an?\s+)?/i, '')
    .replace(/\b(app|application|website|web app|webapp|system|platform)\b/gi, '')
    .replace(/\b(with|using|adding|generate)\s+(images|pictures|photos|features|styling)\b/gi, '')
    .trim();

  // Strip trailing 'with ...' clauses if too long
  if (cleaned.length > 25 && cleaned.includes(' with ')) {
    cleaned = cleaned.split(' with ')[0].trim();
  }
  if (cleaned.length > 25 && cleaned.includes(' for ')) {
    cleaned = cleaned.split(' for ')[0].trim();
  }

  if (cleaned.length < 2) {
    cleaned = prompt.replace(/^(build|create|make|upgrade|update)\s+/i, '').trim();
  }

  // Capitalize words
  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1));
  
  let result = words.join(' ');

  if (result.length > 36) {
    result = result.substring(0, 36).trim() + '...';
  }

  return result ? `${result} Application` : 'Custom Application Studio';
}

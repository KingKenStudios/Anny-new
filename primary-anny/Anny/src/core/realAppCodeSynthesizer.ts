/**
 * ANNY — REAL APPLICATION CODE SYNTHESIZER
 *
 * One authoritative generation engine for user-created websites and applications.
 * - Understands 13 distinct project types and industry-appropriate design systems.
 * - Parses raw JSON, Markdown-fenced JSON (even when files like README.md contain code fences),
 *   file arrays, nested folder maps, structured tool-call responses, and multi-file code blocks.
 * - Rejects ordinary conversational text and detects truncated responses cleanly.
 * - Validates generated projects via generatedProjectValidator and runs a targeted repair loop
 *   before failing honestly with full diagnostics if retries are exhausted.
 * - Never serves a canned template or turns an invalid project into a fake success.
 */

import { modelRouter } from './modelRouter';
import { buildDomainPlatformBlueprint } from './platformBlueprintEngine';
import type { ChatMessage, ChatOptions, ChatPart, ChatResponse } from '../services/aiProviderPlatform';
import type { ProjectVerificationReport } from './generatedProjectValidator';
import { generateRealProjectTitle, isGenericPlaceholderProjectTitle } from '../lib/projectTitleUtils';

export type ProjectArchetype =
  | 'website'
  | 'landing_page'
  | 'ecommerce'
  | 'dashboard'
  | 'mobile_app'
  | 'desktop_app'
  | 'fullstack_web_app'
  | 'portfolio'
  | 'saas'
  | 'admin_panel'
  | 'game'
  | 'ui_mockup'
  | 'code_only';

export interface ProjectRequestClassification {
  projectType: ProjectArchetype;
  label: string;
  requiresBackend: boolean;
  allowCodeOnly: boolean;
  industryStyle: string;
  designDirection: string;
  explicitDarkNeonRequested: boolean;
}

export interface ProjectManifestMeta {
  projectName: string;
  projectType: ProjectArchetype;
  description: string;
  entryPoint: string;
  dependencies: string[];
  buildInstructions: string;
  envVars: string[];
  apiRoutes?: string[];
  databaseSchema?: string;
}

export interface ParsedGenerationPayload {
  files: Record<string, string>;
  summary?: string;
  manifest?: Partial<ProjectManifestMeta>;
  sourceFormat: 'json' | 'fenced_json' | 'tool_call' | 'markdown_files' | 'none';
  truncated: boolean;
  isConversationalOnly: boolean;
  parseError?: string;
}

export interface SynthesisPlan {
  files: Record<string, string>;
  summary: string;
  generationId: string;
  projectKind: 'frontend' | 'fullstack';
  projectType: ProjectArchetype;
  manifest: ProjectManifestMeta;
  repairAttempts: number;
  stages: string[];
  verification?: ProjectVerificationReport;
}

export type SynthesisChatExecutor = (
  messages: ChatMessage[],
  options: ChatOptions
) => Promise<Pick<ChatResponse, 'content' | 'functionCall' | 'provider' | 'model'>>;

function createGenerationId(): string {
  return `gen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizePath(filePath: string): string {
  let normalized = String(filePath || '').trim().replace(/\\/g, '/');
  normalized = normalized.replace(/^\.\/+/, '');
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, '/');
  if (normalized.length > 1 && normalized.endsWith('/')) normalized = normalized.slice(0, -1);
  return normalized;
}

/**
 * STEP A — Understand the request: classify project archetype, backend need,
 * and authentic industry visual direction (never forcing ANNY dark neon unless requested).
 */
export function classifyProjectRequest(prompt: string): ProjectRequestClassification {
  const lower = String(prompt || '').toLowerCase();
  const explicitDarkNeonRequested = /\b(dark neon|cyberpunk|neon glow|anny theme|obsidian neon|sci-?fi neon)\b/i.test(lower);
  const explicitFrontendOnly = /\b(static site|static website|landing page only|frontend only|ui only|mockup only|prototype only|no backend)\b/i.test(lower);
  const explicitBackendSignals =
    /\b(full[- ]?stack|backend|api routes?|rest api|graphql|database|postgres|sqlite|mysql|mongodb|auth(?:entication)?|login|sign[- ]?up|jwt|rbac|crud server|server[- ]?side|webhook|checkout server|stripe)\b/i.test(
      lower
    );

  let projectType: ProjectArchetype = 'website';
  let label = 'Modern Website';
  let requiresBackend = false;
  let allowCodeOnly = false;

  if (/\b(code only|write a function|implement an algorithm|cli script|library only|sdk only|utility script|utility module|helper utility|python script)\b/i.test(lower)) {
    projectType = 'code_only';
    label = 'Code / Utility Package';
    allowCodeOnly = true;
  } else if (/\b(ui mockup|wireframe prototype|interactive mockup|design prototype)\b/i.test(lower)) {
    projectType = 'ui_mockup';
    label = 'Interactive UI Mockup';
  } else if (/\b(game|arcade|puzzle game|platformer|chess|tetris|snake|rpg|canvas game|3d game)\b/i.test(lower)) {
    projectType = 'game';
    label = 'Interactive Browser Game';
  } else if (/\b(admin panel|back[- ]?office|moderation console|operations panel)\b/i.test(lower)) {
    projectType = 'admin_panel';
    label = 'Admin Panel Application';
    requiresBackend = !explicitFrontendOnly && explicitBackendSignals;
  } else if (/\b(saas|multi[- ]?tenant|subscription platform|billing portal)\b/i.test(lower)) {
    projectType = 'saas';
    label = 'SaaS Application';
    requiresBackend = !explicitFrontendOnly;
  } else if (/\b(e-?commerce|online store|storefront|shop|marketplace|product catalog with cart)\b/i.test(lower)) {
    projectType = 'ecommerce';
    label = 'E-Commerce Storefront';
    requiresBackend = !explicitFrontendOnly && explicitBackendSignals;
  } else if (/\b(mobile(?:\s+[a-z0-9&-]+){0,4}\s+app|ios(?:\s+and\s+android)?(?:\s+[a-z0-9&-]+){0,3}\s+app|android(?:\s+[a-z0-9&-]+){0,3}\s+app|react native|flutter app|pwa mobile|mobile[- ]first)\b/i.test(lower)) {
    projectType = 'mobile_app';
    label = 'Mobile-First Web Application';
    requiresBackend = !explicitFrontendOnly && explicitBackendSignals;
  } else if (/\b(desktop app|electron|tauri|workstation app)\b/i.test(lower)) {
    projectType = 'desktop_app';
    label = 'Desktop-Style Application';
    requiresBackend = !explicitFrontendOnly && explicitBackendSignals;
  } else if (/\b(dashboard|analytics|telemetry|monitoring|kpi|inventory management|stock tracking|workshop|crm|erp|pos system|booking system|task manager|project tracker)\b/i.test(lower)) {
    projectType = /\b(inventory|crm|erp|pos|booking|full[- ]?stack)\b/i.test(lower) ? 'fullstack_web_app' : 'dashboard';
    label = projectType === 'fullstack_web_app' ? 'Operational Web Application' : 'Analytics Dashboard';
    // Only hard-require server files when explicit backend/auth/database is requested,
    // while still supporting client+server architecture when generated.
    requiresBackend = !explicitFrontendOnly && explicitBackendSignals;
  } else if (/\b(portfolio|personal site|designer showcase|photographer site|agency showcase)\b/i.test(lower)) {
    projectType = 'portfolio';
    label = 'Creative Portfolio';
  } else if (/\b(landing page|launch page|waitlist|product launch)\b/i.test(lower)) {
    projectType = 'landing_page';
    label = 'Product Landing Page';
  } else if (explicitBackendSignals) {
    projectType = 'fullstack_web_app';
    label = 'Full-Stack Web Application';
    requiresBackend = !explicitFrontendOnly;
  }

  // Industry-authentic design direction (avoids one-size-fits-all dark neon)
  let industryStyle = 'clean modern editorial daylight palette with crisp slate ink, warm neutral surfaces, and disciplined brand accent';
  if (explicitDarkNeonRequested) {
    industryStyle = 'refined dark obsidian surfaces with controlled cyan/indigo luminous accents and crisp typographic contrast';
  } else if (/\b(electrical|industrial|automation|engineering|manufacturing|workshop|plc|scada|energy|power|grid)\b/i.test(lower)) {
    industryStyle = 'precision industrial engineering aesthetic: bright daylight off-white & cool architectural steel (#F8FAFC / #FFFFFF), deep navy slate ink (#0F172A), high-visibility safety amber/copper (#D97706) and technical blueprint blue (#1D4ED8), tabular monospace specs, structured engineering grids';
  } else if (/\b(restaurant|bakery|cafe|coffee|bistro|culinary|food|hotel|hospitality)\b/i.test(lower)) {
    industryStyle = 'warm culinary editorial aesthetic: creamy alabaster (#FAF7F2), deep espresso charcoal (#1F1A17), terracotta/saffron accents (#B45309), expressive serif headings paired with clean sans-serif menus';
  } else if (/\b(health|medical|clinic|hospital|dental|pharmacy|wellness|telemedicine)\b/i.test(lower)) {
    industryStyle = 'calm clinical healthcare aesthetic: pure clean white & pale sage/ice tints (#F4F9F9), deep clinical teal (#0F766E), trustworthy slate typography, clear appointment/accessibility hierarchy';
  } else if (/\b(music|studio|record label|audio|king ken|entertainment|film|podcast|concert)\b/i.test(lower)) {
    industryStyle = 'rich studio media aesthetic: deep matte charcoal (#0C0D12), warm brushed gold (#E5A93C), editorial display typography, tactile audio/media cards with high contrast';
  } else if (/\b(education|school|university|course|academy|lms|learning)\b/i.test(lower)) {
    industryStyle = 'bright academic clarity aesthetic: crisp paper white (#FFFFFF) & soft stone (#F5F6FA), royal indigo (#3730A3) and warm ochre highlights, scannable module cards';
  } else if (/\b(fashion|luxury|jewelry|beauty|architecture|interior)\b/i.test(lower)) {
    industryStyle = 'luxury editorial minimalism: warm ivory (#FAF9F6), obsidian black typography (#111111), generous whitespace, hairline borders, refined serif display scale';
  } else if (/\b(finance|bank|fintech|corporate|consulting|legal|enterprise|law)\b/i.test(lower)) {
    industryStyle = 'executive corporate aesthetic: crisp daylight white & cool gray surfaces (#F8FAFC), deep navy (#0B1F3A), restrained emerald/blue accents, crisp data tables and trust credentials';
  }

  const domainBlueprint = buildDomainPlatformBlueprint(prompt);
  if (domainBlueprint && !explicitFrontendOnly) {
    requiresBackend = true;
    if (projectType === 'website') {
      projectType = 'fullstack_web_app';
      label = domainBlueprint.label;
    }
    if (!explicitDarkNeonRequested) {
      industryStyle = domainBlueprint.recommendedIndustryStyle;
    }
  }

  const designDirection = `${label} — ${industryStyle}`;
  return {
    projectType,
    label,
    requiresBackend,
    allowCodeOnly,
    industryStyle,
    designDirection,
    explicitDarkNeonRequested,
  };
}

function isJsonLikeFilePath(filePath: string): boolean {
  const clean = String(filePath || '').trim().replace(/^\/+|\/+$/g, '').toLowerCase();
  const base = clean.split('/').pop() || '';
  return (
    /\.(?:json|jsonc|geojson|webmanifest|eslintrc|prettierrc|babelrc)$/i.test(base) ||
    base === '.eslintrc' ||
    base === '.prettierrc' ||
    base === '.babelrc'
  );
}

function hasFileExtensionSegment(segment: string): boolean {
  const clean = String(segment || '').trim();
  return /\.[a-z0-9]{1,10}$/i.test(clean) && !clean.startsWith('.');
}

function setNestedJsonValue(target: Record<string, any>, parts: string[], value: string): void {
  let cursor: Record<string, any> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!key) continue;
    if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  const leaf = parts[parts.length - 1];
  if (leaf) {
    cursor[leaf] = value;
  }
}

/**
 * Reconstructs any accidentally flattened JSON subpaths (e.g. /package.json/name,
 * /package.json/scripts/dev) back into a valid JSON file string, and eliminates
 * any file-vs-directory ancestor path collisions before VFS writes.
 */
export function pruneConflictingFilePaths(files: Record<string, string>): Record<string, string> {
  const cleaned: Record<string, string> = {};
  const flattenedJsonBuckets = new Map<string, Array<{ subParts: string[]; value: string }>>();

  for (const [rawPath, content] of Object.entries(files || {})) {
    const norm = normalizePath(rawPath);
    if (!norm || norm === '/' || norm.includes('..')) continue;
    const segments = norm.split('/').filter(Boolean);
    const jsonParentIdx = segments.findIndex((seg, idx) => idx < segments.length - 1 && isJsonLikeFilePath(seg));
    if (jsonParentIdx !== -1) {
      const jsonFilePath = '/' + segments.slice(0, jsonParentIdx + 1).join('/');
      const subParts = segments.slice(jsonParentIdx + 1);
      const bucket = flattenedJsonBuckets.get(jsonFilePath) || [];
      bucket.push({ subParts, value: content });
      flattenedJsonBuckets.set(jsonFilePath, bucket);
      continue;
    }
    cleaned[norm] = content;
  }

  // Reconstruct any JSON file that only existed as flattened subpaths
  for (const [jsonFilePath, entries] of flattenedJsonBuckets.entries()) {
    if (!cleaned[jsonFilePath]) {
      const rebuilt: Record<string, any> = {};
      for (const entry of entries) {
        setNestedJsonValue(rebuilt, entry.subParts, entry.value);
      }
      if (Object.keys(rebuilt).length > 0) {
        cleaned[jsonFilePath] = JSON.stringify(rebuilt, null, 2);
      }
    }
  }

  // Eliminate any remaining file-vs-directory ancestor collisions (e.g. /a/b AND /a/b/c)
  const allPaths = Object.keys(cleaned);
  const pathSet = new Set(allPaths);
  const pathsToDrop = new Set<string>();

  for (const p of allPaths) {
    const segments = p.split('/').filter(Boolean);
    let prefix = '';
    for (let i = 0; i < segments.length - 1; i++) {
      prefix += '/' + segments[i];
      if (pathSet.has(prefix)) {
        // If ancestor looks like a real file (has extension), drop the bogus child path;
        // otherwise drop the bare directory-named entry.
        if (hasFileExtensionSegment(segments[i])) {
          pathsToDrop.add(p);
        } else {
          pathsToDrop.add(prefix);
        }
      }
    }
  }

  for (const dropPath of pathsToDrop) {
    delete cleaned[dropPath];
  }

  return cleaned;
}

function flattenNestedFileTree(
  node: Record<string, unknown>,
  prefix: string = '',
  out: Record<string, string> = {}
): Record<string, string> {
  for (const [key, val] of Object.entries(node)) {
    const cleanKey = key.replace(/^\/+|\/+$/g, '');
    if (!cleanKey) continue;
    const nextPath = prefix ? `${prefix}/${cleanKey}` : `/${cleanKey}`;
    if (typeof val === 'string') {
      if (val.trim().length > 0 || nextPath === '/.gitkeep') {
        out[normalizePath(nextPath)] = val;
      }
    } else if (Array.isArray(val)) {
      if (isJsonLikeFilePath(nextPath)) {
        out[normalizePath(nextPath)] = JSON.stringify(val, null, 2);
      }
    } else if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      if (typeof obj.content === 'string') {
        out[normalizePath(nextPath)] = obj.content;
      } else if (typeof obj.code === 'string') {
        out[normalizePath(nextPath)] = obj.code;
      } else if (typeof obj.source === 'string') {
        out[normalizePath(nextPath)] = obj.source;
      } else if (isJsonLikeFilePath(nextPath)) {
        // LLM emitted a JSON config file (e.g. /package.json or /tsconfig.json) as an object
        // instead of an escaped JSON string — serialize it directly instead of flattening keys!
        out[normalizePath(nextPath)] = JSON.stringify(obj, null, 2);
      } else {
        flattenNestedFileTree(obj, nextPath, out);
      }
    }
  }
  return out;
}

export function sanitizeGeneratedFiles(rawFiles: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!rawFiles) return result;

  // Support array formats: [{ path, content }], [{ filePath, code }], [{ name, source }]
  if (Array.isArray(rawFiles)) {
    for (const entry of rawFiles) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as Record<string, unknown>;
      const rawPath = item.path ?? item.filePath ?? item.filename ?? item.name;
      const rawContent = item.content ?? item.code ?? item.source ?? item.contents ?? item.body;
      if (typeof rawPath !== 'string') continue;
      const path = normalizePath(rawPath);
      if (!path || path === '/' || path.includes('..')) continue;
      if (typeof rawContent === 'string') {
        if (rawContent.trim().length === 0 && path !== '/.gitkeep') continue;
        result[path] = rawContent;
      } else if (rawContent && typeof rawContent === 'object' && isJsonLikeFilePath(path)) {
        result[path] = JSON.stringify(rawContent, null, 2);
      }
    }
    return pruneConflictingFilePaths(result);
  }

  if (typeof rawFiles !== 'object') return result;

  for (const [rawPath, rawContent] of Object.entries(rawFiles as Record<string, unknown>)) {
    if (typeof rawContent === 'string') {
      const path = normalizePath(rawPath);
      if (!path || path === '/' || path.includes('..')) continue;
      if (rawContent.trim().length === 0 && path !== '/.gitkeep') continue;
      result[path] = rawContent;
    } else if (rawContent && typeof rawContent === 'object') {
      const normPath = normalizePath(rawPath);
      if (!normPath || normPath === '/' || normPath.includes('..')) continue;
      if (isJsonLikeFilePath(normPath)) {
        const obj = rawContent as Record<string, unknown>;
        if (!Array.isArray(rawContent) && typeof obj.content === 'string') {
          result[normPath] = obj.content;
        } else if (!Array.isArray(rawContent) && typeof obj.code === 'string') {
          result[normPath] = obj.code;
        } else {
          result[normPath] = JSON.stringify(rawContent, null, 2);
        }
      } else if (!Array.isArray(rawContent)) {
        // Nested directory tree or { content: "..." }
        const nested = flattenNestedFileTree({ [rawPath]: rawContent });
        for (const [np, nc] of Object.entries(nested)) {
          if (np && np !== '/' && !np.includes('..')) {
            result[np] = nc;
          }
        }
      }
    }
  }

  return pruneConflictingFilePaths(result);
}

/**
 * Extracts outer JSON candidate cleanly even when inner file strings (e.g. README.md)
 * contain Markdown triple-backtick code fences!
 */
function extractOuterJsonCandidate(raw: string): { candidate: string; wasFenced: boolean } {
  const text = String(raw || '').trim();
  if (!text) return { candidate: '', wasFenced: false };

  // Strip ONLY outer markdown fence if the entire response starts with ```json or ```
  let stripped = text;
  let wasFenced = false;
  const openFence = stripped.match(/^```(?:json|javascript|ts|typescript)?\s*\r?\n/i);
  if (openFence) {
    wasFenced = true;
    stripped = stripped.slice(openFence[0].length);
    const lastFenceIdx = stripped.lastIndexOf('\n```');
    if (lastFenceIdx !== -1 && stripped.slice(lastFenceIdx + 4).trim().length === 0) {
      stripped = stripped.slice(0, lastFenceIdx).trim();
    } else if (stripped.endsWith('```')) {
      stripped = stripped.slice(0, -3).trim();
    }
  }

  // Locate first '{' and matching balanced '}' (or last '}' if truncated)
  const firstBrace = stripped.indexOf('{');
  if (firstBrace === -1) {
    return { candidate: stripped, wasFenced };
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let balancedEnd = -1;

  for (let i = firstBrace; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        balancedEnd = i;
        break;
      }
    }
  }

  if (balancedEnd > firstBrace) {
    return { candidate: stripped.slice(firstBrace, balancedEnd + 1), wasFenced };
  }

  const lastBrace = stripped.lastIndexOf('}');
  if (lastBrace > firstBrace) {
    return { candidate: stripped.slice(firstBrace, lastBrace + 1), wasFenced };
  }

  return { candidate: stripped.slice(firstBrace), wasFenced };
}

function detectTruncatedJson(raw: string): boolean {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return false;
  const { candidate } = extractOuterJsonCandidate(trimmed);
  if (!candidate.startsWith('{')) return false;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  return inString || depth > 0;
}

function extractFilesFromStructuredObject(obj: any): {
  files: Record<string, string>;
  summary?: string;
  manifest?: Partial<ProjectManifestMeta>;
} {
  if (!obj || typeof obj !== 'object') return { files: {} };

  const root = obj.project && typeof obj.project === 'object'
    ? obj.project
    : obj.manifest && typeof obj.manifest === 'object'
      ? obj.manifest
      : obj.result && typeof obj.result === 'object'
        ? obj.result
        : obj;

  const rawFilesCandidate =
    root.files ??
    root.projectFiles ??
    root.sourceFiles ??
    root.fileMap ??
    obj.files ??
    (Object.keys(root).some((k) => /\.(tsx?|jsx?|html|css|json)$/i.test(k)) ? root : null);

  const files = sanitizeGeneratedFiles(rawFilesCandidate);
  const summary =
    typeof root.summary === 'string' && root.summary.trim()
      ? root.summary.trim()
      : typeof obj.summary === 'string' && obj.summary.trim()
        ? obj.summary.trim()
        : typeof root.description === 'string' && root.description.trim()
          ? root.description.trim()
          : undefined;

  const manifest: Partial<ProjectManifestMeta> = {
    ...(typeof root.projectName === 'string' ? { projectName: root.projectName } : {}),
    ...(typeof root.name === 'string' && !root.projectName ? { projectName: root.name } : {}),
    ...(typeof root.description === 'string' ? { description: root.description } : {}),
    ...(typeof root.entryPoint === 'string' ? { entryPoint: normalizePath(root.entryPoint) } : {}),
    ...(Array.isArray(root.dependencies) ? { dependencies: root.dependencies.map(String) } : {}),
    ...(typeof root.buildInstructions === 'string' ? { buildInstructions: root.buildInstructions } : {}),
    ...(Array.isArray(root.envVars) ? { envVars: root.envVars.map(String) } : {}),
    ...(Array.isArray(root.apiRoutes) ? { apiRoutes: root.apiRoutes.map(String) } : {}),
    ...(typeof root.databaseSchema === 'string' ? { databaseSchema: root.databaseSchema } : {}),
  };

  return { files, summary, manifest };
}

function extractFilesFromNonJson(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  const patterns = [
    /(?:^|\n)\s*(?:#{1,6}\s*|\*\*)?`?(\/?(?:(?:src|server|api|backend|public|app|tests?|components|pages|styles)\/)?[A-Za-z0-9._\-\/]+\.(?:tsx?|jsx?|json|css|scss|html|md|yml|yaml|sql|mjs|cjs|env(?:\.example)?))`?\*?\*?\s*:?\s*\r?\n\s*```[^\n]*\r?\n([\s\S]*?)```/gi,
    /<file\s+path=["']([^"']+)["']\s*>\s*(?:```[^\n]*\r?\n)?([\s\S]*?)(?:```)?\s*<\/file>/gi,
    /```[a-zA-Z0-9_-]*\s+(?:file|path|filename)=["']?([^\s"']+)["']?\s*\r?\n([\s\S]*?)```/gi,
    /```[a-zA-Z0-9_-]*\s*\r?\n\s*(?:\/\/|#|\/\*|<!--)\s*(?:filepath|file|path)\s*:\s*([^\s*<>]+)\s*(?:\*\/|-->)?\s*\r?\n([\s\S]*?)```/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(raw)) !== null) {
      const p = normalizePath(match[1]);
      const content = match[2];
      if (p && p !== '/' && !p.includes('..') && content && content.trim().length > 0) {
        result[p] = content;
      }
    }
  }
  return result;
}

/**
 * STEP B — Universal structured response parser supporting JSON, Markdown-fenced JSON,
 * arrays, nested directory maps, tool-call payloads, and multi-file code fences,
 * while detecting truncation and rejecting conversational prose.
 */
export function parseGeneratedProjectPayload(
  rawContent: string,
  functionCall?: { name: string; arguments?: Record<string, any>; args?: Record<string, any> }
): ParsedGenerationPayload {
  // 1. Structured tool-call response (supports both OpenAI `.arguments` and Gemini `.args`)
  const toolPayload = functionCall?.arguments ?? functionCall?.args;
  if (toolPayload && typeof toolPayload === 'object') {
    const extracted = extractFilesFromStructuredObject(toolPayload);
    if (Object.keys(extracted.files).length > 0) {
      return {
        files: extracted.files,
        summary: extracted.summary,
        manifest: extracted.manifest,
        sourceFormat: 'tool_call',
        truncated: false,
        isConversationalOnly: false,
      };
    }
  }

  const text = String(rawContent || '').trim();
  if (!text) {
    return {
      files: {},
      sourceFormat: 'none',
      truncated: false,
      isConversationalOnly: false,
      parseError: 'Model returned an empty response.',
    };
  }

  const truncated = detectTruncatedJson(text);
  const { candidate, wasFenced } = extractOuterJsonCandidate(text);

  // 2. Direct JSON or Markdown-fenced JSON
  if (candidate.startsWith('{') || candidate.startsWith('[')) {
    try {
      const parsed = JSON.parse(candidate);
      const extracted = Array.isArray(parsed)
        ? { files: sanitizeGeneratedFiles(parsed), summary: undefined, manifest: undefined }
        : extractFilesFromStructuredObject(parsed);
      if (Object.keys(extracted.files).length > 0) {
        return {
          files: extracted.files,
          summary: extracted.summary,
          manifest: extracted.manifest,
          sourceFormat: wasFenced ? 'fenced_json' : 'json',
          truncated: false,
          isConversationalOnly: false,
        };
      }
    } catch (err: any) {
      if (truncated) {
        return {
          files: {},
          sourceFormat: 'none',
          truncated: true,
          isConversationalOnly: false,
          parseError: `Model JSON output appears truncated before completion (${err?.message || 'unexpected EOF'}).`,
        };
      }
      // Fall through to multi-file markdown extractor if model returned prose + code blocks
    }
  }

  // 3. Multi-file Markdown code blocks (explicitly tagged with real file paths)
  const markdownFiles = extractFilesFromNonJson(text);
  if (Object.keys(markdownFiles).length > 0) {
    return {
      files: markdownFiles,
      sourceFormat: 'markdown_files',
      truncated,
      isConversationalOnly: false,
    };
  }

  // 4. Never mistake ordinary conversational commentary for source code
  const looksLikeProse = !text.includes('{') || (!text.includes('import ') && !text.includes('<html') && !text.includes('"files"'));
  return {
    files: {},
    sourceFormat: 'none',
    truncated,
    isConversationalOnly: looksLikeProse && !truncated,
    parseError: truncated
      ? 'Model response was truncated mid-stream before closing JSON.'
      : looksLikeProse
        ? 'Model returned conversational prose instead of structured project source files.'
        : 'Model response did not match a parseable project file manifest.',
  };
}

function buildManifestMetadata(
  files: Record<string, string>,
  classification: ProjectRequestClassification,
  parsedMeta?: Partial<ProjectManifestMeta>,
  prompt?: string
): ProjectManifestMeta {
  let pkgName = parsedMeta?.projectName || '';
  let deps: string[] = parsedMeta?.dependencies || [];
  let buildInstructions = parsedMeta?.buildInstructions || 'npm install && npm run dev';

  if (files['/package.json']) {
    try {
      const pkg = JSON.parse(files['/package.json']);
      if (!pkgName && typeof pkg.name === 'string') pkgName = pkg.name;
      if (deps.length === 0 && pkg.dependencies && typeof pkg.dependencies === 'object') {
        deps = Object.keys(pkg.dependencies);
      }
      if (pkg.scripts?.build) {
        buildInstructions = 'npm install && npm run build';
      }
    } catch {
      // handled by validator
    }
  }

  const entryPoint =
    parsedMeta?.entryPoint ||
    (files['/src/main.tsx']
      ? '/src/main.tsx'
      : files['/src/App.tsx']
        ? '/src/App.tsx'
        : files['/index.html']
          ? '/index.html'
          : Object.keys(files)[0] || '/src/App.tsx');

  const envVars = parsedMeta?.envVars || [];
  if (envVars.length === 0 && files['/.env.example']) {
    for (const line of files['/.env.example'].split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z][A-Z0-9_]{2,})\s*=/);
      if (m?.[1]) envVars.push(m[1]);
    }
  }

  const derivedPromptTitle = generateRealProjectTitle(prompt || '');
  const resolvedName =
    pkgName && !isGenericPlaceholderProjectTitle(pkgName)
      ? pkgName
      : derivedPromptTitle;

  return {
    projectName: resolvedName || 'Custom Application',
    projectType: classification.projectType,
    description: parsedMeta?.description || `Generated ${classification.label}`,
    entryPoint,
    dependencies: deps,
    buildInstructions,
    envVars,
    ...(parsedMeta?.apiRoutes ? { apiRoutes: parsedMeta.apiRoutes } : {}),
    ...(parsedMeta?.databaseSchema ? { databaseSchema: parsedMeta.databaseSchema } : {}),
  };
}

function hasBackendFiles(files: Record<string, string>): boolean {
  return Object.keys(files).some(
    (p) =>
      /^\/(server|backend|api)\//i.test(p) ||
      /^\/server\.(ts|js|mjs|cjs)$/i.test(p) ||
      /^\/src\/(server|api)\//i.test(p)
  );
}

/**
 * Generate a fresh or updated production project from the current request.
 * Includes full validation and targeted repair retries before ever reporting failure.
 */
export async function synthesizeAppFiles(
  prompt: string,
  existingVfs: Record<string, string> = {},
  options: {
    generationId?: string;
    projectId?: string;
    updateExisting?: boolean;
    referenceBlueprint?: unknown;
    images?: Array<{ mimeType?: string; data: string }>;
    webSearch?: boolean;
    model?: string;
    maxRepairAttempts?: number;
    chatExecutor?: SynthesisChatExecutor;
    onProgress?: (update: {
      stage: 'understanding' | 'planning' | 'generating' | 'validating' | 'installing' | 'starting_preview' | 'testing' | 'completed' | 'failed';
      message: string;
      progressPct: number;
      projectName?: string;
      files?: string[];
    }) => void;
  } = {}
): Promise<SynthesisPlan> {
  const generationId = options.generationId || createGenerationId();
  const projectId = options.projectId || `project_${generationId}`;
  const updateExisting = options.updateExisting === true;
  const maxRepairAttempts = typeof options.maxRepairAttempts === 'number' ? Math.max(0, options.maxRepairAttempts) : 2;
  const stages: string[] = [];
  const emitProgress = (
    stage: 'understanding' | 'planning' | 'generating' | 'validating' | 'installing' | 'starting_preview' | 'testing' | 'completed' | 'failed',
    message: string,
    progressPct: number,
    extra?: { projectName?: string; files?: string[] }
  ) => {
    try {
      options.onProgress?.({ stage, message, progressPct, ...extra });
    } catch {
      // never fail synthesis on progress hook error
    }
  };
  const initialProjectName = generateRealProjectTitle(prompt);

  // STEP A: Understand the request
  stages.push('understanding_request');
  emitProgress('understanding', `Understanding request for ${initialProjectName}...`, 10, { projectName: initialProjectName });
  const classification = classifyProjectRequest(prompt);
  stages.push('planning');
  emitProgress('planning', `Planning ${classification.label} architecture for ${initialProjectName}...`, 22, { projectName: initialProjectName });

  const existingPaths = Object.keys(existingVfs).filter(Boolean);
  const existingContext = updateExisting
    ? Object.entries(existingVfs)
        .filter(([filePath, content]) => filePath && content && content.trim())
        .slice(0, 120)
        .map(([filePath, content]) => `\n--- ${filePath} ---\n${content.slice(0, 12000)}\n--- END ${filePath} ---`)
        .join('\n')
    : '';

  const domainBlueprint = buildDomainPlatformBlueprint(prompt);
  const referenceContext = [
    options.referenceBlueprint
      ? `\nREFERENCE EVIDENCE FOR CLEAN-ROOM REBUILD\n${JSON.stringify(options.referenceBlueprint).slice(0, 60000)}\nEND REFERENCE EVIDENCE\n`
      : '',
    domainBlueprint ? `\n${domainBlueprint.promptContextBlock}\n` : '',
  ].filter(Boolean).join('\n');

  const systemPrompt = `You are ANNY's production software architect and full-stack implementation engineer.

IDENTITY
You are ANNY. Do not mention the underlying model or provider.

GENERATION IDENTITY
Generation ID: ${generationId}
Project ID: ${projectId}
Classified Project Type: ${classification.label} (${classification.projectType})
Visual & Industry Direction: ${classification.designDirection}

USER REQUEST
${prompt}
${referenceContext}
MODE
${updateExisting ? 'UPDATE EXISTING PROJECT: preserve working behavior and modify/add only what the request requires.' : 'FRESH PROJECT: create a genuinely tailored implementation for this specific request.'}

ARCHITECTURE & QUALITY REQUIREMENTS
1. Generate a complete, runnable project — NOT a placeholder skeleton or empty shell.
2. Required core files for web apps/websites:
   - /package.json (valid JSON with react, react-dom, lucide-react, and any other packages imported by your code, plus dev/build scripts)
   - /index.html (valid HTML5 mounting #root and referencing /src/main.tsx)
   - /src/main.tsx (mounts App cleanly with React 18/19 createRoot)
   - /src/App.tsx (complete root application with working navigation, views/sections, forms, search/filters, modals, and responsive mobile menu)
   - /src/styles.css (complete self-contained responsive CSS with media queries, fluid CSS grid/flex layout, custom typography scale, polished cards, buttons, forms, loading/empty/error states — DO NOT rely on unresolved @import "tailwindcss")
   - Modular components/data files under /src/components/* and /src/data/* as appropriate.
3. PREVIEW SANDBOX COMPATIBILITY:
   - Use React, lucide-react, and standard browser APIs (and optionally recharts or motion/react) so the app renders immediately in ANNY's isolated preview runner with zero unresolved third-party packages.
   - Ensure EVERY relative import (./components/..., ./styles.css, etc.) matches an exact generated file path.
   - Keep all JSX/TSX syntax completely valid and balanced. Never write "// ... rest of file" truncation placeholders.
4. ${classification.requiresBackend ? 'BACKEND REQUIRED: Include real backend files (e.g. /server/index.ts, /server/schema.sql, /.env.example) with input validation, error handling, and clear persistence boundaries — AND ensure the frontend works smoothly with responsive client state/localStorage persistence when the preview runs standalone without an external database.' : 'BACKEND OPTIONAL: For a website, landing page, portfolio, or client-first workshop app, deliver complete client interactivity and localStorage persistence where helpful; include backend/API files only when genuinely needed by the prompt. Never fabricate fake backend writes.'}
5. INDUSTRY-AUTHENTIC VISUAL DESIGN:
   - ${classification.industryStyle}
   - NEVER force ANNY's dark neon theme onto customer websites unless explicitly requested.
   - Zero Lorem Ipsum, zero TODO/FIXME stubs, zero dead buttons, zero broken image links (use crisp inline SVG illustrations/diagrams or valid data URIs where visuals are needed so nothing renders as a broken image icon).
5A. PROFESSIONAL VISUAL QUALITY BAR — TREAT THIS AS A CLIENT-READY PAID DELIVERABLE:
   - Begin with a coherent art direction: identify the audience, brand personality, content priorities, one primary action, and a small intentional palette. Use 1 display typeface + 1 readable UI typeface (prefer system stacks or safe font loading); establish a consistent type scale, spacing scale, radius, border, shadow, and interaction language.
   - Design the page composition, not just a collection of cards: clear above-the-fold hierarchy, confident headline and supporting copy, deliberate section rhythm, varied layouts, whitespace, alignment, strong contrast, and a memorable visual focal point. Avoid repetitive card grids, generic centered headings, oversized empty hero sections, random gradients, excessive glassmorphism, emoji-as-icons, and decorative effects without purpose.
   - Create a bespoke visual identity and content specific to the user's business/product. Use realistic, useful copy and differentiated section titles; never invent certifications, client logos, testimonials, awards, statistics, prices, or guarantees. If proof is unavailable, use clearly labelled illustrative/demo content or omit it.
   - Include real visual storytelling: use reliable, relevant image assets when appropriate with descriptive alt text and graceful fallbacks; otherwise build polished original inline SVG/CSS diagrams, product mockups, architectural illustrations, or data visualizations. Do not use broken image URLs, placeholder image blocks, or unrelated stock imagery.
   - Polish every state: hover/focus/pressed states, subtle purposeful transitions, skeleton/loading, empty, validation, success, and error states. Use accessible labels, keyboard navigation, semantic landmarks, visible focus, reduced-motion support, and touch targets of at least 44px.
   - Mobile is a designed experience, not a compressed desktop: verify at 360px, 390px, 768px, 1024px, and wide desktop. Avoid overflow, clipped headings, tiny controls, collapsed navigation, and dense tables; adapt layouts and interactions deliberately.
   - Deliver an actual usable product: actions must work and provide feedback; navigation must reach real sections/views; forms must validate and confirm; search/filter/sort must change content; dialogs must close by keyboard and backdrop where appropriate. No dead controls or fake loading.
   - Before returning files, mentally perform a visual QA pass for hierarchy, spacing consistency, responsive behavior, contrast, content density, alignment, icon consistency, and obvious browser errors. If a design choice weakens the overall craft, revise it before output.
6. ARCHETYPE-SPECIFIC FUNCTIONAL COMPLETENESS:
   - For E-Commerce Websites (ecommerce): Include a complete storefront with Homepage hero & featured categories, Shop/Catalogue view with live search & category/price filtering, Product Detail modal or view with technical specs & related items, interactive Shopping Cart drawer with quantity +/- controls & order summary subtotal, Checkout view/drawer with validated shipping & payment form, Customer Account/Orders view, About Us, Contact Us, FAQ, Shipping/Return Policies, and Footer.
   - For Business / Engineering / Corporate Websites (website, landing_page): Include Header navigation with responsive mobile drawer, Hero with primary & secondary CTAs, About / Company Credentials section, Services / Solutions grid with interactive Service Detail modal or view, Filterable Projects / Case Studies portfolio, Client Testimonials & Certifications, FAQ accordion, Validated Quote / Contact Request form with confirmation state, and comprehensive Footer.
   - For Dashboards / SaaS / Operational Apps (dashboard, saas, admin_panel, fullstack_web_app): Include Sidebar & Topbar navigation, Overview KPI metric cards, Filterable & searchable data tables, interactive Create / Edit record modal with validation, Status toggles, Settings view, and realistic empty/error states.
7. SECURITY:
   - Never embed API keys, passwords, or secrets.
   - Never access window.parent or window.top storage/documents.
   - Never put shell commands in package.json preinstall/postinstall scripts.

OUTPUT CONTRACT (STRICT JSON ONLY)
Return ONLY ONE valid JSON object (no markdown fences, no commentary outside JSON).
CRITICAL: Every value inside "files" (including "/package.json" and any other .json file) MUST be a single string containing the file's text, NEVER a nested JSON object.
{
  "projectName": "short-kebab-or-title-name",
  "projectType": "${classification.projectType}",
  "description": "Concise description of the built website or application",
  "entryPoint": "/src/main.tsx",
  "dependencies": ["react", "react-dom", "lucide-react"],
  "buildInstructions": "npm install && npm run build",
  "envVars": [],
  "files": {
    "/package.json": "{\\"name\\":\\"app\\",\\"scripts\\":{\\"dev\\":\\"vite\\",\\"build\\":\\"vite build\\"}}",
    "/index.html": "...",
    "/src/main.tsx": "...",
    "/src/App.tsx": "...",
    "/src/styles.css": "..."
  },
  "summary": "Natural 1-2 sentence summary of the completed website/application and its working features."
}`;

  const contextMessage = updateExisting
    ? `Existing project paths: ${existingPaths.join(', ') || 'none'}\nExisting source context:\n${existingContext}`
    : `Fresh project generation. Create complete, production-ready files tailored specifically to the user request.`;

  const runChat: SynthesisChatExecutor = options.chatExecutor
    ? options.chatExecutor
    : async (msgs, opts) =>
        modelRouter.executeRoutedChat(msgs, { taskCategory: 'coding' }, opts);

  try {
    stages.push('generating_files');
    emitProgress('generating', `Generating source files for ${initialProjectName}...`, 42, { projectName: initialProjectName });
    const validImages = (options.images || []).filter((img) => img && img.data);
    const userText = `${contextMessage}\n\nImplement this request now:\n${prompt}`;
    const userContent: string | ChatPart[] =
      validImages.length > 0
        ? [
            { text: userText },
            ...validImages.map((img) => ({
              inlineData: {
                mimeType: img.mimeType || 'image/jpeg',
                data: img.data,
              },
            })),
          ]
        : userText;

    const initialResponse = await runChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      {
        preserveStructured: true,
        responseMimeType: options.webSearch ? undefined : 'application/json',
        timeoutMs: 120000,
        ...(options.webSearch ? { webSearch: true } : {}),
        ...(options.model ? { model: options.model } : {}),
      }
    );

    let parsedPayload = parseGeneratedProjectPayload(initialResponse.content || '', initialResponse.functionCall);
    let currentFiles: Record<string, string> = { ...parsedPayload.files };
    let currentSummary = parsedPayload.summary;
    let currentManifest = parsedPayload.manifest;

    const { verifyGeneratedProject } = await import('./generatedProjectValidator');

    // STEP D: Validate generated project
    stages.push('validating');
    const extractedFilePaths = Object.keys(currentFiles);
    const provisionalName =
      (currentManifest?.projectName && !isGenericPlaceholderProjectTitle(currentManifest.projectName)
        ? currentManifest.projectName
        : initialProjectName);
    emitProgress(
      'validating',
      `Validating ${extractedFilePaths.length} generated file(s) for ${provisionalName}...`,
      68,
      { projectName: provisionalName, files: extractedFilePaths }
    );
    let verification =
      Object.keys(currentFiles).length > 0
        ? verifyGeneratedProject(currentFiles, {
            requireBackend: classification.requiresBackend,
            allowCodeOnly: classification.allowCodeOnly,
          })
        : {
            passed: false,
            score: 0,
            fileCount: 0,
            checks: [],
            errors: [parsedPayload.parseError || 'Model returned no valid project source files.'],
            warnings: [],
            diagnostics: [parsedPayload.parseError || 'No files extracted from model response.'],
            verifiedAt: new Date().toISOString(),
          };

    // STEP E: Targeted Repair Loop when validation fails or output was truncated/unparseable
    let repairAttempts = 0;
    const originalFilesSnapshot = { ...currentFiles };

    while (!verification.passed && repairAttempts < maxRepairAttempts) {
      repairAttempts++;
      stages.push(`repair_attempt_${repairAttempts}`);
      emitProgress(
        'validating',
        `Repairing validation diagnostics (attempt ${repairAttempts}/${maxRepairAttempts}) for ${provisionalName}...`,
        Math.min(82, 70 + repairAttempts * 5),
        { projectName: provisionalName, files: Object.keys(currentFiles) }
      );

      const existingFileList = Object.entries(currentFiles)
        .slice(0, 25)
        .map(([p, c]) => `--- ${p} ---\n${c.slice(0, 6000)}`)
        .join('\n\n');

      const repairPrompt = `Your previous project generation for "${prompt}" failed validation.

EXACT VALIDATION ERRORS TO FIX:
${verification.errors.map((e, idx) => `${idx + 1}. ${e}`).join('\n')}
${parsedPayload.truncated ? '\nNOTE: Your previous JSON response was truncated. Keep files clean, modular, and concise enough to close the JSON object completely.\n' : ''}
${Object.keys(currentFiles).length > 0 ? `\nCURRENT GENERATED FILES (preserve valid files and fix or add what is missing/broken):\n${existingFileList}` : '\nNO VALID SOURCE FILES WERE EXTRACTED FROM YOUR PREVIOUS OUTPUT. Return the complete valid JSON object with "files" containing all required source files.'}

Return ONLY ONE complete valid JSON object with shape:
{
  "files": { "/path/to/file": "full file content" },
  "summary": "concise summary"
}
Include every file that was created or repaired (or the complete file map if starting fresh). No markdown fences. No commentary outside JSON.`;

      const repairResponse = await runChat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: repairPrompt },
        ],
        {
          preserveStructured: true,
          responseMimeType: 'application/json',
          timeoutMs: 120000,
          ...(options.model ? { model: options.model } : {}),
        }
      );

      const repairedPayload = parseGeneratedProjectPayload(repairResponse.content || '', repairResponse.functionCall);
      parsedPayload = repairedPayload;

      if (Object.keys(repairedPayload.files).length > 0) {
        // Merge repaired/added files onto preserved original generation and prune any path collisions
        currentFiles = pruneConflictingFilePaths({
          ...originalFilesSnapshot,
          ...currentFiles,
          ...repairedPayload.files,
        });
        if (repairedPayload.summary) currentSummary = repairedPayload.summary;
        if (repairedPayload.manifest) {
          currentManifest = { ...currentManifest, ...repairedPayload.manifest };
        }
      }

      verification =
        Object.keys(currentFiles).length > 0
          ? verifyGeneratedProject(currentFiles, {
              requireBackend: classification.requiresBackend,
              allowCodeOnly: classification.allowCodeOnly,
            })
          : {
              passed: false,
              score: 0,
              fileCount: 0,
              checks: [],
              errors: [repairedPayload.parseError || 'Repair attempt produced no valid project source files.'],
              warnings: [],
              diagnostics: [repairedPayload.parseError || 'Repair returned no files.'],
              verifiedAt: new Date().toISOString(),
            };
    }

    if (!verification.passed) {
      const detail = verification.errors.join(' | ');
      throw new Error(`GENERATION_VERIFICATION_FAILED (after ${repairAttempts} repair attempt(s)): ${detail}`);
    }

    stages.push('completed');
    const manifest = buildManifestMetadata(currentFiles, classification, currentManifest, prompt);
    emitProgress('installing', `Finalizing dependencies & workspace bundle for ${manifest.projectName}...`, 86, {
      projectName: manifest.projectName,
      files: Object.keys(currentFiles),
    });
    const projectKind: 'frontend' | 'fullstack' =
      classification.requiresBackend || hasBackendFiles(currentFiles) ? 'fullstack' : 'frontend';

    return {
      files: currentFiles,
      summary:
        currentSummary ||
        `Generated and verified ${manifest.projectName} (${Object.keys(currentFiles).length} files, verification score ${verification.score}/100).`,
      generationId,
      projectKind,
      projectType: classification.projectType,
      manifest,
      repairAttempts,
      stages,
      verification,
    };
  } catch (error: any) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const cleanLogMsg = rawMessage.replace(/\bERROR:\s*/gi, '').replace(/\r?\n/g, ' | ');
    console.warn(`[ANNY:${generationId}] Project synthesis notice: ${cleanLogMsg}`);
    throw new Error(rawMessage.startsWith('PROJECT_GENERATION_FAILED:') ? rawMessage : `PROJECT_GENERATION_FAILED: ${rawMessage}`);
  }
}

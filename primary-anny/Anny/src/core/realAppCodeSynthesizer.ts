/**
 * ANNY — REAL APPLICATION CODE SYNTHESIZER
 *
 * One authoritative generation engine for user-created applications.
 * It never serves a canned application template as a successful build.
 * A build is either generated from the current request or reported as failed.
 */

import { modelRouter } from './modelRouter';
import type { ChatPart } from '../services/aiProviderPlatform';
import type { ProjectVerificationReport } from './generatedProjectValidator';

export interface SynthesisPlan {
  files: Record<string, string>;
  summary: string;
  generationId: string;
  projectKind: 'frontend' | 'fullstack';
  verification?: ProjectVerificationReport;
}

const DESIGN_DIRECTIONS = [
  'editorial premium minimalism with strong typography and generous negative space',
  'cinematic glass surfaces with restrained depth and soft motion',
  'architectural grid system with asymmetric composition and precise spacing',
  'warm modern product design with tactile cards and subtle motion',
  'high-end enterprise interface with calm hierarchy and dense information design',
  'futuristic spatial interface with restrained glow and functional clarity',
  'luxury commerce direction with art-directed imagery and strong product focus',
  'human-centered mobile-first design with expressive micro-interactions'
];

function createGenerationId(): string {
  return `gen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePath(filePath: string): string {
  let normalized = String(filePath || '').trim().replace(/\\/g, '/');
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, '/');
  if (normalized.length > 1 && normalized.endsWith('/')) normalized = normalized.slice(0, -1);
  return normalized;
}

function extractJsonObject(raw: string): string {
  const text = String(raw || '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text;
}

function extractFilesFromNonJson(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  const patterns = [
    /(?:^|\n)\s*(?:#{1,6}\s*)?(\/?(?:src|server|api|backend|public|app|tests?)[^\s:`]+\.(?:tsx?|jsx?|json|css|html|md|yml|yaml|sql|env(?:\.example)?))\s*:?\s*\n\s*```[^\n]*\n([\s\S]*?)```/gi,
    /<file\s+path=["']([^"']+)["']\s*>\s*```[^\n]*\n([\s\S]*?)```\s*<\/file>/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(raw)) !== null) result[normalizePath(match[1])] = match[2];
  }
  return result;
}

function sanitizeGeneratedFiles(rawFiles: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!rawFiles || typeof rawFiles !== 'object') return result;

  for (const [rawPath, rawContent] of Object.entries(rawFiles as Record<string, unknown>)) {
    if (typeof rawContent !== 'string') continue;
    const path = normalizePath(rawPath);
    if (!path || path === '/') continue;
    if (rawContent.trim().length === 0 && path !== '/.gitkeep') continue;
    result[path] = rawContent;
  }

  return result;
}

function hasExecutableFrontend(files: Record<string, string>): boolean {
  return Boolean(
    (files['/src/App.tsx'] || files['/src/App.jsx']) &&
    (files['/src/main.tsx'] || files['/src/main.jsx']) &&
    files['/index.html']
  );
}

function hasBackend(files: Record<string, string>): boolean {
  return Boolean(
    files['/server.ts'] || files['/server/index.ts'] || files['/server/index.js'] ||
    files['/backend/server.ts'] || files['/backend/server.js'] || files['/api/index.ts'] || files['/api/index.js'] ||
    Object.keys(files).some((path) => /^\/(server|api|backend)\//i.test(path) && /\.(ts|tsx|js|mjs|cjs)$/.test(path))
  );
}

function isStaticOnlyRequest(prompt: string): boolean {
  return /\b(static site|static website|landing page only|frontend only|ui only|mockup only|prototype only)\b/i.test(prompt);
}

/**
 * Generate a fresh project from the current request.
 * Existing VFS is supplied only when the caller explicitly means an update.
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
  } = {}
): Promise<SynthesisPlan> {
  const generationId = options.generationId || createGenerationId();
  const projectId = options.projectId || `project_${generationId}`;
  const updateExisting = options.updateExisting === true;
  const designDirection = DESIGN_DIRECTIONS[Math.floor(Math.random() * DESIGN_DIRECTIONS.length)];
  const existingPaths = Object.keys(existingVfs).filter(Boolean);
  const existingContext = updateExisting
    ? Object.entries(existingVfs)
        .filter(([filePath, content]) => filePath && content && content.trim())
        .slice(0, 120)
        .map(([filePath, content]) => `\n--- ${filePath} ---\n${content.slice(0, 12000)}\n--- END ${filePath} ---`)
        .join('\n')
    : '';

  const staticOnly = isStaticOnlyRequest(prompt);
  const referenceContext = options.referenceBlueprint
    ? `\nREFERENCE EVIDENCE FOR CLEAN-ROOM REBUILD\n${JSON.stringify(options.referenceBlueprint).slice(0, 60000)}\nEND REFERENCE EVIDENCE\n`
    : '';
  const systemPrompt = `You are ANNY's canonical production software architect and implementation engineer.

IDENTITY
You are ANNY. Do not mention the underlying model or provider.

GENERATION IDENTITY
Generation ID: ${generationId}
Project ID: ${projectId}
Design direction: ${designDirection}

USER REQUEST
${prompt}
${referenceContext}
MODE
${updateExisting ? 'UPDATE EXISTING PROJECT: preserve working behavior and improve only what the request requires.' : 'FRESH PROJECT: create a genuinely new implementation. Do not copy, recycle, or reproduce a previous project template.'}

PRODUCTION REQUIREMENTS
1. Implement the requested product completely, not as a mockup, screenshot, placeholder, static demo, or fake interaction. A browser app must contain index.html, src/main.tsx or src/main.jsx, and a real application entry component.
2. Build the complete frontend: responsive layouts, real state, navigation, forms, validation, loading, empty, error and success states, accessibility, keyboard behavior, mobile/tablet/desktop behavior, and polished interaction design.
3. ${staticOnly ? 'This request explicitly allows frontend-only output, so do not invent a backend.' : 'For applications and websites, generate a real backend unless the user explicitly requested a frontend-only/static result. Include API routes, validation, error handling, persistence integration points, authentication/authorization where relevant, and environment configuration.'}
4. When persistence is required, generate a real schema/migration or database definition and a repository/data-access layer. Never invent successful database writes in the UI.
5. Include package.json with the actual dependencies required by the generated code.
6. Include index.html and a real React entry point for browser applications.
7. Use modular files. Do not put the entire application into one enormous file.
8. Never leave TODOs, fake API responses, hardcoded success states, dummy authentication, placeholder content presented as completed functionality, or fabricated telemetry.
9. Never use a canned e-commerce, dashboard, portfolio, SaaS, or landing-page template. The visual hierarchy, naming, data model, components, and interactions must be derived from this request and this generation ID.
10. When reference evidence is supplied, use it to understand information architecture, observable behavior, layout relationships, accessibility needs, and product utility. Produce an independently implemented result. Do not copy proprietary source code, credentials, private data, protected brand assets, tracking identifiers, or server-side secrets. If the user owns or is authorized to reuse an asset, preserve it only when explicitly supplied as an authorized asset.
10. If images are required, use real image assets/URLs or explicit asset references. Do not pretend a local image exists when it does not.
11. If an external dependency is required for a feature, declare it in package.json and implement the real integration boundary. Do not silently replace it with a fake implementation.
12. Include a concise README describing how to run frontend and backend and required environment variables.
13. Include deployment configuration when appropriate (Dockerfile and/or deployment configuration) so the generated project is deployable.
14. Keep security in mind: validate input, avoid exposing secrets, use environment variables, and never embed credentials.
15. If the request is for 3D, build a real interactive 3D workspace with Three.js/React Three Fiber where appropriate, scene graph, camera/lights/material controls, orbit/transform interaction, asset import/export, responsive rendering, and real animation support. Do not substitute a static image for an interactive 3D request.
16. If the request is for animation, implement actual browser animation using CSS, Web Animations API, Motion, Canvas, WebGL, or a real timeline system as appropriate. Do not fake motion with a progress bar.
17. If the request is for image generation/editing, use the application's real image-generation boundary and preserve returned assets rather than inventing image URLs.
18. Do not depend on a CSS processor being present inside the standalone preview runner. Put required visual rules in real CSS files and avoid unresolved bare @import directives such as @import "tailwindcss".
19. Visual & Industry Authenticity: NEVER impose ANNY's dark neon aesthetic onto client websites unless the user explicitly asks for dark/cyber aesthetics. Match the requested industry (e.g., bright editorial ivory/charcoal for luxury fashion, crisp daylight slate/amber for an electrical workshop inventory system, rich studio obsidian/warm gold for King Ken Studios music & media). Avoid generic 3-card filler grids, placeholder Lorem Ipsum, or dead buttons.
20. Functional Completeness: Every visible navigation link, filter, search bar, shopping cart, form submission, inventory stock adjustment, and modal must actually work with real React state and clear feedback.
21. Output complete source files, not patches or snippets.

OUTPUT CONTRACT
Return ONLY one JSON object with this exact top-level shape:
{
  "files": { "/src/App.tsx": "...", "/src/main.tsx": "..." },
  "summary": "..."
}

No markdown fences. No commentary outside JSON.`;

  const contextMessage = updateExisting
    ? `Existing project paths: ${existingPaths.join(', ') || 'none'}\nExisting source context:\n${existingContext}`
    : `This is a fresh project. Existing project paths must not be reused as a template: ${existingPaths.length ? 'do not inspect or copy them.' : 'none.'}`;

  try {
    const validImages = (options.images || []).filter(img => img && img.data);
    const userText = `${contextMessage}\n\nImplement this request now:\n${prompt}`;
    const userContent: string | ChatPart[] = validImages.length > 0
      ? [
          { text: userText },
          ...validImages.map(img => ({
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: img.data
            }
          }))
        ]
      : userText;

    const response = await modelRouter.executeRoutedChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      { taskCategory: 'coding' },
      {
        preserveStructured: true,
        timeoutMs: 120000,
        ...(options.webSearch ? { webSearch: true } : {}),
        ...(options.model ? { model: options.model } : {})
      }
    );

    const rawContent = response.content || '';
    let parsed: any = {};
    try { parsed = JSON.parse(extractJsonObject(rawContent)); } catch { parsed = {}; }
    const files = sanitizeGeneratedFiles(parsed?.files);
    const recoveredFiles = Object.keys(files).length ? files : extractFilesFromNonJson(rawContent);
    const finalFiles = sanitizeGeneratedFiles(recoveredFiles);

    if (!hasExecutableFrontend(finalFiles)) {
      throw new Error('GENERATION_INVALID: model returned no executable frontend entry file.');
    }

    if (!staticOnly && !hasBackend(finalFiles)) {
      throw new Error('GENERATION_INVALID: application generation returned no backend implementation.');
    }

    if (!finalFiles['/package.json']) {
      throw new Error('GENERATION_INVALID: generated project is missing package.json.');
    }

    if (!finalFiles['/index.html'] && hasExecutableFrontend(finalFiles)) {
      throw new Error('GENERATION_INVALID: generated browser project is missing index.html.');
    }

    const { verifyGeneratedProject } = await import('./generatedProjectValidator');
    const verification = verifyGeneratedProject(finalFiles, { requireBackend: !staticOnly });
    if (!verification.passed) {
      throw new Error(`GENERATION_VERIFICATION_FAILED: ${verification.errors.join(' | ')}`);
    }

    return {
      files: finalFiles,
      summary: typeof parsed?.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : `Generated and verified a new production project for: ${prompt}`,
      generationId,
      projectKind: staticOnly ? 'frontend' : 'fullstack',
      verification
    };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ANNY:${generationId}] Project synthesis failed: ${message}`);
    throw new Error(`PROJECT_GENERATION_FAILED: ${message}`);
  }
}

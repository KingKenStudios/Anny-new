/**
 * ANNY — Genuine Generated Website & Application Verification Engine
 *
 * Real deterministic static, structural, manifest, dependency, import-resolution,
 * syntax/truncation, security, and interactivity verification over VFS files.
 */

export interface VerificationCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  detail: string;
}

export interface ProjectVerificationReport {
  passed: boolean;
  score: number;
  fileCount: number;
  checks: VerificationCheck[];
  errors: string[];
  warnings: string[];
  diagnostics: string[];
  verifiedAt: string;
}

function normalizePath(p: string): string {
  const cleaned = p.replace(/\\/g, '/').trim();
  const withLead = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  return withLead.replace(/\/+/g, '/');
}

function isUnsafePath(rawPath: string): boolean {
  if (!rawPath || rawPath.includes('\0') || rawPath.includes('\\')) return true;
  const segments = rawPath.split('/');
  return segments.some((seg) => seg === '..');
}

function resolveRelativeImport(fromFile: string, specifier: string, fileSet: Set<string>): boolean {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return true; // external npm package
  let resolved: string[];
  if (specifier.startsWith('@/')) {
    resolved = ['', 'src', ...specifier.slice(2).split('/').filter(Boolean)];
  } else {
    const fromDir = fromFile.split('/').slice(0, -1);
    const segs = specifier.split('/');
    resolved = [...fromDir];
    for (const s of segs) {
      if (!s || s === '.') continue;
      if (s === '..') {
        resolved.pop();
      } else {
        resolved.push(s);
      }
    }
  }
  const base = normalizePath(resolved.join('/'));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    `${base}.css`,
    `${base}.scss`,
    `${base}.json`,
    `${base}.svg`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
  ];
  return candidates.some((c) => fileSet.has(c));
}

function checkBalancedDelimiters(code: string): { balanced: boolean; reason?: string } {
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    const next = code[i + 1];

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inSingle) {
      if (c === '\\') { i++; continue; }
      if (c === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      if (c === '\\') { i++; continue; }
      if (c === '"') inDouble = false;
      continue;
    }
    if (inTemplate) {
      if (c === '\\') { i++; continue; }
      if (c === '`') inTemplate = false;
      continue;
    }

    if (c === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (c === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (c === "'") { inSingle = true; continue; }
    if (c === '"') { inDouble = true; continue; }
    if (c === '`') { inTemplate = true; continue; }

    if (c === '{') braceDepth++;
    else if (c === '}') {
      braceDepth--;
      if (braceDepth < 0) return { balanced: false, reason: 'unexpected closing brace }' };
    } else if (c === '(') parenDepth++;
    else if (c === ')') {
      parenDepth--;
      if (parenDepth < 0) return { balanced: false, reason: 'unexpected closing parenthesis )' };
    } else if (c === '[') bracketDepth++;
    else if (c === ']') {
      bracketDepth--;
      if (bracketDepth < 0) return { balanced: false, reason: 'unexpected closing bracket ]' };
    }
  }

  if (inBlockComment) return { balanced: false, reason: 'unterminated block comment' };
  if (inTemplate) return { balanced: false, reason: 'unterminated template literal' };
  if (braceDepth !== 0) return { balanced: false, reason: `unbalanced braces (depth=${braceDepth})` };
  if (parenDepth !== 0) return { balanced: false, reason: `unbalanced parentheses (depth=${parenDepth})` };
  if (bracketDepth !== 0) return { balanced: false, reason: `unbalanced brackets (depth=${bracketDepth})` };
  return { balanced: true };
}

function extractPackageName(specifier: string): string | null {
  if (!specifier || specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('@/')) {
    return null;
  }
  if (specifier.startsWith('node:')) return null;
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split('/')[0];
}

const NODE_BUILTINS = new Set([
  'fs', 'path', 'http', 'https', 'crypto', 'os', 'url', 'util', 'stream', 'events',
  'buffer', 'querystring', 'zlib', 'net', 'tls', 'dns', 'child_process', 'assert', 'timers',
]);

export function verifyGeneratedProject(
  rawFiles: Record<string, string>,
  options: { requireBackend?: boolean; allowCodeOnly?: boolean } = {}
): ProjectVerificationReport {
  const files: Record<string, string> = {};
  const unsafePaths: string[] = [];
  const duplicatePaths: string[] = [];
  const emptyFiles: string[] = [];

  for (const [k, v] of Object.entries(rawFiles || {})) {
    if (typeof v !== 'string') continue;
    if (isUnsafePath(k)) {
      unsafePaths.push(k);
      continue;
    }
    const norm = normalizePath(k);
    if (norm === '/') continue;
    if (Object.prototype.hasOwnProperty.call(files, norm)) {
      duplicatePaths.push(norm);
    }
    if (v.trim().length === 0 && norm !== '/.gitkeep') {
      emptyFiles.push(norm);
    }
    files[norm] = v;
  }

  const paths = Object.keys(files);
  const fileSet = new Set(paths);
  const checks: VerificationCheck[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const diagnostics: string[] = [];

  const pushCheck = (c: VerificationCheck) => {
    checks.push(c);
    diagnostics.push(`[${c.passed ? 'PASS' : c.severity.toUpperCase()}] ${c.label}: ${c.detail}`);
    if (!c.passed) {
      if (c.severity === 'error') errors.push(c.detail);
      else if (c.severity === 'warning') warnings.push(c.detail);
    }
  };

  // 0. File path safety, duplicates, and empty files
  pushCheck({
    id: 'file-paths',
    label: 'Safe Normalized File Paths',
    passed: unsafePaths.length === 0 && duplicatePaths.length === 0 && paths.length > 0,
    severity: 'error',
    detail:
      paths.length === 0
        ? 'No project files were provided.'
        : unsafePaths.length > 0
          ? `Blocked unsafe path(s): ${unsafePaths.join(', ')}`
          : duplicatePaths.length > 0
            ? `Duplicate file path(s) detected: ${duplicatePaths.join(', ')}`
            : `Verified ${paths.length} clean project file paths.`,
  });

  if (emptyFiles.length > 0) {
    pushCheck({
      id: 'non-empty-files',
      label: 'Non-Empty Source Files',
      passed: false,
      severity: 'error',
      detail: `Empty source file(s) detected: ${emptyFiles.join(', ')}`,
    });
  }

  // 1. Entrypoints check (supports Vite/React, Next.js, or standalone HTML5 web apps)
  const hasIndexHtml = fileSet.has('/index.html');
  const hasMainEntry =
    fileSet.has('/src/main.tsx') ||
    fileSet.has('/src/main.jsx') ||
    fileSet.has('/src/index.tsx') ||
    fileSet.has('/src/index.jsx');
  const hasAppEntry =
    fileSet.has('/src/App.tsx') ||
    fileSet.has('/src/App.jsx') ||
    fileSet.has('/app/page.tsx') ||
    fileSet.has('/src/app/page.tsx');
  const hasStandaloneHtmlApp =
    hasIndexHtml &&
    (/<body[\s>]/i.test(files['/index.html']) && (/<script[\s>]/i.test(files['/index.html']) || paths.some((p) => /\.(js|ts|css)$/i.test(p))));

  const entrypointPassed = options.allowCodeOnly
    ? paths.some((p) => /\.(tsx?|jsx?|py|go|rs|sql|html)$/i.test(p))
    : Boolean((hasIndexHtml && (hasMainEntry || hasAppEntry)) || hasAppEntry || hasStandaloneHtmlApp);

  pushCheck({
    id: 'entrypoints',
    label: 'Executable Application Entrypoints',
    passed: entrypointPassed,
    severity: 'error',
    detail: entrypointPassed
      ? hasIndexHtml && (hasMainEntry || hasAppEntry)
        ? 'Verified index.html and React application entrypoints exist.'
        : hasAppEntry
          ? 'Verified application framework entrypoint exists.'
          : 'Verified runnable project entrypoint exists.'
      : 'Missing required frontend entrypoints (index.html and src/main.tsx or src/App.tsx).',
  });

  // 2. package.json JSON validity & dangerous script scan
  let pkgValid = false;
  let pkgDetail = 'Missing package.json manifest.';
  let declaredDeps = new Set<string>();
  const dangerousPkgScripts: string[] = [];

  if (files['/package.json']) {
    try {
      const parsed = JSON.parse(files['/package.json']);
      pkgValid = Boolean(parsed && typeof parsed === 'object' && (parsed.dependencies || parsed.scripts));
      if (parsed && typeof parsed === 'object') {
        for (const dep of Object.keys(parsed.dependencies || {})) declaredDeps.add(dep);
        for (const dep of Object.keys(parsed.devDependencies || {})) declaredDeps.add(dep);
        for (const [scriptName, scriptCmd] of Object.entries(parsed.scripts || {})) {
          const cmd = String(scriptCmd || '');
          if (
            /^(pre|post)?install$/i.test(scriptName) &&
            /\b(curl|wget|bash|sh\s+-c|powershell|rm\s+-rf|nc\s+-e|eval)\b/i.test(cmd)
          ) {
            dangerousPkgScripts.push(`${scriptName}: ${cmd.slice(0, 80)}`);
          }
        }
      }
      pkgDetail = pkgValid
        ? 'Valid package.json with declared dependencies/scripts.'
        : 'package.json is valid JSON but missing dependencies or scripts.';
    } catch (e: any) {
      pkgDetail = `Invalid JSON in package.json: ${e?.message || 'parse error'}`;
    }
  } else if (hasStandaloneHtmlApp && !hasMainEntry && !hasAppEntry) {
    // Pure static HTML/CSS/JS site without npm dependencies
    pkgValid = true;
    pkgDetail = 'Static HTML/CSS/JS project verified without npm manifest requirement.';
  }

  pushCheck({
    id: 'package-json',
    label: 'Valid package.json Manifest',
    passed: pkgValid,
    severity: 'error',
    detail: pkgDetail,
  });

  if (dangerousPkgScripts.length > 0) {
    pushCheck({
      id: 'safe-package-scripts',
      label: 'Safe Package Lifecycle Scripts',
      passed: false,
      severity: 'error',
      detail: `Blocked dangerous package.json lifecycle script(s): ${dangerousPkgScripts.join('; ')}`,
    });
  }

  // Validate any additional JSON files in project
  const invalidJsonFiles: string[] = [];
  for (const p of paths) {
    if (p.endsWith('.json') && p !== '/package.json') {
      try {
        JSON.parse(files[p]);
      } catch {
        invalidJsonFiles.push(p);
      }
    }
  }
  if (invalidJsonFiles.length > 0) {
    pushCheck({
      id: 'valid-json-files',
      label: 'Valid JSON Configuration Files',
      passed: false,
      severity: 'error',
      detail: `Invalid JSON syntax in: ${invalidJsonFiles.join(', ')}`,
    });
  }

  // 3. Backend check if fullstack requested
  if (options.requireBackend) {
    const hasBackendFile = paths.some(
      (p) =>
        /^\/(server|backend|api)\//i.test(p) ||
        /^\/server\.(ts|js|mjs|cjs)$/i.test(p) ||
        /^\/src\/(server|api)\//i.test(p)
    );
    pushCheck({
      id: 'backend-layer',
      label: 'Backend API / Persistence Layer',
      passed: hasBackendFile,
      severity: 'error',
      detail: hasBackendFile
        ? 'Verified backend server/API source files are present.'
        : 'Full-stack application requested, but no backend server or API route files were generated.',
    });
  }

  // 4. Relative import resolution, external dependency declarations, syntax balance, and truncation check
  const brokenImports: string[] = [];
  const unbalancedFiles: string[] = [];
  const truncatedFiles: string[] = [];
  const undeclaredPackages = new Set<string>();
  const codeFiles = paths.filter((p) => /\.(tsx?|jsx?|mjs|cjs)$/i.test(p));

  for (const filePath of codeFiles) {
    const content = files[filePath];
    const balance = checkBalancedDelimiters(content);
    if (!balance.balanced) {
      unbalancedFiles.push(`${filePath} (${balance.reason})`);
    }
    if (/\/\/\s*\.\.\.\s*(?:rest of|remaining|omitted|truncated|existing code)/i.test(content)) {
      truncatedFiles.push(filePath);
    }

    const importRegex = /(?:import|export)\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = importRegex.exec(content)) !== null) {
      const spec = m[1];
      if (spec.startsWith('.') || spec.startsWith('@/')) {
        if (!resolveRelativeImport(filePath, spec, fileSet)) {
          brokenImports.push(`${filePath} -> ${spec}`);
        }
      } else {
        const pkgName = extractPackageName(spec);
        if (
          pkgName &&
          !NODE_BUILTINS.has(pkgName) &&
          declaredDeps.size > 0 &&
          !declaredDeps.has(pkgName)
        ) {
          undeclaredPackages.add(pkgName);
        }
      }
    }
  }

  pushCheck({
    id: 'import-resolution',
    label: 'Local Import Resolution',
    passed: brokenImports.length === 0,
    severity: 'error',
    detail:
      brokenImports.length === 0
        ? `All relative imports across ${codeFiles.length} source files resolved cleanly.`
        : `Unresolved local imports: ${brokenImports.slice(0, 6).join(', ')}`,
  });

  if (undeclaredPackages.size > 0) {
    pushCheck({
      id: 'dependency-declarations',
      label: 'Declared Package Dependencies',
      passed: false,
      severity: 'warning',
      detail: `Imported package(s) missing from package.json: ${Array.from(undeclaredPackages).slice(0, 8).join(', ')}`,
    });
  }

  pushCheck({
    id: 'syntax-balance',
    label: 'Source Brace & Syntax Balance',
    passed: unbalancedFiles.length === 0 && truncatedFiles.length === 0,
    severity: 'error',
    detail:
      unbalancedFiles.length === 0 && truncatedFiles.length === 0
        ? 'All generated TypeScript/JSX files have balanced block structure with no truncation stubs.'
        : [
            unbalancedFiles.length > 0 ? `Unbalanced syntax in: ${unbalancedFiles.join(', ')}` : '',
            truncatedFiles.length > 0 ? `Truncated placeholder comments in: ${truncatedFiles.join(', ')}` : '',
          ]
            .filter(Boolean)
            .join(' | '),
  });

  // 5. Security hygiene scan (hardcoded secrets & host sandbox escape attempts)
  const secretFindings: string[] = [];
  const unsafeCodeFindings: string[] = [];
  const secretPattern =
    /\b(AIza[0-9A-Za-z\-_]{30,}|sk-[A-Za-z0-9\-_]{20,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16})\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
  const hostEscapePattern = /\b(window\.parent\.localStorage|window\.top\.localStorage|window\.parent\.document|window\.top\.document)\b/;

  for (const [p, content] of Object.entries(files)) {
    if (secretPattern.test(content)) {
      secretFindings.push(p);
    }
    if (hostEscapePattern.test(content)) {
      unsafeCodeFindings.push(p);
    }
  }

  pushCheck({
    id: 'secret-hygiene',
    label: 'Zero Hardcoded Secrets & Sandbox Isolation',
    passed: secretFindings.length === 0 && unsafeCodeFindings.length === 0,
    severity: 'error',
    detail:
      secretFindings.length === 0 && unsafeCodeFindings.length === 0
        ? 'No hardcoded cloud API keys, tokens, or host-escape attempts detected.'
        : [
            secretFindings.length > 0 ? `Potential hardcoded secret or credential found in: ${secretFindings.join(', ')}` : '',
            unsafeCodeFindings.length > 0 ? `Blocked host-origin access attempt in: ${unsafeCodeFindings.join(', ')}` : '',
          ]
            .filter(Boolean)
            .join(' | '),
  });

  // 6. Placeholder & unfinished-stub hygiene check
  const placeholderFindings: string[] = [];
  const placeholderPattern = /\b(lorem ipsum|TODO:|FIXME:|placeholder text here|coming soon placeholder)\b/i;
  for (const [p, content] of Object.entries(files)) {
    if (placeholderPattern.test(content)) {
      placeholderFindings.push(p);
    }
  }
  pushCheck({
    id: 'no-placeholders',
    label: 'Production Content (No Lorem Ipsum / TODO Stubs)',
    passed: placeholderFindings.length === 0,
    severity: 'warning',
    detail:
      placeholderFindings.length === 0
        ? 'No Lorem Ipsum or unfinished TODO placeholders found.'
        : `Placeholder markers detected in: ${placeholderFindings.join(', ')}`,
  });

  // 7. Interactive UI & responsive CSS verification
  const combinedUi = codeFiles.map((p) => files[p]).join('\n');
  const combinedCss = paths
    .filter((p) => /\.css$/i.test(p))
    .map((p) => files[p])
    .join('\n');
  const hasInteractivity = /\b(useState|onClick|onSubmit|onChange|addEventListener)\b/.test(
    combinedUi + '\n' + (files['/index.html'] || '')
  );
  const hasResponsiveDesign =
    /@media\b/.test(combinedCss + '\n' + (files['/index.html'] || '')) ||
    /\b(sm:|md:|lg:|xl:|grid-template-columns|auto-fit|minmax|clamp\()\b/.test(
      combinedUi + '\n' + combinedCss + '\n' + (files['/index.html'] || '')
    );

  pushCheck({
    id: 'interactivity',
    label: 'Interactive Application State & Controls',
    passed: hasInteractivity,
    severity: 'warning',
    detail: hasInteractivity
      ? 'Verified interactive state hooks and event handlers in UI components.'
      : 'No React state hooks or interactive handlers detected.',
  });

  pushCheck({
    id: 'responsive-layout',
    label: 'Responsive Desktop & Mobile Layout',
    passed: hasResponsiveDesign,
    severity: 'warning',
    detail: hasResponsiveDesign
      ? 'Verified responsive breakpoints or adaptive fluid CSS grid rules.'
      : 'No responsive media queries or adaptive layout rules detected.',
  });

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / Math.max(1, checks.length)) * 100);

  return {
    passed: errors.length === 0,
    score,
    fileCount: paths.length,
    checks,
    errors,
    warnings,
    diagnostics,
    verifiedAt: new Date().toISOString(),
  };
}

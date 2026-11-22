/**
 * ANNY — Genuine Generated Website & Application Verification Engine
 *
 * Replaces fake build logs with real deterministic static, structural,
 * import-resolution, security, and interactivity verification over VFS files.
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
  verifiedAt: string;
}

function normalizePath(p: string): string {
  const cleaned = p.replace(/\\/g, '/').trim();
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

function resolveRelativeImport(fromFile: string, specifier: string, fileSet: Set<string>): boolean {
  if (!specifier.startsWith('.')) return true; // external npm package
  const fromDir = fromFile.split('/').slice(0, -1);
  const segs = specifier.split('/');
  const resolved = [...fromDir];
  for (const s of segs) {
    if (!s || s === '.') continue;
    if (s === '..') {
      resolved.pop();
    } else {
      resolved.push(s);
    }
  }
  const base = normalizePath(resolved.join('/'));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.css`,
    `${base}.json`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
  ];
  return candidates.some((c) => fileSet.has(c));
}

function checkBalancedDelimiters(code: string): boolean {
  // Lightweight brace balance check ignoring string literals & single-line comments
  let depth = 0;
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

    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

export function verifyGeneratedProject(
  rawFiles: Record<string, string>,
  options: { requireBackend?: boolean } = {}
): ProjectVerificationReport {
  const files: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawFiles || {})) {
    if (typeof v === 'string') {
      files[normalizePath(k)] = v;
    }
  }

  const paths = Object.keys(files);
  const fileSet = new Set(paths);
  const checks: VerificationCheck[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const pushCheck = (c: VerificationCheck) => {
    checks.push(c);
    if (!c.passed) {
      if (c.severity === 'error') errors.push(c.detail);
      else if (c.severity === 'warning') warnings.push(c.detail);
    }
  };

  // 1. Entrypoints check
  const hasIndexHtml = fileSet.has('/index.html');
  const hasMainEntry =
    fileSet.has('/src/main.tsx') ||
    fileSet.has('/src/main.jsx') ||
    fileSet.has('/src/index.tsx') ||
    fileSet.has('/src/index.jsx');
  const hasAppEntry =
    fileSet.has('/src/App.tsx') ||
    fileSet.has('/src/App.jsx') ||
    fileSet.has('/app/page.tsx');

  pushCheck({
    id: 'entrypoints',
    label: 'Executable Frontend Entrypoints',
    passed: hasIndexHtml && (hasMainEntry || hasAppEntry),
    severity: 'error',
    detail:
      hasIndexHtml && (hasMainEntry || hasAppEntry)
        ? 'Verified index.html and React application entrypoints exist.'
        : 'Missing required frontend entrypoints (index.html and src/main.tsx or src/App.tsx).',
  });

  // 2. package.json JSON validity
  let pkgValid = false;
  let pkgDetail = 'Missing package.json manifest.';
  if (files['/package.json']) {
    try {
      const parsed = JSON.parse(files['/package.json']);
      pkgValid = Boolean(parsed && typeof parsed === 'object' && (parsed.dependencies || parsed.scripts));
      pkgDetail = pkgValid
        ? 'Valid package.json with declared dependencies/scripts.'
        : 'package.json is valid JSON but missing dependencies or scripts.';
    } catch (e: any) {
      pkgDetail = `Invalid JSON in package.json: ${e?.message || 'parse error'}`;
    }
  }
  pushCheck({
    id: 'package-json',
    label: 'Valid package.json Manifest',
    passed: pkgValid,
    severity: 'error',
    detail: pkgDetail,
  });

  // 3. Backend check if fullstack requested
  if (options.requireBackend) {
    const hasBackendFile = paths.some((p) => /^\/(server|backend|api)\//i.test(p) || /^\/server\.(ts|js|mjs)$/i.test(p));
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

  // 4. Relative import resolution
  const brokenImports: string[] = [];
  const unbalancedFiles: string[] = [];
  const codeFiles = paths.filter((p) => /\.(tsx?|jsx?)$/i.test(p));
  for (const filePath of codeFiles) {
    const content = files[filePath];
    if (!checkBalancedDelimiters(content)) {
      unbalancedFiles.push(filePath);
    }
    const importRegex = /(?:import|export)\s+(?:[^'"]*from\s+)?['"](\.[^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = importRegex.exec(content)) !== null) {
      const spec = m[1];
      if (!resolveRelativeImport(filePath, spec, fileSet)) {
        brokenImports.push(`${filePath} -> ${spec}`);
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
        : `Unresolved local imports: ${brokenImports.slice(0, 5).join(', ')}`,
  });

  pushCheck({
    id: 'syntax-balance',
    label: 'Source Brace & Syntax Balance',
    passed: unbalancedFiles.length === 0,
    severity: 'error',
    detail:
      unbalancedFiles.length === 0
        ? 'All generated TypeScript/JSX files have balanced block structure.'
        : `Unbalanced braces detected in: ${unbalancedFiles.join(', ')}`,
  });

  // 5. Security secret exposure scan
  const secretFindings: string[] = [];
  const secretPattern = /\b(AIza[0-9A-Za-z\-_]{35}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16})\b/;
  for (const [p, content] of Object.entries(files)) {
    if (secretPattern.test(content)) {
      secretFindings.push(p);
    }
  }
  pushCheck({
    id: 'secret-hygiene',
    label: 'Zero Hardcoded Secrets',
    passed: secretFindings.length === 0,
    severity: 'error',
    detail:
      secretFindings.length === 0
        ? 'No hardcoded cloud API keys or tokens detected in generated files.'
        : `Potential hardcoded secret found in: ${secretFindings.join(', ')}`,
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
  const hasInteractivity = /\b(useState|onClick|onSubmit|onChange)\b/.test(combinedUi);
  const hasResponsiveDesign =
    /@media\b/.test(combinedCss) ||
    /\b(sm:|md:|lg:|xl:|grid-template-columns|auto-fit|minmax|clamp\()\b/.test(combinedUi + '\n' + combinedCss);

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
    verifiedAt: new Date().toISOString(),
  };
}

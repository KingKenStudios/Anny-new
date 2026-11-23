/**
 * ANNY — OFFLINE-FIRST ISOLATED PREVIEW RUNTIME SERVICE
 * Provides:
 *  1. Cached offline React 19 + ReactDOM client runtime bundle (via local esbuild).
 *  2. Local offline Tailwind CSS v4 utility compiler (via local tailwindcss).
 *  3. Authenticated preview session lifecycle management (start / refresh / status / stop).
 *  4. Isolated opaque-origin standalone HTML serving for "Open in New Tab" previews
 *     with strict `Content-Security-Policy: sandbox allow-scripts allow-forms allow-modals`.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  isValidProjectId,
  projectPersistenceService,
  sanitizeProjectFilesMap,
  type PersistedPreviewSession,
} from './projectPersistenceService';
import { isStrongSecuritySecret } from './envConfigService';

export type PreviewRuntimeStatus = 'STARTING' | 'RUNNING' | 'STOPPED' | 'ERROR';

export interface PreviewSessionRecord {
  previewId: string;
  projectId: string;
  ownerUserId: string;
  name: string;
  version: number;
  status: PreviewRuntimeStatus;
  capabilityToken: string;
  previewUrl: string;
  runtimeMode: 'ISOLATED_OPQ_ORIGIN_SANDBOX';
  entryFile: string;
  lastError?: string | null;
  startedAt: string;
  updatedAt: string;
}

const VALID_PREVIEW_ID_REGEX = /^prev_[a-f0-9]{16,64}$/;

export const STANDALONE_TAB_SANDBOX_CSP =
  "sandbox allow-scripts allow-forms allow-modals; default-src 'none'; connect-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob: https:; font-src data: https:; media-src data: blob:; object-src 'none'; base-uri 'none'; form-action 'none';";

const INLINE_SECRET_PATTERNS: RegExp[] = [
  /AIzaSy[0-9A-Za-z\-_]{30,}/g,
  /sk-(?:ant-|proj-)?[0-9A-Za-z\-_]{20,}/g,
  /ghp_[0-9A-Za-z\-_]{30,}/g,
  /bearer\s+[0-9A-Za-z_\-\.]{20,}/gi,
  /-----\s*BEGIN\s+(?:[A-Z0-9]+\s+)*PRIVATE\s+KEY(?:\s+BLOCK)?\s*-----[\s\S]*?-----\s*END\s+(?:[A-Z0-9]+\s+)*PRIVATE\s+KEY(?:\s+BLOCK)?\s*-----/g,
  /(?:postgres|mongodb|mysql|redis):\/\/[^\s:@]+:[^\s@]+@[^\s:]+/g,
  /(?:api[_-]?key|api[_-]?secret|auth[_-]?token)\s*[:=]\s*['"][0-9A-Za-z_\-\.]{16,}['"]/gi,
];

function redactSecretsForPreview(content: string): string {
  if (!content) return '';
  let out = content;
  for (const pat of INLINE_SECRET_PATTERNS) {
    out = out.replace(pat, (m) =>
      /PRIVATE\s+KEY/i.test(m) ? '/*REDACTED_PRIVATE_KEY*/' : `${m.slice(0, 4)}/*REDACTED_SECRET*/`
    );
  }
  return out;
}

function getRuntimeRequire(): NodeRequire {
  try {
    if (typeof __filename !== 'undefined' && __filename) {
      return createRequire(__filename);
    }
  } catch (_e) {}
  try {
    return createRequire(import.meta.url);
  } catch (_e) {
    return (typeof require !== 'undefined' ? require : ({} as any)) as NodeRequire;
  }
}

function extractTailwindCandidates(files: Record<string, string>): string[] {
  const candidates = new Set<string>([
    'min-h-screen',
    'bg-slate-950',
    'text-white',
    'text-slate-100',
    'flex',
    'grid',
    'items-center',
    'justify-between',
    'p-4',
    'p-6',
    'px-4',
    'py-2',
    'rounded-xl',
    'border',
    'font-sans',
  ]);
  const tokenRegex = /[a-zA-Z0-9_!@:\-\/\[\].#%]+/g;
  for (const [filePath, rawContent] of Object.entries(files)) {
    if (!/\.(tsx|jsx|ts|js|html|css|scss)$/i.test(filePath) || typeof rawContent !== 'string') {
      continue;
    }
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(rawContent)) !== null) {
      const tok = match[0];
      if (tok.length >= 2 && tok.length <= 80) {
        candidates.add(tok);
      }
    }
  }
  return Array.from(candidates);
}

function resolveVfsImportPathServer(
  currentFile: string,
  specifier: string,
  modules: Record<string, string>,
  cssMap: Record<string, string>
): { resolved: string | null; traversalBlocked: boolean } {
  if (!specifier || specifier.includes('\0') || specifier.includes('\\')) {
    return { resolved: null, traversalBlocked: true };
  }
  let targetPath = '';
  if (specifier.startsWith('@/')) {
    const parts = specifier.slice(2).split('/');
    const stack = ['src'];
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (stack.length === 0) return { resolved: null, traversalBlocked: true };
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    targetPath = '/' + stack.join('/');
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const normCurrent = currentFile.startsWith('/') ? currentFile : `/${currentFile}`;
    const lastSlash = normCurrent.lastIndexOf('/');
    const currentDir = lastSlash > 0 ? normCurrent.substring(0, lastSlash) : '';
    const stack = currentDir.split('/').filter(Boolean);
    for (const part of specifier.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (stack.length === 0) return { resolved: null, traversalBlocked: true };
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    targetPath = '/' + stack.join('/');
  } else if (specifier.startsWith('/')) {
    const stack: string[] = [];
    for (const part of specifier.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (stack.length === 0) return { resolved: null, traversalBlocked: true };
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    targetPath = '/' + stack.join('/');
  } else {
    return { resolved: null, traversalBlocked: false };
  }

  const exts = ['', '.tsx', '.jsx', '.ts', '.js', '.json', '.css', '.scss', '/index.tsx', '/index.jsx', '/index.ts', '/index.js'];
  for (const ext of exts) {
    const cand = targetPath + ext;
    if (Object.prototype.hasOwnProperty.call(modules, cand) || Object.prototype.hasOwnProperty.call(cssMap, cand)) {
      return { resolved: cand, traversalBlocked: false };
    }
  }
  return { resolved: null, traversalBlocked: false };
}

export class PreviewRuntimeService {
  private static instance: PreviewRuntimeService;
  private cachedReactVendorJs: string | null = null;
  private tailwindCompilerPromise: Promise<any> | null = null;
  private compiledCssCache: Map<string, string> = new Map();
  private sessionsById: Map<string, PreviewSessionRecord> = new Map();
  private previewIdByProject: Map<string, string> = new Map();
  private localCapabilitySecret: string | null = null;

  private constructor() {}

  private getCapabilitySecret(): string {
    const configuredSecret = typeof process !== 'undefined' ? process.env.SESSION_SECRET?.trim() : '';
    if (isStrongSecuritySecret(configuredSecret)) return configuredSecret;
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
      throw new Error('PREVIEW_CAPABILITY_SECRET_UNAVAILABLE');
    }
    if (this.localCapabilitySecret) return this.localCapabilitySecret;

    const dataDirectory = typeof process !== 'undefined' && process.env.ANNY_DATA_DIR
      ? path.resolve(process.env.ANNY_DATA_DIR)
      : path.join(process.cwd(), '.anny-data');
    fs.mkdirSync(dataDirectory, { recursive: true, mode: 0o700 });
    const secretPath = path.join(dataDirectory, 'preview-capability.key');

    if (fs.existsSync(secretPath)) {
      const existingSecret = fs.readFileSync(secretPath, 'utf8').trim();
      if (!isStrongSecuritySecret(existingSecret)) {
        throw new Error('PREVIEW_CAPABILITY_SECRET_INVALID');
      }
      try { fs.chmodSync(secretPath, 0o600); } catch {}
      this.localCapabilitySecret = existingSecret;
      return existingSecret;
    }

    const generatedSecret = crypto.randomBytes(32).toString('hex');
    try {
      fs.writeFileSync(secretPath, generatedSecret, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    } catch (error: any) {
      if (error?.code !== 'EEXIST') throw new Error('PREVIEW_CAPABILITY_SECRET_PERSIST_FAILED');
      const concurrentSecret = fs.readFileSync(secretPath, 'utf8').trim();
      if (!isStrongSecuritySecret(concurrentSecret)) throw new Error('PREVIEW_CAPABILITY_SECRET_INVALID');
      this.localCapabilitySecret = concurrentSecret;
      return concurrentSecret;
    }
    try { fs.chmodSync(secretPath, 0o600); } catch {}
    this.localCapabilitySecret = generatedSecret;
    return generatedSecret;
  }

  private deriveCapabilityToken(session: Pick<PersistedPreviewSession,
    'previewId' | 'projectId' | 'ownerUserId' | 'version' | 'updatedAt'
  >): string {
    const secret = this.getCapabilitySecret();
    const material = [
      session.previewId,
      session.projectId,
      session.ownerUserId,
      session.updatedAt
    ].join('\\u0000');
    return crypto.createHmac('sha256', secret).update(material).digest('hex');
  }

  private restoreSession(record: PersistedPreviewSession): PreviewSessionRecord {
    const capabilityToken = this.deriveCapabilityToken(record);
    return {
      ...record,
      capabilityToken,
      previewUrl: `/api/preview/sessions/${encodeURIComponent(record.previewId)}/app?token=${encodeURIComponent(capabilityToken)}`
    };
  }

  private async loadPersistedSession(previewId: string): Promise<PreviewSessionRecord | null> {
    const persisted = await projectPersistenceService.getPreviewSessionById(previewId);
    if (!persisted) return null;
    const session = this.restoreSession(persisted);
    this.sessionsById.set(session.previewId, session);
    this.previewIdByProject.set(session.projectId, session.previewId);
    return session;
  }

  public static getInstance(): PreviewRuntimeService {
    if (!PreviewRuntimeService.instance) {
      PreviewRuntimeService.instance = new PreviewRuntimeService();
    }
    return PreviewRuntimeService.instance;
  }

  public getReactVendorBundle(): string {
    if (this.cachedReactVendorJs) {
      return this.cachedReactVendorJs;
    }

    const req = getRuntimeRequire();
    const esbuild = req('esbuild');
    const reactEntry = req.resolve('react');
    const resolveDir = path.dirname(reactEntry);

    const buildRes = esbuild.buildSync({
      stdin: {
        contents: `
          import * as ReactNS from 'react';
          import * as ReactDOMClient from 'react-dom/client';
          const ReactObj = ReactNS.default ? Object.assign({}, ReactNS, ReactNS.default) : ReactNS;
          globalThis.React = ReactObj;
          globalThis.ReactDOM = {
            ...ReactDOMClient,
            createRoot: ReactDOMClient.createRoot,
            hydrateRoot: ReactDOMClient.hydrateRoot,
          };
        `,
        resolveDir,
        loader: 'js',
      },
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'browser',
      minify: true,
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    });

    const js = buildRes?.outputFiles?.[0]?.text || '';
    if (!js || !js.includes('createRoot')) {
      throw new Error('REACT_VENDOR_BUNDLE_FAILED');
    }
    this.cachedReactVendorJs = js;
    return js;
  }

  private async getTailwindCompiler(): Promise<any> {
    if (!this.tailwindCompilerPromise) {
      this.tailwindCompilerPromise = (async () => {
        const req = getRuntimeRequire();
        const tw = req('tailwindcss');
        const indexCssPath = req.resolve('tailwindcss/index.css');
        const baseDir = path.dirname(indexCssPath);
        const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');
        return tw.compile(indexCssContent, {
          base: baseDir,
          loadStylesheet: async (id: string, fromDir: string) => {
            const cleanId = id.replace(/^tailwindcss\//, '');
            const candidates = [
              path.resolve(fromDir || baseDir, id),
              path.resolve(baseDir, cleanId),
              path.resolve(baseDir, `${cleanId}.css`),
            ];
            for (const c of candidates) {
              if (fs.existsSync(c) && fs.statSync(c).isFile()) {
                return {
                  path: c,
                  base: path.dirname(c),
                  content: fs.readFileSync(c, 'utf8'),
                };
              }
            }
            return { path: id, base: baseDir, content: '' };
          },
        });
      })().catch((err) => {
        this.tailwindCompilerPromise = null;
        throw err;
      });
    }
    return this.tailwindCompilerPromise;
  }

  public async compileTailwindCssFromSources(files: Record<string, string>): Promise<string> {
    const candidates = extractTailwindCandidates(files);
    const cacheKey = crypto.createHash('sha1').update(candidates.join('\n')).digest('hex');
    const cached = this.compiledCssCache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const compiler = await this.getTailwindCompiler();
      const compiled = String(compiler.build(candidates) || '');
      if (this.compiledCssCache.size > 40) {
        const firstKey = this.compiledCssCache.keys().next().value;
        if (firstKey) this.compiledCssCache.delete(firstKey);
      }
      this.compiledCssCache.set(cacheKey, compiled);
      return compiled;
    } catch (err: any) {
      console.warn('[PreviewRuntimeService] Tailwind local compile fallback:', err?.message || err);
      return '';
    }
  }

  public async bundleStandaloneProjectHtml(params: {
    projectId: string;
    name: string;
    files: Record<string, string>;
  }): Promise<{ html: string; entryFile: string }> {
    const cleanFiles = sanitizeProjectFilesMap(params.files);
    const possibleEntries = [
      '/src/App.tsx',
      '/src/App.jsx',
      '/App.tsx',
      '/App.jsx',
      '/src/App.js',
      '/App.js',
      '/src/main.tsx',
    ];
    let entryFile = '';
    for (const candidate of possibleEntries) {
      if (typeof cleanFiles[candidate] === 'string' && cleanFiles[candidate].trim().length > 0) {
        entryFile = candidate;
        break;
      }
    }

    if (!entryFile && typeof cleanFiles['/index.html'] === 'string' && cleanFiles['/index.html'].includes('<html')) {
      const sanitizedHtml = cleanFiles['/index.html']
        .replace(/<base\b[^>]*>/gi, '')
        .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?\s*content-security-policy\s*["']?[^>]*>/gi, '');
      return { html: sanitizedHtml, entryFile: '/index.html' };
    }

    if (!entryFile) {
      throw new Error('NO_VALID_PREVIEW_ENTRY_FILE');
    }

    const req = getRuntimeRequire();
    const esbuild = req('esbuild');
    const transpiledModules: Record<string, string> = {};
    const cssMap: Record<string, string> = {};

    for (const [filePath, rawContent] of Object.entries(cleanFiles)) {
      const safeContent = redactSecretsForPreview(rawContent);
      if (/\.(css|scss)$/i.test(filePath)) {
        cssMap[filePath] = safeContent
          .replace(/@import\s+["']tailwindcss["']\s*;?/g, '')
          .replace(/@tailwind\s+[a-z]+\s*;?/g, '');
        continue;
      }
      if (/\.json$/i.test(filePath)) {
        if (filePath !== '/package.json' && filePath !== '/tsconfig.json') {
          const parsed = JSON.parse(safeContent);
          transpiledModules[filePath] = `exports.__esModule = true; exports.default = ${JSON.stringify(parsed)}; module.exports = exports.default;`;
        }
        continue;
      }
      if (!/\.(tsx|jsx|ts|js)$/i.test(filePath)) continue;
      if (filePath.endsWith('.d.ts') || filePath.includes('vite.config') || filePath.includes('server.')) continue;

      const loader = filePath.endsWith('.tsx')
        ? 'tsx'
        : filePath.endsWith('.ts')
          ? 'ts'
          : filePath.endsWith('.jsx')
            ? 'jsx'
            : 'js';

      try {
        const transformed = esbuild.transformSync(safeContent, {
          loader,
          format: 'cjs',
          jsx: 'transform',
          jsxFactory: 'React.createElement',
          jsxFragment: 'React.Fragment',
          target: 'es2020',
          sourcefile: filePath,
          logLevel: 'silent',
        });
        transpiledModules[filePath] = transformed.code;
      } catch (transformErr: any) {
        const errItems: Array<{ text?: string; location?: { line?: number; column?: number } }> =
          Array.isArray(transformErr?.errors) ? transformErr.errors : [];
        const formattedDetails =
          errItems.length > 0
            ? errItems
                .slice(0, 3)
                .map((item) => {
                  const loc = item.location ? ` (${item.location.line}:${item.location.column})` : '';
                  return `${filePath}${loc} -> ${item.text || 'syntax error'}`;
                })
                .join(' | ')
            : String(transformErr?.message || 'Compilation failed')
                .replace(/\bERROR:\s*/gi, '')
                .replace(/\r?\n/g, ' | ')
                .slice(0, 260);
        throw new Error(`PREVIEW_COMPILE_DIAGNOSTIC: ${formattedDetails}`);
      }
    }

    // Validate reachable local imports
    const visited = new Set<string>();
    const visitImports = (modPath: string) => {
      if (visited.has(modPath)) return;
      visited.add(modPath);
      const code = transpiledModules[modPath];
      if (!code) return;
      const requireRegex = /require\(["']([^"']+)["']\)/g;
      let match: RegExpExecArray | null;
      while ((match = requireRegex.exec(code)) !== null) {
        const spec = match[1];
        if (!spec.startsWith('./') && !spec.startsWith('../') && !spec.startsWith('@/') && !spec.startsWith('/')) {
          continue;
        }
        const resolved = resolveVfsImportPathServer(modPath, spec, transpiledModules, cssMap);
        if (resolved.traversalBlocked) {
          throw new Error(`VFS_PATH_TRAVERSAL_BLOCKED:${spec}`);
        }
        if (!resolved.resolved) {
          throw new Error(`UNRESOLVED_LOCAL_IMPORT:${spec} in ${modPath}`);
        }
        if (Object.prototype.hasOwnProperty.call(transpiledModules, resolved.resolved)) {
          visitImports(resolved.resolved);
        }
      }
    };
    visitImports(entryFile);

    const compiledTailwindCss = await this.compileTailwindCssFromSources(cleanFiles);
    const reactVendorJs = this.getReactVendorBundle().replace(/<\/script/gi, '<\\/script');

    const safePayloadJson = JSON.stringify({
      projectId: params.projectId,
      projectName: params.name,
      entryFile,
      modules: transpiledModules,
      css: cssMap,
    }).replace(/<\//g, '<\\/');

    const safeTitle = String(params.name || 'ANNY Live Application').replace(/[<>&"]/g, '');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — ANNY Isolated Preview</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body, #root { margin: 0; padding: 0; min-height: 100vh; width: 100%; font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; }
  </style>
  <style id="anny-compiled-tailwind">${compiledTailwindCss.replace(/<\/style/gi, '<\\/style')}</style>
  <script>${reactVendorJs}</script>
</head>
<body>
  <div id="root"></div>
  <script id="anny-vfs-bundle" type="application/json">${safePayloadJson}</script>
  <script>
    (function() {
      var payload = JSON.parse(document.getElementById('anny-vfs-bundle').textContent || '{}');
      var cssMap = payload.css || {};
      Object.keys(cssMap).forEach(function(p) {
        if (!cssMap[p]) return;
        var s = document.createElement('style');
        s.textContent = cssMap[p];
        document.head.appendChild(s);
      });

      var React = window.React;
      var ReactDOM = window.ReactDOM;
      if (!React || !ReactDOM) {
        document.getElementById('root').innerHTML = '<div style="padding:24px;color:#fda4af;font-family:monospace;">Preview runtime error: React vendor bundle failed to initialize.</div>';
        return;
      }

      var currentRoute = '/';
      var routeListeners = new Set();
      function setRoute(nextPath) {
        var norm = typeof nextPath === 'string' && nextPath ? nextPath : '/';
        if (!norm.startsWith('/')) norm = '/' + norm;
        if (norm !== currentRoute) {
          currentRoute = norm;
          routeListeners.forEach(function(fn) { try { fn(currentRoute); } catch(_e) {} });
        }
      }
      function useRouterPath() {
        var pair = React.useState(currentRoute);
        var pathState = pair[0];
        var setPathState = pair[1];
        React.useEffect(function() {
          routeListeners.add(setPathState);
          return function() { routeListeners.delete(setPathState); };
        }, []);
        return pathState;
      }
      var RouterShim = {
        __esModule: true,
        BrowserRouter: function(p) { return React.createElement(React.Fragment, null, p && p.children); },
        HashRouter: function(p) { return React.createElement(React.Fragment, null, p && p.children); },
        MemoryRouter: function(p) { return React.createElement(React.Fragment, null, p && p.children); },
        Routes: function(p) {
          var pathNow = useRouterPath();
          var children = React.Children.toArray(p && p.children);
          var matched = null;
          var fallback = null;
          for (var i = 0; i < children.length; i++) {
            var ch = children[i];
            if (!ch || !ch.props) continue;
            var rp = ch.props.path;
            if (rp === '*') { fallback = ch.props.element || null; continue; }
            if (rp === pathNow || (ch.props.index && pathNow === '/')) {
              matched = ch.props.element || null;
              break;
            }
          }
          return matched || fallback || (children[0] && children[0].props ? children[0].props.element : null);
        },
        Route: function() { return null; },
        Link: function(p) {
          var to = (p && p.to) || '/';
          return React.createElement('a', Object.assign({}, p, {
            href: typeof to === 'string' ? to : '/',
            onClick: function(e) {
              e.preventDefault();
              if (p && p.onClick) p.onClick(e);
              if (typeof to === 'string') setRoute(to);
            }
          }), p && p.children);
        },
        NavLink: function(p) {
          var pathNow = useRouterPath();
          var to = (p && p.to) || '/';
          var active = pathNow === to;
          var cls = typeof (p && p.className) === 'function' ? p.className({ isActive: active }) : (p && p.className) || '';
          return React.createElement('a', Object.assign({}, p, {
            href: typeof to === 'string' ? to : '/',
            className: cls,
            onClick: function(e) {
              e.preventDefault();
              if (p && p.onClick) p.onClick(e);
              if (typeof to === 'string') setRoute(to);
            }
          }), typeof (p && p.children) === 'function' ? p.children({ isActive: active }) : (p && p.children));
        },
        Navigate: function(p) {
          React.useEffect(function() { if (p && p.to) setRoute(String(p.to)); }, [p && p.to]);
          return null;
        },
        Outlet: function() { return null; },
        useNavigate: function() { return function(to) { if (typeof to === 'string') setRoute(to); }; },
        useLocation: function() { var pathname = useRouterPath(); return { pathname: pathname, search: '', hash: '', state: null }; },
        useParams: function() { return {}; },
        useSearchParams: function() { return [new URLSearchParams(), function() {}]; }
      };

      var LucideProxy = new Proxy({}, {
        get: function(_t, prop) {
          if (prop === '__esModule') return true;
          if (prop === 'default') return LucideProxy;
          return function(props) {
            var size = (props && props.size) || 18;
            return React.createElement('svg', {
              width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
              stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
              className: (props && props.className) || ''
            }, React.createElement('circle', { cx: 12, cy: 12, r: 9 }));
          };
        }
      });
      var RechartsProxy = new Proxy({}, {
        get: function(_t, prop) {
          if (prop === '__esModule') return true;
          if (prop === 'default') return RechartsProxy;
          return function(props) { return React.createElement('div', { className: (props && props.className) || '' }, props && props.children); };
        }
      });
      var MotionProxy = new Proxy({}, {
        get: function(_t, tag) {
          return function(props) {
            var clean = Object.assign({}, props);
            delete clean.initial; delete clean.animate; delete clean.exit; delete clean.transition;
            delete clean.whileHover; delete clean.whileTap; delete clean.variants; delete clean.layout;
            return React.createElement(typeof tag === 'string' ? tag : 'div', clean, props && props.children);
          };
        }
      });
      var AnimatePresence = function(props) { return React.createElement(React.Fragment, null, props && props.children); };
      var clsxShim = function() { return Array.prototype.slice.call(arguments).flat(Infinity).filter(Boolean).join(' '); };

      var modules = payload.modules || {};
      var moduleCache = {};
      var mountedByMain = false;

      function resolvePath(currentFile, imp) {
        if (imp.indexOf('\\\\') !== -1) throw new Error('Traversal blocked');
        var base = '';
        if (imp.indexOf('@/') === 0) {
          base = '/src/' + imp.slice(2);
        } else if (imp.indexOf('./') === 0 || imp.indexOf('../') === 0) {
          var dir = currentFile.substring(0, currentFile.lastIndexOf('/')) || '';
          var stack = dir.split('/').filter(Boolean);
          var parts = imp.split('/');
          for (var i = 0; i < parts.length; i++) {
            if (!parts[i] || parts[i] === '.') continue;
            if (parts[i] === '..') stack.pop();
            else stack.push(parts[i]);
          }
          base = '/' + stack.join('/');
        } else {
          base = imp.indexOf('/') === 0 ? imp : '/' + imp;
        }
        var exts = ['', '.tsx', '.jsx', '.ts', '.js', '.json', '.css', '.scss', '/index.tsx', '/index.jsx', '/index.ts', '/index.js'];
        for (var j = 0; j < exts.length; j++) {
          var c = base + exts[j];
          if (Object.prototype.hasOwnProperty.call(modules, c) || Object.prototype.hasOwnProperty.call(cssMap, c)) return c;
        }
        return null;
      }

      function scopeRequire(modName, currentFile) {
        if (modName === 'react') return Object.assign({}, React, { default: React, __esModule: true });
        if (modName === 'react/jsx-runtime' || modName === 'react/jsx-dev-runtime') {
          return { jsx: React.createElement, jsxs: React.createElement, jsxDEV: React.createElement, Fragment: React.Fragment, __esModule: true };
        }
        if (modName === 'react-dom' || modName === 'react-dom/client') {
          return {
            render: function(el, c) { mountedByMain = true; ReactDOM.createRoot(c || document.getElementById('root')).render(el); },
            createRoot: function(c) { return { render: function(el) { mountedByMain = true; ReactDOM.createRoot(c || document.getElementById('root')).render(el); }, unmount: function() {} }; },
            default: ReactDOM,
            __esModule: true
          };
        }
        if (modName === 'react-router-dom' || modName === 'react-router') return RouterShim;
        if (modName === 'lucide-react') return LucideProxy;
        if (modName === 'recharts') return RechartsProxy;
        if (modName === 'framer-motion' || modName === 'motion/react' || modName === 'motion') {
          return { motion: MotionProxy, AnimatePresence: AnimatePresence, default: { motion: MotionProxy, AnimatePresence: AnimatePresence }, __esModule: true };
        }
        if (modName === 'clsx' || modName === 'tailwind-merge' || modName === 'classnames') {
          return { clsx: clsxShim, twMerge: clsxShim, default: clsxShim, __esModule: true };
        }
        if (modName.indexOf('./') === 0 || modName.indexOf('../') === 0 || modName.indexOf('@/') === 0 || modName.indexOf('/') === 0) {
          var res = resolvePath(currentFile, modName);
          if (!res) throw new Error("Unresolved local import '" + modName + "' from '" + currentFile + "'");
          if (/\\.(css|scss)$/i.test(res)) return { __esModule: true, default: {} };
          if (moduleCache[res]) return moduleCache[res].exports;
          var sub = { exports: {} };
          moduleCache[res] = sub;
          var fn = new Function('React', 'require', 'exports', 'module', modules[res]);
          fn(React, function(m) { return scopeRequire(m, res); }, sub.exports, sub);
          if (sub.exports && typeof sub.exports === 'object' && !sub.exports.default) {
            sub.exports.default = sub.exports.App || sub.exports;
          }
          return sub.exports;
        }
        if (/\\.(css|scss)$/i.test(modName)) return { __esModule: true, default: {} };
        throw new Error("Preview dependency unavailable: '" + modName + "'");
      }

      document.addEventListener('click', function(ev) {
        var anchor = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
        if (!anchor) return;
        var href = anchor.getAttribute('href') || '';
        if (href.startsWith('/')) {
          ev.preventDefault();
          setRoute(href);
        }
      });

      try {
        var entry = payload.entryFile || '/src/App.tsx';
        var entryMod = { exports: {} };
        moduleCache[entry] = entryMod;
        var entryFn = new Function('React', 'require', 'exports', 'module', modules[entry] || '');
        entryFn(React, function(m) { return scopeRequire(m, entry); }, entryMod.exports, entryMod);
        if (!mountedByMain) {
          var ExportedApp = entryMod.exports.default || entryMod.exports.App || Object.values(entryMod.exports)[0];
          if (!ExportedApp) throw new Error('No exported React component in ' + entry);
          ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(ExportedApp));
        }
      } catch (err) {
        var msg = (err && err.message) ? err.message : String(err);
        document.getElementById('root').innerHTML = '<div style="padding:24px;background:#1a0612;color:#fecdd3;font-family:monospace;border:1px solid #f43f5e44;margin:16px;border-radius:16px;"><strong>ANNY Isolated Preview Error</strong><pre style="white-space:pre-wrap;font-size:12px;margin-top:12px;">' + msg.replace(/[<>&]/g, '') + '</pre></div>';
      }
    })();
  </script>
</body>
</html>`;

    return { html, entryFile };
  }

  public async createOrRefreshPreviewSession(params: {
    projectId: string;
    ownerUserId: string;
    isAdmin?: boolean;
    name?: string;
    files?: Record<string, string>;
    version?: number;
  }): Promise<PreviewSessionRecord> {
    if (!isValidProjectId(params.projectId)) {
      throw new Error('INVALID_PROJECT_ID');
    }
    const cleanProjId = params.projectId.trim();
    let project = await projectPersistenceService.getProjectById(cleanProjId);

    if (project && !params.isAdmin && project.ownerUserId !== params.ownerUserId) {
      throw new Error('FORBIDDEN_PROJECT_OWNERSHIP');
    }

    if (!project) {
      if (!params.files || Object.keys(params.files).length === 0) {
        throw new Error('PROJECT_NOT_FOUND');
      }
      project = await projectPersistenceService.upsertProject({
        projectId: cleanProjId,
        ownerUserId: params.ownerUserId,
        name: params.name || cleanProjId,
        files: params.files,
        buildStatus: 'READY',
        previewStatus: 'STARTING',
      });
    } else if (params.files && Object.keys(params.files).length > 0) {
      project = await projectPersistenceService.updateProjectFiles(cleanProjId, params.ownerUserId, params.files, {
        isAdmin: params.isAdmin,
        name: params.name,
        buildStatus: 'READY',
      });
    }

    const persistedSession = await projectPersistenceService.getPreviewSessionByProjectId(cleanProjId);
    const previewId = persistedSession?.previewId || `prev_${crypto.randomBytes(12).toString('hex')}`;
    const now = new Date().toISOString();
    const startedAt = persistedSession?.startedAt || now;
    const capabilityToken = this.deriveCapabilityToken({
      previewId,
      projectId: cleanProjId,
      ownerUserId: project.ownerUserId,
      version: project.version,
      updatedAt: now
    });

    try {
      const bundled = await this.bundleStandaloneProjectHtml({
        projectId: cleanProjId,
        name: project.name,
        files: project.files,
      });

      const previewUrl = `/api/preview/sessions/${encodeURIComponent(previewId)}/app?token=${encodeURIComponent(capabilityToken)}`;
      const session: PreviewSessionRecord = {
        previewId,
        projectId: cleanProjId,
        ownerUserId: project.ownerUserId,
        name: project.name,
        version: project.version,
        status: 'RUNNING',
        capabilityToken,
        previewUrl,
        runtimeMode: 'ISOLATED_OPQ_ORIGIN_SANDBOX',
        entryFile: bundled.entryFile,
        lastError: null,
        startedAt,
        updatedAt: now,
      };
      await projectPersistenceService.upsertPreviewSession({
        previewId: session.previewId,
        projectId: session.projectId,
        ownerUserId: session.ownerUserId,
        name: session.name,
        version: session.version,
        status: session.status,
        runtimeMode: session.runtimeMode,
        entryFile: session.entryFile,
        lastError: session.lastError,
        startedAt: session.startedAt,
        updatedAt: session.updatedAt
      });
      await projectPersistenceService.updateProjectPreviewState(cleanProjId, 'RUNNING', null);
      this.sessionsById.set(previewId, session);
      this.previewIdByProject.set(cleanProjId, previewId);
      return session;
    } catch (err: any) {
      const msg = err?.message || 'PREVIEW_BUNDLE_FAILED';
      await projectPersistenceService.updateProjectPreviewState(cleanProjId, 'ERROR', msg);
      throw new Error(msg);
    }
  }

  public getPublicSessionSummary(session: PreviewSessionRecord) {
    return {
      previewId: session.previewId,
      projectId: session.projectId,
      name: session.name,
      version: session.version,
      status: session.status,
      previewUrl: session.previewUrl,
      runtimeMode: session.runtimeMode,
      entryFile: session.entryFile,
      lastError: session.lastError || null,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
    };
  }

  public async getPreviewSessionStatus(
    previewId: string,
    requesterUid: string,
    isAdmin: boolean
  ): Promise<PreviewSessionRecord> {
    if (!VALID_PREVIEW_ID_REGEX.test(previewId)) {
      throw new Error('INVALID_PREVIEW_ID');
    }
    const session = await this.loadPersistedSession(previewId);
    if (!session) {
      throw new Error('PREVIEW_SESSION_NOT_FOUND');
    }
    if (!isAdmin && session.ownerUserId !== requesterUid) {
      throw new Error('FORBIDDEN_PREVIEW_OWNERSHIP');
    }
    return session;
  }

  public async stopPreviewSession(
    previewId: string,
    requesterUid: string,
    isAdmin: boolean
  ): Promise<PreviewSessionRecord> {
    const session = await this.getPreviewSessionStatus(previewId, requesterUid, isAdmin);
    session.status = 'STOPPED';
    session.updatedAt = new Date().toISOString();
    session.capabilityToken = this.deriveCapabilityToken(session);
    session.previewUrl = `/api/preview/sessions/${encodeURIComponent(session.previewId)}/app?token=${encodeURIComponent(session.capabilityToken)}`;
    await projectPersistenceService.upsertPreviewSession({
      previewId: session.previewId,
      projectId: session.projectId,
      ownerUserId: session.ownerUserId,
      name: session.name,
      version: session.version,
      status: session.status,
      runtimeMode: session.runtimeMode,
      entryFile: session.entryFile,
      lastError: session.lastError,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt
    });
    await projectPersistenceService.updateProjectPreviewState(session.projectId, 'STOPPED');
    this.sessionsById.set(previewId, session);
    return session;
  }

  public async serveIsolatedPreviewHtml(
    previewId: string,
    token: string
  ): Promise<{ html: string; session: PreviewSessionRecord }> {
    if (!VALID_PREVIEW_ID_REGEX.test(previewId) || typeof token !== 'string' || token.length < 24) {
      throw new Error('UNAUTHORIZED_PREVIEW_CAPABILITY');
    }
    const session = await this.loadPersistedSession(previewId);
    if (!session) {
      throw new Error('PREVIEW_SESSION_NOT_FOUND');
    }

    const expectedBuf = Buffer.from(session.capabilityToken, 'utf8');
    const providedBuf = Buffer.from(token, 'utf8');
    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      throw new Error('UNAUTHORIZED_PREVIEW_CAPABILITY');
    }

    if (session.status === 'STOPPED') {
      throw new Error('PREVIEW_SESSION_STOPPED');
    }

    const project = await projectPersistenceService.getProjectById(session.projectId);
    if (!project || Object.keys(project.files).length === 0) {
      throw new Error('PROJECT_FILES_NOT_FOUND');
    }

    const bundled = await this.bundleStandaloneProjectHtml({
      projectId: project.projectId,
      name: project.name,
      files: project.files,
    });
    session.status = 'RUNNING';
    session.entryFile = bundled.entryFile;
    session.version = project.version;
    await projectPersistenceService.upsertPreviewSession({
      previewId: session.previewId,
      projectId: session.projectId,
      ownerUserId: session.ownerUserId,
      name: session.name,
      version: session.version,
      status: session.status,
      runtimeMode: session.runtimeMode,
      entryFile: session.entryFile,
      lastError: session.lastError,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt
    });
    return { html: bundled.html, session };
  }
}

export const previewRuntimeService = PreviewRuntimeService.getInstance();

import * as Babel from '@babel/standalone';
import { WorkspaceManager } from './workspaceManager';
import { sanitizeConstDeclarations } from './codeSanitizer';

export interface VerificationResult {
  success: boolean;
  file: string;
  error?: string;
  stack?: string;
}

/**
 * ANNY — REAL RUNTIME MOUNT VERIFIER (ZERO-EXECUTION STATIC AST & IMPORT VERIFIER)
 * P0 SECURITY HARDENING: Never executes generated code via `new Function()` on the
 * authenticated application origin. Instead performs Babel compilation, recursive local
 * VFS import resolution, and export signature verification cleanly in memory.
 */
export function verifyVFSRuntimeMount(): VerificationResult {
  const wsManager = WorkspaceManager.getInstance();
  const vfs = wsManager.getVFS();

  const entryPaths = [
    '/src/App.tsx',
    '/src/App.jsx',
    '/App.tsx',
    '/App.jsx',
    '/src/App.js',
    '/App.js'
  ];

  let entryFile = '';
  let appCode = '';

  for (const path of entryPaths) {
    if (vfs.exists(path)) {
      const content = vfs.readFile(path);
      if (content && content.trim().length > 0) {
        entryFile = path;
        appCode = content;
        break;
      }
    }
  }

  if (!entryFile || !appCode) {
    return {
      success: false,
      file: '/src/App.tsx',
      error: 'No valid React entry file (/src/App.tsx) found in Virtual FileSystem'
    };
  }

  try {
    const visitedFiles = new Set<string>();

    const resolveVfsPath = (currentFile: string, importPath: string): { resolved: string | null; traversalBlocked: boolean } => {
      if (importPath.includes('\0') || importPath.includes('\\')) {
        return { resolved: null, traversalBlocked: true };
      }
      let targetPath = '';
      if (importPath.startsWith('@/')) {
        const relParts = importPath.slice(2).split('/');
        const stack: string[] = ['src'];
        for (const part of relParts) {
          if (!part || part === '.') continue;
          if (part === '..') {
            if (stack.length === 0) return { resolved: null, traversalBlocked: true };
            stack.pop();
          } else {
            stack.push(part);
          }
        }
        targetPath = '/' + stack.join('/');
      } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const lastSlash = currentFile.lastIndexOf('/');
        const currentDir = lastSlash > 0 ? currentFile.substring(0, lastSlash) : '';
        const stack: string[] = currentDir.split('/').filter(Boolean);
        const parts = importPath.split('/');
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
      } else {
        targetPath = importPath.startsWith('/') ? importPath : '/' + importPath;
      }

      const extensions = ['', '.tsx', '.jsx', '.ts', '.js', '.css', '.scss', '/index.tsx', '/index.jsx', '/index.ts', '/index.js'];
      for (const ext of extensions) {
        const candidate = targetPath + ext;
        if (vfs.exists(candidate)) return { resolved: candidate, traversalBlocked: false };
      }
      return { resolved: null, traversalBlocked: false };
    };

    const verifyModuleFile = (filePath: string, rawCode: string, isEntry: boolean): VerificationResult => {
      if (visitedFiles.has(filePath)) {
        return { success: true, file: filePath };
      }
      visitedFiles.add(filePath);

      if (filePath.endsWith('.css') || filePath.endsWith('.scss') || filePath.endsWith('.json')) {
        return { success: true, file: filePath };
      }

      const cleanCode = sanitizeConstDeclarations(rawCode);
      const transpiled = Babel.transform(cleanCode, {
        presets: [
          ['env', { modules: 'commonjs' }],
          ['react', { runtime: 'classic' }],
          'typescript'
        ],
        filename: filePath
      }).code;

      if (!transpiled || transpiled.trim().length === 0) {
        return {
          success: false,
          file: filePath,
          error: `Babel transformation produced empty code for ${filePath}`
        };
      }

      if (isEntry) {
        const hasExport =
          /exports\.default\s*=/.test(transpiled) ||
          /exports\[["']default["']\]\s*=/.test(transpiled) ||
          /exports\.App\s*=/.test(transpiled) ||
          /exports\[["']App["']\]\s*=/.test(transpiled) ||
          /module\.exports\s*=/.test(transpiled) ||
          /Object\.defineProperty\(exports,\s*["'](__esModule|default)["']/.test(transpiled);
        if (!hasExport) {
          return {
            success: false,
            file: filePath,
            error: `No valid exported React component found in ${filePath}`
          };
        }
      }

      // Verify local relative / alias imports exist and compile cleanly
      const importRegex = /require\(["'](\.[^"']+|@\/[^"']+)["']\)/g;
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(transpiled)) !== null) {
        const importSpecifier = match[1];
        const resolution = resolveVfsPath(filePath, importSpecifier);
        if (resolution.traversalBlocked) {
          return {
            success: false,
            file: filePath,
            error: `VFS path traversal blocked: "${importSpecifier}" referenced in ${filePath} escapes project root`
          };
        }
        if (importSpecifier.endsWith('.css') || importSpecifier.endsWith('.scss')) {
          continue;
        }
        if (!resolution.resolved || !vfs.exists(resolution.resolved)) {
          return {
            success: false,
            file: filePath,
            error: `Unresolved local VFS import "${importSpecifier}" referenced in ${filePath}`
          };
        }
        const subResult = verifyModuleFile(resolution.resolved, vfs.readFile(resolution.resolved), false);
        if (!subResult.success) {
          return subResult;
        }
      }

      return {
        success: true,
        file: filePath
      };
    };

    return verifyModuleFile(entryFile, appCode, true);
  } catch (err: any) {
    return {
      success: false,
      file: entryFile,
      error: err.message || String(err),
      stack: err.stack
    };
  }
}


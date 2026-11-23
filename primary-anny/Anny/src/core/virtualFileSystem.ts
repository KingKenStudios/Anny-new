/**
 * ANNY — VIRTUAL FILESYSTEM (VFS) ENGINE (VERSION 1.0)
 * Priority 1 Subsystem: Enterprise In-Memory Hierarchical Virtual Filesystem.
 * Provides file tree modeling, CRUD operations, event watching, diffing,
 * path normalization, pattern searching, and local persistence.
 */

import { safeStorage } from '../lib/storage';
import { sanitizeConstDeclarations } from './codeSanitizer';
import { executionStreamManager } from './executionStreamManager';
import { systemBus } from './systemBus';

export type VFSNodeType = 'file' | 'directory';

export interface VFSBaseNode {
  id: string;
  name: string;
  path: string; // Absolute normalized path e.g. "/src/App.tsx"
  type: VFSNodeType;
  createdAt: number;
  updatedAt: number;
  isReadOnly?: boolean;
}

export interface VFSFileNode extends VFSBaseNode {
  type: 'file';
  content: string;
  language: string;
  size: number;
  hash: string;
  isExecutable?: boolean;
}

export interface VFSDirectoryNode extends VFSBaseNode {
  type: 'directory';
  children: Record<string, VFSNode>;
}

export type VFSNode = VFSFileNode | VFSDirectoryNode;

export interface VFSChangeEvent {
  type: 'create' | 'update' | 'delete' | 'rename' | 'move';
  path: string;
  oldPath?: string;
  node?: VFSNode;
  timestamp: number;
}

export type VFSEventListener = (event: VFSChangeEvent) => void;

// ============================================================================
// PATH UTILITIES
// ============================================================================
export class PathUtils {
  public static normalize(path: any): string {
    const cleanPath = typeof path === 'string' ? path : (path != null ? String(path) : '/');
    let clean = cleanPath.trim().replace(/\\/g, '/');
    if (!clean.startsWith('/')) clean = '/' + clean;
    clean = clean.replace(/\/+/g, '/');
    if (clean.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    return clean;
  }

  public static getParent(path: string): string {
    const normalized = PathUtils.normalize(path);
    if (normalized === '/') return '/';
    const parts = normalized.split('/');
    parts.pop();
    const parent = parts.join('/');
    return parent === '' ? '/' : parent;
  }

  public static getName(path: string): string {
    const normalized = PathUtils.normalize(path);
    if (normalized === '/') return '/';
    const parts = normalized.split('/');
    return parts[parts.length - 1];
  }

  public static detectLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'json':
        return 'json';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'md':
        return 'markdown';
      case 'py':
        return 'python';
      case 'sh':
        return 'shell';
      case 'dockerfile':
      case 'docker':
        return 'dockerfile';
      case 'yml':
      case 'yaml':
        return 'yaml';
      default:
        return 'plaintext';
    }
  }

  public static computeHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
}

// ============================================================================
// VIRTUAL FILESYSTEM ENGINE
// ============================================================================
export class VirtualFileSystem {
  private root: VFSDirectoryNode;
  private listeners: Set<VFSEventListener> = new Set();
  private storageKey: string;

  constructor(storageKey: string = 'anny_anny_vfs_default') {
    this.storageKey = storageKey;
    this.root = {
      id: 'root',
      name: '/',
      path: '/',
      type: 'directory',
      children: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.loadFromStorage();
  }

  // --- Event Subscription ---
  public watch(listener: VFSEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: VFSChangeEvent): void {
    this.listeners.forEach(fn => {
      try { fn(event); } catch (e) { console.error('[VFS Event Error]', e); }
    });
    this.saveToStorage();
  }

  // --- Directory Operations ---
  
  public mkdir(path: string): VFSDirectoryNode {
    throw new Error("PHANTOM_WRITE_ERROR: Unauthorized project mutation attempt. Direct VFS mutations are prohibited. Use vfsTransactionManager.");
  }
  public _unsafe_mkdir(path: string): VFSDirectoryNode {
    const norm = PathUtils.normalize(path);
    if (norm === '/') return this.root;

    const parts = norm.split('/').filter(Boolean);
    let current: VFSDirectoryNode = this.root;
    let currentPath = '';

    for (const part of parts) {
      currentPath += '/' + part;
      if (!current.children[part] || current.children[part].type !== 'directory') {
        const newDir: VFSDirectoryNode = {
          id: `dir_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: part,
          path: currentPath,
          type: 'directory',
          children: current.children[part] && current.children[part].type === 'directory' ? (current.children[part] as VFSDirectoryNode).children : {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        current.children[part] = newDir;
        this.notify({ type: 'create', path: currentPath, node: newDir, timestamp: Date.now() });
      }
      current = current.children[part] as VFSDirectoryNode;
    }

    this.saveToStorage();
    return current;
  }

  // --- Write File ---
  
  public writeFile(path: string, rawContent: any, isExecutable: boolean = false): VFSFileNode {
    throw new Error("PHANTOM_WRITE_ERROR: Unauthorized project mutation attempt. Direct VFS mutations are prohibited. Use vfsTransactionManager.");
  }
  public _unsafe_writeFile(path: string, rawContent: any, isExecutable: boolean = false): VFSFileNode {
    const safePath = typeof path === 'string' && path.trim() ? path : (path != null ? String(path) : '/untitled.tsx');
    const stringContent = typeof rawContent === 'string' 
      ? rawContent 
      : (rawContent != null 
          ? (typeof rawContent === 'object' ? JSON.stringify(rawContent, null, 2) : String(rawContent)) 
          : '');
    let norm = PathUtils.normalize(safePath);
    if (!norm || norm === '/') {
      norm = '/untitled.txt';
    }
    const parentPath = PathUtils.getParent(norm);
    const fileName = PathUtils.getName(norm);
    if (!fileName || fileName === '/') {
      throw new Error(`[VFS Invalid Path] Cannot write file at directory path: ${norm}`);
    }

    const isScript = norm.endsWith('.ts') || norm.endsWith('.tsx') || norm.endsWith('.js') || norm.endsWith('.jsx');
    const content = isScript ? sanitizeConstDeclarations(stringContent) : stringContent;

    const parentDir = this._unsafe_mkdir(parentPath);
    const existing = parentDir.children[fileName];

    const language = PathUtils.detectLanguage(fileName);
    const hash = PathUtils.computeHash(content);
    const now = Date.now();

    let node: VFSFileNode;
    let eventType: 'create' | 'update' = 'create';

    if (existing && existing.type === 'file') {
      eventType = 'update';
    }

    try {
      systemBus.publish('FILE_OPERATION_STARTED', 'VirtualFileSystem', { filePath: norm, operation: eventType === 'create' ? 'create' : 'edit' });
      executionStreamManager.touchFile(norm, 'active', eventType === 'create' ? 'create' : 'edit');
    } catch (_e) {}

    if (existing && existing.type === 'file') {
      node = {
        ...existing,
        content,
        size: content.length,
        hash,
        language,
        isExecutable,
        updatedAt: now
      };
    } else {
      node = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: fileName,
        path: norm,
        type: 'file',
        content,
        language,
        size: content.length,
        hash,
        isExecutable,
        createdAt: now,
        updatedAt: now
      };
    }

    parentDir.children[fileName] = node;

    // MANDATORY READ-BACK VERIFICATION (supports legitimate empty files such as "" / .keep / .env.example)
    // Verify BEFORE firing watch() listeners so synchronous subscribers cannot invalidate the read-back check.
    const readBackNode = this.getNode(norm);
    const readBackContent = readBackNode && readBackNode.type === 'file' ? readBackNode.content : null;
    const readBackHash = readBackContent !== null ? PathUtils.computeHash(readBackContent) : '';
    if (readBackContent === null || readBackHash !== hash) {
      try {
        systemBus.publish('FILE_OPERATION_FAILED', 'VirtualFileSystem', { filePath: norm, error: `Read-back verification failed for ${norm}` });
        executionStreamManager.failFile(norm, `Read-back verification failed for ${norm}`);
      } catch (_e) {}
      throw new Error(`[VFS Write Verification Failure] File write verification failed for ${norm}`);
    }

    this.notify({ type: eventType, path: norm, node, timestamp: now });
    try {
      systemBus.publish('FILE_OPERATION_COMPLETED', 'VirtualFileSystem', { filePath: norm, operation: eventType === 'create' ? 'create' : 'edit' });
      executionStreamManager.completeFile(norm, eventType === 'create' ? 'create' : 'edit');
    } catch (_e) {}
    this.saveToStorage();
    return node;
  }

  // --- Read File ---
  public readFile(path: string): string {
    const node = this.getNode(path);
    if (!node || node.type !== 'file') {
      return '';
    }
    return node.content;
  }

  // --- Read Directory / List Files ---
  public readDir(path: string = '/'): VFSNode[] {
    const node = this.getNode(path);
    if (!node) {
      throw new Error(`Directory not found: ${path}`);
    }
    if (node.type !== 'directory') {
      throw new Error(`Path is a file, not a directory: ${path}`);
    }
    return Object.values(node.children);
  }

  // --- Get Node ---
  public getNode(path: string): VFSNode | null {
    const norm = PathUtils.normalize(path);
    if (norm === '/') return this.root;

    const parts = norm.split('/').filter(Boolean);
    let current: VFSNode = this.root;

    for (const part of parts) {
      if (current.type !== 'directory' || !current.children[part]) {
        return null;
      }
      current = current.children[part];
    }
    return current;
  }

  // --- Exists Check ---
  public exists(path: string): boolean {
    return this.getNode(path) !== null;
  }

  // --- Remove File/Directory ---
  public clearAll(): void {
    this.root = {
      id: 'root',
      name: '/',
      path: '/',
      type: 'directory',
      children: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.saveToStorage();
    this.notify({ type: 'delete', path: '/', timestamp: Date.now() });
  }

  
  public remove(path: string): boolean {
    throw new Error("PHANTOM_WRITE_ERROR: Unauthorized project mutation attempt. Direct VFS mutations are prohibited. Use vfsTransactionManager.");
  }
  public _unsafe_remove(path: string): boolean {
    const norm = PathUtils.normalize(path);
    if (norm === '/') throw new Error('Cannot remove root directory');

    const parentPath = PathUtils.getParent(norm);
    const name = PathUtils.getName(norm);

    const parentNode = this.getNode(parentPath);
    if (!parentNode || parentNode.type !== 'directory' || !parentNode.children[name]) {
      return false;
    }

    const targetNode = parentNode.children[name];
    delete parentNode.children[name];
    this.notify({ type: 'delete', path: norm, node: targetNode, timestamp: Date.now() });
    this.saveToStorage();
    return true;
  }

  
  public deleteFile(path: string): boolean {
    throw new Error("PHANTOM_WRITE_ERROR: Unauthorized project mutation attempt. Direct VFS mutations are prohibited. Use vfsTransactionManager.");
  }
  public _unsafe_deleteFile(path: string): boolean {
    return this._unsafe_remove(path);
  }

  public _unsafe_delete(path: string): boolean {
    return this._unsafe_remove(path);
  }

  // --- Move / Rename ---
  public move(sourcePath: string, destPath: string): boolean {
    const srcNorm = PathUtils.normalize(sourcePath);
    const destNorm = PathUtils.normalize(destPath);
    if (srcNorm === '/' || destNorm === '/') throw new Error('Root directory cannot be moved.');
    if (srcNorm === destNorm) return true;
    if (destNorm.startsWith(`${srcNorm}/`)) throw new Error('A directory cannot be moved inside itself.');

    const srcNode = this.getNode(srcNorm);
    if (!srcNode) throw new Error(`Source path not found: ${sourcePath}`);
    if (this.exists(destNorm)) throw new Error(`Destination already exists: ${destPath}`);

    const sourceParent = this.getNode(PathUtils.getParent(srcNorm));
    if (!sourceParent || sourceParent.type !== 'directory') throw new Error(`Source parent not found: ${srcNorm}`);

    const destParent = this._unsafe_mkdir(PathUtils.getParent(destNorm));
    const movedNode: VFSNode = { ...srcNode, path: destNorm, name: PathUtils.getName(destNorm), updatedAt: Date.now() } as VFSNode;

    if (srcNode.type === 'directory') {
      const rewritePaths = (node: VFSNode, oldPrefix: string, newPrefix: string): VFSNode => {
        const nextPath = node.path === oldPrefix ? newPrefix : newPrefix + node.path.slice(oldPrefix.length);
        if (node.type === 'directory') {
          const children: Record<string, VFSNode> = {};
          Object.entries(node.children).forEach(([name, child]) => {
            children[name] = rewritePaths(child, oldPrefix, newPrefix);
          });
          return { ...node, path: nextPath, children, updatedAt: Date.now() };
        }
        return { ...node, path: nextPath, updatedAt: Date.now() };
      };
      Object.assign(movedNode, rewritePaths(srcNode, srcNorm, destNorm));
    }

    delete sourceParent.children[srcNode.name];
    destParent.children[movedNode.name] = movedNode;
    this.notify({ type: 'move', path: destNorm, oldPath: srcNorm, node: movedNode, timestamp: Date.now() });
    this.saveToStorage();
    return true;
  }

  public rename(path: string, newName: string): boolean {
    const cleanName = String(newName || '').trim().replace(/[\/]/g, '');
    if (!cleanName || cleanName === '.' || cleanName === '..') throw new Error('Invalid new name.');
    return this.move(path, `${PathUtils.getParent(path)}/${cleanName}`);
  }

  // --- Flatten All Files (Utility for compilation & building) ---
  public getAllDirectories(dirPath: string = '/'): VFSDirectoryNode[] {
    const result: VFSDirectoryNode[] = [];
    const target = this.getNode(dirPath);
    const traverse = (node: VFSNode) => {
      if (node.type !== 'directory') return;
      if (node.path !== '/') result.push(node);
      Object.values(node.children).forEach(traverse);
    };
    if (target) traverse(target);
    return result;
  }

  public getAllFiles(dirPath: string = '/'): VFSFileNode[] {
    const result: VFSFileNode[] = [];

    const traverse = (node: VFSNode) => {
      if (node.type === 'file') {
        result.push(node);
      } else if (node.type === 'directory') {
        Object.values(node.children).forEach(traverse);
      }
    };

    const target = this.getNode(dirPath);
    if (target) traverse(target);
    return result;
  }

  public getAllFilesMap(dirPath: string = '/'): Record<string, string> {
    const map: Record<string, string> = {};
    this.getAllFiles(dirPath).forEach(f => {
      map[f.path] = f.content;
    });
    return map;
  }

  public validateTypeScriptAST(code: string, filePath: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!code || code.trim().length === 0) {
      errors.push('Empty file');
    }
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Mismatched braces: ${openBraces} open vs ${closeBraces} close`);
    }
    if (/return\s*[\+\-\*\/]\s*;/i.test(code) || /=\s*;/i.test(code) || /\+\s*;/i.test(code)) {
      errors.push('Incomplete expression before semicolon');
    }
    return { valid: errors.length === 0, errors };
  }

  // --- Search Files ---
  public search(query: string): VFSFileNode[] {
    const lower = query.toLowerCase();
    return this.getAllFiles().filter(f => 
      f.name.toLowerCase().includes(lower) || 
      f.path.toLowerCase().includes(lower) || 
      f.content.toLowerCase().includes(lower)
    );
  }

  // --- Load / Save Persistence ---
  public saveToStorage(): void {
    try {
      const serialized = JSON.stringify(this.root);
      safeStorage.setItem(this.storageKey, serialized);
    } catch (e) {
      // Storage full or unavailable
    }
  }

  private loadFromStorage(): void {
    try {
      let data = safeStorage.getItem(this.storageKey);
      if (!data && this.storageKey.startsWith('anny_anny_vfs_')) {
        const altKey = 'anny_vfs_' + this.storageKey.replace('anny_anny_vfs_', '');
        data = safeStorage.getItem(altKey);
      }
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed.type === 'directory' && parsed.children && typeof parsed.children === 'object') {
          const packageNode = parsed.children?.package?.children?.json;
          const appNode = parsed.children?.src?.children?.App?.children?.tsx;
          const packageName = packageNode?.type === 'file' ? (() => {
            try { return JSON.parse(packageNode.content)?.name || ''; } catch { return ''; }
          })() : '';
          const appContent = appNode?.type === 'file' ? String(appNode.content || '') : '';
          const isHistoricalSeed = packageName === 'anny-vfs-project' ||
            packageName === 'ecommerce-website' ||
            /export\s+default\s+function\s+App\s*\(\)\s*\{\s*return\s+null;\s*\}/.test(appContent);
          if (isHistoricalSeed) {
            this.root = {
              id: 'root', name: '/', path: '/', type: 'directory', children: {},
              createdAt: Date.now(), updatedAt: Date.now()
            };
            this.saveToStorage();
            return;
          }
          this.root = parsed;
          return;
        }
      }
    } catch (e) {
      // Ignore storage parse exceptions gracefully and fall through to default root initialization
    }

    this.root = {
      id: 'root',
      name: '/',
      path: '/',
      type: 'directory',
      children: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Fresh workspaces intentionally contain no generated application.
   * Historical seed generation was removed because it could make a new project
   * appear to contain a template before ANNY had actually generated anything.
   */
  public seedDefaultFiles(): void {
    // Deprecated compatibility method. It deliberately performs no writes.
  }

  public reloadFromStorage(): void {
    this.loadFromStorage();
  }

  // --- Import Batch of Files (Chunked processing for large projects) ---
  public importBatch(
    files: { path: string; content: string; isExecutable?: boolean }[],
    onProgress?: (processedCount: number, totalCount: number) => void
  ): void {
    const CHUNK_SIZE = 50;
    let processed = 0;

    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      const chunk = files.slice(i, i + CHUNK_SIZE);
      chunk.forEach(f => {
        this._unsafe_writeFile(f.path, f.content, f.isExecutable);
        processed++;
      });
      if (onProgress) {
        onProgress(processed, files.length);
      }
    }
  }

  // --- Extract Indexed Project Graph for Project Intelligence ---
  public getProjectGraph(): {
    filesCount: number;
    components: { name: string; path: string }[];
    routes: string[];
    importsMap: Record<string, string[]>;
    dependencies: Record<string, string>;
  } {
    const allFiles = this.getAllFiles();
    const components: { name: string; path: string }[] = [];
    const routes: string[] = [];
    const importsMap: Record<string, string[]> = {};
    let dependencies: Record<string, string> = {};

    const pkgStr = this.readFile('/package.json');
    if (pkgStr) {
      try {
        const pkg = JSON.parse(pkgStr);
        dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
      } catch (e) {
        // ignore
      }
    }

    allFiles.forEach(file => {
      if (file.path.endsWith('.tsx') || file.path.endsWith('.jsx') || file.path.endsWith('.ts') || file.path.endsWith('.js')) {
        const lines = file.content.split('\n');
        const fileImports: string[] = [];

        lines.forEach(line => {
          // Detect imports
          const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
          if (importMatch) {
            fileImports.push(importMatch[1]);
          }

          // Detect components
          const compMatch = line.match(/(?:export\ default\ function|export\ const|function)\s+([A-Z][A-Za-z0-9_]*)/);
          if (compMatch) {
            components.push({ name: compMatch[1], path: file.path });
          }

          // Detect routes
          const routeMatch = line.match(/path=['"]([^'"]+)['"]/);
          if (routeMatch) {
            routes.push(routeMatch[1]);
          }
        });

        importsMap[file.path] = fileImports;
      }
    });

    return {
      filesCount: allFiles.length,
      components,
      routes: Array.from(new Set(routes)),
      importsMap,
      dependencies
    };
  }

  // --- Export Full JSON Tree ---
  public exportJSON(): VFSDirectoryNode {
    return this.root;
  }

  // --- Snapshot/Restore (Transaction-Oriented) ---
  public captureSnapshot(): VFSNode {
    return this.deepCloneNode(this.root);
  }

  private deepCloneNode(node: VFSNode): VFSNode {
    if (node.type === 'file') {
      return { ...node };
    }
    const children: Record<string, VFSNode> = {};
    for (const [key, child] of Object.entries((node as VFSDirectoryNode).children)) {
      children[key] = this.deepCloneNode(child);
    }
    return {
      ...(node as VFSDirectoryNode),
      children
    };
  }

  public restoreSnapshot(snapshot: VFSNode): void {
    this.root = snapshot as VFSDirectoryNode;
    this.saveToStorage();
    this.notify({ type: 'update', path: '/', timestamp: Date.now() });
  }

  // --- Import Record of Files (e.g. from ProjectGenerationEngine) ---
  public importFileMap(fileMap: Record<string, { path: string; content: string; isExecutable?: boolean }>): void {
    Object.values(fileMap).forEach(f => {
      this._unsafe_writeFile(f.path, f.content, f.isExecutable);
    });
  }

  // --- Export Record of Files ---
  public exportFileMap(): Record<string, { path: string; content: string; language: string }> {
    const map: Record<string, { path: string; content: string; language: string }> = {};
    this.getAllFiles().forEach(f => {
      map[f.path] = {
        path: f.path,
        content: f.content,
        language: f.language
      };
    });
    return map;
  }

  private static instance: VirtualFileSystem;
  public static getInstance(): VirtualFileSystem {
    if (!VirtualFileSystem.instance) {
      VirtualFileSystem.instance = new VirtualFileSystem();
    }
    return VirtualFileSystem.instance;
  }
}

export const virtualFileSystem = VirtualFileSystem.getInstance();



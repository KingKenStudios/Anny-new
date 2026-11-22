import React, { useState, useEffect } from 'react';
import * as Babel from '@babel/standalone';
import * as LucideIcons from 'lucide-react';
import * as Recharts from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, RefreshCw, AlertTriangle, Code, Code2, Terminal, CheckCircle2, Loader2, Circle } from 'lucide-react';
import { WorkspaceManager } from '../core/workspaceManager';
import { universalExecutionController } from '../core/universalExecutionController';
import { executionStreamManager } from '../core/executionStreamManager';
import { sanitizeConstDeclarations } from '../core/codeSanitizer';
import {
  VerifiedPreviewAuthorizationContext,
  isVerifiedAuthorizationContextValidForRead,
  authorizeLocalOnlyProjectSync,
  authorizeProjectForPreviewSnapshot,
  invalidatePreviewSessionAuthorizations,
  getProjectOwnershipRecord
} from '../services/projectOwnershipService';

// Expose global window scope fallbacks for dynamic VFS evaluation
if (typeof window !== 'undefined') {
  const win = window as any;
  if (!win.font) {
    win.font = { family: 'inter, sans-serif', className: 'font-sans', name: 'sans-serif', toString: () => 'font-sans' };
  }
  if (!win.Font) {
    win.Font = (props: any) => React.createElement('span', { className: props?.className || 'font-sans', ...props }, props?.children);
  }
}

const safeFont = {
  family: 'inter, sans-serif',
  className: 'font-sans',
  name: 'sans-serif',
  toString: () => 'font-sans'
};

const SafeFontComponent = (props: any) => {
  if (typeof props?.children === 'string' || typeof props?.children === 'number') {
    return React.createElement('span', { className: props?.className || 'font-sans' }, props.children);
  }
  return React.createElement('span', { className: props?.className || 'font-sans', ...props }, props?.children);
};

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class VFSAppErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const msg = (error?.message || '').toLowerCase();
    if (
      msg.includes('database is closing') ||
      msg.includes('closing/hidden')
    ) {
      console.warn('Ignoring transient error in VFSAppErrorBoundary:', error?.message);
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const msg = (error?.message || '').toLowerCase();
    if (
      msg.includes('database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('error 0') ||
      msg.includes('missing initializer in const declaration')
    ) {
      console.warn('Suppressed transient error:', error?.message);
      return;
    }
    console.error('[VFS Runtime Component Error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-8 bg-[#090308] text-red-100 font-sans">
          <div className="max-w-xl w-full p-6 bg-red-950/40 border border-red-500/30 rounded-3xl shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400 font-bold text-base border-b border-red-500/20 pb-3 font-mono">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <span>VFS Runtime Component Error</span>
            </div>

            <p className="text-xs text-red-300/90 leading-relaxed font-mono bg-black/50 p-4 rounded-xl border border-red-500/20 overflow-x-auto whitespace-pre-wrap">
              {this.state.error?.message || 'Component failed during render execution'}
            </p>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400 font-mono">
                Runtime Guard: <strong className="text-amber-400">Error Caught Gracefully</strong>
              </span>

              <button 
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Execution
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const MAX_PREVIEW_MESSAGE_BYTES = 16384;
export const MAX_VFS_SNAPSHOT_BYTES = 2 * 1024 * 1024;
export const MAX_VFS_SNAPSHOT_FILES = 200;
const MAX_VFS_FILE_PATH_LENGTH = 256;
const VALID_PROJECT_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const VALID_HANDSHAKE_ID_REGEX = /^[a-f0-9]{32,128}$/i;

const ALLOWED_PREVIEW_MESSAGE_TYPES = new Set([
  'PREVIEW_READY',
  'PREVIEW_WAITING',
  'PREVIEW_LOG',
  'PREVIEW_RUNTIME_ERROR',
  'PREVIEW_VFS_SYN'
]);

const ALLOWED_SNAPSHOT_KEYS = new Set([
  'type',
  'projectId',
  'handshakeId',
  'snapshotSeq',
  'files'
]);

export function generatePreviewHandshakeId(bytes = 24): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const arr = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(arr);
    let hex = '';
    for (let i = 0; i < arr.length; i++) {
      hex += arr[i].toString(16).padStart(2, '0');
    }
    return hex;
  }
  throw new Error('CSPRNG_UNAVAILABLE: Secure preview handshake generation requires Web Crypto getRandomValues.');
}

export function isValidVfsSnapshotFilePath(filePath: unknown): filePath is string {
  if (typeof filePath !== 'string') return false;
  const trimmed = filePath.trim();
  if (trimmed.length < 2 || trimmed.length > MAX_VFS_FILE_PATH_LENGTH) return false;
  if (!trimmed.startsWith('/')) return false;
  if (trimmed.includes('\0') || trimmed.includes('\\') || trimmed.includes('//')) return false;
  const segments = trimmed.split('/').filter(Boolean);
  if (segments.length === 0) return false;
  for (const seg of segments) {
    if (seg === '.' || seg === '..') return false;
    if (/^\.env(\.|$)/i.test(seg)) return false;
  }
  return true;
}

/**
 * Resolves the target origin for postMessage to the parent workspace frame.
 * Inside an opaque-origin sandboxed iframe (`sandbox` without `allow-same-origin`),
 * `window.location.origin` is `'null'` and same-origin parent discovery is intentionally blocked;
 * we derive the parent origin from `document.referrer` when valid http(s), falling back to `window.location.origin`
 * only when running in a standard origin context.
 */
export function resolveParentTargetOrigin(): string {
  if (typeof window === 'undefined') return 'http://localhost:3000';
  try {
    if (typeof document !== 'undefined' && document.referrer) {
      const refUrl = new URL(document.referrer);
      if (refUrl.protocol === 'http:' || refUrl.protocol === 'https:') {
        return refUrl.origin;
      }
    }
  } catch {
    // ignore invalid referrer
  }
  if (window.location.origin && window.location.origin !== 'null') {
    return window.location.origin;
  }
  return '*';
}

export function sanitizePreviewFrameMessage(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;
  const msgType = data.type;
  if (typeof msgType !== 'string' || !ALLOWED_PREVIEW_MESSAGE_TYPES.has(msgType)) {
    return null;
  }
  if (msgType === 'PREVIEW_READY' || msgType === 'PREVIEW_WAITING') {
    const clean: Record<string, unknown> = { type: msgType };
    if (data.projectId !== undefined) {
      if (typeof data.projectId !== 'string') return null;
      clean.projectId = data.projectId.slice(0, 128);
    }
    if (data.path !== undefined) {
      if (typeof data.path !== 'string') return null;
      clean.path = data.path.slice(0, 256);
    }
    return clean;
  }
  if (msgType === 'PREVIEW_LOG') {
    if (typeof data.level !== 'string' || typeof data.message !== 'string') return null;
    return {
      type: 'PREVIEW_LOG',
      level: data.level.slice(0, 32),
      message: data.message.slice(0, 4000)
    };
  }
  if (msgType === 'PREVIEW_RUNTIME_ERROR') {
    if (typeof data.message !== 'string') return null;
    return {
      type: 'PREVIEW_RUNTIME_ERROR',
      message: data.message.slice(0, 2000),
      filename: typeof data.filename === 'string' ? data.filename.slice(0, 300) : '',
      lineno: typeof data.lineno === 'number' && Number.isFinite(data.lineno) ? data.lineno : 0
    };
  }
  if (msgType === 'PREVIEW_VFS_SYN') {
    if (typeof data.projectId !== 'string' || !VALID_PROJECT_ID_REGEX.test(data.projectId)) return null;
    if (typeof data.handshakeId !== 'string' || !VALID_HANDSHAKE_ID_REGEX.test(data.handshakeId)) return null;
    return {
      type: 'PREVIEW_VFS_SYN',
      projectId: data.projectId,
      handshakeId: data.handshakeId
    };
  }
  return null;
}

export function postPreviewMessageToParent(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.parent || window.parent === window) return;
  try {
    const clean = sanitizePreviewFrameMessage(payload);
    if (!clean) return;
    const serialized = JSON.stringify(clean);
    if (serialized.length > MAX_PREVIEW_MESSAGE_BYTES) return;
    const targetOrigin = resolveParentTargetOrigin();
    window.parent.postMessage(clean, targetOrigin);
  } catch {
    // ignore serialization or cross-origin postMessage errors
  }
}

export function isValidPreviewFrameMessage(
  event: MessageEvent,
  expectedContentWindow: Window | null | undefined
): boolean {
  if (!expectedContentWindow || !event.source || event.source !== expectedContentWindow) {
    return false;
  }
  const data = event.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }
  try {
    const rawLen = JSON.stringify(data).length;
    if (rawLen > MAX_PREVIEW_MESSAGE_BYTES) return false;
  } catch {
    return false;
  }
  return sanitizePreviewFrameMessage(data) !== null;
}

export function validatePreviewVfsSynMessage(
  event: MessageEvent,
  expectedContentWindow: Window | null | undefined,
  authorizedProjectId: string,
  consumedHandshakeIds?: Set<string>
): { valid: boolean; reason?: string; projectId?: string; handshakeId?: string } {
  if (!expectedContentWindow || !event.source || event.source !== expectedContentWindow) {
    return { valid: false, reason: 'INVALID_SOURCE_WINDOW' };
  }
  if (
    typeof window !== 'undefined' &&
    window.location.origin !== 'null' &&
    event.origin !== window.location.origin &&
    event.origin !== 'null'
  ) {
    return { valid: false, reason: 'UNTRUSTED_ORIGIN' };
  }
  const data = event.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, reason: 'MALFORMED_PAYLOAD' };
  }
  try {
    if (JSON.stringify(data).length > MAX_PREVIEW_MESSAGE_BYTES) {
      return { valid: false, reason: 'OVERSIZED_MESSAGE' };
    }
  } catch {
    return { valid: false, reason: 'UNSERIALIZABLE_PAYLOAD' };
  }
  if ((data as any).type !== 'PREVIEW_VFS_SYN') {
    return { valid: false, reason: 'INVALID_MESSAGE_TYPE' };
  }
  const requestedProjectId = (data as any).projectId;
  if (typeof requestedProjectId !== 'string' || !VALID_PROJECT_ID_REGEX.test(requestedProjectId)) {
    return { valid: false, reason: 'INVALID_PROJECT_ID_FORMAT' };
  }
  if (!VALID_PROJECT_ID_REGEX.test(authorizedProjectId) || requestedProjectId !== authorizedProjectId) {
    return { valid: false, reason: 'UNAUTHORIZED_PROJECT_ID' };
  }
  const handshakeId = (data as any).handshakeId;
  if (typeof handshakeId !== 'string' || !VALID_HANDSHAKE_ID_REGEX.test(handshakeId)) {
    return { valid: false, reason: 'INVALID_HANDSHAKE_ID' };
  }
  if (consumedHandshakeIds) {
    if (consumedHandshakeIds.has(handshakeId)) {
      return { valid: false, reason: 'DUPLICATE_HANDSHAKE_ID' };
    }
    consumedHandshakeIds.add(handshakeId);
  }
  return { valid: true, projectId: requestedProjectId, handshakeId };
}

export function readAuthorizedProjectVfsSnapshot(
  authContext: VerifiedPreviewAuthorizationContext
): Record<string, string> {
  if (!isVerifiedAuthorizationContextValidForRead(authContext)) {
    return {};
  }
  const authorizedProjectId = authContext.projectId;
  const wsManager = WorkspaceManager.getInstance();
  const projectVfs = wsManager.getWorkspaceVFS(authorizedProjectId);
  projectVfs.reloadFromStorage();
  let nodes = projectVfs.getAllFiles();

  if (nodes.length === 0 && wsManager.getActiveProjectId() === authorizedProjectId) {
    const activeVfs = wsManager.getVFS();
    activeVfs.reloadFromStorage();
    nodes = activeVfs.getAllFiles();
  }

  const snapshot: Record<string, string> = {};
  for (const node of nodes) {
    if (!node || typeof node.path !== 'string' || typeof node.content !== 'string') continue;
    const normalizedPath = node.path.startsWith('/') ? node.path : `/${node.path}`;
    if (!isValidVfsSnapshotFilePath(normalizedPath)) continue;
    const redacted = detectAndRedactInlineSecrets(normalizedPath, node.content);
    if (redacted.failClosed) {
      continue;
    }
    snapshot[normalizedPath] = redacted.content;
  }
  return snapshot;
}

export function buildValidatedVfsSnapshotPayload(params: {
  projectId: string;
  handshakeId: string;
  files: Record<string, string>;
  snapshotSeq?: number;
}): { valid: boolean; reason?: string; payload?: Record<string, unknown> } {
  if (typeof params.projectId !== 'string' || !VALID_PROJECT_ID_REGEX.test(params.projectId)) {
    return { valid: false, reason: 'INVALID_PROJECT_ID' };
  }
  if (typeof params.handshakeId !== 'string' || !VALID_HANDSHAKE_ID_REGEX.test(params.handshakeId)) {
    return { valid: false, reason: 'INVALID_HANDSHAKE_ID' };
  }
  if (!params.files || typeof params.files !== 'object' || Array.isArray(params.files)) {
    return { valid: false, reason: 'INVALID_FILES_MAP' };
  }
  const entries = Object.entries(params.files);
  if (entries.length > MAX_VFS_SNAPSHOT_FILES) {
    return { valid: false, reason: 'TOO_MANY_FILES' };
  }
  const cleanFiles: Record<string, string> = {};
  for (const [rawPath, rawContent] of entries) {
    if (!isValidVfsSnapshotFilePath(rawPath)) {
      return { valid: false, reason: `INVALID_FILE_PATH:${rawPath}` };
    }
    if (typeof rawContent !== 'string') {
      return { valid: false, reason: `INVALID_FILE_CONTENT_TYPE:${rawPath}` };
    }
    cleanFiles[rawPath] = rawContent;
  }
  const snapshotSeq =
    typeof params.snapshotSeq === 'number' && Number.isInteger(params.snapshotSeq) && params.snapshotSeq > 0
      ? params.snapshotSeq
      : 1;

  const payload: Record<string, unknown> = {
    type: 'PREVIEW_VFS_SNAPSHOT',
    projectId: params.projectId,
    handshakeId: params.handshakeId,
    snapshotSeq,
    files: cleanFiles
  };

  try {
    const serialized = JSON.stringify(payload);
    if (serialized.length > MAX_VFS_SNAPSHOT_BYTES) {
      return { valid: false, reason: 'OVERSIZED_SNAPSHOT' };
    }
  } catch {
    return { valid: false, reason: 'UNSERIALIZABLE_SNAPSHOT' };
  }

  return { valid: true, payload };
}

export function validateIncomingVfsSnapshotMessage(
  event: MessageEvent,
  expectedState: {
    expectedSource: Window | null | undefined;
    expectedProjectId: string;
    expectedHandshakeId: string;
    lastAcceptedSeq: number;
  }
): { valid: boolean; reason?: string; files?: Record<string, string>; snapshotSeq?: number } {
  if (!expectedState.expectedSource || !event.source || event.source !== expectedState.expectedSource) {
    return { valid: false, reason: 'INVALID_SOURCE_WINDOW' };
  }
  const data = event.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, reason: 'MALFORMED_PAYLOAD' };
  }
  for (const key of Object.keys(data)) {
    if (!ALLOWED_SNAPSHOT_KEYS.has(key)) {
      return { valid: false, reason: `UNEXPECTED_FIELD:${key}` };
    }
  }
  if ((data as any).type !== 'PREVIEW_VFS_SNAPSHOT') {
    return { valid: false, reason: 'INVALID_MESSAGE_TYPE' };
  }
  let serializedLen = 0;
  try {
    serializedLen = JSON.stringify(data).length;
  } catch {
    return { valid: false, reason: 'UNSERIALIZABLE_PAYLOAD' };
  }
  if (serializedLen > MAX_VFS_SNAPSHOT_BYTES) {
    return { valid: false, reason: 'OVERSIZED_MESSAGE' };
  }
  const projectId = (data as any).projectId;
  if (
    typeof projectId !== 'string' ||
    !VALID_PROJECT_ID_REGEX.test(projectId) ||
    projectId !== expectedState.expectedProjectId
  ) {
    return { valid: false, reason: 'UNAUTHORIZED_PROJECT_ID' };
  }
  const handshakeId = (data as any).handshakeId;
  if (
    typeof handshakeId !== 'string' ||
    !VALID_HANDSHAKE_ID_REGEX.test(handshakeId) ||
    handshakeId !== expectedState.expectedHandshakeId
  ) {
    return { valid: false, reason: 'STALE_OR_INVALID_HANDSHAKE' };
  }
  const snapshotSeq = (data as any).snapshotSeq;
  if (
    typeof snapshotSeq !== 'number' ||
    !Number.isInteger(snapshotSeq) ||
    snapshotSeq <= expectedState.lastAcceptedSeq
  ) {
    return { valid: false, reason: 'DUPLICATE_OR_STALE_SEQUENCE' };
  }
  const rawFiles = (data as any).files;
  if (!rawFiles || typeof rawFiles !== 'object' || Array.isArray(rawFiles)) {
    return { valid: false, reason: 'INVALID_FILES_CONTAINER' };
  }
  const entries = Object.entries(rawFiles);
  if (entries.length > MAX_VFS_SNAPSHOT_FILES) {
    return { valid: false, reason: 'TOO_MANY_FILES' };
  }
  const validatedFiles: Record<string, string> = {};
  for (const [filePath, fileContent] of entries) {
    if (!isValidVfsSnapshotFilePath(filePath)) {
      return { valid: false, reason: `INVALID_FILE_PATH:${filePath}` };
    }
    if (typeof fileContent !== 'string') {
      return { valid: false, reason: `INVALID_FILE_CONTENT_TYPE:${filePath}` };
    }
    validatedFiles[filePath] = fileContent;
  }
  return { valid: true, files: validatedFiles, snapshotSeq };
}

export function createIsolatedPreviewVFS(projectId: string, filesMap: Record<string, string>) {
  const safeId = String(projectId || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
  const wsManager = WorkspaceManager.getInstance();
  const baseCtor = (wsManager.getVFS() as any).constructor;
  const isolatedVfs = new baseCtor(`__anny_ephemeral_preview_${safeId}`);
  // Disable persistence so transferred preview snapshots are never written to localStorage
  isolatedVfs.saveToStorage = () => {};
  isolatedVfs.reloadFromStorage = () => {};
  isolatedVfs.clearAll();
  for (const [filePath, content] of Object.entries(filesMap)) {
    if (isValidVfsSnapshotFilePath(filePath) && typeof content === 'string') {
      isolatedVfs._unsafe_writeFile(filePath, content);
    }
  }
  return isolatedVfs;
}

export function resolveSafeVfsImportPath(
  currentFile: string,
  importPath: string,
  availableModules: Record<string, string>,
  availableCss: Record<string, string>
): { resolved: string | null; traversalBlocked: boolean } {
  if (typeof importPath !== 'string' || !importPath.trim()) {
    return { resolved: null, traversalBlocked: false };
  }
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
        if (stack.length === 0) {
          return { resolved: null, traversalBlocked: true };
        }
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    targetPath = '/' + stack.join('/');
  } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const normalizedCurrent = currentFile.startsWith('/') ? currentFile : `/${currentFile}`;
    const lastSlash = normalizedCurrent.lastIndexOf('/');
    const currentDir = lastSlash > 0 ? normalizedCurrent.substring(0, lastSlash) : '';
    const stack: string[] = currentDir.split('/').filter(Boolean);
    const relParts = importPath.split('/');
    for (const part of relParts) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (stack.length === 0) {
          return { resolved: null, traversalBlocked: true };
        }
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    targetPath = '/' + stack.join('/');
  } else if (importPath.startsWith('/')) {
    const parts = importPath.split('/');
    const stack: string[] = [];
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (stack.length === 0) {
          return { resolved: null, traversalBlocked: true };
        }
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    targetPath = '/' + stack.join('/');
  } else {
    return { resolved: null, traversalBlocked: false };
  }

  const exts = ['', '.tsx', '.jsx', '.ts', '.js', '.css', '.scss', '/index.tsx', '/index.jsx', '/index.ts', '/index.js'];
  for (const ext of exts) {
    const cand = targetPath + ext;
    if (
      Object.prototype.hasOwnProperty.call(availableModules, cand) ||
      Object.prototype.hasOwnProperty.call(availableCss, cand)
    ) {
      return { resolved: cand, traversalBlocked: false };
    }
  }
  return { resolved: null, traversalBlocked: false };
}

export const STRICT_DEFAULT_DENY_CSP =
  "default-src 'none'; connect-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; media-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none';";

const PEM_PRIVATE_KEY_BLOCK_REGEX =
  /-----\s*BEGIN\s+(?:[A-Z0-9]+\s+)*PRIVATE\s+KEY(?:\s+BLOCK)?\s*-----[\s\S]*?-----\s*END\s+(?:[A-Z0-9]+\s+)*PRIVATE\s+KEY(?:\s+BLOCK)?\s*-----/g;

const RESIDUAL_PEM_PRIVATE_KEY_REGEX =
  /-----\s*(?:BEGIN|END)\s+(?:[A-Z0-9]+\s+)*PRIVATE\s+KEY(?:\s+BLOCK)?\s*-----/i;

const INLINE_SECRET_PATTERNS: RegExp[] = [
  /AIzaSy[0-9A-Za-z\-_]{30,}/g,
  /sk-(?:ant-|proj-)?[0-9A-Za-z\-_]{20,}/g,
  /ghp_[0-9A-Za-z\-_]{30,}/g,
  /bearer\s+[0-9A-Za-z_\-\.]{20,}/gi,
  PEM_PRIVATE_KEY_BLOCK_REGEX,
  /(?:postgres|mongodb|mysql|redis):\/\/[^\s:@]+:[^\s@]+@[^\s:]+/g,
  /(?:api[_-]?key|api[_-]?secret|auth[_-]?token)\s*[:=]\s*['"][0-9A-Za-z_\-\.]{16,}['"]/gi
];

export function detectAndRedactInlineSecrets(
  filePath: string,
  content: string
): { content: string; hasSecret: boolean; failClosed?: boolean } {
  if (typeof content !== 'string' || !content) return { content, hasSecret: false, failClosed: false };
  let modified = content;
  let detected = false;
  for (const pattern of INLINE_SECRET_PATTERNS) {
    const replaced = modified.replace(pattern, (match) => {
      if (/PRIVATE\s+KEY/i.test(match)) {
        return '/*REDACTED_PEM_PRIVATE_KEY*/';
      }
      const prefix = match.slice(0, Math.min(4, match.length));
      return `${prefix}/*REDACTED_INLINE_SECRET*/`;
    });
    if (replaced !== modified) {
      detected = true;
      modified = replaced;
    }
  }
  if (RESIDUAL_PEM_PRIVATE_KEY_REGEX.test(modified)) {
    console.warn(`[Security Warning] Incomplete or unredacted PEM private key detected; failing closed for VFS file: ${filePath}`);
    return {
      content: '',
      hasSecret: true,
      failClosed: true
    };
  }
  if (detected) {
    console.warn(`[Security Warning] Inline secret pattern detected and redacted in VFS file: ${filePath}`);
  }
  return { content: modified, hasSecret: detected, failClosed: false };
}

/**
 * Builds an isolated, self-contained HTML document for executing transpiled VFS React modules
 * inside a dedicated `<iframe sandbox="allow-scripts allow-forms allow-modals">` (NO `allow-same-origin`).
 * Because the iframe runs in an opaque origin (`null`), generated code cannot read `parent.document`,
 * `parent.localStorage`, `IndexedDB`, Firebase Auth tokens, or parent cookies.
 */
export function buildIsolatedPreviewSrcDoc(params: {
  projectId: string;
  entryFile: string;
  transpiledModules: Record<string, string>;
  cssMap: Record<string, string>;
  parentOrigin: string;
  allowExternalCdn?: boolean;
}): string {
  const safePayloadJson = JSON.stringify({
    projectId: params.projectId,
    entryFile: params.entryFile,
    modules: params.transpiledModules,
    css: params.cssMap,
    parentOrigin: params.parentOrigin
  }).replace(/<\//g, '<\\/');

  const allowExternalCdn = params.allowExternalCdn === true;
  const cspPolicy = allowExternalCdn
    ? "default-src 'none'; connect-src 'self' data: blob:; script-src 'self' https://cdn.jsdelivr.net https://cdn.tailwindcss.com 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; media-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none';"
    : STRICT_DEFAULT_DENY_CSP;

  const cdnScripts = allowExternalCdn
    ? `  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>
  <script crossorigin src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="${cspPolicy}" />
  <title>ANNY Isolated Sandbox Runtime</title>
${cdnScripts}
  <style>
    html, body, #root { margin: 0; padding: 0; min-height: 100vh; width: 100%; background: #020617; color: #f8fafc; font-family: Inter, system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script id="anny-vfs-bundle" type="application/json">${safePayloadJson}</script>
  <script>
    (function() {
      var bundleEl = document.getElementById('anny-vfs-bundle');
      var payload = JSON.parse(bundleEl ? bundleEl.textContent : '{}');
      var targetOrigin = (payload.parentOrigin && payload.parentOrigin !== 'null') ? payload.parentOrigin : '*';

      function notifyParent(msg) {
        try {
          if (window.parent && window.parent !== window) {
            var str = JSON.stringify(msg);
            if (str.length <= 16384) {
              window.parent.postMessage(msg, targetOrigin);
            }
          }
        } catch (_e) {}
      }

      ['log', 'warn', 'error'].forEach(function(level) {
        var orig = console[level];
        console[level] = function() {
          orig.apply(console, arguments);
          try {
            var text = Array.prototype.slice.call(arguments).map(function(a) {
              return typeof a === 'object' ? JSON.stringify(a) : String(a);
            }).join(' ').slice(0, 4000);
            notifyParent({ type: 'PREVIEW_LOG', level: level === 'log' ? 'info' : level, message: text });
          } catch (_e) {}
        };
      });

      window.addEventListener('error', function(ev) {
        notifyParent({
          type: 'PREVIEW_RUNTIME_ERROR',
          message: String(ev.message || 'Runtime execution error').slice(0, 2000),
          filename: String(ev.filename || payload.entryFile || '').slice(0, 300),
          lineno: Number(ev.lineno || 0)
        });
      });

      // Inject VFS CSS files
      var cssMap = payload.css || {};
      Object.keys(cssMap).forEach(function(cssPath) {
        var st = document.createElement('style');
        st.id = 'vfs-style-' + cssPath;
        st.textContent = cssMap[cssPath];
        document.head.appendChild(st);
      });

      var React = window.React;
      var ReactDOM = window.ReactDOM;
      if (!React || !ReactDOM) {
        document.getElementById('root').innerHTML = '<div style="padding:24px;color:#fda4af;font-family:monospace;">Isolated preview runtime awaiting React UMD scripts.</div>';
        return;
      }

      var safeFont = { family: 'inter, sans-serif', className: 'font-sans', name: 'sans-serif', toString: function() { return 'font-sans'; } };
      var SafeFontComponent = function(props) {
        return React.createElement('span', Object.assign({ className: (props && props.className) || 'font-sans' }, props), props && props.children);
      };

      var LucideProxy = new Proxy({}, {
        get: function(_t, prop) {
          if (prop === '__esModule') return true;
          if (prop === 'default') return LucideProxy;
          return function(props) {
            var size = (props && props.size) || 18;
            var cls = (props && props.className) || '';
            return React.createElement('svg', {
              width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
              stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
              className: cls, 'data-lucide-icon': String(prop)
            }, React.createElement('circle', { cx: 12, cy: 12, r: 9 }));
          };
        }
      });

      var RechartsProxy = new Proxy({}, {
        get: function(_t, prop) {
          if (prop === '__esModule') return true;
          if (prop === 'default') return RechartsProxy;
          return function(props) {
            return React.createElement('div', { className: (props && props.className) || 'w-full h-full' }, props && props.children);
          };
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
      var clsxShim = function() {
        return Array.prototype.slice.call(arguments).flat(Infinity).filter(Boolean).join(' ');
      };

      var modules = payload.modules || {};
      var moduleCache = {};
      var __annyMountedByMain = false;

      function resolveVfsPath(currentFile, importPath) {
        if (typeof importPath !== 'string' || importPath.indexOf('\\0') !== -1 || importPath.indexOf('\\\\') !== -1) {
          throw new Error("VFS path traversal blocked: '" + importPath + "' from '" + currentFile + "'");
        }
        var targetPath = '';
        if (importPath.indexOf('@/') === 0) {
          var aliasParts = importPath.slice(2).split('/');
          var aliasStack = ['src'];
          for (var a = 0; a < aliasParts.length; a++) {
            if (!aliasParts[a] || aliasParts[a] === '.') continue;
            if (aliasParts[a] === '..') {
              if (aliasStack.length === 0) {
                throw new Error("VFS path traversal blocked: '" + importPath + "' from '" + currentFile + "' escapes project root");
              }
              aliasStack.pop();
            } else {
              aliasStack.push(aliasParts[a]);
            }
          }
          targetPath = '/' + aliasStack.join('/');
        } else if (importPath.indexOf('./') === 0 || importPath.indexOf('../') === 0) {
          var normCurrent = currentFile.indexOf('/') === 0 ? currentFile : '/' + currentFile;
          var lastSlash = normCurrent.lastIndexOf('/');
          var currentDir = lastSlash > 0 ? normCurrent.substring(0, lastSlash) : '';
          var stack = currentDir.split('/').filter(Boolean);
          var parts = importPath.split('/');
          for (var i = 0; i < parts.length; i++) {
            if (!parts[i] || parts[i] === '.') continue;
            if (parts[i] === '..') {
              if (stack.length === 0) {
                throw new Error("VFS path traversal blocked: '" + importPath + "' from '" + currentFile + "' escapes project root");
              }
              stack.pop();
            } else {
              stack.push(parts[i]);
            }
          }
          targetPath = '/' + stack.join('/');
        } else {
          targetPath = importPath.indexOf('/') === 0 ? importPath : '/' + importPath;
        }
        var exts = ['', '.tsx', '.jsx', '.ts', '.js', '.css', '.scss', '/index.tsx', '/index.jsx', '/index.ts', '/index.js'];
        for (var j = 0; j < exts.length; j++) {
          var cand = targetPath + exts[j];
          if (Object.prototype.hasOwnProperty.call(modules, cand) || Object.prototype.hasOwnProperty.call(cssMap, cand)) return cand;
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
            render: function(el, container) {
              __annyMountedByMain = true;
              if (ReactDOM.render) ReactDOM.render(el, container || document.getElementById('root'));
            },
            createRoot: function(container) {
              return {
                render: function(el) {
                  __annyMountedByMain = true;
                  var target = container || document.getElementById('root');
                  if (ReactDOM.createRoot) {
                    ReactDOM.createRoot(target).render(el);
                  } else if (ReactDOM.render) {
                    ReactDOM.render(el, target);
                  }
                },
                unmount: function() {}
              };
            },
            default: ReactDOM,
            __esModule: true
          };
        }
        if (modName === 'lucide-react') return LucideProxy;
        if (modName === 'recharts') return RechartsProxy;
        if (modName === 'framer-motion' || modName === 'motion/react' || modName === 'motion') {
          return { motion: MotionProxy, AnimatePresence: AnimatePresence, default: { motion: MotionProxy, AnimatePresence: AnimatePresence }, __esModule: true };
        }
        if (modName === 'clsx' || modName === 'tailwind-merge' || modName === 'classnames') {
          return { clsx: clsxShim, twMerge: clsxShim, default: clsxShim, __esModule: true };
        }
        if (modName.indexOf('./') === 0 || modName.indexOf('../') === 0 || modName.indexOf('@/') === 0 || modName.indexOf('/') === 0) {
          var resolved = resolveVfsPath(currentFile, modName);
          if (!resolved) {
            throw new Error("Unresolved local VFS import '" + modName + "' from '" + currentFile + "'");
          }
          if (resolved.slice(-4) === '.css' || resolved.slice(-5) === '.scss') {
            return { __esModule: true, default: {} };
          }
          if (Object.prototype.hasOwnProperty.call(modules, resolved)) {
            if (moduleCache[resolved]) return moduleCache[resolved].exports;
            var subMod = { exports: {} };
            moduleCache[resolved] = subMod;
            var fn = new Function('React', 'require', 'exports', 'module', 'LucideIcons', 'Recharts', 'motion', 'AnimatePresence', 'font', 'Font', modules[resolved]);
            fn(React, function(m) { return scopeRequire(m, resolved); }, subMod.exports, subMod, LucideProxy, RechartsProxy, MotionProxy, AnimatePresence, safeFont, SafeFontComponent);
            if (subMod.exports && typeof subMod.exports === 'object' && !subMod.exports.default) {
              subMod.exports.default = subMod.exports.App || subMod.exports;
            }
            return subMod.exports;
          }
          throw new Error("Unresolved local VFS import '" + modName + "' from '" + currentFile + "'");
        }
        if (modName.slice(-4) === '.css' || modName.slice(-5) === '.scss') {
          return { __esModule: true, default: {} };
        }
        throw new Error("Preview dependency unavailable: '" + modName + "'");
      }

      try {
        var entry = payload.entryFile || '/src/App.tsx';
        var entryMod = { exports: {} };
        moduleCache[entry] = entryMod;
        var entryFn = new Function('React', 'require', 'exports', 'module', 'LucideIcons', 'Recharts', 'motion', 'AnimatePresence', 'font', 'Font', modules[entry] || '');
        entryFn(React, function(m) { return scopeRequire(m, entry); }, entryMod.exports, entryMod, LucideProxy, RechartsProxy, MotionProxy, AnimatePresence, safeFont, SafeFontComponent);
        if (!__annyMountedByMain) {
          var ExportedApp = entryMod.exports.default || entryMod.exports.App || Object.values(entryMod.exports)[0];
          if (!ExportedApp) throw new Error('No default exported React component found in ' + entry);
          var root = ReactDOM.createRoot ? ReactDOM.createRoot(document.getElementById('root')) : null;
          if (root) {
            root.render(React.createElement(ExportedApp));
          } else {
            ReactDOM.render(React.createElement(ExportedApp), document.getElementById('root'));
          }
        }
        notifyParent({ type: 'PREVIEW_READY', projectId: payload.projectId, path: entry });
      } catch (err) {
        var errMsg = (err && err.message) ? err.message : String(err);
        document.getElementById('root').innerHTML = '<div style="padding:24px;background:#1a0612;color:#fecdd3;font-family:monospace;border:1px solid #f43f5e44;margin:16px;border-radius:16px;"><strong>VFS Sandbox Runtime Error</strong><pre style="white-space:pre-wrap;font-size:12px;margin-top:12px;">' + errMsg.replace(/[<>&]/g, '') + '</pre></div>';
        notifyParent({ type: 'PREVIEW_RUNTIME_ERROR', message: errMsg, filename: payload.entryFile || '/src/App.tsx', lineno: 0 });
      }
    })();
  </script>
</body>
</html>`;
}

export function sanitizeHtmlPreviewSrcDoc(
  rawHtml: string,
  projectId: string = 'default',
  parentOrigin: string = ''
): string {
  const cleanedHtml = (rawHtml || '')
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?\s*content-security-policy\s*["']?[^>]*>/gi, '');
  const targetOrigin = parentOrigin && parentOrigin !== 'null' ? parentOrigin : '*';
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${STRICT_DEFAULT_DENY_CSP}" />`;
  const bridgeScript = `${cspMeta}<script>
(function() {
  var targetOrigin = ${JSON.stringify(targetOrigin)};
  function notify(msg) {
    try {
      if (window.parent && window.parent !== window) {
        var s = JSON.stringify(msg);
        if (s.length <= 16384) window.parent.postMessage(msg, targetOrigin);
      }
    } catch (_e) {}
  }
  window.addEventListener('error', function(ev) {
    notify({ type: 'PREVIEW_RUNTIME_ERROR', message: String(ev.message || 'HTML preview error').slice(0, 2000), filename: '/index.html', lineno: Number(ev.lineno || 0) });
  });
  window.addEventListener('DOMContentLoaded', function() {
    notify({ type: 'PREVIEW_READY', projectId: ${JSON.stringify(projectId)}, path: '/index.html' });
  });
})();
</script>`;
  if (/<head\b[^>]*>/i.test(cleanedHtml)) {
    return cleanedHtml.replace(/<head\b[^>]*>/i, (match) => `${match}${bridgeScript}`);
  }
  if (/<html\b[^>]*>/i.test(cleanedHtml)) {
    return cleanedHtml.replace(/<html\b[^>]*>/i, (match) => `${match}<head>${bridgeScript}</head>`);
  }
  return `${cspMeta}${bridgeScript.slice(cspMeta.length)}\n${cleanedHtml}`;
}

export interface VfsPreviewBundleResult {
  entryFile: string;
  transpiledModules: Record<string, string>;
  cssMap: Record<string, string>;
  srcDoc: string;
}

/**
 * Canonical VFS-to-Isolated-Preview Bundler.
 * Iterates over `vfs.getAllFiles()` (`VFSFileNode[]`), reads `.path` and `.content`,
 * transpiles `.tsx/.jsx/.ts/.js` modules via Babel, collects `.css/.scss` stylesheets,
 * blocks VFS path traversal, and validates all reachable local imports.
 */
export function bundleVFSForIsolatedPreview(
  vfs: {
    exists: (path: string) => boolean;
    readFile: (path: string) => string;
    getAllFiles: () => Array<{ path: string; content: string }>;
  },
  options?: {
    projectId?: string;
    parentOrigin?: string;
  }
): VfsPreviewBundleResult {
  const activeProjId = options?.projectId || 'ws_default_1';
  const parentOrigin = options?.parentOrigin || resolveParentTargetOrigin();

  const possiblePaths = [
    '/src/App.tsx',
    '/src/App.jsx',
    '/App.tsx',
    '/App.jsx',
    '/src/App.js',
    '/App.js',
    '/src/main.tsx'
  ];

  let appCode = '';
  let foundPath = '';

  for (const candidatePath of possiblePaths) {
    if (vfs.exists(candidatePath)) {
      const content = vfs.readFile(candidatePath);
      if (content && content.trim().length > 0) {
        appCode = content;
        foundPath = candidatePath;
        break;
      }
    }
  }

  if (!foundPath || !appCode) {
    throw new Error('No valid React entry file found in Virtual FileSystem');
  }

  const vfsSourceLocationPlugin = ({ types: t }: any) => ({
    visitor: {
      JSXOpeningElement(path: any, state: any) {
        const filename = state.filename || foundPath || '/src/App.tsx';
        const hasFileAttr = path.node.attributes.some((attr: any) =>
          attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'data-vfs-file'
        );
        if (!hasFileAttr) {
          path.node.attributes.push(
            t.jsxAttribute(t.jsxIdentifier('data-vfs-file'), t.stringLiteral(filename))
          );
        }
        if (path.node.loc && path.node.loc.start) {
          const hasLineAttr = path.node.attributes.some((attr: any) =>
            attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'data-vfs-line'
          );
          if (!hasLineAttr) {
            path.node.attributes.push(
              t.jsxAttribute(t.jsxIdentifier('data-vfs-line'), t.stringLiteral(String(path.node.loc.start.line)))
            );
          }
        }
      }
    }
  });

  const allFiles = vfs.getAllFiles();
  const transpiledModules: Record<string, string> = {};
  const cssMap: Record<string, string> = {};
  const transpileErrors: Record<string, Error> = {};

  for (const rawNode of allFiles) {
    if (!rawNode || typeof rawNode.path !== 'string') continue;
    const rawPath = rawNode.path.trim();
    if (!rawPath) continue;
    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    if (!isValidVfsSnapshotFilePath(normalizedPath)) {
      throw new Error(`Invalid or unsafe VFS file path rejected: "${rawPath}"`);
    }
    const rawContent = typeof rawNode.content === 'string' ? rawNode.content : '';

    if (/\.(css|scss)$/i.test(normalizedPath)) {
      cssMap[normalizedPath] = rawContent;
      continue;
    }
    if (!/\.(tsx|jsx|ts|js)$/i.test(normalizedPath)) {
      continue;
    }
    if (
      normalizedPath.endsWith('.d.ts') ||
      normalizedPath.includes('vite.config') ||
      normalizedPath.includes('server.')
    ) {
      continue;
    }

    try {
      const cleanCode = sanitizeConstDeclarations(rawContent);
      const transformed = Babel.transform(cleanCode, {
        presets: [
          ['env', { modules: 'commonjs' }],
          ['react', { runtime: 'classic' }],
          'typescript'
        ],
        plugins: [vfsSourceLocationPlugin],
        filename: normalizedPath
      }).code;
      if (transformed) {
        transpiledModules[normalizedPath] = transformed;
      }
    } catch (fileErr: any) {
      if (normalizedPath === foundPath) {
        throw fileErr;
      }
      transpileErrors[normalizedPath] =
        fileErr instanceof Error ? fileErr : new Error(String(fileErr));
    }
  }

  if (!transpiledModules[foundPath]) {
    const cleanEntry = sanitizeConstDeclarations(appCode);
    const entryTransformed = Babel.transform(cleanEntry, {
      presets: [
        ['env', { modules: 'commonjs' }],
        ['react', { runtime: 'classic' }],
        'typescript'
      ],
      plugins: [vfsSourceLocationPlugin],
      filename: foundPath
    }).code;
    if (!entryTransformed) {
      throw new Error('Empty transpilation result');
    }
    transpiledModules[foundPath] = entryTransformed;
  }

  // Validate reachable local imports from the entry file (and /src/main.tsx if present)
  const visitedModules = new Set<string>();
  const validateModuleImports = (modulePath: string) => {
    if (visitedModules.has(modulePath)) return;
    visitedModules.add(modulePath);

    const code = transpiledModules[modulePath];
    if (!code) return;

    const requireRegex = /require\(["']([^"']+)["']\)/g;
    let match: RegExpExecArray | null;
    while ((match = requireRegex.exec(code)) !== null) {
      const specifier = match[1];
      const isLocalImport =
        specifier.startsWith('./') ||
        specifier.startsWith('../') ||
        specifier.startsWith('@/') ||
        specifier.startsWith('/');
      if (!isLocalImport) continue;

      const resolution = resolveSafeVfsImportPath(
        modulePath,
        specifier,
        transpiledModules,
        cssMap
      );
      if (resolution.traversalBlocked) {
        throw new Error(
          `VFS path traversal blocked: local import "${specifier}" in ${modulePath} escapes VFS project boundary`
        );
      }
      if (!resolution.resolved) {
        // Check if the target file failed Babel transpilation
        for (const errPath of Object.keys(transpileErrors)) {
          if (errPath.includes(specifier.replace(/^(\.\/|\.\.\/|@\/)/, ''))) {
            throw transpileErrors[errPath];
          }
        }
        throw new Error(
          `Unresolved local VFS import "${specifier}" referenced in ${modulePath}`
        );
      }
      if (Object.prototype.hasOwnProperty.call(transpiledModules, resolution.resolved)) {
        validateModuleImports(resolution.resolved);
      }
    }
  };

  validateModuleImports(foundPath);
  if (transpiledModules['/src/main.tsx'] && foundPath !== '/src/main.tsx') {
    validateModuleImports('/src/main.tsx');
  }

  const srcDoc = buildIsolatedPreviewSrcDoc({
    projectId: activeProjId,
    entryFile: foundPath,
    transpiledModules,
    cssMap,
    parentOrigin
  });

  return {
    entryFile: foundPath,
    transpiledModules,
    cssMap,
    srcDoc
  };
}

/* =========================================================================
   DYNAMIC VFS APPLICATION RUNNER (ISOLATED SANDBOXED RUNTIME ENGINE)
   Compiles Virtual File System code and executes it strictly inside an
   opaque-origin sandboxed iframe (`sandbox="allow-scripts allow-forms allow-modals"`
   WITHOUT `allow-same-origin`). Never executes generated JS/HTML on the
   authenticated ANNY origin.
   ========================================================================= */
export const DynamicVFSAppRunner: React.FC<{ projectId?: string | null }> = ({ projectId }) => {
  const [isolatedSrcDoc, setIsolatedSrcDoc] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [vfsVersion, setVfsVersion] = useState<number>(0);
  const [activePath, setActivePath] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('Preparing build...');
  const [isolatedPreviewVfs, setIsolatedPreviewVfs] = useState<any | null>(null);
  const sandboxIframeRef = React.useRef<HTMLIFrameElement>(null);
  const handshakeStateRef = React.useRef<{
    projectId: string;
    handshakeId: string;
    lastAcceptedSeq: number;
  } | null>(null);

  useEffect(() => {
    const unsub = executionStreamManager.subscribe((state) => {
      setIsExecuting(state.isRunning);
      if (state.currentMessage) {
        setCurrentMessage(state.currentMessage);
      }
    });
    return () => unsub();
  }, []);

  // Forward validated messages from the inner opaque-origin sandbox iframe to the outer container
  useEffect(() => {
    const handleInnerMessage = (event: MessageEvent) => {
      if (!isValidPreviewFrameMessage(event, sandboxIframeRef.current?.contentWindow)) {
        return;
      }
      const clean = sanitizePreviewFrameMessage(event.data);
      if (clean) {
        postPreviewMessageToParent(clean);
      }
    };
    window.addEventListener('message', handleInnerMessage);
    return () => window.removeEventListener('message', handleInnerMessage);
  }, []);

  // Parent-to-Preview VFS Snapshot Handshake Protocol (for opaque-origin outer iframes)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.parent || window.parent === window) {
      return;
    }
    const rawTargetId = projectId || 'ws_default_1';
    const targetProjId = String(rawTargetId).replace(/[^a-zA-Z0-9_-]/g, '') || 'ws_default_1';

    // Clear any stale preview VFS immediately on project switch or reload
    setIsolatedPreviewVfs(null);
    setIsolatedSrcDoc(null);
    setHtmlContent(null);
    setCompileError(null);

    let handshakeId = '';
    try {
      handshakeId = generatePreviewHandshakeId();
    } catch {
      return;
    }

    handshakeStateRef.current = {
      projectId: targetProjId,
      handshakeId,
      lastAcceptedSeq: 0
    };

    const handleParentSnapshot = (event: MessageEvent) => {
      const currentHandshake = handshakeStateRef.current;
      if (!currentHandshake) return;

      const validation = validateIncomingVfsSnapshotMessage(event, {
        expectedSource: window.parent,
        expectedProjectId: currentHandshake.projectId,
        expectedHandshakeId: currentHandshake.handshakeId,
        lastAcceptedSeq: currentHandshake.lastAcceptedSeq
      });
      if (!validation.valid || !validation.files || validation.snapshotSeq === undefined) {
        return;
      }

      currentHandshake.lastAcceptedSeq = validation.snapshotSeq;
      const previewVfs = createIsolatedPreviewVFS(currentHandshake.projectId, validation.files);
      setIsolatedPreviewVfs(previewVfs);
      setVfsVersion((prev) => prev + 1);
    };

    window.addEventListener('message', handleParentSnapshot);

    const sendSyn = () => {
      const currentHandshake = handshakeStateRef.current;
      if (!currentHandshake || currentHandshake.lastAcceptedSeq > 0) return;
      postPreviewMessageToParent({
        type: 'PREVIEW_VFS_SYN',
        projectId: currentHandshake.projectId,
        handshakeId: currentHandshake.handshakeId
      });
    };

    sendSyn();
    const retryTimer1 = setTimeout(sendSyn, 150);
    const retryTimer2 = setTimeout(sendSyn, 450);

    return () => {
      clearTimeout(retryTimer1);
      clearTimeout(retryTimer2);
      window.removeEventListener('message', handleParentSnapshot);
    };
  }, [projectId]);

  const isBuilding = isExecuting || universalExecutionController.getIsExecuting(projectId || undefined);

  // 1. Listen for VFS change events ONLY in trusted same-origin in-app mode (never inside embedded iframes)
  useEffect(() => {
    const isEmbeddedIframe =
      typeof window !== 'undefined' && Boolean(window.parent && window.parent !== window);
    if (isEmbeddedIframe) {
      return;
    }

    const wsManager = WorkspaceManager.getInstance();
    const targetProjId = projectId || wsManager.getActiveProjectId();
    if (!targetProjId) return;

    let currentVFS = wsManager.getWorkspaceVFS(targetProjId);
    currentVFS.reloadFromStorage();
    setVfsVersion(prev => prev + 1);

    let unsubscribeVFS = currentVFS.watch(() => {
      setVfsVersion(prev => prev + 1);
    });

    const handleCustomVfsEvent = (e?: any) => {
      const eventProjectId = e?.detail?.projectId;

      // Strict session isolation: only react if the event is for this runner's specific project
      if (projectId && eventProjectId && projectId !== eventProjectId) {
        return;
      }

      const nextProjId = eventProjectId || projectId || wsManager.getActiveProjectId();
      if (nextProjId) {
        const newVFS = wsManager.getWorkspaceVFS(nextProjId);
        if (newVFS !== currentVFS) {
          unsubscribeVFS();
          currentVFS = newVFS;
          unsubscribeVFS = currentVFS.watch(() => {
            setVfsVersion(prev => prev + 1);
          });
        }
      }
      currentVFS.reloadFromStorage();
      setVfsVersion(prev => prev + 1);
    };

    window.addEventListener('anny_vfs_changed', handleCustomVfsEvent);
    window.addEventListener('anny_project_generated', handleCustomVfsEvent);
    window.addEventListener('storage', handleCustomVfsEvent);

    return () => {
      unsubscribeVFS();
      window.removeEventListener('anny_vfs_changed', handleCustomVfsEvent);
      window.removeEventListener('anny_project_generated', handleCustomVfsEvent);
      window.removeEventListener('storage', handleCustomVfsEvent);
    };
  }, [projectId]);

  // 2. Compilation and Transpilation Pipeline (Transpiles only; never executes generated code on main origin)
  useEffect(() => {
    let cancelled = false;
    const isEmbeddedIframe =
      typeof window !== 'undefined' && Boolean(window.parent && window.parent !== window);

    if (isBuilding) {
      if (!isolatedSrcDoc && !htmlContent) {
        setIsolatedSrcDoc(null);
        setCompileError(null);
        setHtmlContent(null);
      }
      return;
    }

    const wsManager = WorkspaceManager.getInstance();
    const activeProjId = projectId || wsManager.getActiveProjectId() || 'ws_default_1';
    const parentOrigin = typeof window !== 'undefined' && window.location.origin !== 'null'
      ? window.location.origin
      : resolveParentTargetOrigin();

    // Embedded opaque-origin preview iframes MUST ONLY compile validated parent snapshots
    if (isEmbeddedIframe && !isolatedPreviewVfs) {
      setIsolatedSrcDoc(null);
      setHtmlContent(null);
      setCompileError(null);
      setActivePath('');
      return;
    }

    const compileWithAuthorizedVfs = (vfs: any) => {
      if (cancelled) return;
      const possiblePaths = [
        '/src/App.tsx',
        '/src/App.jsx',
        '/App.tsx',
        '/App.jsx',
        '/src/App.js',
        '/App.js',
        '/src/main.tsx'
      ];

      let appCode = '';
      let foundPath = '';

      for (const path of possiblePaths) {
        if (vfs.exists(path)) {
          const content = vfs.readFile(path);
          if (content && content.trim().length > 0) {
            appCode = content;
            foundPath = path;
            break;
          }
        }
      }

      if (typeof window !== 'undefined') {
        (window as any).__ANNY_PROJECT_RUNTIME__ = {
          projectId: activeProjId,
          source: isolatedPreviewVfs ? 'ISOLATED_PREVIEW_SNAPSHOT' : 'PROJECT_VFS',
          path: foundPath,
          loaded: Boolean(appCode),
          isolatedSandbox: true
        };
        postPreviewMessageToParent({
          type: Boolean(appCode) ? 'PREVIEW_READY' : 'PREVIEW_WAITING',
          projectId: activeProjId,
          path: foundPath
        });
      }

      // Check for HTML static file
      if (!appCode && vfs.exists('/index.html')) {
        const html = vfs.readFile('/index.html');
        if (html && html.includes('<html') && !html.includes('src="/src/main.tsx"')) {
          setHtmlContent(sanitizeHtmlPreviewSrcDoc(html, activeProjId, parentOrigin));
          setIsolatedSrcDoc(null);
          setCompileError(null);
          setActivePath('/index.html');
          postPreviewMessageToParent({ type: 'PREVIEW_READY', projectId: activeProjId, path: '/index.html' });
          return;
        }
      }

      if (!appCode) {
        setIsolatedSrcDoc(null);
        setHtmlContent(null);
        setCompileError(null);
        setActivePath('');
        return;
      }

      setActivePath(foundPath);

      try {
        setHtmlContent(null);
        const bundle = bundleVFSForIsolatedPreview(vfs, {
          projectId: activeProjId,
          parentOrigin
        });
        setIsolatedSrcDoc(bundle.srcDoc);
        setCompileError(null);
      } catch (err: any) {
        console.warn('[VFS Dynamic App Transpilation Error]:', err);
        setCompileError(err.message || 'Failed to transpile generated React component');
        setIsolatedSrcDoc(null);
      }
    };

    if (isEmbeddedIframe) {
      compileWithAuthorizedVfs(isolatedPreviewVfs);
      return () => {
        cancelled = true;
      };
    }

    // In-app direct runner mode: independently verify ownership before reading VFS
    const ownershipRecord = getProjectOwnershipRecord(activeProjId);
    if (!ownershipRecord) {
      setIsolatedSrcDoc(null);
      setHtmlContent(null);
      setCompileError(null);
      setActivePath('');
      return () => {
        cancelled = true;
      };
    }

    if (ownershipRecord.ownershipMode === 'local-only') {
      const localCheck = authorizeLocalOnlyProjectSync(activeProjId);
      if (!localCheck.authorized) {
        setIsolatedSrcDoc(null);
        setHtmlContent(null);
        setCompileError(null);
        setActivePath('');
        return () => {
          cancelled = true;
        };
      }
      compileWithAuthorizedVfs(wsManager.getWorkspaceVFS(activeProjId));
      return () => {
        cancelled = true;
      };
    }

    // Cloud project in-app runner: async server verification required (fail closed)
    let sessionId = '';
    try {
      sessionId = generatePreviewHandshakeId(16);
      const handshakeId = generatePreviewHandshakeId(16);
      authorizeProjectForPreviewSnapshot({
        projectId: activeProjId,
        previewSessionId: sessionId,
        expectedIframeWindow: typeof window !== 'undefined' ? window : ({} as Window),
        handshakeId
      }).then((result) => {
        if (cancelled) return;
        if (!result.authorized || !result.context) {
          invalidatePreviewSessionAuthorizations(sessionId);
          setIsolatedSrcDoc(null);
          setHtmlContent(null);
          setCompileError(null);
          setActivePath('');
          return;
        }
        const authorizedFiles = readAuthorizedProjectVfsSnapshot(result.context);
        invalidatePreviewSessionAuthorizations(sessionId);
        if (Object.keys(authorizedFiles).length === 0) {
          setIsolatedSrcDoc(null);
          setHtmlContent(null);
          setActivePath('');
          return;
        }
        compileWithAuthorizedVfs(createIsolatedPreviewVFS(activeProjId, authorizedFiles));
      }).catch(() => {
        if (!cancelled) {
          invalidatePreviewSessionAuthorizations(sessionId);
          setIsolatedSrcDoc(null);
          setHtmlContent(null);
        }
      });
    } catch {
      setIsolatedSrcDoc(null);
      setHtmlContent(null);
    }

    return () => {
      cancelled = true;
      invalidatePreviewSessionAuthorizations(sessionId);
    };
  }, [vfsVersion, projectId, isBuilding, isolatedPreviewVfs]);

  /* legacy compiler block replaced */

  // 1. Render HTML inside strict opaque-origin sandbox (NO allow-same-origin, NO allow-top-navigation)
  if (htmlContent) {
    return (
      <iframe
        ref={sandboxIframeRef}
        srcDoc={htmlContent}
        title="VFS HTML Preview"
        sandbox="allow-scripts allow-forms allow-modals"
        referrerPolicy="no-referrer"
        className="w-full h-full min-h-[500px] border-none bg-white"
      />
    );
  }

  // 2. Render transpiled React application inside strict opaque-origin sandbox (NO allow-same-origin, NO allow-top-navigation)
  if (isolatedSrcDoc) {
    return (
      <div className="w-full min-h-screen h-full bg-slate-950 text-slate-100 relative isolate flex flex-col overflow-hidden">
        <VFSAppErrorBoundary>
          <iframe
            ref={sandboxIframeRef}
            srcDoc={isolatedSrcDoc}
            title="VFS Isolated Application Sandbox"
            sandbox="allow-scripts allow-forms allow-modals"
            referrerPolicy="no-referrer"
            className="w-full flex-1 min-h-[500px] h-full border-none bg-slate-950"
          />
        </VFSAppErrorBoundary>
      </div>
    );
  }

  // 3. Render Compilation Error Diagnostic (NO MOCKUPS)
  if (compileError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8 bg-[#090308] text-red-100 font-sans">
        <div className="max-w-xl w-full p-6 bg-red-950/40 border border-red-500/30 rounded-3xl shadow-2xl space-y-4">
          <div className="flex items-center gap-3 text-red-400 font-bold text-base border-b border-red-500/20 pb-3 font-mono">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <span>VFS Application Build Diagnostic Error</span>
          </div>

          <p className="text-xs text-red-300/90 leading-relaxed font-mono bg-black/50 p-4 rounded-xl border border-red-500/20 overflow-x-auto whitespace-pre-wrap">
            {compileError}
          </p>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400 font-mono">
              Source file: <strong className="text-white">{activePath || '/src/App.tsx'}</strong>
            </span>

            <button 
              onClick={() => setVfsVersion(v => v + 1)}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Execution
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Render Clean Execution Engine Building Screen or Empty State (NO MOCKUPS)
  if (isBuilding && !isolatedSrcDoc) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-950/95 p-8 text-center text-white overflow-hidden">
        <div className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.045] p-7 shadow-2xl backdrop-blur-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.14),transparent_55%)] pointer-events-none" />
          <div className="relative mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-200" />
          </div>
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">ANNY Preview Runtime</p>
          <h3 className="relative mt-2 text-xl font-semibold text-white">Preparing the real project</h3>
          <p className="relative mt-2 text-xs leading-relaxed text-slate-400">{currentMessage || 'Loading generated source from the active project workspace.'}</p>
          <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/5 animate-pulse rounded-full bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-300" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-[#07091e] p-8 text-center">
      <div className="max-w-md p-8 bg-white/[0.02] border border-white/10 rounded-3xl shadow-2xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          <Globe className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-white font-sans tracking-tight">No Application Built Yet</h3>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          This session is ready for development. Send a prompt to ANNY in the conversation panel to synthesize and preview your application instantly.
        </p>
      </div>
    </div>
  );
};

/* =========================================================================
   STANDALONE PREVIEW RUNNER (FRAMEWORK ENTRY CONTAINER)
   Blocks direct top-level execution on the authenticated ANNY origin unless
   running inside an embedded/sandboxed preview context; all generated code
   inside DynamicVFSAppRunner is further isolated in an opaque-origin srcDoc iframe.
   ========================================================================= */
export const StandalonePreviewRunner: React.FC<{ projectId?: string | null }> = ({ projectId }) => {
  const [streamState, setStreamState] = useState(() => executionStreamManager.getState());
  const [isRuntimeLoaded, setIsRuntimeLoaded] = useState<boolean>(false);

  // Detect if someone navigated top-level on the authenticated ANNY origin (`?preview=standalone` in a normal tab)
  const isTopLevelAuthenticatedOrigin =
    typeof window !== 'undefined' &&
    window.self === window.top &&
    window.location.origin !== 'null';

  useEffect(() => {
    const checkRuntime = () => {
      const loaded = typeof window !== 'undefined' && (window as any).__ANNY_PROJECT_RUNTIME__?.loaded === true;
      setIsRuntimeLoaded(Boolean(loaded));
    };
    checkRuntime();
    const interval = setInterval(checkRuntime, 500);

    const unsubscribeQueue = executionStreamManager.subscribe((state) => {
      setStreamState(state);
      checkRuntime();
    });

    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    const sendMessage = (type: string, args: any[]) => {
      try {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ').slice(0, 4000);
        postPreviewMessageToParent({ type: 'PREVIEW_LOG', level: type, message });
      } catch (_e) {
        // Ignore serialization error
      }
    };

    console.log = (...args) => { originalConsoleLog(...args); sendMessage('info', args); };
    console.error = (...args) => { originalConsoleError(...args); sendMessage('error', args); };
    console.warn = (...args) => { originalConsoleWarn(...args); sendMessage('warn', args); };

    const errorHandler = (event: ErrorEvent) => {
      postPreviewMessageToParent({
        type: 'PREVIEW_RUNTIME_ERROR',
        message: String(event.message || 'Runtime error').slice(0, 2000),
        filename: String(event.filename || '').slice(0, 300),
        lineno: Number(event.lineno || 0)
      });
    };

    window.addEventListener('error', errorHandler);

    return () => {
      clearInterval(interval);
      unsubscribeQueue();
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  const isBuilding = streamState.isRunning;
  const isFailed = streamState.currentStatus === 'failed';
  const currentStage = streamState.currentMessage || 'Building';

  const progressPct = (() => {
    switch (streamState.currentStage) {
      case 'analyzing': return 15;
      case 'planning': return 30;
      case 'editing': return 50;
      case 'validation': return 70;
      case 'build': return 85;
      case 'runtime': return 92;
      case 'persistence': return 97;
      case 'finalization': return 100;
      default: return 50;
    }
  })();

  if (isTopLevelAuthenticatedOrigin) {
    return (
      <div className="w-full h-screen bg-[#070913] text-slate-100 flex flex-col font-sans select-none">
        <header className="h-10 bg-[#0d0f1f] border-b border-amber-500/30 px-4 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Opaque-Origin Sandbox Enforced • Top-Level Same-Origin Execution Blocked</span>
          </div>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = window.location.origin + window.location.pathname;
              }
            }}
            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs border border-indigo-400/40 cursor-pointer"
          >
            ← Back to ANNY Workspace
          </button>
        </header>
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#0d0f1f] border border-amber-500/30 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <h2 className="text-base font-bold text-white">Direct Top-Level Preview Execution Blocked</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Projects can only execute inside an isolated opaque-origin workspace preview frame after authenticated ownership verification.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-[#070913] text-slate-100 flex flex-col overflow-x-hidden font-sans select-none">
      {/* Top Banner indicating Real Stage State */}
      <header className="h-10 bg-[#0d0f1f] border-b border-cyan-500/20 px-4 flex items-center justify-between text-xs font-mono shrink-0 z-50">
        <div className="flex items-center gap-2">
          {isBuilding ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="font-bold text-cyan-300 tracking-wide flex items-center gap-2">
                <span>Building Application...</span>
                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-200 text-[10px]">
                  Stage: {currentStage}
                </span>
              </span>
            </>
          ) : isFailed ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="font-bold text-red-400 tracking-wide flex items-center gap-2">
                <span>Build Failed</span>
                <span className="px-2 py-0.5 rounded bg-red-950 border border-red-500/30 text-red-200 text-[10px] truncate max-w-xs">
                  {streamState.error || 'Execution Error'}
                </span>
              </span>
            </>
          ) : isRuntimeLoaded ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-white tracking-wide">
                Real Running Application • Isolated Sandbox
              </span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
              </span>
              <span className="font-bold text-slate-400 tracking-wide">
                Application Sandbox Idle
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>Status: <strong className={isFailed ? "text-red-400" : isBuilding ? "text-cyan-400" : isRuntimeLoaded ? "text-emerald-400" : "text-slate-500"}>
            {isFailed ? "BUILD FAILED" : isBuilding ? `${progressPct}%` : isRuntimeLoaded ? "200 OK" : "IDLE"}
          </strong></span>
          <span className="bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 text-cyan-400 font-mono">
            VFS ISOLATED SANDBOX
          </span>
        </div>
      </header>

      {/* Main View Renderer */}
      <main className="flex-1 overflow-y-auto">
        <DynamicVFSAppRunner projectId={projectId} />
      </main>
    </div>
  );
};

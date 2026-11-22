import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, RefreshCw, Maximize2, Minimize2, CheckCircle2, Play, Globe, Sparkles, Layers } from 'lucide-react';
import { WorkspaceManager } from '../core/workspaceManager';
import {
  validatePreviewVfsSynMessage,
  readAuthorizedProjectVfsSnapshot,
  buildValidatedVfsSnapshotPayload,
  isValidPreviewFrameMessage,
  generatePreviewHandshakeId
} from './StandalonePreviewRunner';
import {
  authorizeProjectForPreviewSnapshot,
  invalidatePreviewSessionAuthorizations,
  migrateLegacyLocalProjectOwnership
} from '../services/projectOwnershipService';

interface LiveAppPreviewCardProps {
  content: string;
}

export function validateSafePreviewUrl(candidateUrl: string, allowedOrigin: string): string | null {
  try {
    const parsed = new URL(candidateUrl, allowedOrigin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    const allowed = new URL(allowedOrigin);
    if (parsed.origin !== allowed.origin) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export const LiveAppPreviewCard: React.FC<LiveAppPreviewCardProps> = ({ content }) => {
  const [reloadKey, setReloadKey] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [authDenialState, setAuthDenialState] = useState<{
    reason: string;
    legacyEligible?: boolean;
  } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const consumedHandshakeIdsRef = useRef<Set<string>>(new Set());
  const activeHandshakeRef = useRef<{
    projectId: string;
    handshakeId: string;
    seq: number;
    expectedWindow: Window;
  } | null>(null);
  const authEpochRef = useRef<number>(0);
  const previewSessionIdRef = useRef<string>('');

  const allowedOrigin = typeof window !== 'undefined' && window.location.origin !== 'null'
    ? window.location.origin
    : 'http://localhost:3000';

  const rawProjectId =
    WorkspaceManager.getInstance().getCurrentWorkspace()?.id ||
    WorkspaceManager.getInstance().getActiveProjectId() ||
    'ws_default_1';
  const currentProjectId = rawProjectId.replace(/[^a-zA-Z0-9_-]/g, '') || 'ws_default_1';

  useEffect(() => {
    setAuthDenialState(null);
    activeHandshakeRef.current = null;
    authEpochRef.current += 1;
    const effectEpoch = authEpochRef.current;

    if (previewSessionIdRef.current) {
      invalidatePreviewSessionAuthorizations(previewSessionIdRef.current);
    }

    let previewSessionId = '';
    try {
      previewSessionId = generatePreviewHandshakeId(16);
    } catch {
      return;
    }
    previewSessionIdRef.current = previewSessionId;

    const pushSnapshotToCardPreview = async (
      handshakeId: string,
      nextSeq: number,
      expectedWindow: Window,
      isRefreshOnActiveHandshake = false
    ) => {
      if (authEpochRef.current !== effectEpoch) return;
      const targetWin = iframeRef.current?.contentWindow;
      if (!targetWin || targetWin !== expectedWindow) return;

      const authResult = await authorizeProjectForPreviewSnapshot({
        projectId: currentProjectId,
        previewSessionId,
        expectedIframeWindow: expectedWindow,
        handshakeId,
        isRefreshOnActiveHandshake
      });

      if (authEpochRef.current !== effectEpoch) return;
      if (iframeRef.current?.contentWindow !== expectedWindow) return;

      if (!authResult.authorized || !authResult.context) {
        activeHandshakeRef.current = null;
        setAuthDenialState({
          reason: authResult.reason || 'PROJECT_AUTHORIZATION_DENIED',
          legacyEligible: authResult.legacyMigrationEligible
        });
        console.warn('[ANNY LiveCard] Snapshot authorization denied', {
          projectId: currentProjectId,
          reason: authResult.reason || 'PROJECT_AUTHORIZATION_DENIED'
        });
        return;
      }

      setAuthDenialState(null);
      const files = readAuthorizedProjectVfsSnapshot(authResult.context);
      const built = buildValidatedVfsSnapshotPayload({
        projectId: currentProjectId,
        handshakeId,
        files,
        snapshotSeq: nextSeq
      });
      if (built.valid && built.payload) {
        expectedWindow.postMessage(built.payload, '*');
      }
    };

    const onCardPreviewMessage = (event: MessageEvent) => {
      const expectedWindow = iframeRef.current?.contentWindow;
      if (!expectedWindow || !event.source || event.source !== expectedWindow) {
        return;
      }
      if (event.origin !== window.location.origin && event.origin !== 'null') {
        return;
      }
      if (!isValidPreviewFrameMessage(event, expectedWindow)) {
        return;
      }
      const data = event.data as Record<string, unknown>;
      if (data.type === 'PREVIEW_VFS_SYN') {
        const synCheck = validatePreviewVfsSynMessage(
          event,
          expectedWindow,
          currentProjectId,
          consumedHandshakeIdsRef.current
        );
        if (!synCheck.valid || !synCheck.handshakeId) {
          return;
        }
        activeHandshakeRef.current = {
          projectId: currentProjectId,
          handshakeId: synCheck.handshakeId,
          seq: 1,
          expectedWindow
        };
        void pushSnapshotToCardPreview(synCheck.handshakeId, 1, expectedWindow, false);
      }
    };

    const onParentVfsUpdated = (e?: any) => {
      const eventProjectId = e?.detail?.projectId;
      if (eventProjectId && eventProjectId !== currentProjectId) {
        return;
      }
      const currentHandshake = activeHandshakeRef.current;
      if (!currentHandshake || currentHandshake.projectId !== currentProjectId) {
        return;
      }
      currentHandshake.seq += 1;
      void pushSnapshotToCardPreview(
        currentHandshake.handshakeId,
        currentHandshake.seq,
        currentHandshake.expectedWindow,
        true
      );
    };

    window.addEventListener('message', onCardPreviewMessage);
    window.addEventListener('anny_vfs_changed', onParentVfsUpdated);
    window.addEventListener('anny_project_generated', onParentVfsUpdated);
    window.addEventListener('storage', onParentVfsUpdated);

    return () => {
      authEpochRef.current += 1;
      activeHandshakeRef.current = null;
      invalidatePreviewSessionAuthorizations(previewSessionId);
      window.removeEventListener('message', onCardPreviewMessage);
      window.removeEventListener('anny_vfs_changed', onParentVfsUpdated);
      window.removeEventListener('anny_project_generated', onParentVfsUpdated);
      window.removeEventListener('storage', onParentVfsUpdated);
    };
  }, [currentProjectId, reloadKey]);

  // Never trust arbitrary external hosts from markdown content; bind preview URL strictly to allowedOrigin
  const candidateUrl = `${allowedOrigin}/?preview=standalone&project=${encodeURIComponent(currentProjectId)}&v=${reloadKey}`;
  const url = validateSafePreviewUrl(candidateUrl, allowedOrigin) || `${allowedOrigin}/?preview=standalone&v=${reloadKey}`;

  // Extract app/project name if present
  let appName = 'Generated Application Preview';
  const nameMatch = content.match(/\*\*Name\*\*:\s*([^\n•]+)/);
  if (nameMatch && nameMatch[1]) {
    appName = nameMatch[1].trim();
  } else if (/e-commerce|shop|cart|store/i.test(content)) {
    appName = 'E-Commerce Web Application';
  }

  return (
    <div className="my-4 rounded-2xl bg-[#090b14] border border-cyan-500/40 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all">
      {/* Card Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#0f1122] border-b border-white/10 text-xs font-mono">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-white tracking-wide truncate">{appName}</span>
          <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
            Isolated Sandbox • Live
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setReloadKey(prev => prev + 1)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-[11px]"
            title="Reload Application Preview"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Reload</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all flex items-center gap-1 text-[11px] font-bold"
            title={isExpanded ? "Minimize Sandboxed Preview" : "Expand Sandboxed Preview"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-cyan-300" /> : <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />}
            <span>{isExpanded ? 'Minimize Sandbox' : 'Expand Sandbox'}</span>
          </button>
        </div>
      </div>

      {/* Iframe Live Application Viewer (strictly sandboxed opaque origin; no allow-same-origin) */}
      <div className={`relative w-full bg-black ${isExpanded ? 'h-[760px]' : 'h-[500px]'} transition-all duration-300`}>
        {authDenialState && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/95 p-6 text-center">
            <div className="max-w-md w-full p-5 rounded-2xl bg-[#0d0f1c] border border-amber-500/40 space-y-3">
              <p className="text-sm font-bold text-white">Preview Authorization Denied</p>
              <p className="text-xs text-slate-400 font-mono">Zero files transferred ({authDenialState.reason}).</p>
              {authDenialState.legacyEligible && (
                <button
                  type="button"
                  onClick={() => {
                    const migrated = migrateLegacyLocalProjectOwnership(currentProjectId);
                    if (migrated.migrated) {
                      setAuthDenialState(null);
                      setReloadKey((k) => k + 1);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
                >
                  Adopt Legacy Local Project into Active Profile
                </button>
              )}
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          key={`${currentProjectId}-${reloadKey}`}
          src={url}
          title={appName}
          className="w-full h-full border-none"
          sandbox="allow-forms allow-modals allow-scripts"
          referrerPolicy="same-origin"
        />
      </div>

      {/* Footer Status Bar */}
      <div className="px-4 py-2 bg-[#0d0f1c] border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Compiled & Serving in Opaque-Origin Sandbox</span>
        </div>
        <span className="text-[10px] text-slate-500 truncate max-w-[220px] sm:max-w-none">{url}</span>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Loader2,
  AlertTriangle,
  Monitor,
  Tablet,
  Smartphone,
  Minimize2,
  Maximize2,
  Pencil,
  ExternalLink,
  Wrench,
  CheckCircle2,
  Code2,
  Share2,
  Check,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { AnnyBuildPreviewOverlay, type BuildStageItem } from '../AnnyBuildPreviewOverlay';
import { WorkspaceManager } from '../../core/workspaceManager';
import { fetchWithAuth } from '../../lib/apiUtils';
import {
  validatePreviewVfsSynMessage,
  readAuthorizedProjectVfsSnapshot,
  buildValidatedVfsSnapshotPayload,
  isValidPreviewFrameMessage,
  generatePreviewHandshakeId,
  loadOfflineReactVendorScript,
} from '../StandalonePreviewRunner';
import {
  authorizeProjectForPreviewSnapshot,
  invalidatePreviewSessionAuthorizations,
  migrateLegacyLocalProjectOwnership,
} from '../../services/projectOwnershipService';
import { projectPreviewController } from '../../services/projectPreviewController';

export interface WorkspacePreviewContainerProps {
  isPreviewFullScreen: boolean;
  setIsPreviewFullScreen: (val: boolean) => void;
  setReloadKey: React.Dispatch<React.SetStateAction<number>>;
  buildState: 'in_progress' | 'completed' | 'failed';
  hasExistingProject: boolean;
  deviceMode: 'desktop' | 'tablet' | 'mobile';
  setDeviceMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  currentBuildPrompt: string;
  liveBuildAction: string;
  buildProgressPct: number;
  setRightTab: (tab: any) => void;
  activeProjectId: string;
  reloadKey: number;
  previewRuntimeReady: boolean;
  onOpenVisualEdit?: () => void;
  buildStages?: BuildStageItem[];
  buildError?: string;
  buildDiagnostics?: string[];
  onRetryBuild?: () => void;
  projectName?: string;
  projectVersion?: number;
  generatedFiles?: string[];
  onRebuild?: () => void;
  onFixRuntimeError?: (errorMessage: string) => void;
  onOpenNewTabError?: (msg: string) => void;
  previewSessionUrl?: string | null;
}

function hashFilesSnapshot(files: Record<string, string>): string {
  const keys = Object.keys(files).sort();
  let h1 = 2166136261;
  let totalLen = 0;
  for (const k of keys) {
    const val = files[k] ?? '';
    totalLen += val.length;
    for (let i = 0; i < k.length; i++) {
      h1 ^= k.charCodeAt(i);
      h1 = Math.imul(h1, 16777619);
    }
    const step = val.length > 512 ? Math.floor(val.length / 128) : 1;
    for (let i = 0; i < val.length; i += step) {
      h1 ^= val.charCodeAt(i);
      h1 = Math.imul(h1, 16777619);
    }
  }
  return `${keys.length}:${totalLen}:${h1 >>> 0}`;
}

export const WorkspacePreviewContainer: React.FC<WorkspacePreviewContainerProps> = ({
  isPreviewFullScreen,
  setIsPreviewFullScreen,
  setReloadKey,
  buildState,
  hasExistingProject,
  deviceMode,
  setDeviceMode,
  currentBuildPrompt,
  liveBuildAction,
  buildProgressPct,
  setRightTab,
  activeProjectId,
  reloadKey,
  previewRuntimeReady,
  onOpenVisualEdit,
  buildStages,
  buildError,
  buildDiagnostics,
  onRetryBuild,
  projectName,
  projectVersion,
  generatedFiles,
  onRebuild,
  onFixRuntimeError,
  onOpenNewTabError,
  previewSessionUrl,
}) => {
  const [mobilePreset, setMobilePreset] = useState<'390x844' | '375x812' | '430x932'>('390x844');
  const stageRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [runtimeVerified, setRuntimeVerified] = useState<boolean>(false);
  const [currentRoute, setCurrentRoute] = useState<string>('/');
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);
  const [runtimeErrorState, setRuntimeErrorState] = useState<{
    message: string;
    filename?: string;
    lineno?: number;
  } | null>(null);
  const [isOpeningTab, setIsOpeningTab] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const compiledCssCacheRef = useRef<{ hash: string; css: string } | null>(null);

  // Target viewport dimensions
  const getTargetDimensions = () => {
    if (deviceMode === 'desktop') return { width: 1440, height: 900, isFluid: true };
    if (deviceMode === 'tablet') return { width: 768, height: 1024, isFluid: false };
    if (mobilePreset === '375x812') return { width: 375, height: 812, isFluid: false };
    if (mobilePreset === '430x932') return { width: 430, height: 932, isFluid: false };
    return { width: 390, height: 844, isFluid: false };
  };

  const { width: targetWidth, height: targetHeight, isFluid } = getTargetDimensions();

  // Compute visual scale transform so CSS viewport remains targetWidth x targetHeight
  useEffect(() => {
    if (isFluid) {
      setScaleFactor(1);
      return;
    }
    const updateScale = () => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const availWidth = rect.width - 32;
      const availHeight = rect.height - 32;

      const scaleX = availWidth / targetWidth;
      const scaleY = availHeight / targetHeight;
      const scale = Math.min(1, scaleX, scaleY);
      setScaleFactor(Math.max(0.35, scale));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [deviceMode, mobilePreset, isFluid, targetWidth, targetHeight]);

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
  const [authDenialState, setAuthDenialState] = useState<{
    reason: string;
    legacyEligible?: boolean;
  } | null>(null);

  const resolvedTargetProjectId = (() => {
    const raw = String(activeProjectId || '').trim();
    if (raw.startsWith('proj_')) {
      return raw;
    }
    // If activeProjectId is a chat session ID that has a mapped project build, resolve to that session's proj_* ID
    if (raw && raw !== 'ws_default_1' && raw !== 'anny-project' && raw !== 'default-project') {
      const mapped = projectPreviewController.getSessionProjectMeta(raw);
      if (mapped?.projectId && mapped.projectId.startsWith('proj_')) {
        return mapped.projectId;
      }
    }
    return raw || 'ws_default_1';
  })();

  const sanitizedAuthorizedId =
    String(resolvedTargetProjectId || 'ws_default_1').replace(/[^a-zA-Z0-9_-]/g, '') || 'ws_default_1';

  useEffect(() => {
    setRuntimeVerified(false);
    setAuthDenialState(null);
    setRuntimeErrorState(null);
    setCurrentRoute('/');
    setCanGoBack(false);
    setCanGoForward(false);
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

    const postLifecycleStateToIframe = (
      expectedWindow: Window,
      handshakeId: string,
      lifecycleState:
        | 'restoring_project'
        | 'metadata_not_found'
        | 'no_entry_point'
        | 'authorization_denied'
        | 'missing_project_id',
      reason?: string,
    ) => {
      try {
        expectedWindow.postMessage(
          {
            type: 'PREVIEW_LIFECYCLE_STATE',
            projectId: sanitizedAuthorizedId,
            handshakeId,
            lifecycleState,
            reason: reason || '',
          },
          '*',
        );
      } catch {
        // Ignore postMessage failure if iframe unmounted
      }
    };

    const pushSnapshotToPreview = async (
      handshakeId: string,
      nextSeq: number,
      expectedWindow: Window,
      isRefreshOnActiveHandshake = false
    ) => {
      if (authEpochRef.current !== effectEpoch) return;
      const targetWin = iframeRef.current?.contentWindow;
      if (!targetWin || targetWin !== expectedWindow) return;

      const isPlaceholder =
        !sanitizedAuthorizedId ||
        sanitizedAuthorizedId === 'ws_default_1' ||
        sanitizedAuthorizedId === 'default-project' ||
        sanitizedAuthorizedId === 'anny-project' ||
        sanitizedAuthorizedId === 'default-session';

      if (isPlaceholder) {
        const defaultVfs = WorkspaceManager.getInstance().getWorkspaceVFS(sanitizedAuthorizedId);
        defaultVfs.reloadFromStorage();
        if (defaultVfs.getAllFiles().length === 0) {
          postLifecycleStateToIframe(expectedWindow, handshakeId, 'missing_project_id');
          projectPreviewController.logPreviewHandoffDiagnostics({
            requestedProjectId: String(activeProjectId || ''),
            resolvedProjectId: sanitizedAuthorizedId,
            ownershipResult: 'MISSING_PROJECT_ID',
            localVfsFileCount: 0,
            controllerFileCount: 0,
            restoredServerFileCount: 0,
            selectedVfsSource: 'none',
            snapshotFileCount: 0,
            handshakeAccepted: true,
            compilationResult: 'NO_PROJECT_BUILT_YET',
          });
          return;
        }
      } else {
        // Notify preview runner that handshake was accepted and project restoration is in progress
        postLifecycleStateToIframe(
          expectedWindow,
          handshakeId,
          'restoring_project',
          `Restoring verified project ${sanitizedAuthorizedId}...`,
        );

        const restoration = await projectPreviewController.restoreProjectById(
          sanitizedAuthorizedId,
          { switchActiveWorkspace: false },
        );

        if (authEpochRef.current !== effectEpoch) return;
        if (iframeRef.current?.contentWindow !== expectedWindow) return;

        if (restoration.status === 'authorization_denied') {
          activeHandshakeRef.current = null;
          setRuntimeVerified(false);
          setAuthDenialState({
            reason: restoration.errorReason || 'PROJECT_AUTHORIZATION_DENIED',
          });
          postLifecycleStateToIframe(
            expectedWindow,
            handshakeId,
            'authorization_denied',
            restoration.errorReason,
          );
          projectPreviewController.logPreviewHandoffDiagnostics({
            requestedProjectId: String(activeProjectId || ''),
            resolvedProjectId: sanitizedAuthorizedId,
            handshakeAccepted: false,
            compilationResult: 'AUTHORIZATION_DENIED',
          });
          return;
        }

        if (restoration.status === 'metadata_not_found') {
          setRuntimeVerified(false);
          postLifecycleStateToIframe(
            expectedWindow,
            handshakeId,
            'metadata_not_found',
            restoration.errorReason,
          );
          projectPreviewController.logPreviewHandoffDiagnostics({
            requestedProjectId: String(activeProjectId || ''),
            resolvedProjectId: sanitizedAuthorizedId,
            handshakeAccepted: true,
            compilationResult: 'METADATA_NOT_FOUND',
          });
          return;
        }

        if (restoration.status === 'no_entry_point') {
          setRuntimeVerified(false);
          postLifecycleStateToIframe(
            expectedWindow,
            handshakeId,
            'no_entry_point',
            restoration.errorReason,
          );
          projectPreviewController.logPreviewHandoffDiagnostics({
            requestedProjectId: String(activeProjectId || ''),
            resolvedProjectId: sanitizedAuthorizedId,
            handshakeAccepted: true,
            compilationResult: 'NO_ENTRY_POINT',
          });
          return;
        }

        if (restoration.status === 'missing_project_id') {
          setRuntimeVerified(false);
          postLifecycleStateToIframe(
            expectedWindow,
            handshakeId,
            'missing_project_id',
            restoration.errorReason,
          );
          return;
        }
      }

      const authResult = await authorizeProjectForPreviewSnapshot({
        projectId: sanitizedAuthorizedId,
        previewSessionId,
        expectedIframeWindow: expectedWindow,
        handshakeId,
        isRefreshOnActiveHandshake,
      });

      if (authEpochRef.current !== effectEpoch) return;
      if (iframeRef.current?.contentWindow !== expectedWindow) return;

      if (!authResult.authorized || !authResult.context) {
        activeHandshakeRef.current = null;
        setRuntimeVerified(false);
        setAuthDenialState({
          reason: authResult.reason || 'PROJECT_AUTHORIZATION_DENIED',
          legacyEligible: authResult.legacyMigrationEligible,
        });
        postLifecycleStateToIframe(
          expectedWindow,
          handshakeId,
          'authorization_denied',
          authResult.reason || 'PROJECT_AUTHORIZATION_DENIED',
        );
        projectPreviewController.logPreviewHandoffDiagnostics({
          requestedProjectId: String(activeProjectId || ''),
          resolvedProjectId: sanitizedAuthorizedId,
          ownershipResult: authResult.reason || 'PROJECT_AUTHORIZATION_DENIED',
          snapshotFileCount: 0,
          handshakeAccepted: false,
          compilationResult: 'AUTHORIZATION_DENIED',
        });
        console.warn('[ANNY Preview] Snapshot authorization denied', {
          projectId: sanitizedAuthorizedId,
          reason: authResult.reason || 'PROJECT_AUTHORIZATION_DENIED',
        });
        return;
      }

      setAuthDenialState(null);
      setRuntimeErrorState(null);
      const rawFiles = readAuthorizedProjectVfsSnapshot(authResult.context);
      const userFileCount = Object.keys(rawFiles).length;

      if (userFileCount === 0) {
        postLifecycleStateToIframe(
          expectedWindow,
          handshakeId,
          isPlaceholder ? 'missing_project_id' : 'no_entry_point',
          isPlaceholder
            ? ''
            : `Project "${sanitizedAuthorizedId}" contains 0 source files after authorization.`,
        );
        projectPreviewController.logPreviewHandoffDiagnostics({
          requestedProjectId: String(activeProjectId || ''),
          resolvedProjectId: sanitizedAuthorizedId,
          ownershipResult: 'AUTHORIZED',
          snapshotFileCount: 0,
          handshakeAccepted: true,
          compilationResult: isPlaceholder ? 'NO_PROJECT_BUILT_YET' : 'EMPTY_SNAPSHOT',
        });
        return;
      }

      let snapshotFiles = { ...rawFiles };

      if (userFileCount > 0) {
        const hash = hashFilesSnapshot(rawFiles);
        const [vendorJs] = await Promise.all([
          loadOfflineReactVendorScript(typeof window !== 'undefined' ? window.location.origin : ''),
          (async () => {
            if (compiledCssCacheRef.current?.hash !== hash) {
              try {
                const cssRes = await fetchWithAuth('/api/preview/runtime/compile-css', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ files: rawFiles }),
                });
                if (cssRes.ok) {
                  const cssData = await cssRes.json().catch(() => null);
                  if (cssData?.success && typeof cssData.css === 'string') {
                    compiledCssCacheRef.current = { hash, css: cssData.css };
                  }
                }
              } catch {
                // Non-fatal: iframe still has base CSS + utility fallbacks
              }
            }
          })(),
        ]);

        if (authEpochRef.current !== effectEpoch) return;
        if (iframeRef.current?.contentWindow !== expectedWindow) return;

        if (compiledCssCacheRef.current?.hash === hash && compiledCssCacheRef.current.css) {
          snapshotFiles['/__anny_compiled_tailwind.css'] = compiledCssCacheRef.current.css;
        }
        if (vendorJs) {
          snapshotFiles['/__anny_react_vendor.js'] = vendorJs;
        }
      }

      const built = buildValidatedVfsSnapshotPayload({
        projectId: sanitizedAuthorizedId,
        handshakeId,
        files: snapshotFiles,
        snapshotSeq: nextSeq,
      });
      if (built.valid && built.payload) {
        expectedWindow.postMessage(built.payload, '*');
        projectPreviewController.logPreviewHandoffDiagnostics({
          requestedProjectId: String(activeProjectId || ''),
          resolvedProjectId: sanitizedAuthorizedId,
          ownershipResult: 'AUTHORIZED',
          snapshotFileCount: userFileCount,
          handshakeAccepted: true,
        });
      } else {
        projectPreviewController.logPreviewHandoffDiagnostics({
          requestedProjectId: String(activeProjectId || ''),
          resolvedProjectId: sanitizedAuthorizedId,
          ownershipResult: 'AUTHORIZED',
          snapshotFileCount: 0,
          handshakeAccepted: false,
          compilationResult: `SNAPSHOT_VALIDATION_REJECTED:${built.reason || 'UNKNOWN'}`,
        });
      }
    };

    const onPreviewMessage = (event: MessageEvent) => {
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
      const msgType = data.type;

      if (msgType === 'PREVIEW_VFS_SYN') {
        const synCheck = validatePreviewVfsSynMessage(
          event,
          expectedWindow,
          sanitizedAuthorizedId,
          consumedHandshakeIdsRef.current
        );
        if (!synCheck.valid || !synCheck.handshakeId) {
          projectPreviewController.logPreviewHandoffDiagnostics({
            requestedProjectId: String(activeProjectId || ''),
            resolvedProjectId: sanitizedAuthorizedId,
            handshakeAccepted: false,
            compilationResult: `SYN_REJECTED:${synCheck.reason || 'INVALID_SYN'}`,
          });
          return;
        }
        activeHandshakeRef.current = {
          projectId: sanitizedAuthorizedId,
          handshakeId: synCheck.handshakeId,
          seq: 1,
          expectedWindow,
        };
        void pushSnapshotToPreview(synCheck.handshakeId, 1, expectedWindow, false);
        return;
      }

      if (msgType === 'PREVIEW_READY' && data.projectId === sanitizedAuthorizedId) {
        setRuntimeVerified(true);
        setRuntimeErrorState(null);
        projectPreviewController.setPreviewRunning();
      }

      if (msgType === 'PREVIEW_NAVIGATION') {
        const navPath =
          typeof data.path === 'string' && data.path.trim()
            ? data.path.trim()
            : typeof data.route === 'string' && data.route.trim()
              ? data.route.trim()
              : '';
        if (navPath) {
          setCurrentRoute(navPath);
        }
        if (typeof data.canGoBack === 'boolean') {
          setCanGoBack(data.canGoBack);
        }
        if (typeof data.canGoForward === 'boolean') {
          setCanGoForward(data.canGoForward);
        }
      }

      if (msgType === 'PREVIEW_RUNTIME_ERROR') {
        setRuntimeVerified(false);
        const errMsg =
          typeof data.message === 'string' && data.message.trim()
            ? data.message.trim()
            : 'Runtime error inside preview application.';
        setRuntimeErrorState({
          message: errMsg,
          filename: typeof data.filename === 'string' ? data.filename : undefined,
          lineno: typeof data.lineno === 'number' ? data.lineno : undefined,
        });
        projectPreviewController.setRuntimeError(errMsg);
      }
    };

    const onParentVfsUpdated = (e?: any) => {
      const eventProjectId = e?.detail?.projectId;
      if (eventProjectId && eventProjectId !== sanitizedAuthorizedId) {
        return;
      }
      const currentHandshake = activeHandshakeRef.current;
      if (!currentHandshake || currentHandshake.projectId !== sanitizedAuthorizedId) {
        return;
      }
      currentHandshake.seq += 1;
      void pushSnapshotToPreview(
        currentHandshake.handshakeId,
        currentHandshake.seq,
        currentHandshake.expectedWindow,
        true
      );
    };

    window.addEventListener('message', onPreviewMessage);
    window.addEventListener('anny_vfs_changed', onParentVfsUpdated);
    window.addEventListener('anny_project_generated', onParentVfsUpdated);
    window.addEventListener('storage', onParentVfsUpdated);

    return () => {
      authEpochRef.current += 1;
      activeHandshakeRef.current = null;
      invalidatePreviewSessionAuthorizations(previewSessionId);
      window.removeEventListener('message', onPreviewMessage);
      window.removeEventListener('anny_vfs_changed', onParentVfsUpdated);
      window.removeEventListener('anny_project_generated', onParentVfsUpdated);
      window.removeEventListener('storage', onParentVfsUpdated);
    };
  }, [activeProjectId, reloadKey, sanitizedAuthorizedId]);

  const sendNavigationCommand = (action: 'back' | 'forward') => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'PREVIEW_NAVIGATE_COMMAND', action }, '*');
  };

  const resolveStandalonePreviewUrl = async (): Promise<string> => {
    const filesMap: Record<string, string> = {};
    try {
      const restored = await projectPreviewController.restoreProjectById(sanitizedAuthorizedId, {
        switchActiveWorkspace: false,
      });
      if (restored.status === 'restored' && Object.keys(restored.files).length > 0) {
        Object.assign(filesMap, restored.files);
      } else {
        const mgr = WorkspaceManager.getInstance();
        const projectVfs = mgr.getWorkspaceVFS(sanitizedAuthorizedId);
        projectVfs.reloadFromStorage();
        const vfsFiles = projectVfs.getAllFiles();
        vfsFiles.forEach((f) => {
          if (!f.path.startsWith('/__anny_')) {
            filesMap[f.path] = f.content;
          }
        });
      }
    } catch {
      // ignore
    }

    if (Object.keys(filesMap).length === 0) {
      throw new Error('Generate or load a project first before opening or sharing it.');
    }

    let targetUrl = '';
    const res = await fetchWithAuth('/api/preview/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: sanitizedAuthorizedId,
        name: projectName || sanitizedAuthorizedId,
        files: filesMap,
      }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) {
      const urlCandidate = data.session?.previewUrl || data.preview?.previewUrl;
      if (typeof urlCandidate === 'string' && urlCandidate.startsWith('/api/preview/sessions/')) {
        targetUrl = urlCandidate;
      }
    }
    if (!targetUrl && previewSessionUrl && previewSessionUrl.startsWith('/api/preview/sessions/')) {
      targetUrl = previewSessionUrl;
    }
    if (!targetUrl || !targetUrl.startsWith('/api/preview/sessions/')) {
      throw new Error(data?.error || `Unable to start isolated preview session (HTTP ${res.status})`);
    }
    return targetUrl;
  };

  const handleOpenInNewTab = async () => {
    if (isOpeningTab) return;
    setIsOpeningTab(true);
    try {
      const targetUrl = await resolveStandalonePreviewUrl();
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      onOpenNewTabError?.(err?.message || 'Unable to open standalone preview tab.');
    } finally {
      setIsOpeningTab(false);
    }
  };

  const handleShareProject = async () => {
    if (isOpeningTab) return;
    setIsOpeningTab(true);
    try {
      const targetUrl = await resolveStandalonePreviewUrl();
      const fullShareUrl =
        typeof window !== 'undefined' && targetUrl.startsWith('/')
          ? `${window.location.origin}${targetUrl}`
          : targetUrl;
      try {
        await navigator.clipboard?.writeText(fullShareUrl);
      } catch {
        // clipboard may be restricted in some iframe environments
      }
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      onOpenNewTabError?.(err?.message || 'Unable to create share link.');
    } finally {
      setIsOpeningTab(false);
    }
  };

  const statusMeta = (() => {
    if (buildState === 'in_progress') {
      return {
        label: hasExistingProject ? 'Updating' : 'Building',
        colorClass: 'text-purple-300',
        icon: <Loader2 className="w-3 h-3 animate-spin text-cyan-300" />,
      };
    }
    if (buildState === 'failed') {
      return {
        label: 'Build Failed',
        colorClass: 'text-rose-400',
        icon: <AlertTriangle className="w-3 h-3 text-rose-400" />,
      };
    }
    if (runtimeErrorState) {
      return {
        label: 'Runtime Error',
        colorClass: 'text-amber-300',
        icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
      };
    }
    if (hasExistingProject && previewRuntimeReady && runtimeVerified) {
      return {
        label: 'Ready · Live',
        colorClass: 'text-emerald-400',
        icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
      };
    }
    if (hasExistingProject) {
      return {
        label: 'Loading Runtime',
        colorClass: 'text-cyan-300',
        icon: <Loader2 className="w-3 h-3 animate-spin text-cyan-300" />,
      };
    }
    return {
      label: 'Idle',
      colorClass: 'text-slate-400',
      icon: null,
    };
  })();

  return (
    <div
      className={`w-full h-full flex flex-col bg-[#0b0d1b] ${
        isPreviewFullScreen ? 'fixed inset-0 z-[9999] bg-[#070913] w-screen h-screen' : ''
      }`}
    >
      {isPreviewFullScreen && (
        <button
          type="button"
          onClick={() => setIsPreviewFullScreen(false)}
          className="fixed top-2.5 right-4 z-[999999] px-3.5 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold border border-rose-400/50 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xl backdrop-blur-md"
          title="Exit Fullscreen Preview"
        >
          <Minimize2 className="w-4 h-4" />
          <span>Exit Fullscreen</span>
        </button>
      )}

      {/* Browser Toolbar Bar */}
      <div className="min-h-10 bg-[#0e1022] border-b border-white/10 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() => sendNavigationCommand('back')}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed rounded cursor-pointer"
            title="Navigate Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canGoForward}
            onClick={() => sendNavigationCommand('forward')}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed rounded cursor-pointer"
            title="Navigate Forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => (onRebuild ? onRebuild() : setReloadKey((k) => k + 1))}
            className="p-1.5 text-slate-400 hover:text-white rounded cursor-pointer"
            title="Reload Preview"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2 bg-[#14162e] px-3 py-1 rounded-lg border border-white/10 text-slate-300 min-w-0 flex-1 max-w-md">
            <span className="truncate text-[11px] text-slate-200">
              {projectName ? projectName : 'Preview'}
              {typeof projectVersion === 'number' && projectVersion > 0 ? ` · v${projectVersion}` : ''}
              <span className="text-cyan-300 ml-1.5">{currentRoute}</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap shrink-0 ${statusMeta.colorClass}`}>
              {statusMeta.icon}
              <span>{statusMeta.label}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400 flex-wrap">
          {/* Device Toggles */}
          <div className="flex items-center gap-1 bg-[#14162e] p-1 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => setDeviceMode('desktop')}
              className={`p-1 rounded transition cursor-pointer ${
                deviceMode === 'desktop' ? 'bg-indigo-600 text-white' : 'hover:text-white'
              }`}
              title="Desktop View (Fluid / 1440x900)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('tablet')}
              className={`p-1 rounded transition cursor-pointer ${
                deviceMode === 'tablet' ? 'bg-indigo-600 text-white' : 'hover:text-white'
              }`}
              title="Tablet View (768x1024)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('mobile')}
              className={`p-1 rounded transition cursor-pointer ${
                deviceMode === 'mobile' ? 'bg-indigo-600 text-white' : 'hover:text-white'
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Preset Selector */}
          {deviceMode === 'mobile' && (
            <select
              value={mobilePreset}
              onChange={(e) => setMobilePreset(e.target.value as any)}
              className="bg-[#14162e] border border-white/10 text-slate-200 text-[11px] rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="390x844">390 × 844</option>
              <option value="375x812">375 × 812</option>
              <option value="430x932">430 × 932</option>
            </select>
          )}

          {/* Share Project */}
          {hasExistingProject && (
            <button
              type="button"
              onClick={() => void handleShareProject()}
              disabled={isOpeningTab || buildState === 'in_progress'}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-200 font-semibold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-45 whitespace-nowrap shrink-0"
              title="Open and copy standalone shareable preview link"
            >
              {shareCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3 text-emerald-400" />}
              <span className="hidden sm:inline">{shareCopied ? 'Shared!' : 'Share'}</span>
            </button>
          )}

          {/* Open in New Tab */}
          {hasExistingProject && (
            <button
              type="button"
              onClick={() => void handleOpenInNewTab()}
              disabled={isOpeningTab || buildState === 'in_progress'}
              className="px-2.5 py-1 rounded-lg bg-[#14162e] hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-45 whitespace-nowrap shrink-0"
              title="Open standalone sandboxed preview in new browser tab"
            >
              {isOpeningTab ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3 text-cyan-300" />}
              <span className="hidden sm:inline">Open in New Tab</span>
            </button>
          )}

          {/* Visual Edit Quick Button */}
          {onOpenVisualEdit && (
            <button
              type="button"
              onClick={onOpenVisualEdit}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-md transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Pencil className="w-3 h-3" />
              <span className="hidden sm:inline">Open Editor</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPreviewFullScreen(!isPreviewFullScreen)}
            className={`p-1.5 rounded bg-[#14162e] border transition cursor-pointer ${
              isPreviewFullScreen
                ? 'border-purple-500/50 text-purple-300 bg-purple-950/40'
                : 'border-white/10 hover:text-white'
            }`}
            title={isPreviewFullScreen ? 'Exit Full Screen' : 'Full Screen Preview Mode'}
          >
            {isPreviewFullScreen ? <Minimize2 className="w-3.5 h-3.5 text-purple-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Runtime Error Diagnostics Banner */}
      {runtimeErrorState && buildState !== 'in_progress' && (
        <div className="bg-rose-950/90 border-b border-rose-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs z-20">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-semibold text-rose-200">Runtime error inside preview</div>
              <div className="text-[11px] text-rose-300/90 font-mono truncate">
                {runtimeErrorState.message}
                {runtimeErrorState.filename ? ` (${runtimeErrorState.filename}${runtimeErrorState.lineno ? `:${runtimeErrorState.lineno}` : ''})` : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setRightTab('code')}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Code2 className="w-3 h-3" />
              View Code
            </button>
            {onFixRuntimeError && (
              <button
                type="button"
                onClick={() => onFixRuntimeError(runtimeErrorState.message)}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Wrench className="w-3 h-3" />
                Fix Error with ANNY
              </button>
            )}
          </div>
        </div>
      )}

      {/* Real Live Application Container */}
      <div
        ref={stageRef}
        className="flex-1 bg-[#03040c] flex items-center justify-center p-2 sm:p-4 overflow-hidden relative isolate"
      >
        <AnimatePresence>
          {(buildState === 'in_progress' || buildState === 'failed') && (
            <AnnyBuildPreviewOverlay
              isBuilding={buildState === 'in_progress'}
              buildState={buildState}
              projectName={projectName}
              userPrompt={currentBuildPrompt}
              currentStage={liveBuildAction}
              progressPct={buildProgressPct}
              stages={buildStages}
              generatedFiles={generatedFiles}
              errorMessage={buildError}
              diagnostics={buildDiagnostics}
              onViewCode={() => setRightTab('code')}
              onViewLogs={() => setRightTab('logs')}
              onRetryBuild={onRetryBuild}
            />
          )}
        </AnimatePresence>

        {authDenialState && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/95 p-6">
            <div className="max-w-md w-full p-6 rounded-2xl bg-[#0d0f1f] border border-amber-500/40 text-center space-y-3 shadow-2xl">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Preview Ownership Authorization Required</h3>
              <p className="text-xs text-slate-400 font-mono">
                Zero project files transferred ({authDenialState.reason}).
              </p>
              {authDenialState.legacyEligible && (
                <button
                  type="button"
                  onClick={() => {
                    const migrated = migrateLegacyLocalProjectOwnership(sanitizedAuthorizedId);
                    if (migrated.migrated) {
                      setAuthDenialState(null);
                      setReloadKey((k) => k + 1);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer transition"
                >
                  Adopt Legacy Local Project into Active Profile
                </button>
              )}
            </div>
          </div>
        )}

        {/* Viewport Frame with Logical Dimensions & Transform Scaling */}
        {isFluid ? (
          <div className="w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-white/10 shadow-2xl relative">
            <iframe
              ref={iframeRef}
              key={`${sanitizedAuthorizedId}-${reloadKey}`}
              src={
                typeof window !== 'undefined'
                  ? `${window.location.origin}?preview=standalone&project=${encodeURIComponent(sanitizedAuthorizedId)}&v=${reloadKey}`
                  : 'http://localhost:3000'
              }
              title="ANNY Live Generated Application"
              className="w-full h-full border-none bg-slate-950"
              sandbox="allow-forms allow-modals allow-scripts"
              referrerPolicy="same-origin"
            />
          </div>
        ) : (
          <div
            style={{
              width: `${targetWidth}px`,
              height: `${targetHeight}px`,
              transform: `scale(${scaleFactor})`,
              transformOrigin: 'top center',
            }}
            className="bg-slate-950 rounded-2xl border-2 border-slate-700/60 shadow-2xl overflow-hidden shrink-0 transition-all duration-300 relative"
          >
            <iframe
              ref={iframeRef}
              key={`${sanitizedAuthorizedId}-${reloadKey}`}
              src={
                typeof window !== 'undefined'
                  ? `${window.location.origin}?preview=standalone&project=${encodeURIComponent(sanitizedAuthorizedId)}&v=${reloadKey}`
                  : 'http://localhost:3000'
              }
              title="ANNY Live Generated Application"
              className="w-full h-full border-none bg-slate-950"
              sandbox="allow-forms allow-modals allow-scripts"
              referrerPolicy="same-origin"
            />
          </div>
        )}
      </div>

      {/* Live Preview Bottom Status Bar */}
      <div className="min-h-9 bg-[#080a18] border-t border-white/10 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span>
            Viewport: <strong className="text-slate-200">{isFluid ? 'Fluid 100%' : `${targetWidth} × ${targetHeight}`}</strong>
          </span>
          <span>
            Scale: <strong className="text-slate-200">{Math.round(scaleFactor * 100)}%</strong>
          </span>
          <span className="hidden sm:inline">
            Project: <strong className="text-slate-200">{sanitizedAuthorizedId}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-semibold ${statusMeta.colorClass}`}>
            Runtime: {statusMeta.label}
          </span>
          <button
            type="button"
            onClick={() => {
              WorkspaceManager.getInstance().restartDevServer();
              setReloadKey((k) => k + 1);
            }}
            className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded border border-purple-500/30 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RotateCw className="w-3 h-3" /> Refresh Preview
          </button>
        </div>
      </div>
    </div>
  );
};


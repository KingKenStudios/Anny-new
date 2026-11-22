import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Loader2, AlertTriangle, Monitor, Tablet, Smartphone, Minimize2, Maximize2, Pencil } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { AnnyBuildPreviewOverlay, type BuildStageItem } from '../AnnyBuildPreviewOverlay';
import { WorkspaceManager } from '../../core/workspaceManager';
import {
  validatePreviewVfsSynMessage,
  readAuthorizedProjectVfsSnapshot,
  buildValidatedVfsSnapshotPayload,
  isValidPreviewFrameMessage,
  generatePreviewHandshakeId
} from '../StandalonePreviewRunner';
import {
  authorizeProjectForPreviewSnapshot,
  invalidatePreviewSessionAuthorizations,
  migrateLegacyLocalProjectOwnership
} from '../../services/projectOwnershipService';

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
  onRetryBuild
}) => {
  const [mobilePreset, setMobilePreset] = useState<'390x844' | '375x812' | '430x932'>('390x844');
  const stageRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [runtimeVerified, setRuntimeVerified] = useState<boolean>(false);

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
      const availWidth = rect.width - 32; // 16px padding each side
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

  const sanitizedAuthorizedId =
    String(activeProjectId || 'ws_default_1').replace(/[^a-zA-Z0-9_-]/g, '') || 'ws_default_1';

  useEffect(() => {
    setRuntimeVerified(false);
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

    const pushSnapshotToPreview = async (
      handshakeId: string,
      nextSeq: number,
      expectedWindow: Window,
      isRefreshOnActiveHandshake = false
    ) => {
      if (authEpochRef.current !== effectEpoch) return;
      const targetWin = iframeRef.current?.contentWindow;
      if (!targetWin || targetWin !== expectedWindow) return;

      const authResult = await authorizeProjectForPreviewSnapshot({
        projectId: sanitizedAuthorizedId,
        previewSessionId,
        expectedIframeWindow: expectedWindow,
        handshakeId,
        isRefreshOnActiveHandshake
      });

      if (authEpochRef.current !== effectEpoch) return;
      if (iframeRef.current?.contentWindow !== expectedWindow) return;

      if (!authResult.authorized || !authResult.context) {
        activeHandshakeRef.current = null;
        setRuntimeVerified(false);
        setAuthDenialState({
          reason: authResult.reason || 'PROJECT_AUTHORIZATION_DENIED',
          legacyEligible: authResult.legacyMigrationEligible
        });
        console.warn('[ANNY Preview] Snapshot authorization denied', {
          projectId: sanitizedAuthorizedId,
          reason: authResult.reason || 'PROJECT_AUTHORIZATION_DENIED'
        });
        return;
      }

      setAuthDenialState(null);
      const files = readAuthorizedProjectVfsSnapshot(authResult.context);
      const built = buildValidatedVfsSnapshotPayload({
        projectId: sanitizedAuthorizedId,
        handshakeId,
        files,
        snapshotSeq: nextSeq
      });
      if (built.valid && built.payload) {
        expectedWindow.postMessage(built.payload, '*');
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
          return;
        }
        activeHandshakeRef.current = {
          projectId: sanitizedAuthorizedId,
          handshakeId: synCheck.handshakeId,
          seq: 1,
          expectedWindow
        };
        void pushSnapshotToPreview(synCheck.handshakeId, 1, expectedWindow, false);
        return;
      }

      if (msgType === 'PREVIEW_READY' && data.projectId === sanitizedAuthorizedId) {
        setRuntimeVerified(true);
      }
      if (msgType === 'PREVIEW_RUNTIME_ERROR') {
        setRuntimeVerified(false);
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

  return (
    <div className={`w-full h-full flex flex-col bg-[#0b0d1b] ${
      isPreviewFullScreen ? 'fixed inset-0 z-[9999] bg-[#070913] w-screen h-screen' : ''
    }`}>
      {isPreviewFullScreen && (
        <button
          onClick={() => setIsPreviewFullScreen(false)}
          className="fixed top-2.5 right-4 z-[999999] px-3.5 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold border border-red-400/50 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xl backdrop-blur-md"
          title="Exit Fullscreen Preview"
        >
          <Minimize2 className="w-4 h-4" />
          <span>Exit Fullscreen</span>
        </button>
      )}

      {/* Browser Toolbar Bar */}
      <div className="h-10 bg-[#0e1022] border-b border-white/10 px-4 flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setReloadKey(k => k + 1)} className="p-1 text-slate-400 hover:text-white rounded" title="Back"><ArrowLeft className="w-3.5 h-3.5" /></button>
          <button onClick={() => setReloadKey(k => k + 1)} className="p-1 text-slate-400 hover:text-white rounded" title="Forward"><ArrowRight className="w-3.5 h-3.5" /></button>
          <button onClick={() => setReloadKey(k => k + 1)} className="p-1 text-slate-400 hover:text-white rounded" title="Reload Preview"><RotateCw className="w-3.5 h-3.5" /></button>

          <div className="flex items-center gap-2 bg-[#14162e] px-3 py-1 rounded-xl border border-white/10 text-slate-300 min-w-[200px]">
            <span className="truncate text-[11px]">http://localhost:3000</span>
            {buildState === 'in_progress' ? (
              <span className="text-purple-300 font-bold flex items-center gap-1.5 text-[10px] bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-cyan-300" />
                {hasExistingProject ? 'Updating...' : 'Building...'}
              </span>
            ) : buildState === 'failed' ? (
              <span className="text-red-400 font-bold flex items-center gap-1 text-[10px] bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                <AlertTriangle className="w-3 h-3 text-red-400" /> Error
              </span>
            ) : (
              <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Verified
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          {/* Device Toggles */}
          <div className="flex items-center gap-1 bg-[#14162e] p-1 rounded-lg border border-white/10">
            <button onClick={() => setDeviceMode('desktop')} className={`p-1 rounded transition ${deviceMode === 'desktop' ? 'bg-indigo-600 text-white' : 'hover:text-white'}`} title="Desktop View (Fluid / 1440x900)"><Monitor className="w-3.5 h-3.5" /></button>
            <button onClick={() => setDeviceMode('tablet')} className={`p-1 rounded transition ${deviceMode === 'tablet' ? 'bg-indigo-600 text-white' : 'hover:text-white'}`} title="Tablet View (768x1024)"><Tablet className="w-3.5 h-3.5" /></button>
            <button onClick={() => setDeviceMode('mobile')} className={`p-1 rounded transition ${deviceMode === 'mobile' ? 'bg-indigo-600 text-white' : 'hover:text-white'}`} title="Mobile View"><Smartphone className="w-3.5 h-3.5" /></button>
          </div>

          {/* Mobile Preset Selector */}
          {deviceMode === 'mobile' && (
            <select
              value={mobilePreset}
              onChange={e => setMobilePreset(e.target.value as any)}
              className="bg-[#14162e] border border-white/10 text-slate-200 text-[11px] rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="390x844">390 × 844 (iPhone 14)</option>
              <option value="375x812">375 × 812 (iPhone X)</option>
              <option value="430x932">430 × 932 (Pro Max)</option>
            </select>
          )}

          {/* Visual Edit Quick Button */}
          {onOpenVisualEdit && (
            <button
              onClick={onOpenVisualEdit}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-md transition-all cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
              <span>Visual Edit</span>
            </button>
          )}

          <button 
            onClick={() => setIsPreviewFullScreen(!isPreviewFullScreen)}
            className={`p-1.5 rounded bg-[#14162e] border transition ${
              isPreviewFullScreen ? 'border-purple-500/50 text-purple-300 bg-purple-950/40' : 'border-white/10 hover:text-white'
            }`}
            title={isPreviewFullScreen ? "Exit Full Screen" : "Full Screen Preview Mode"}
          >
            {isPreviewFullScreen ? <Minimize2 className="w-3.5 h-3.5 text-purple-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Real Live Application Container */}
      <div 
        ref={stageRef}
        className="flex-1 bg-[#03040c] flex items-center justify-center p-4 overflow-hidden relative isolate"
      >
        <AnimatePresence>
          {(buildState === 'in_progress' || buildState === 'failed') && (
            <AnnyBuildPreviewOverlay
              isBuilding={buildState === 'in_progress'}
              buildState={buildState}
              userPrompt={currentBuildPrompt}
              currentStage={liveBuildAction}
              progressPct={buildProgressPct}
              stages={buildStages}
              errorMessage={buildError}
              diagnostics={buildDiagnostics}
              onViewCode={() => setRightTab('code')}
              onViewLogs={() => setRightTab('intelligence')}
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
              key={`${activeProjectId}-${reloadKey}`}
              src={typeof window !== 'undefined' ? `${window.location.origin}?preview=standalone&project=${encodeURIComponent(activeProjectId)}&v=${reloadKey}` : 'http://localhost:3000'}
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
              key={`${activeProjectId}-${reloadKey}`}
              src={typeof window !== 'undefined' ? `${window.location.origin}?preview=standalone&project=${encodeURIComponent(activeProjectId)}&v=${reloadKey}` : 'http://localhost:3000'}
              title="ANNY Live Generated Application"
              className="w-full h-full border-none bg-slate-950"
              sandbox="allow-forms allow-modals allow-scripts"
              referrerPolicy="same-origin"
            />
          </div>
        )}
      </div>

      {/* Live Preview Bottom Status Bar */}
      <div className="h-9 bg-[#080a18] border-t border-white/10 px-4 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
        <div className="flex items-center gap-4">
          <span>Viewport: <strong className="text-slate-200">{isFluid ? 'Fluid 100%' : `${targetWidth} × ${targetHeight}`}</strong></span>
          <span>Scale: <strong className="text-slate-200">{Math.round(scaleFactor * 100)}%</strong></span>
          <span>Project ID: <strong className="text-slate-200">{activeProjectId}</strong></span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 font-bold ${(previewRuntimeReady && runtimeVerified) ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${(previewRuntimeReady && runtimeVerified) ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} /> {(previewRuntimeReady && runtimeVerified) ? 'Preview Runtime: Live' : 'Preview Runtime: Waiting'}
          </span>
          <button onClick={() => WorkspaceManager.getInstance().restartDevServer()} className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded border border-purple-500/30 font-bold flex items-center gap-1">
            <RotateCw className="w-3 h-3" /> Refresh Preview
          </button>
        </div>
      </div>
    </div>
  );
};


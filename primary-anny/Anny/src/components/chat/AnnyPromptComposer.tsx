import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Paperclip,
  Globe,
  Zap,
  Brain,
  Code2,
  Mic,
  MicOff,
  Send,
  Square,
  Maximize2,
  Minimize2,
  FileText,
  X,
} from 'lucide-react';
import { calculateAutoTextareaHeight, shouldSubmitOnKeyDown } from './composerUtils';

export interface ComposerAttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

export interface AnnyPromptComposerProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onSend: (overrideText?: string) => void;
  onStop: () => void;
  isWorking: boolean;
  placeholder?: string;
  variant?: 'main' | 'split';
  theme?: 'dark' | 'light';
  attachedFiles: ComposerAttachedFile[];
  onRemoveAttachedFile: (id: string) => void;
  visionSnapshot: string | null;
  onClearVisionSnapshot: () => void;
  selectedImageForEdit?: { url: string; label?: string } | null;
  onClearSelectedImageForEdit?: () => void;
  isListening: boolean;
  isRecordingAudio: boolean;
  isTranscribingAudio: boolean;
  onToggleVoiceInput: () => void;
  onStopSpeechRecognition: () => void;
  onStopMediaRecording: (cancel: boolean) => void;
  onAttachFilesClick: () => void;
  isWebSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  isProToolsActive: boolean;
  onToggleProTools: () => void;
  activeModelLabel: string;
  isModelPopoverActive: boolean;
  selectedModelId: string;
  onToggleModelPopover: () => void;
  includeCodeContext: boolean;
  onToggleCodeContext: () => void;
  vfsFileCount: number;
}

export const AnnyPromptComposer: React.FC<AnnyPromptComposerProps> = ({
  prompt,
  setPrompt,
  onSend,
  onStop,
  isWorking,
  placeholder = 'Ask Anny to design, engineer, analyze, or build...',
  variant = 'main',
  theme = 'dark',
  attachedFiles,
  onRemoveAttachedFile,
  visionSnapshot,
  onClearVisionSnapshot,
  selectedImageForEdit,
  onClearSelectedImageForEdit,
  isListening,
  isRecordingAudio,
  isTranscribingAudio,
  onToggleVoiceInput,
  onStopSpeechRecognition,
  onStopMediaRecording,
  onAttachFilesClick,
  isWebSearchEnabled,
  onToggleWebSearch,
  isProToolsActive,
  onToggleProTools,
  activeModelLabel,
  isModelPopoverActive,
  selectedModelId,
  onToggleModelPopover,
  includeCodeContext,
  onToggleCodeContext,
  vfsFileCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTouchPrimary, setIsTouchPrimary] = useState(false);
  const [compactOverflowY, setCompactOverflowY] = useState<'hidden' | 'auto'>('hidden');
  const [expandedOverflowY, setExpandedOverflowY] = useState<'hidden' | 'auto'>('hidden');

  const compactTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const expandedTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  const isLight = theme === 'light';
  const hasSubmitPayload = Boolean(prompt.trim() || attachedFiles.length > 0 || visionSnapshot);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const coarseMql = window.matchMedia('(pointer: coarse)');
    const syncPointerMode = () => setIsTouchPrimary(coarseMql.matches);
    syncPointerMode();
    coarseMql.addEventListener?.('change', syncPointerMode);
    return () => coarseMql.removeEventListener?.('change', syncPointerMode);
  }, []);

  const syncSelectionFromRef = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    selectionRef.current = {
      start: el.selectionStart ?? el.value.length,
      end: el.selectionEnd ?? el.value.length,
    };
  };

  // Auto-resize inline multiline textarea cleanly without clipping or horizontal overflow
  useLayoutEffect(() => {
    const el = compactTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const minHeight = variant === 'split' ? 48 : 54;
    const maxHeight = variant === 'split' ? 190 : 230;
    const { heightPx, overflowY } = calculateAutoTextareaHeight({
      scrollHeight: el.scrollHeight,
      minHeight,
      maxHeight,
    });
    el.style.height = `${heightPx}px`;
    setCompactOverflowY(overflowY);
  }, [prompt, variant, isExpanded]);

  // Auto-resize expanded modal textarea
  useLayoutEffect(() => {
    if (!isExpanded) return;
    const el = expandedTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxH = typeof window !== 'undefined' ? Math.max(280, Math.round(window.innerHeight * 0.52)) : 420;
    const { heightPx, overflowY } = calculateAutoTextareaHeight({
      scrollHeight: el.scrollHeight,
      minHeight: 200,
      maxHeight: maxH,
    });
    el.style.height = `${heightPx}px`;
    setExpandedOverflowY(overflowY);
  }, [prompt, isExpanded]);

  // Escape closes expanded modal while restoring focus & selection cleanly
  useEffect(() => {
    if (!isExpanded) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleToggleExpand(false);
      }
    };
    window.addEventListener('keydown', onEsc, true);
    return () => window.removeEventListener('keydown', onEsc, true);
  }, [isExpanded]);

  const handleToggleExpand = (nextExpanded: boolean) => {
    const activeEl = isExpanded ? expandedTextareaRef.current : compactTextareaRef.current;
    if (activeEl) {
      selectionRef.current = {
        start: activeEl.selectionStart ?? prompt.length,
        end: activeEl.selectionEnd ?? prompt.length,
      };
    }
    setIsExpanded(nextExpanded);
    requestAnimationFrame(() => {
      const targetEl = nextExpanded ? expandedTextareaRef.current : compactTextareaRef.current;
      if (targetEl) {
        targetEl.focus({ preventScroll: true });
        if (selectionRef.current) {
          const maxIdx = targetEl.value.length;
          const start = Math.min(selectionRef.current.start, maxIdx);
          const end = Math.min(selectionRef.current.end, maxIdx);
          try {
            targetEl.setSelectionRange(start, end);
          } catch {}
        }
      }
    });
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const nativeComposing = Boolean((e.nativeEvent as KeyboardEvent)?.isComposing);
    if (
      shouldSubmitOnKeyDown(
        {
          key: e.key,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          altKey: e.altKey,
          isComposing: nativeComposing,
        },
        { isTouchPrimary, isExpanded }
      )
    ) {
      if (isWorking || !hasSubmitPayload) return;
      e.preventDefault();
      if (isExpanded) setIsExpanded(false);
      onSend();
    }
  };

  const handleSubmitAction = () => {
    if (isWorking) {
      onStop();
      return;
    }
    if (!hasSubmitPayload) return;
    if (isExpanded) setIsExpanded(false);
    onSend();
  };

  const renderStatusAndAttachments = () => (
    <>
      {selectedImageForEdit && (
        <div
          className={`flex items-center justify-between gap-2 px-2.5 py-1.5 mb-2 rounded-xl border text-xs ${
            isLight
              ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
              : 'bg-indigo-950/70 border-indigo-400/40 text-indigo-100'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={selectedImageForEdit.url}
              alt="Selected for edit"
              className="w-6 h-6 rounded object-cover border border-white/20 shrink-0"
            />
            <span className="truncate">
              Editing: <strong>{selectedImageForEdit.label || 'Selected image'}</strong> (original preserved)
            </span>
          </div>
          {onClearSelectedImageForEdit && (
            <button
              type="button"
              onClick={onClearSelectedImageForEdit}
              aria-label="Clear selected image for editing"
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-white/10 font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {(attachedFiles.length > 0 || visionSnapshot) && (
        <div
          className={`flex flex-wrap items-center gap-1.5 mb-2 p-2 rounded-xl border text-xs ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#06091e] border-white/10'
          }`}
        >
          {visionSnapshot && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 font-mono text-[11px]">
              <img
                src={`data:image/jpeg;base64,${visionSnapshot}`}
                alt="Vision snapshot"
                className="w-5 h-5 object-cover rounded shrink-0"
              />
              <span>vision-snapshot.jpg</span>
              <button
                type="button"
                onClick={onClearVisionSnapshot}
                aria-label="Remove vision snapshot"
                className="text-slate-300 hover:text-white ml-1 font-bold rounded hover:bg-white/10 px-1 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}
          {attachedFiles.map((f) => (
            <div
              key={f.id}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-mono text-[11px] ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800'
                  : 'bg-indigo-950/80 border-indigo-500/40 text-cyan-300'
              }`}
            >
              {f.previewUrl ? (
                <img src={f.previewUrl} alt={f.name} className="w-4 h-4 object-cover rounded shrink-0" />
              ) : (
                <FileText className="w-3 h-3 text-cyan-500 shrink-0" />
              )}
              <span className="truncate max-w-[140px]">{f.name}</span>
              <button
                type="button"
                onClick={() => onRemoveAttachedFile(f.id)}
                aria-label={`Remove attached file ${f.name}`}
                className="opacity-70 hover:opacity-100 ml-1 font-bold rounded hover:bg-white/10 px-1 cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {(isListening || isRecordingAudio || isTranscribingAudio) && (
        <div className="mb-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-100">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>
              {isTranscribingAudio
                ? 'Transcribing voice...'
                : isRecordingAudio
                ? 'Recording voice... Tap Stop to transcribe'
                : 'Listening... Speak naturally'}
            </span>
          </span>
          {!isTranscribingAudio && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (isRecordingAudio ? onStopMediaRecording(false) : onStopSpeechRecognition())}
                className="px-2.5 py-1 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-white text-[11px] font-semibold cursor-pointer"
              >
                Stop
              </button>
              {isRecordingAudio && (
                <button
                  type="button"
                  onClick={() => onStopMediaRecording(true)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );

  const renderControlStrip = (inModal = false) => (
    <div
      className={`flex items-center justify-between gap-2 pt-2 mt-2 border-t flex-wrap ${
        isLight ? 'border-slate-200 text-slate-600' : 'border-white/10 text-slate-400'
      }`}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={onAttachFilesClick}
          aria-label="Attach files"
          title="Attach images, PDFs, code, CAD/DXF, audio, or archives"
          className={`min-h-[38px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
          }`}
        >
          <Paperclip className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Attach</span>
        </button>

        <button
          type="button"
          onClick={onToggleWebSearch}
          aria-label="Toggle web search grounding"
          aria-pressed={isWebSearchEnabled}
          className={`min-h-[38px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
            isWebSearchEnabled
              ? 'bg-blue-500/20 border-blue-400/60 text-blue-200'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>{isWebSearchEnabled ? 'Web Live' : 'Web'}</span>
        </button>

        {!inModal && (
          <>
            <button
              type="button"
              onClick={onToggleProTools}
              aria-label="Open ANNY Pro Tools"
              aria-expanded={isProToolsActive}
              className={`min-h-[38px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                isProToolsActive
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                  : isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className={variant === 'split' ? 'hidden sm:inline' : ''}>Pro Tools</span>
            </button>

            <button
              type="button"
              onClick={onToggleModelPopover}
              aria-label="Select neural model route"
              aria-expanded={isModelPopoverActive}
              className={`min-h-[38px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                isModelPopoverActive || selectedModelId !== 'auto'
                  ? 'bg-purple-500/20 border-purple-400/60 text-purple-200'
                  : isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="hidden sm:inline">{activeModelLabel.split(' ')[0]}</span>
            </button>

            <button
              type="button"
              onClick={onToggleCodeContext}
              aria-label="Include workspace code context"
              aria-pressed={includeCodeContext}
              className={`min-h-[38px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                includeCodeContext
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                  : isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
              }`}
              title={`Workspace context (${vfsFileCount} files)`}
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Code</span>
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <span className="hidden md:inline text-[11px] font-mono opacity-75 mr-1">
          {isTouchPrimary ? 'Tap Send to submit' : inModal ? 'Enter to send • Shift+Enter newline' : 'Enter sends • Shift+Enter newline'}
        </span>

        <button
          type="button"
          onClick={() => handleToggleExpand(!inModal)}
          aria-label={inModal ? 'Collapse prompt composer' : 'Expand prompt composer'}
          title={inModal ? 'Collapse composer (Esc)' : 'Expand to full composer'}
          className={`min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
          }`}
        >
          {inModal ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onToggleVoiceInput}
          disabled={isTranscribingAudio}
          aria-label={isListening || isRecordingAudio ? 'Stop voice dictation' : 'Start voice dictation'}
          title={isListening || isRecordingAudio ? 'Stop voice capture' : 'Voice dictation'}
          className={`min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
            isListening || isRecordingAudio
              ? 'bg-rose-500/25 text-rose-300 border border-rose-500/60 shadow-[0_0_12px_rgba(239,68,68,0.45)]'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-cyan-700 border border-slate-300'
              : 'bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10'
          }`}
        >
          {isListening || isRecordingAudio ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleSubmitAction}
          disabled={!isWorking && !hasSubmitPayload}
          aria-label={isWorking ? 'Stop response generation' : 'Send message'}
          title={isWorking ? 'Stop generation' : 'Send prompt'}
          className={`min-h-[44px] min-w-[44px] sm:min-h-[36px] px-3.5 rounded-xl flex items-center justify-center gap-1.5 shrink-0 font-semibold text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isWorking
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
              : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white shadow-md hover:brightness-110'
          }`}
        >
          {isWorking ? (
            <>
              <Square className="w-3.5 h-3.5 fill-white text-white" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div
        data-testid={`anny-prompt-composer-${variant}`}
        className={`rounded-2xl border p-3 transition-all backdrop-blur-md shadow-lg ${
          isLight
            ? 'bg-white border-slate-300 text-slate-900 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20'
            : 'bg-[#0b0f2d]/95 border-white/15 text-slate-100 focus-within:border-cyan-400/80 focus-within:ring-2 focus-within:ring-cyan-500/20'
        }`}
      >
        {renderStatusAndAttachments()}

        <div className="w-full min-w-0">
          <textarea
            ref={compactTextareaRef}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              syncSelectionFromRef(e.target);
            }}
            onSelect={(e) => syncSelectionFromRef(e.currentTarget)}
            onKeyDown={handleTextareaKeyDown}
            rows={variant === 'split' ? 2 : 2}
            placeholder={placeholder}
            aria-label="Prompt input"
            data-testid="anny-composer-textarea"
            style={{ overflowY: compactOverflowY }}
            className={`anny-composer-textarea w-full bg-transparent border-none outline-none text-[16px] leading-6 sm:text-[15px] sm:leading-6 px-1 py-1 select-text ${
              isLight ? 'text-slate-900 placeholder-slate-500' : 'text-white placeholder-slate-400'
            }`}
          />
        </div>

        {renderControlStrip(false)}
      </div>

      {/* Expandable Full-Focus Modal Composer */}
      {isExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded prompt composer"
          data-testid="anny-expanded-composer-modal"
          className="fixed inset-0 z-[1200] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleToggleExpand(false);
          }}
        >
          <div
            className={`w-full max-w-4xl rounded-2xl border p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92dvh] ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900'
                : 'bg-[#080d22] border-cyan-500/35 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-white/10">
              <div>
                <h2 className="text-sm font-bold tracking-wide">Expanded Prompt Composer</h2>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Draft long specifications, architectural briefs, multi-paragraph instructions, or code reviews.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleExpand(false)}
                aria-label="Close expanded composer"
                className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renderStatusAndAttachments()}

            <div className="flex-1 min-h-0 overflow-hidden">
              <textarea
                ref={expandedTextareaRef}
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  syncSelectionFromRef(e.target);
                }}
                onSelect={(e) => syncSelectionFromRef(e.currentTarget)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={placeholder}
                aria-label="Expanded prompt input"
                data-testid="anny-expanded-composer-textarea"
                style={{ overflowY: expandedOverflowY }}
                className={`anny-composer-textarea w-full rounded-xl border p-3.5 outline-none text-[16px] leading-6 select-text ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500 focus:border-indigo-500'
                    : 'bg-[#040714] border-white/15 text-white placeholder-slate-400 focus:border-cyan-400'
                }`}
              />
            </div>

            {renderControlStrip(true)}
          </div>
        </div>
      )}
    </>
  );
};

/**
 * ANNY — Authoritative Composer Behavior Utilities
 * Pure deterministic helpers governing textarea auto-sizing, Enter vs Shift+Enter
 * keyboard behavior across desktop and mobile, cursor preservation across expand/collapse,
 * and draft restoration if message submission fails.
 */

export interface ComposerKeyEventLike {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
}

export interface AutoHeightOptions {
  scrollHeight: number;
  minHeight?: number;
  maxHeight?: number;
}

export interface AutoHeightResult {
  heightPx: number;
  overflowY: 'hidden' | 'auto';
}

export function calculateAutoTextareaHeight(options: AutoHeightOptions): AutoHeightResult {
  const minHeight = Math.max(40, options.minHeight ?? 52);
  const maxHeight = Math.max(minHeight, options.maxHeight ?? 220);
  const measured = Math.max(minHeight, Number.isFinite(options.scrollHeight) ? options.scrollHeight : minHeight);

  if (measured >= maxHeight) {
    return {
      heightPx: maxHeight,
      overflowY: 'auto',
    };
  }

  return {
    heightPx: measured,
    overflowY: 'hidden',
  };
}

/**
 * Determines whether a keydown inside the multiline prompt composer should submit
 * or allow a natural newline.
 * - Never submits during IME composition.
 * - Shift+Enter always inserts a newline (never submits).
 * - Ctrl+Enter / Cmd+Enter submits on both desktop and mobile hardware keyboards.
 * - On touch/mobile virtual keyboards (`isTouchPrimary === true`), Enter inserts a newline
 *   so users can write multi-paragraph prompts naturally and tap Send to submit.
 * - On desktop (`isTouchPrimary === false`), bare Enter submits.
 */
export function shouldSubmitOnKeyDown(
  event: ComposerKeyEventLike,
  options: { isTouchPrimary?: boolean; isExpanded?: boolean } = {}
): boolean {
  if (event.isComposing) return false;
  if (event.key !== 'Enter') return false;
  if (event.shiftKey || event.altKey) return false;
  if (event.ctrlKey || event.metaKey) return true;
  if (options.isTouchPrimary) return false;
  return true;
}

export function canSubmitPrompt(params: {
  prompt: string;
  attachedCount: number;
  hasVisionSnapshot: boolean;
  isWorking: boolean;
}): boolean {
  if (params.isWorking) return false;
  return Boolean(params.prompt.trim() || params.attachedCount > 0 || params.hasVisionSnapshot);
}

/**
 * Restores the exact failed draft if the user hasn't typed something else since sending.
 */
export function resolveDraftAfterFailedSend(
  currentPrompt: string,
  submittedRawDraft: string
): string {
  if (!currentPrompt.trim()) {
    return submittedRawDraft;
  }
  return currentPrompt;
}

/**
 * ANNY — Canonical Media Response & Source Normalization
 *
 * Unifies image and audio response contracts across:
 *  - Backend Express endpoints (/api/creative/image, /api/router/image, /api/creative/audio)
 *  - Frontend clients (imageGenerationEngine, AnnyWorkspace, KingKenStudiosView, GeneratedImageGallery, ImageLightboxViewer)
 *  - Specialist workers & Reality suites
 *
 * Prevents regressions where callers read `data.base64 || data.url` while providers return `imageUrl` or `primaryImageUrl`,
 * or where raw base64 is treated as a URL path or remote URLs are mis-wrapped as base64.
 */

export interface ImageSourceInput {
  imageUrl?: string;
  url?: string;
  primaryImageUrl?: string;
  base64?: string;
  mimeType?: string;
  primaryMimeType?: string;
}

export interface NormalizedImageOutput {
  valid: boolean;
  src: string;
  imageUrl: string;
  url: string;
  base64?: string;
  mimeType: string;
  isDataUrl: boolean;
  isRemoteUrl: boolean;
  isRelativeUrl: boolean;
  error?: string;
}

export interface NormalizedAudioOutput {
  valid: boolean;
  src: string;
  audioUrl: string;
  url: string;
  base64?: string;
  mimeType: string;
  isDataUrl: boolean;
  error?: string;
}

const IMAGE_DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+)(?:;charset=[^;,]+)?(;base64)?,([\s\S]+)$/i;
const URL_HTTP_RE = /^https?:\/\/[^\s]+$/i;
const BASE64_BODY_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export function detectImageMimeFromBase64(base64Payload: string, fallback = 'image/png'): string {
  const clean = (base64Payload || '').replace(/\s+/g, '');
  if (!clean) return fallback;
  if (clean.startsWith('iVBOR')) return 'image/png';
  if (clean.startsWith('/9j/')) return 'image/jpeg';
  if (clean.startsWith('UklGR')) return 'image/webp';
  if (clean.startsWith('R0lGOD')) return 'image/gif';
  if (clean.startsWith('PHN2Zy') || clean.startsWith('PD94bWw')) return 'image/svg+xml';
  return fallback;
}

export function extractBase64FromDataUrl(dataUrl: string): { base64: string; mimeType: string } | null {
  const match = (dataUrl || '').trim().match(IMAGE_DATA_URL_RE);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || '';
  if (!payload.trim()) return null;
  if (isBase64) {
    return { mimeType, base64: payload.replace(/\s+/g, '') };
  }
  // UTF-8 encoded SVG data URL -> convert to base64 if needed
  try {
    const decoded = decodeURIComponent(payload);
    if (typeof Buffer !== 'undefined') {
      return { mimeType, base64: Buffer.from(decoded, 'utf-8').toString('base64') };
    }
    return { mimeType, base64: btoa(unescape(encodeURIComponent(decoded))) };
  } catch {
    return null;
  }
}

export function isLikelyRawBase64(value: string): boolean {
  const compact = (value || '').replace(/\s+/g, '');
  if (compact.length < 24) return false;
  if (compact.startsWith('http://') || compact.startsWith('https://') || compact.startsWith('blob:') || compact.startsWith('data:')) {
    return false;
  }
  if (compact.startsWith('/') && !compact.startsWith('/9j/')) {
    return false;
  }
  return BASE64_BODY_RE.test(compact);
}

/**
 * Resolves any combination of `imageUrl`, `primaryImageUrl`, `url`, and `base64`
 * into one guaranteed renderable image `src` plus synchronized metadata.
 */
export function normalizeImageSource(input: string | ImageSourceInput | null | undefined): NormalizedImageOutput {
  if (!input) {
    return { valid: false, src: '', imageUrl: '', url: '', mimeType: 'application/octet-stream', isDataUrl: false, isRemoteUrl: false, isRelativeUrl: false, error: 'Empty image payload.' };
  }

  const candidateUrl =
    typeof input === 'string'
      ? input.trim()
      : (input.imageUrl || input.primaryImageUrl || input.url || '').trim();
  const candidateBase64 = typeof input === 'string' ? '' : (input.base64 || '').trim();
  const declaredMime =
    typeof input === 'string'
      ? ''
      : (input.mimeType || input.primaryMimeType || '').split(';')[0].trim().toLowerCase();

  const rawCandidate = candidateUrl || candidateBase64;
  if (!rawCandidate) {
    return { valid: false, src: '', imageUrl: '', url: '', mimeType: declaredMime || 'application/octet-stream', isDataUrl: false, isRemoteUrl: false, isRelativeUrl: false, error: 'No imageUrl, url, or base64 field provided.' };
  }

  // Reject HTML / JSON error text masquerading as an image string
  if (/^\s*(<!doctype\s+html|<html\b|\{\s*"error")/i.test(rawCandidate)) {
    return { valid: false, src: '', imageUrl: '', url: '', mimeType: 'text/html', isDataUrl: false, isRemoteUrl: false, isRelativeUrl: false, error: 'Image field contains HTML or JSON error text instead of an image.' };
  }

  // Raw SVG XML string
  if (/^\s*(?:<\?xml[\s\S]*?)?<svg[\s>]/i.test(rawCandidate)) {
    const encoded = typeof Buffer !== 'undefined'
      ? Buffer.from(rawCandidate, 'utf-8').toString('base64')
      : btoa(unescape(encodeURIComponent(rawCandidate)));
    const dataUrl = `data:image/svg+xml;base64,${encoded}`;
    return {
      valid: true,
      src: dataUrl,
      imageUrl: dataUrl,
      url: dataUrl,
      base64: encoded,
      mimeType: 'image/svg+xml',
      isDataUrl: true,
      isRemoteUrl: false,
      isRelativeUrl: false,
    };
  }

  // Existing data:image/... URL
  if (rawCandidate.startsWith('data:')) {
    const match = rawCandidate.match(IMAGE_DATA_URL_RE);
    if (!match || !match[3].trim()) {
      return { valid: false, src: '', imageUrl: '', url: '', mimeType: declaredMime || 'application/octet-stream', isDataUrl: false, isRemoteUrl: false, isRelativeUrl: false, error: 'Invalid or non-image data URL.' };
    }
    const mimeType = match[1].toLowerCase();
    const extracted = extractBase64FromDataUrl(rawCandidate);
    return {
      valid: true,
      src: rawCandidate,
      imageUrl: rawCandidate,
      url: rawCandidate,
      base64: extracted?.base64,
      mimeType,
      isDataUrl: true,
      isRemoteUrl: false,
      isRelativeUrl: false,
    };
  }

  // blob: URL
  if (rawCandidate.startsWith('blob:')) {
    return {
      valid: true,
      src: rawCandidate,
      imageUrl: rawCandidate,
      url: rawCandidate,
      mimeType: declaredMime || 'image/png',
      isDataUrl: false,
      isRemoteUrl: false,
      isRelativeUrl: false,
    };
  }

  // Relative asset path (/api/creative/image/asset/... or /assets/...)
  if (rawCandidate.startsWith('/')) {
    // Guard: never treat '/9j/...' raw JPEG base64 as a relative filesystem path!
    if (isLikelyRawBase64(rawCandidate)) {
      const compact = rawCandidate.replace(/\s+/g, '');
      const mimeType = detectImageMimeFromBase64(compact, declaredMime || 'image/jpeg');
      const dataUrl = `data:${mimeType};base64,${compact}`;
      return {
        valid: true,
        src: dataUrl,
        imageUrl: dataUrl,
        url: dataUrl,
        base64: compact,
        mimeType,
        isDataUrl: true,
        isRemoteUrl: false,
        isRelativeUrl: false,
      };
    }
    return {
      valid: true,
      src: rawCandidate,
      imageUrl: rawCandidate,
      url: rawCandidate,
      mimeType: declaredMime || 'image/png',
      isDataUrl: false,
      isRemoteUrl: false,
      isRelativeUrl: true,
    };
  }

  // Remote HTTP(S) URL
  if (URL_HTTP_RE.test(rawCandidate)) {
    return {
      valid: true,
      src: rawCandidate,
      imageUrl: rawCandidate,
      url: rawCandidate,
      mimeType: declaredMime || 'image/png',
      isDataUrl: false,
      isRemoteUrl: true,
      isRelativeUrl: false,
    };
  }

  // Raw base64 payload (either passed in candidateUrl or candidateBase64)
  const b64Source = candidateBase64 || candidateUrl;
  if (isLikelyRawBase64(b64Source)) {
    const compact = b64Source.replace(/\s+/g, '');
    const mimeType = detectImageMimeFromBase64(compact, declaredMime && declaredMime.startsWith('image/') ? declaredMime : 'image/png');
    const dataUrl = `data:${mimeType};base64,${compact}`;
    return {
      valid: true,
      src: dataUrl,
      imageUrl: dataUrl,
      url: dataUrl,
      base64: compact,
      mimeType,
      isDataUrl: true,
      isRemoteUrl: false,
      isRelativeUrl: false,
    };
  }

  return {
    valid: false,
    src: '',
    imageUrl: '',
    url: '',
    mimeType: declaredMime || 'application/octet-stream',
    isDataUrl: false,
    isRemoteUrl: false,
    isRelativeUrl: false,
    error: 'Unrecognized image source format (not a valid URL, data URL, SVG, or base64 image).',
  };
}

export function normalizeAudioSource(input: {
  audioUrl?: string;
  url?: string;
  base64?: string;
  mimeType?: string;
} | null | undefined): NormalizedAudioOutput {
  if (!input) {
    return { valid: false, src: '', audioUrl: '', url: '', mimeType: 'audio/wav', isDataUrl: false, error: 'Empty audio payload.' };
  }
  const candidateUrl = (input.audioUrl || input.url || '').trim();
  const candidateBase64 = (input.base64 || '').trim();
  const mime = (input.mimeType || 'audio/wav').split(';')[0].trim().toLowerCase();

  if (candidateUrl.startsWith('data:audio/')) {
    const m = candidateUrl.match(/^data:(audio\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
    if (!m || !m[2].trim()) {
      return { valid: false, src: '', audioUrl: '', url: '', mimeType: mime, isDataUrl: false, error: 'Malformed audio data URL.' };
    }
    return {
      valid: true,
      src: candidateUrl,
      audioUrl: candidateUrl,
      url: candidateUrl,
      base64: m[2].replace(/\s+/g, ''),
      mimeType: m[1].toLowerCase(),
      isDataUrl: true,
    };
  }

  if (candidateUrl.startsWith('https://') || candidateUrl.startsWith('http://') || candidateUrl.startsWith('/') || candidateUrl.startsWith('blob:')) {
    return {
      valid: true,
      src: candidateUrl,
      audioUrl: candidateUrl,
      url: candidateUrl,
      mimeType: mime,
      isDataUrl: false,
    };
  }

  if (candidateBase64 && /^[A-Za-z0-9+/=\s]+$/.test(candidateBase64) && candidateBase64.replace(/\s+/g, '').length > 32) {
    const compact = candidateBase64.replace(/\s+/g, '');
    const dataUrl = `data:${mime.startsWith('audio/') ? mime : 'audio/wav'};base64,${compact}`;
    return {
      valid: true,
      src: dataUrl,
      audioUrl: dataUrl,
      url: dataUrl,
      base64: compact,
      mimeType: mime.startsWith('audio/') ? mime : 'audio/wav',
      isDataUrl: true,
    };
  }

  return { valid: false, src: '', audioUrl: '', url: '', mimeType: mime, isDataUrl: false, error: 'No valid audioUrl or base64 audio data provided.' };
}

/**
 * Ensures any CreativeImageResult-like object carries canonical, synchronized URL and MIME fields.
 */
export function attachCanonicalImageFields<T extends Record<string, any>>(payload: T): T & {
  imageUrl: string;
  url: string;
  primaryImageUrl: string;
  mimeType: string;
  primaryMimeType: string;
  base64?: string;
} {
  const normalized = normalizeImageSource({
    imageUrl: payload.imageUrl,
    primaryImageUrl: payload.primaryImageUrl,
    url: payload.url,
    base64: payload.base64,
    mimeType: payload.mimeType,
    primaryMimeType: payload.primaryMimeType,
  });

  const canonicalUrl = normalized.valid ? normalized.src : '';
  const canonicalMime = normalized.valid
    ? normalized.mimeType
    : (payload.primaryMimeType || payload.mimeType || 'application/octet-stream');

  return {
    ...payload,
    primaryImageUrl: canonicalUrl,
    imageUrl: canonicalUrl,
    url: canonicalUrl,
    primaryMimeType: canonicalMime,
    mimeType: canonicalMime,
    ...(normalized.base64 ? { base64: normalized.base64 } : {}),
  };
}

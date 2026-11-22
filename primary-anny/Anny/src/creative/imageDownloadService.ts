/**
 * ANNY — Verified Image Download & Integrity Service
 *
 * Guarantees reliable, non-corrupted downloads across:
 *  - Data URLs (Base64 raster & SVG)
 *  - Raw Base64 payloads
 *  - Blob objects & blob: URLs
 *  - Authenticated ANNY server asset URLs (/api/creative/image/asset/...)
 *  - Validated remote HTTPS image URLs
 *
 * Strictly enforces:
 *  - Real binary/XML header validation (rejects HTML error pages, JSON payloads, empty files)
 *  - SVG XSS sanitization before download
 *  - Accurate MIME-to-extension mapping (.png, .jpg, .webp, .svg — NEVER forces .jpg)
 *  - Safe, human-readable sanitized filenames (e.g., King_Ken_Logo_01.png)
 *  - Expired URL fallback to cached server asset or lossless inline data URL
 */

import { base64ToBytes, sanitizeAndValidateSvg, validateImageAsset } from './ImageQualityValidator';

export interface DownloadableImageSource {
  url?: string;
  fallbackUrl?: string;
  fallbackDataUrl?: string;
  blob?: Blob;
  base64?: string;
  declaredMimeType?: string;
  title?: string;
  index?: number;
  filename?: string;
}

export interface PreparedImageDownload {
  ok: boolean;
  bytes?: Uint8Array;
  mimeType: string;
  extension: 'png' | 'jpg' | 'webp' | 'svg';
  filename: string;
  byteLength: number;
  width: number;
  height: number;
  sha256: string;
  usedFallback: boolean;
  error?: string;
  fallbackUrl?: string;
}

export type ImageDownloadFetcher = (url: string, init?: RequestInit) => Promise<Response>;

export function mimeTypeToExtension(mimeType: string): 'png' | 'jpg' | 'webp' | 'svg' {
  const normalized = (mimeType || '').split(';')[0].trim().toLowerCase();
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'jpg';
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/svg+xml') return 'svg';
  return 'png';
}

export function buildSafeImageFilename(params: {
  title?: string;
  filename?: string;
  index?: number;
  mimeType: string;
}): string {
  const ext = mimeTypeToExtension(params.mimeType);
  const rawBase = (params.filename || params.title || 'ANNY_Image')
    .replace(/\.(png|jpe?g|webp|svg|gif|bmp)$/i, '')
    .replace(/\.\.+/g, '_')
    .replace(/[/\\:*?"<>|\x00-\x1f]/g, ' ')
    .trim();

  const words = rawBase
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 6);

  const stem = words.length > 0 ? words.join('_').slice(0, 64) : 'ANNY_Image';
  const indexSuffix =
    typeof params.index === 'number' && Number.isFinite(params.index) && params.index > 0
      ? `_${String(Math.floor(params.index)).padStart(2, '0')}`
      : '';

  return `${stem}${indexSuffix}.${ext}`;
}

export function isAllowedImageDownloadUrl(rawUrl: string): boolean {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('blob:')) return true;
  if (trimmed.startsWith('/api/creative/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function looksLikeHtmlOrJsonError(bytes: Uint8Array, contentType?: string): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('text/html') || ct.includes('application/json') || ct.includes('text/plain')) {
    return true;
  }
  const head = new TextDecoder().decode(bytes.slice(0, 256)).trim().toLowerCase();
  if (head.startsWith('<!doctype html') || head.startsWith('<html') || head.startsWith('{"error"') || head.startsWith('{"success":false')) {
    return true;
  }
  return false;
}

function decodeDataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
  const base64Match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/i);
  if (base64Match) {
    return {
      mimeType: base64Match[1].trim().toLowerCase(),
      bytes: base64ToBytes(base64Match[2]),
    };
  }
  const utf8Match = dataUrl.match(/^data:([^;,]+)(?:;charset=[^,]+)?,([\s\S]+)$/i);
  if (utf8Match) {
    const mimeType = utf8Match[1].trim().toLowerCase();
    const decoded = decodeURIComponent(utf8Match[2]);
    return {
      mimeType,
      bytes: new TextEncoder().encode(decoded),
    };
  }
  throw new Error('Malformed image data URL.');
}

async function resolveUrlToBytes(
  url: string,
  fetcher: ImageDownloadFetcher
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  if (!isAllowedImageDownloadUrl(url)) {
    throw new Error(`Blocked unsafe or unsupported image URL scheme.`);
  }
  if (url.startsWith('data:')) {
    return decodeDataUrlToBytes(url);
  }
  const response = await fetcher(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Image download source returned HTTP ${response.status}`);
  }
  const contentType = response.headers?.get?.('content-type') || '';
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new Error('Image source returned an empty 0-byte payload.');
  }
  if (looksLikeHtmlOrJsonError(buffer, contentType)) {
    throw new Error(`Image source returned ${contentType || 'HTML/JSON'} instead of image bytes.`);
  }
  return {
    bytes: buffer,
    mimeType: contentType.split(';')[0].trim().toLowerCase(),
  };
}

/**
 * Resolves, validates, sanitizes, and prepares exact bytes + filename for an image download.
 * Never returns HTML/JSON/corrupted payloads and automatically handles expired-URL fallback.
 */
export async function prepareVerifiedImageDownload(
  source: DownloadableImageSource,
  options?: { fetcher?: ImageDownloadFetcher }
): Promise<PreparedImageDownload> {
  const fetcher: ImageDownloadFetcher =
    options?.fetcher || ((url, init) => fetch(url, init));

  let rawBytes: Uint8Array | null = null;
  let detectedDeclaredMime = source.declaredMimeType || '';
  let usedFallback = false;
  let primaryError = '';

  try {
    if (source.blob) {
      const ab = await source.blob.arrayBuffer();
      rawBytes = new Uint8Array(ab);
      detectedDeclaredMime = source.blob.type || detectedDeclaredMime;
    } else if (source.base64) {
      const cleaned = source.base64.startsWith('data:')
        ? decodeDataUrlToBytes(source.base64)
        : { bytes: base64ToBytes(source.base64), mimeType: detectedDeclaredMime || 'image/png' };
      rawBytes = cleaned.bytes;
      detectedDeclaredMime = cleaned.mimeType || detectedDeclaredMime;
    } else if (source.url) {
      const resolved = await resolveUrlToBytes(source.url, fetcher);
      rawBytes = resolved.bytes;
      detectedDeclaredMime = resolved.mimeType || detectedDeclaredMime;
    }
  } catch (err: any) {
    primaryError = err?.message || 'Primary image download source failed.';
  }

  // Expired URL / network fallback chain
  if (!rawBytes || rawBytes.byteLength === 0) {
    const fallbacks = [source.fallbackUrl, source.fallbackDataUrl].filter(
      (candidate): candidate is string => Boolean(candidate && candidate !== source.url)
    );
    for (const candidate of fallbacks) {
      try {
        const resolved = await resolveUrlToBytes(candidate, fetcher);
        rawBytes = resolved.bytes;
        detectedDeclaredMime = resolved.mimeType || detectedDeclaredMime;
        usedFallback = true;
        break;
      } catch {
        // Try next fallback
      }
    }
  }

  if (!rawBytes || rawBytes.byteLength === 0) {
    const fallbackHint = source.fallbackUrl || source.url;
    return {
      ok: false,
      mimeType: detectedDeclaredMime || 'application/octet-stream',
      extension: mimeTypeToExtension(detectedDeclaredMime),
      filename: buildSafeImageFilename({
        title: source.title,
        filename: source.filename,
        index: source.index,
        mimeType: detectedDeclaredMime || 'image/png',
      }),
      byteLength: 0,
      width: 0,
      height: 0,
      sha256: '',
      usedFallback,
      error: primaryError || 'Unable to retrieve image bytes for download.',
      fallbackUrl: fallbackHint && isAllowedImageDownloadUrl(fallbackHint) ? fallbackHint : undefined,
    };
  }

  if (looksLikeHtmlOrJsonError(rawBytes, detectedDeclaredMime)) {
    return {
      ok: false,
      mimeType: detectedDeclaredMime || 'text/html',
      extension: 'png',
      filename: buildSafeImageFilename({
        title: source.title,
        filename: source.filename,
        index: source.index,
        mimeType: 'image/png',
      }),
      byteLength: rawBytes.byteLength,
      width: 0,
      height: 0,
      sha256: '',
      usedFallback,
      error: 'Download blocked: server returned an HTML/JSON error page instead of a valid image.',
    };
  }

  let finalBytes = rawBytes;
  const quality = validateImageAsset({
    bytes: rawBytes,
    declaredMimeType: detectedDeclaredMime || undefined,
  });

  if (!quality.valid) {
    return {
      ok: false,
      mimeType: quality.mimeType,
      extension: mimeTypeToExtension(quality.mimeType),
      filename: buildSafeImageFilename({
        title: source.title,
        filename: source.filename,
        index: source.index,
        mimeType: quality.mimeType,
      }),
      byteLength: rawBytes.byteLength,
      width: quality.width,
      height: quality.height,
      sha256: quality.sha256,
      usedFallback,
      error: quality.errors.join('; ') || 'Downloaded asset failed image integrity validation.',
    };
  }

  // Always sanitize SVG markup prior to saving so downloaded SVGs cannot execute scripts
  if (quality.isVectorSvg) {
    const svgCheck = sanitizeAndValidateSvg(new TextDecoder().decode(rawBytes));
    if (!svgCheck.valid) {
      return {
        ok: false,
        mimeType: 'image/svg+xml',
        extension: 'svg',
        filename: buildSafeImageFilename({
          title: source.title,
          filename: source.filename,
          index: source.index,
          mimeType: 'image/svg+xml',
        }),
        byteLength: rawBytes.byteLength,
        width: 0,
        height: 0,
        sha256: quality.sha256,
        usedFallback,
        error: svgCheck.errors.join('; ') || 'SVG failed security sanitization.',
      };
    }
    finalBytes = new TextEncoder().encode(svgCheck.sanitizedSvg);
  }

  const extension = mimeTypeToExtension(quality.mimeType);
  const filename = buildSafeImageFilename({
    title: source.title,
    filename: source.filename,
    index: source.index,
    mimeType: quality.mimeType,
  });

  return {
    ok: true,
    bytes: finalBytes,
    mimeType: quality.mimeType,
    extension,
    filename,
    byteLength: finalBytes.byteLength,
    width: quality.width,
    height: quality.height,
    sha256: quality.sha256,
    usedFallback,
  };
}

/**
 * Triggers a verified browser file download using Blob + ObjectURL with automatic cleanup.
 * Returns the full PreparedImageDownload result so callers never fake success on errors.
 */
export async function downloadVerifiedImage(
  source: DownloadableImageSource,
  options?: { fetcher?: ImageDownloadFetcher }
): Promise<PreparedImageDownload> {
  const prepared = await prepareVerifiedImageDownload(source, options);
  if (!prepared.ok || !prepared.bytes) {
    return prepared;
  }

  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return prepared;
  }

  try {
    const copy = new Uint8Array(prepared.bytes.byteLength);
    copy.set(prepared.bytes);
    const blob = new Blob([copy.buffer], { type: prepared.mimeType });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = prepared.filename;
    anchor.rel = 'noopener noreferrer';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // Ignore cleanup errors
      }
    }, 10000);
    return prepared;
  } catch (err: any) {
    return {
      ...prepared,
      ok: false,
      error: `Browser blocked the download trigger: ${err?.message || 'unknown error'}`,
      fallbackUrl: source.fallbackUrl || source.url,
    };
  }
}

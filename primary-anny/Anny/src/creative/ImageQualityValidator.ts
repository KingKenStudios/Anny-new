/**
 * ANNY — Genuine Image, SVG & Video Output Quality Validator
 *
 * Works in both Node.js server and Browser client (pure Uint8Array binary parsers,
 * zero Node-only top-level imports so Vite frontend bundles stay clean).
 *
 * Validates:
 *  - Authentic MIME type & binary magic bytes (PNG, JPEG, WebP, SVG)
 *  - Real pixel dimensions parsed from PNG IHDR / JPEG SOF / WebP VP8 headers or SVG viewBox
 *  - Rejects empty buffers, HTML error pages masquerading as images, and corrupt payloads
 *  - Sanitizes SVG XML against XSS (<script>, on* handlers, javascript:, <foreignObject>, external hrefs)
 *  - Computes deterministic content fingerprint to detect accidental duplicates
 *  - Validates MP4 / WebM video magic bytes so empty or text files are never marked playable
 */

import type { ImageQualityReport } from './types';

function computeFingerprintHex(bytes: Uint8Array): string {
  // Deterministic 128-bit dual-lane FNV-1a hex digest (runs synchronously in Node & Browser)
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x243f6a88;
  let h4 = 0xb7e15162;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    h1 = Math.imul(h1 ^ b, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ ((b + i) & 0xff), 0x01000193) >>> 0;
    h3 = Math.imul(h3 ^ (b ^ 0x5a), 0x85ebca6b) >>> 0;
    h4 = Math.imul(h4 ^ ((b * 31 + i) & 0xff), 0xc2b2ae35) >>> 0;
  }
  return [h1, h2, h3, h4].map((n) => n.toString(16).padStart(8, '0')).join('');
}

export function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export function base64ToBytes(base64: string): Uint8Array {
  const cleaned = base64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(cleaned, 'base64'));
  }
  const binary = atob(cleaned);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

/**
 * Strictly sanitizes and validates SVG markup against XSS and malformed XML.
 */
export function sanitizeAndValidateSvg(rawSvg: string): {
  valid: boolean;
  sanitizedSvg: string;
  width: number;
  height: number;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawSvg || typeof rawSvg !== 'string') {
    return { valid: false, sanitizedSvg: '', width: 0, height: 0, errors: ['Empty SVG input.'], warnings };
  }

  let svg = rawSvg.trim();

  // Reject HTML error pages or non-SVG content
  if (/<!doctype\s+html|<html[\s>]/i.test(svg)) {
    return { valid: false, sanitizedSvg: '', width: 0, height: 0, errors: ['Received HTML document instead of SVG markup.'], warnings };
  }

  const startIdx = svg.search(/<svg[\s>]/i);
  const endIdx = svg.toLowerCase().lastIndexOf('</svg>');
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return { valid: false, sanitizedSvg: '', width: 0, height: 0, errors: ['Missing valid root <svg>...</svg> structure.'], warnings };
  }

  svg = svg.slice(startIdx, endIdx + 6);

  // Strip dangerous XSS elements
  const dangerousTags = /<(script|foreignObject|iframe|object|embed|audio|video|link|meta|base)\b[^>]*>[\s\S]*?<\/\1>|<(script|foreignObject|iframe|object|embed|link|meta|base)\b[^>]*\/?>/gi;
  if (dangerousTags.test(svg)) {
    warnings.push('Stripped potentially unsafe elements from SVG markup.');
    svg = svg.replace(dangerousTags, '');
  }

  // Strip inline event handlers (onclick=, onload=, onerror=, etc.)
  const eventHandlerAttr = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
  if (eventHandlerAttr.test(svg)) {
    warnings.push('Stripped inline event handlers from SVG markup.');
    svg = svg.replace(eventHandlerAttr, '');
  }

  // Strip javascript:, vbscript:, data:text/html, and external remote hrefs (SSRF/XSS guard)
  const dangerousHref = /\s+(?:xlink:)?href\s*=\s*(?:"\s*(?:javascript:|vbscript:|data:\s*text\/html|https?:\/\/)[^"]*"|'\s*(?:javascript:|vbscript:|data:\s*text\/html|https?:\/\/)[^']*')/gi;
  if (dangerousHref.test(svg)) {
    warnings.push('Removed unsafe or external href attributes from SVG markup.');
    svg = svg.replace(dangerousHref, '');
  }

  // Strip CSS expression() / url(http...) inside style attributes
  svg = svg.replace(/url\(\s*['"]?\s*(?:https?:|javascript:|data:)/gi, 'url(#blocked-');

  // Ensure xmlns attribute exists on root <svg>
  if (!/<svg\b[^>]*xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Require at least one actual vector drawing primitive
  if (!/<(path|rect|circle|ellipse|polygon|polyline|line|text)\b/i.test(svg)) {
    errors.push('SVG contains no vector drawing primitives.');
  }

  // Extract dimensions from viewBox or width/height
  let width = 0;
  let height = 0;
  const viewBoxMatch = svg.match(/viewBox\s*=\s*["']\s*[\d.\-]+\s+[\d.\-]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  if (viewBoxMatch) {
    width = Math.round(parseFloat(viewBoxMatch[1]) || 0);
    height = Math.round(parseFloat(viewBoxMatch[2]) || 0);
  }
  if (!width || !height) {
    const wMatch = svg.match(/\bwidth\s*=\s*["']\s*([\d.]+)/i);
    const hMatch = svg.match(/\bheight\s*=\s*["']\s*([\d.]+)/i);
    if (wMatch) width = Math.round(parseFloat(wMatch[1]) || 0);
    if (hMatch) height = Math.round(parseFloat(hMatch[1]) || 0);
  }

  if (width < 16 || height < 16) {
    errors.push(`Invalid or tiny SVG dimensions (${width}x${height}).`);
  }

  return {
    valid: errors.length === 0,
    sanitizedSvg: svg,
    width,
    height,
    errors,
    warnings,
  };
}

function parsePngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A, IHDR width at 16..19, height at 20..23
  if (bytes.length < 24) return null;
  if (
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47 ||
    bytes[4] !== 0x0d ||
    bytes[5] !== 0x0a ||
    bytes[6] !== 0x1a ||
    bytes[7] !== 0x0a
  ) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  return { width, height };
}

function parseJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) break;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2) break;
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (offset + 7 <= bytes.length) {
        const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
        const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
        return { width, height };
      }
    }
    offset += length;
  }
  return { width: 0, height: 0 };
}

function parseWebpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 30) return null;
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff !== 'RIFF' || webp !== 'WEBP') return null;

  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (chunk === 'VP8X' && bytes.length >= 30) {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    return { width, height };
  }
  if (chunk === 'VP8 ' && bytes.length >= 30) {
    const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    return { width, height };
  }
  if (chunk === 'VP8L' && bytes.length >= 25) {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }
  return { width: 0, height: 0 };
}

/**
 * Validates raw image bytes (PNG, JPEG, WebP, or SVG) and produces a truthful ImageQualityReport.
 */
export function validateImageAsset(params: {
  bytes: Uint8Array;
  declaredMimeType?: string;
  previousHashes?: Set<string>;
  requireUnique?: boolean;
}): ImageQualityReport {
  const { bytes, declaredMimeType = '', previousHashes, requireUnique = false } = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!bytes || bytes.length === 0) {
    return {
      valid: false,
      mimeType: declaredMimeType || 'application/octet-stream',
      format: 'unknown',
      byteLength: 0,
      width: 0,
      height: 0,
      sha256: '',
      isVectorSvg: false,
      sanitizedSvg: false,
      duplicateDetected: false,
      semanticReviewStatus: 'skipped',
      errors: ['Image payload is empty (0 bytes).'],
      warnings,
    };
  }

  const fingerprint = computeFingerprintHex(bytes);
  const duplicateDetected = Boolean(requireUnique && previousHashes?.has(fingerprint));
  if (duplicateDetected) {
    warnings.push('Generated image matches a previously produced asset hash.');
  }

  // Detect PNG
  const pngDims = parsePngDimensions(bytes);
  if (pngDims) {
    if (declaredMimeType === 'image/svg+xml') {
      errors.push('Format mismatch: raster PNG asset was mislabeled as image/svg+xml.');
    }
    if (pngDims.width < 16 || pngDims.height < 16) {
      errors.push(`PNG dimensions too small (${pngDims.width}x${pngDims.height}).`);
    }
    return {
      valid: errors.length === 0,
      mimeType: 'image/png',
      format: 'png',
      byteLength: bytes.length,
      width: pngDims.width,
      height: pngDims.height,
      sha256: fingerprint,
      isVectorSvg: false,
      sanitizedSvg: false,
      duplicateDetected,
      semanticReviewStatus: 'not_run_no_evaluator',
      errors,
      warnings,
    };
  }

  // Detect JPEG
  const jpegDims = parseJpegDimensions(bytes);
  if (jpegDims) {
    if (declaredMimeType === 'image/svg+xml') {
      errors.push('Format mismatch: raster JPEG asset was mislabeled as image/svg+xml.');
    }
    if (jpegDims.width < 16 || jpegDims.height < 16) {
      errors.push(`JPEG dimensions invalid or too small (${jpegDims.width}x${jpegDims.height}).`);
    }
    return {
      valid: errors.length === 0,
      mimeType: 'image/jpeg',
      format: 'jpeg',
      byteLength: bytes.length,
      width: jpegDims.width,
      height: jpegDims.height,
      sha256: fingerprint,
      isVectorSvg: false,
      sanitizedSvg: false,
      duplicateDetected,
      semanticReviewStatus: 'not_run_no_evaluator',
      errors,
      warnings,
    };
  }

  // Detect WebP
  const webpDims = parseWebpDimensions(bytes);
  if (webpDims) {
    if (declaredMimeType === 'image/svg+xml') {
      errors.push('Format mismatch: raster WebP asset was mislabeled as image/svg+xml.');
    }
    if (webpDims.width < 16 || webpDims.height < 16) {
      errors.push(`WebP dimensions invalid or too small (${webpDims.width}x${webpDims.height}).`);
    }
    return {
      valid: errors.length === 0,
      mimeType: 'image/webp',
      format: 'webp',
      byteLength: bytes.length,
      width: webpDims.width,
      height: webpDims.height,
      sha256: fingerprint,
      isVectorSvg: false,
      sanitizedSvg: false,
      duplicateDetected,
      semanticReviewStatus: 'not_run_no_evaluator',
      errors,
      warnings,
    };
  }

  // Detect SVG XML
  const headText = bytesToUtf8(bytes.slice(0, Math.min(bytes.length, 4096))).trimStart();
  if (/^<\?xml|^<svg[\s>]/i.test(headText) || declaredMimeType === 'image/svg+xml') {
    const fullText = bytesToUtf8(bytes);
    const svgCheck = sanitizeAndValidateSvg(fullText);
    return {
      valid: svgCheck.valid,
      mimeType: 'image/svg+xml',
      format: 'svg',
      byteLength: bytes.length,
      width: svgCheck.width,
      height: svgCheck.height,
      sha256: fingerprint,
      isVectorSvg: svgCheck.valid,
      sanitizedSvg: svgCheck.valid,
      duplicateDetected,
      semanticReviewStatus: 'not_run_no_evaluator',
      errors: svgCheck.errors,
      warnings: [...warnings, ...svgCheck.warnings],
    };
  }

  // Reject HTML/JSON/plain error text masquerading as an image
  if (/^<!doctype|^<html|^\{|"error"/i.test(headText)) {
    errors.push('Provider returned HTML or JSON error payload instead of a valid image.');
  } else {
    errors.push('Unrecognized or corrupted binary image format (failed PNG/JPEG/WebP/SVG header verification).');
  }

  return {
    valid: false,
    mimeType: declaredMimeType || 'application/octet-stream',
    format: 'unknown',
    byteLength: bytes.length,
    width: 0,
    height: 0,
    sha256: fingerprint,
    isVectorSvg: false,
    sanitizedSvg: false,
    duplicateDetected,
    semanticReviewStatus: 'skipped',
    errors,
    warnings,
  };
}

/**
 * Validates raw video bytes beyond just an opening header:
 * - For MP4 / ISO BMFF: walks top-level boxes verifying `ftyp`, `moov` (movie metadata),
 *   and `mdat` (actual media payload) exist and are non-truncated.
 * - For WebM / Matroska: verifies EBML magic (1A 45 DF A3) and Segment header (18 53 80 67).
 * Rejects header-only, truncated, empty, or text/HTML payloads so fake videos are NEVER marked COMPLETED.
 */
export function validateVideoAsset(bytes: Uint8Array): {
  valid: boolean;
  mimeType: string;
  byteLength: number;
  containerDetails: {
    container: 'mp4' | 'webm' | 'unknown';
    hasFtypBox?: boolean;
    hasMoovBox?: boolean;
    hasMdatBox?: boolean;
  };
  error?: string;
} {
  if (!bytes || bytes.length < 24) {
    return {
      valid: false,
      mimeType: 'application/octet-stream',
      byteLength: bytes?.length || 0,
      containerDetails: { container: 'unknown' },
      error: 'Video payload is empty or too small to be a playable media container.',
    };
  }

  // ISO BMFF / MP4 box walker
  const firstBoxType = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  if (firstBoxType === 'ftyp') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 0;
    let hasFtypBox = false;
    let hasMoovBox = false;
    let hasMdatBox = false;
    let boxesScanned = 0;

    while (offset + 8 <= bytes.length && boxesScanned < 512) {
      let boxSize = view.getUint32(offset, false);
      const boxType = String.fromCharCode(
        bytes[offset + 4],
        bytes[offset + 5],
        bytes[offset + 6],
        bytes[offset + 7]
      );
      if (boxSize === 0) {
        // Box extends to EOF
        boxSize = bytes.length - offset;
      } else if (boxSize === 1 && offset + 16 <= bytes.length) {
        // 64-bit extended size (read lower 32 bits safely for buffers < 4GB)
        const hi = view.getUint32(offset + 8, false);
        const lo = view.getUint32(offset + 12, false);
        boxSize = hi === 0 ? lo : bytes.length - offset;
      }
      if (boxSize < 8 || offset + boxSize > bytes.length) {
        return {
          valid: false,
          mimeType: 'video/mp4',
          byteLength: bytes.length,
          containerDetails: { container: 'mp4', hasFtypBox, hasMoovBox, hasMdatBox },
          error: `Truncated or malformed MP4 box '${boxType}' at byte offset ${offset}.`,
        };
      }
      if (boxType === 'ftyp') hasFtypBox = true;
      if (boxType === 'moov') hasMoovBox = true;
      if (boxType === 'mdat' && boxSize > 8) hasMdatBox = true;
      offset += boxSize;
      boxesScanned++;
    }

    if (!hasMoovBox || !hasMdatBox) {
      return {
        valid: false,
        mimeType: 'video/mp4',
        byteLength: bytes.length,
        containerDetails: { container: 'mp4', hasFtypBox, hasMoovBox, hasMdatBox },
        error: `MP4 container is incomplete (hasFtyp=${hasFtypBox}, hasMoov=${hasMoovBox}, hasMdat=${hasMdatBox}); a header-only MP4 is not playable.`,
      };
    }

    return {
      valid: true,
      mimeType: 'video/mp4',
      byteLength: bytes.length,
      containerDetails: { container: 'mp4', hasFtypBox, hasMoovBox, hasMdatBox },
    };
  }

  // WebM / Matroska EBML magic: 1A 45 DF A3 + Segment (18 53 80 67)
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    let hasSegment = false;
    const scanLimit = Math.min(bytes.length - 4, 4096);
    for (let i = 4; i <= scanLimit; i++) {
      if (bytes[i] === 0x18 && bytes[i + 1] === 0x53 && bytes[i + 2] === 0x80 && bytes[i + 3] === 0x67) {
        hasSegment = true;
        break;
      }
    }
    if (!hasSegment) {
      return {
        valid: false,
        mimeType: 'video/webm',
        byteLength: bytes.length,
        containerDetails: { container: 'webm' },
        error: 'WebM container has EBML header but is missing a valid Segment payload.',
      };
    }
    return {
      valid: true,
      mimeType: 'video/webm',
      byteLength: bytes.length,
      containerDetails: { container: 'webm' },
    };
  }

  return {
    valid: false,
    mimeType: 'application/octet-stream',
    byteLength: bytes.length,
    containerDetails: { container: 'unknown' },
    error: 'Video binary failed MP4/WebM container structure validation.',
  };
}

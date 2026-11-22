/**
 * ANNY — VISION FRAME PROCESSOR
 * Converts HTMLVideoElement frames or raw RGBA buffers into downsampled luminance grids
 * for real-time local motion/tracking, and encodes bounded-resolution JPEG frames for AI analysis.
 * Reuses internal offscreen canvases to prevent GC churn and memory leaks.
 */

import type { EncodedFramePayload, ProcessedGrayFrame } from './types';

export interface FrameProcessorOptions {
  /** Analysis grid width for local pixel processing (default 64) */
  analysisWidth?: number;
  /** Analysis grid height for local pixel processing (default 48) */
  analysisHeight?: number;
}

export class FrameProcessor {
  private readonly analysisWidth: number;
  private readonly analysisHeight: number;
  private analysisCanvas: HTMLCanvasElement | null = null;
  private analysisCtx: CanvasRenderingContext2D | null = null;
  private encodeCanvas: HTMLCanvasElement | null = null;
  private encodeCtx: CanvasRenderingContext2D | null = null;
  private frameCounter = 0;

  constructor(options: FrameProcessorOptions = {}) {
    this.analysisWidth = Math.max(16, Math.min(160, options.analysisWidth ?? 64));
    this.analysisHeight = Math.max(12, Math.min(120, options.analysisHeight ?? 48));
  }

  /**
   * Pure RGBA buffer -> ProcessedGrayFrame converter (works in Node.js tests and browsers).
   */
  processRgbaBuffer(
    rgba: Uint8ClampedArray | Uint8Array,
    sourceWidth: number,
    sourceHeight: number,
    timestamp = Date.now()
  ): ProcessedGrayFrame {
    const outW = this.analysisWidth;
    const outH = this.analysisHeight;
    const luma = new Uint8Array(outW * outH);
    const histogram = new Float32Array(16);

    const scaleX = sourceWidth / outW;
    const scaleY = sourceHeight / outH;
    let sumLuma = 0;

    for (let y = 0; y < outH; y++) {
      const sy = Math.min(sourceHeight - 1, Math.floor((y + 0.5) * scaleY));
      const rowOffset = sy * sourceWidth;
      for (let x = 0; x < outW; x++) {
        const sx = Math.min(sourceWidth - 1, Math.floor((x + 0.5) * scaleX));
        const idx = (rowOffset + sx) * 4;
        const r = rgba[idx] ?? 0;
        const g = rgba[idx + 1] ?? 0;
        const b = rgba[idx + 2] ?? 0;
        // Rec. 601 luminance
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        luma[y * outW + x] = lum;
        sumLuma += lum;
        const bin = Math.min(15, lum >> 4);
        histogram[bin] += 1;
      }
    }

    const totalPixels = outW * outH;
    if (totalPixels > 0) {
      for (let i = 0; i < 16; i++) {
        histogram[i] = histogram[i] / totalPixels;
      }
    }

    this.frameCounter += 1;
    return {
      frameIndex: this.frameCounter,
      timestamp,
      width: outW,
      height: outH,
      luma,
      histogram,
      meanLuma: totalPixels > 0 ? sumLuma / totalPixels : 0,
      sourceWidth,
      sourceHeight,
    };
  }

  /**
   * Extracts a downsampled grayscale frame from an active HTMLVideoElement.
   */
  extractGrayFrameFromVideo(video: HTMLVideoElement, timestamp = Date.now()): ProcessedGrayFrame | null {
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return null;
    }
    if (typeof document === 'undefined') {
      return null;
    }

    if (!this.analysisCanvas) {
      this.analysisCanvas = document.createElement('canvas');
      this.analysisCanvas.width = this.analysisWidth;
      this.analysisCanvas.height = this.analysisHeight;
      this.analysisCtx = this.analysisCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (!this.analysisCtx) return null;

    this.analysisCtx.drawImage(video, 0, 0, this.analysisWidth, this.analysisHeight);
    const imgData = this.analysisCtx.getImageData(0, 0, this.analysisWidth, this.analysisHeight);

    const outW = this.analysisWidth;
    const outH = this.analysisHeight;
    const luma = new Uint8Array(outW * outH);
    const histogram = new Float32Array(16);
    const data = imgData.data;
    let sumLuma = 0;

    for (let i = 0, p = 0; i < luma.length; i++, p += 4) {
      const lum = Math.round(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
      luma[i] = lum;
      sumLuma += lum;
      histogram[Math.min(15, lum >> 4)] += 1;
    }

    const total = luma.length;
    for (let b = 0; b < 16; b++) {
      histogram[b] /= total;
    }

    this.frameCounter += 1;
    return {
      frameIndex: this.frameCounter,
      timestamp,
      width: outW,
      height: outH,
      luma,
      histogram,
      meanLuma: total > 0 ? sumLuma / total : 0,
      sourceWidth: video.videoWidth,
      sourceHeight: video.videoHeight,
    };
  }

  /**
   * Encodes the current video frame into a bounded-size JPEG base64 payload (no data-URL prefix).
   */
  encodeVideoFrameToJpeg(
    video: HTMLVideoElement,
    maxWidth = 640,
    quality = 0.72,
    timestamp = Date.now()
  ): EncodedFramePayload | null {
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return null;
    }
    if (typeof document === 'undefined') {
      return null;
    }

    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    const scale = srcW > maxWidth ? maxWidth / srcW : 1;
    const targetW = Math.max(64, Math.round(srcW * scale));
    const targetH = Math.max(48, Math.round(srcH * scale));

    if (!this.encodeCanvas) {
      this.encodeCanvas = document.createElement('canvas');
      this.encodeCtx = this.encodeCanvas.getContext('2d');
    }
    if (!this.encodeCtx) return null;

    if (this.encodeCanvas.width !== targetW || this.encodeCanvas.height !== targetH) {
      this.encodeCanvas.width = targetW;
      this.encodeCanvas.height = targetH;
    }

    this.encodeCtx.drawImage(video, 0, 0, targetW, targetH);
    const dataUrl = this.encodeCanvas.toDataURL('image/jpeg', Math.max(0.35, Math.min(0.95, quality)));
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();

    return {
      base64,
      mimeType: 'image/jpeg',
      width: targetW,
      height: targetH,
      byteLength: Math.round((base64.length * 3) / 4),
      timestamp,
      captureLatencyMs: Math.max(0, Number((end - start).toFixed(2))),
    };
  }

  reset(): void {
    this.frameCounter = 0;
  }

  dispose(): void {
    if (this.analysisCanvas) {
      this.analysisCanvas.width = 0;
      this.analysisCanvas.height = 0;
      this.analysisCanvas = null;
      this.analysisCtx = null;
    }
    if (this.encodeCanvas) {
      this.encodeCanvas.width = 0;
      this.encodeCanvas.height = 0;
      this.encodeCanvas = null;
      this.encodeCtx = null;
    }
    this.frameCounter = 0;
  }
}

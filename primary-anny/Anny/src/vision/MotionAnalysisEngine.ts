/**
 * ANNY — GENUINE MOTION & SCENE-CHANGE ANALYSIS ENGINE
 * Performs real pixel-level computer vision on consecutive grayscale frames:
 *  1. Block-matching optical flow to estimate global camera pan/tilt vs stationary background.
 *  2. Camera-motion-compensated frame differencing to isolate genuine independent object motion.
 *  3. Adaptive noise floor to reject sensor flicker/grain.
 *  4. Connected-component clustering to extract real normalized motion bounding boxes & vectors.
 *  5. Histogram + structural scene-change detection with cooldown.
 *
 * Works 100% locally offline and in Node.js unit tests with zero external dependencies.
 */

import type {
  DirectionLabel,
  MotionAnalysisResult,
  MotionRegion,
  MotionVector,
  ProcessedGrayFrame,
} from './types';

export interface MotionAnalysisOptions {
  blockSize?: number;
  searchRadius?: number;
  minRegionPixels?: number;
  sceneChangeThreshold?: number;
  sceneChangeCooldownMs?: number;
  cameraMotionPixelThreshold?: number;
}

export function classifyDirection(dx: number, dy: number, deadzone = 0.008): DirectionLabel {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX < deadzone && absY < deadzone) return 'stationary';
  const horiz = absX >= deadzone ? (dx > 0 ? 'right' : 'left') : '';
  const vert = absY >= deadzone ? (dy > 0 ? 'down' : 'up') : '';
  if (horiz && vert) {
    if (absX > absY * 2.2) return horiz as DirectionLabel;
    if (absY > absX * 2.2) return vert as DirectionLabel;
    return `${vert}-${horiz}` as DirectionLabel;
  }
  return (horiz || vert || 'stationary') as DirectionLabel;
}

export function buildMotionVector(dx: number, dy: number, deadzone = 0.008): MotionVector {
  const magnitude = Math.hypot(dx, dy);
  return {
    dx: Number(dx.toFixed(4)),
    dy: Number(dy.toFixed(4)),
    magnitude: Number(magnitude.toFixed(4)),
    direction: classifyDirection(dx, dy, deadzone),
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export class MotionAnalysisEngine {
  private prevFrame: ProcessedGrayFrame | null = null;
  private lastSceneChangeAt = 0;
  private readonly blockSize: number;
  private readonly searchRadius: number;
  private readonly minRegionPixels: number;
  private readonly sceneChangeThreshold: number;
  private readonly sceneChangeCooldownMs: number;
  private readonly cameraMotionPixelThreshold: number;

  constructor(options: MotionAnalysisOptions = {}) {
    this.blockSize = Math.max(4, options.blockSize ?? 8);
    this.searchRadius = Math.max(2, Math.min(6, options.searchRadius ?? 4));
    this.minRegionPixels = Math.max(4, options.minRegionPixels ?? 10);
    this.sceneChangeThreshold = options.sceneChangeThreshold ?? 0.34;
    this.sceneChangeCooldownMs = options.sceneChangeCooldownMs ?? 1500;
    this.cameraMotionPixelThreshold = options.cameraMotionPixelThreshold ?? 0.85;
  }

  analyze(frame: ProcessedGrayFrame): MotionAnalysisResult {
    const prev = this.prevFrame;
    if (!prev || prev.width !== frame.width || prev.height !== frame.height) {
      this.prevFrame = frame;
      return {
        frameIndex: frame.frameIndex,
        timestamp: frame.timestamp,
        motionScore: 0,
        cameraMotion: buildMotionVector(0, 0),
        cameraMoving: false,
        objectMotionActive: false,
        sceneChanged: false,
        sceneChangeMagnitude: 0,
        foregroundRatio: 0,
        noiseFloor: 0,
        regions: [],
      };
    }

    const w = frame.width;
    const h = frame.height;
    const totalPixels = w * h;

    // Step 1: Block-matching flow across interior textured blocks to estimate global camera shift
    const blockDxs: number[] = [];
    const blockDys: number[] = [];
    const blockFlowMap = new Map<string, { dx: number; dy: number }>();

    const bs = this.blockSize;
    const sr = this.searchRadius;

    for (let by = sr; by <= h - bs - sr; by += bs) {
      for (let bx = sr; bx <= w - bs - sr; bx += bs) {
        // Compute block texture variance so flat walls don't corrupt optical flow
        let sum = 0;
        let sumSq = 0;
        const count = bs * bs;
        for (let py = 0; py < bs; py++) {
          const row = (by + py) * w + bx;
          for (let px = 0; px < bs; px++) {
            const v = frame.luma[row + px];
            sum += v;
            sumSq += v * v;
          }
        }
        const mean = sum / count;
        const variance = sumSq / count - mean * mean;
        if (variance < 18) continue;

        let zeroSad = 0;
        for (let py = 0; py < bs; py++) {
          const row = (by + py) * w + bx;
          for (let px = 0; px < bs; px++) {
            zeroSad += Math.abs(frame.luma[row + px] - prev.luma[row + px]);
          }
        }

        let bestSad = zeroSad;
        let bestDx = 0;
        let bestDy = 0;

        // Only search if block actually changed beyond tiny sensor noise
        if (zeroSad > count * 2.5) {
          for (let dy = -sr; dy <= sr; dy++) {
            for (let dx = -sr; dx <= sr; dx++) {
              if (dx === 0 && dy === 0) continue;
              let sad = 0;
              for (let py = 0; py < bs; py++) {
                const curRow = (by + py) * w + bx;
                // Where did pixels at (bx, by) in current frame come from in previous frame?
                // If scene moved by (+dx, +dy), current(x, y) matches prev(x - dx, y - dy).
                const prevRow = (by + py - dy) * w + (bx - dx);
                for (let px = 0; px < bs; px++) {
                  sad += Math.abs(frame.luma[curRow + px] - prev.luma[prevRow + px]);
                }
                if (sad >= bestSad) break;
              }
              if (sad + count * 0.6 < bestSad) {
                bestSad = sad;
                bestDx = dx;
                bestDy = dy;
              }
            }
          }
        }

        blockDxs.push(bestDx);
        blockDys.push(bestDy);
        blockFlowMap.set(`${Math.floor(bx / bs)},${Math.floor(by / bs)}`, { dx: bestDx, dy: bestDy });
      }
    }

    // Global camera motion = median block displacement when enough textured blocks agree
    let globalDxPx = 0;
    let globalDyPx = 0;
    let cameraMoving = false;
    if (blockDxs.length >= 4) {
      const medDx = median(blockDxs);
      const medDy = median(blockDys);
      const medMag = Math.hypot(medDx, medDy);
      if (medMag >= this.cameraMotionPixelThreshold) {
        // Check consensus: at least 50% of textured blocks agree within 1.5px of median
        let inliers = 0;
        for (let i = 0; i < blockDxs.length; i++) {
          if (Math.hypot(blockDxs[i] - medDx, blockDys[i] - medDy) <= 1.5) {
            inliers += 1;
          }
        }
        if (inliers / blockDxs.length >= 0.5) {
          globalDxPx = Math.round(medDx);
          globalDyPx = Math.round(medDy);
          cameraMoving = true;
        }
      }
    }

    // Step 2: Camera-motion-compensated pixel difference
    const diffGrid = new Uint8Array(totalPixels);
    const marginX = Math.abs(globalDxPx);
    const marginY = Math.abs(globalDyPx);
    let diffSum = 0;
    let diffSqSum = 0;
    let validCount = 0;

    for (let y = marginY; y < h - marginY; y++) {
      const prevY = y - globalDyPx;
      const curRow = y * w;
      const prevRow = prevY * w;
      for (let x = marginX; x < w - marginX; x++) {
        const prevX = x - globalDxPx;
        const d = Math.abs(frame.luma[curRow + x] - prev.luma[prevRow + prevX]);
        diffGrid[curRow + x] = d;
        diffSum += d;
        diffSqSum += d * d;
        validCount += 1;
      }
    }

    const meanDiff = validCount > 0 ? diffSum / validCount : 0;
    const varianceDiff = validCount > 0 ? Math.max(0, diffSqSum / validCount - meanDiff * meanDiff) : 0;
    const stdDiff = Math.sqrt(varianceDiff);

    // Step 3: Adaptive noise floor (prevents sensor flicker from causing fake detections)
    const noiseFloor = Math.max(16, Math.min(58, meanDiff + 2.2 * stdDiff));
    const fgMask = new Uint8Array(totalPixels);
    let fgPixels = 0;
    let fgDiffEnergy = 0;

    for (let y = marginY; y < h - marginY; y++) {
      const row = y * w;
      for (let x = marginX; x < w - marginX; x++) {
        const idx = row + x;
        if (diffGrid[idx] > noiseFloor) {
          fgMask[idx] = 1;
          fgPixels += 1;
          fgDiffEnergy += diffGrid[idx] / 255;
        }
      }
    }

    const foregroundRatio = validCount > 0 ? fgPixels / validCount : 0;

    // Step 4: Scene-change detection via histogram L1 distance + large global structural delta
    let histL1 = 0;
    for (let i = 0; i < 16; i++) {
      histL1 += Math.abs(frame.histogram[i] - prev.histogram[i]);
    }
    const histDist = histL1 / 2; // Normalized [0..1]
    const meanLumaShift = Math.abs(frame.meanLuma - prev.meanLuma) / 255;
    const rawChangeMetric = Math.min(1, histDist * 0.55 + (meanDiff / 128) * 0.45 + meanLumaShift * 0.25);

    // Suppress scene-cut flag only when camera is smoothly panning with small luminance/histogram shift
    const isSmoothPanOnly = cameraMoving && foregroundRatio < 0.25 && histDist < 0.35 && meanLumaShift < 0.2;
    const sceneChangeMagnitude = isSmoothPanOnly ? rawChangeMetric * 0.4 : rawChangeMetric;
    const cooldownElapsed = frame.timestamp - this.lastSceneChangeAt >= this.sceneChangeCooldownMs;
    const sceneChanged = sceneChangeMagnitude >= this.sceneChangeThreshold && cooldownElapsed;
    if (sceneChanged) {
      this.lastSceneChangeAt = frame.timestamp;
    }

    // Step 5: Connected-component clustering to extract real foreground motion regions
    const visited = new Uint8Array(totalPixels);
    const regions: MotionRegion[] = [];
    const queue = new Int32Array(totalPixels);

    // If full scene cut occurred, do not treat the entire cut frame as individual tracked objects
    if (!sceneChanged && fgPixels >= this.minRegionPixels && foregroundRatio < 0.72) {
      for (let y = marginY; y < h - marginY; y++) {
        for (let x = marginX; x < w - marginX; x++) {
          const startIdx = y * w + x;
          if (!fgMask[startIdx] || visited[startIdx]) continue;

          let head = 0;
          let tail = 0;
          queue[tail++] = startIdx;
          visited[startIdx] = 1;

          let minX = x;
          let maxX = x;
          let minY = y;
          let maxY = y;
          let sumX = 0;
          let sumY = 0;
          let sumIntensity = 0;
          let count = 0;

          while (head < tail) {
            const idx = queue[head++];
            const cy = Math.floor(idx / w);
            const cx = idx - cy * w;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;
            sumX += cx;
            sumY += cy;
            sumIntensity += diffGrid[idx] / 255;
            count += 1;

            // 8-neighborhood expansion for cleaner blobs
            for (let ny = cy - 1; ny <= cy + 1; ny++) {
              if (ny < marginY || ny >= h - marginY) continue;
              const nRow = ny * w;
              for (let nx = cx - 1; nx <= cx + 1; nx++) {
                if (nx < marginX || nx >= w - marginX) continue;
                const nIdx = nRow + nx;
                if (fgMask[nIdx] && !visited[nIdx]) {
                  visited[nIdx] = 1;
                  queue[tail++] = nIdx;
                }
              }
            }
          }

          if (count < this.minRegionPixels) continue;

          const boxW = (maxX - minX + 1) / w;
          const boxH = (maxY - minY + 1) / h;
          const areaRatio = count / totalPixels;

          // Aggregate local block motion inside region minus global camera shift
          let localDxSum = 0;
          let localDySum = 0;
          let localSamples = 0;
          for (let by = Math.floor(minY / bs); by <= Math.floor(maxY / bs); by++) {
            for (let bx = Math.floor(minX / bs); bx <= Math.floor(maxX / bs); bx++) {
              const flow = blockFlowMap.get(`${bx},${by}`);
              if (flow) {
                localDxSum += flow.dx - globalDxPx;
                localDySum += flow.dy - globalDyPx;
                localSamples += 1;
              }
            }
          }
          const avgDxNorm = localSamples > 0 ? (localDxSum / localSamples) / w : 0;
          const avgDyNorm = localSamples > 0 ? (localDySum / localSamples) / h : 0;

          regions.push({
            regionId: `reg_${frame.frameIndex}_${regions.length + 1}`,
            box: {
              x: Number((minX / w).toFixed(4)),
              y: Number((minY / h).toFixed(4)),
              w: Number(boxW.toFixed(4)),
              h: Number(boxH.toFixed(4)),
            },
            centroid: {
              x: Number(((sumX / count) / w).toFixed(4)),
              y: Number(((sumY / count) / h).toFixed(4)),
            },
            intensity: Number((sumIntensity / count).toFixed(3)),
            areaRatio: Number(areaRatio.toFixed(4)),
            vector: buildMotionVector(avgDxNorm, avgDyNorm, 0.005),
          });
        }
      }
    }

    // Sort strongest / largest regions first, cap at 8 distinct regions per frame
    regions.sort((a, b) => b.areaRatio * b.intensity - a.areaRatio * a.intensity);
    const topRegions = regions.slice(0, 8);

    const motionScore = Number(
      Math.min(1, validCount > 0 ? (fgDiffEnergy / validCount) * 4.5 : 0).toFixed(3)
    );
    const cameraMotion = buildMotionVector(globalDxPx / w, globalDyPx / h, 0.008);
    const objectMotionActive = topRegions.length > 0 && motionScore >= 0.015;

    this.prevFrame = frame;

    return {
      frameIndex: frame.frameIndex,
      timestamp: frame.timestamp,
      motionScore,
      cameraMotion,
      cameraMoving,
      objectMotionActive,
      sceneChanged,
      sceneChangeMagnitude: Number(sceneChangeMagnitude.toFixed(3)),
      foregroundRatio: Number(foregroundRatio.toFixed(4)),
      noiseFloor: Number(noiseFloor.toFixed(1)),
      regions: topRegions,
    };
  }

  reset(): void {
    this.prevFrame = null;
    this.lastSceneChangeAt = 0;
  }
}

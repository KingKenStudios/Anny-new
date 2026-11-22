/**
 * ANNY — REAL-TIME VISION CANVAS OVERLAY RENDERER
 * Renders synchronized real detections, tracked entity bounding boxes, persistent IDs,
 * velocity/direction arrows, optional pose skeleton landmarks, camera-motion indicator,
 * and scene-change alert onto an HTML5 <canvas> aligned with the displayed <video>.
 *
 * Strictly truthful: renders ONLY actual tracks, detections, and motion vectors.
 */

import type { SharedPerceptionState } from './types';

const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

export interface OverlayRenderOptions {
  mirrored?: boolean;
  showBoxes?: boolean;
  showMotionVectors?: boolean;
  showPose?: boolean;
  showHud?: boolean;
  fitMode?: 'contain' | 'cover';
}

interface DrawRect {
  offsetX: number;
  offsetY: number;
  drawW: number;
  drawH: number;
}

function computeVideoDisplayRect(
  canvasW: number,
  canvasH: number,
  videoW: number,
  videoH: number,
  fitMode: 'contain' | 'cover'
): DrawRect {
  if (!videoW || !videoH || !canvasW || !canvasH) {
    return { offsetX: 0, offsetY: 0, drawW: canvasW, drawH: canvasH };
  }
  const canvasRatio = canvasW / canvasH;
  const videoRatio = videoW / videoH;

  let drawW = canvasW;
  let drawH = canvasH;
  if (fitMode === 'cover') {
    if (videoRatio > canvasRatio) {
      drawH = canvasH;
      drawW = canvasH * videoRatio;
    } else {
      drawW = canvasW;
      drawH = canvasW / videoRatio;
    }
  } else {
    if (videoRatio > canvasRatio) {
      drawW = canvasW;
      drawH = canvasW / videoRatio;
    } else {
      drawH = canvasH;
      drawW = canvasH * videoRatio;
    }
  }
  return {
    offsetX: (canvasW - drawW) / 2,
    offsetY: (canvasH - drawH) / 2,
    drawW,
    drawH,
  };
}

export function renderVisionOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement | null,
  state: SharedPerceptionState,
  options: OverlayRenderOptions = {}
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const targetW = Math.max(1, Math.round(rect.width * dpr));
  const targetH = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  if (!state.status.videoStreamActive) {
    ctx.restore();
    return;
  }

  const videoW = video?.videoWidth || rect.width;
  const videoH = video?.videoHeight || rect.height;
  const drawRect = computeVideoDisplayRect(
    rect.width,
    rect.height,
    videoW,
    videoH,
    options.fitMode || 'cover'
  );

  const mapX = (nx: number) => {
    const xVal = options.mirrored ? 1 - nx : nx;
    return drawRect.offsetX + xVal * drawRect.drawW;
  };
  const mapY = (ny: number) => drawRect.offsetY + ny * drawRect.drawH;

  // 1. Optional Pose Skeleton Landmarks (only when MediaPipe Pose is actually loaded and detecting)
  if (options.showPose !== false && state.latestPose?.detected && state.latestPose.landmarks.length > 0) {
    const lms = state.latestPose.landmarks;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
    ctx.lineWidth = 2;
    for (const [a, b] of POSE_CONNECTIONS) {
      const lmA = lms[a];
      const lmB = lms[b];
      if (!lmA || !lmB || lmA.visibility < 0.45 || lmB.visibility < 0.45) continue;
      ctx.beginPath();
      ctx.moveTo(mapX(lmA.x), mapY(lmA.y));
      ctx.lineTo(mapX(lmB.x), mapY(lmB.y));
      ctx.stroke();
    }
    ctx.fillStyle = '#34d399';
    for (const lm of lms) {
      if (lm.visibility < 0.45) continue;
      ctx.beginPath();
      ctx.arc(mapX(lm.x), mapY(lm.y), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. Real Tracked Entities (persistent track IDs, boxes, confidence, velocity vectors)
  if (options.showBoxes !== false) {
    for (const trk of state.trackedEntities) {
      const rawLeft = mapX(trk.box.x);
      const rawRight = mapX(trk.box.x + trk.box.w);
      const bx = Math.min(rawLeft, rawRight);
      const bw = Math.abs(rawRight - rawLeft);
      const by = mapY(trk.box.y);
      const bh = trk.box.h * drawRect.drawH;

      const isAi = trk.source === 'ai_vision';
      const isPose = trk.source === 'local_pose';
      const stroke = isAi
        ? '#38bdf8'
        : isPose
          ? '#10b981'
          : trk.state === 'occluded'
            ? 'rgba(245, 158, 11, 0.55)'
            : '#f59e0b';

      ctx.strokeStyle = stroke;
      ctx.lineWidth = trk.state === 'occluded' ? 1.25 : 2;
      if (trk.state === 'occluded') {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);

      // Corner ticks for crisp technical telemetry look
      const corner = Math.min(10, bw * 0.25, bh * 0.25);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx, by + corner);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + corner, by);
      ctx.moveTo(bx + bw - corner, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw, by + corner);
      ctx.stroke();

      // Label tag
      const confPct = Math.round(trk.confidence * 100);
      const dirTag = trk.velocity.direction !== 'stationary' ? ` · ${trk.velocity.direction}` : '';
      const labelText = `${trk.trackId} ${trk.label} ${confPct}%${dirTag}`;
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      const textW = ctx.measureText(labelText).width;
      const tagX = Math.max(4, Math.min(rect.width - textW - 12, bx));
      const tagY = by > 20 ? by - 18 : by + 4;

      ctx.fillStyle = 'rgba(9, 11, 18, 0.82)';
      ctx.fillRect(tagX, tagY, textW + 10, 16);
      ctx.fillStyle = stroke;
      ctx.fillText(labelText, tagX + 5, tagY + 11);

      // Motion velocity vector arrow from centroid
      if (options.showMotionVectors !== false && trk.velocity.magnitude >= 0.012) {
        const cx = mapX(trk.centroid.x);
        const cy = mapY(trk.centroid.y);
        const vx = (options.mirrored ? -trk.velocity.dx : trk.velocity.dx) * drawRect.drawW * 3.5;
        const vy = trk.velocity.dy * drawRect.drawH * 3.5;
        const ex = cx + vx;
        const ey = cy + vy;

        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        const angle = Math.atan2(vy, vx);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 7 * Math.cos(angle - Math.PI / 6), ey - 7 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(ex - 7 * Math.cos(angle + Math.PI / 6), ey - 7 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = stroke;
        ctx.fill();
      }
    }
  }

  // 3. Camera Motion & Scene Change Indicators (truthful from MotionAnalysisEngine)
  if (options.showHud !== false && state.latestMotion) {
    const motion = state.latestMotion;
    let badgeY = 10;

    if (motion.sceneChanged) {
      const txt = `SCENE CHANGE (${Math.round(motion.sceneChangeMagnitude * 100)}%)`;
      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      const w = ctx.measureText(txt).width + 14;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.88)';
      ctx.fillRect(10, badgeY, w, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(txt, 17, badgeY + 12);
      badgeY += 22;
    }

    if (motion.cameraMoving) {
      const txt = `CAMERA PAN: ${motion.cameraMotion.direction.toUpperCase()}`;
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      const w = ctx.measureText(txt).width + 14;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.fillRect(10, badgeY, w, 18);
      ctx.fillStyle = '#090b12';
      ctx.fillText(txt, 17, badgeY + 12);
    }

    // Bottom-left compact telemetry line
    const tel = state.telemetry;
    const hudLine = `CV ${tel.localPerceptionFps.toFixed(1)}fps (${tel.localLatencyMs.toFixed(0)}ms) | AI ${tel.aiAnalysisFps.toFixed(2)}fps${tel.droppedFrames > 0 ? ` | drop ${tel.droppedFrames}` : ''}`;
    ctx.font = '500 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    const hudW = ctx.measureText(hudLine).width + 12;
    ctx.fillStyle = 'rgba(9, 11, 18, 0.72)';
    ctx.fillRect(8, rect.height - 24, hudW, 18);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(hudLine, 14, rect.height - 12);
  }

  ctx.restore();
}

/**
 * ANNY — LIVE & CONTINUOUS ONLINE VISION PROVIDER
 * Routes all online vision requests strictly through authenticated ANNY server endpoints
 * (never exposes Gemini API keys in the browser):
 *  1. Native Live Streaming via WebSocket /api/vision/live -> Server Gemini Live API (gemini-3.8-live)
 *  2. Continuous Frame Analysis / Snapshot via POST /api/vision/analyze -> Server Vision Model
 *
 * Truthfully distinguishes native live video streaming from continuous frame analysis.
 */

import { fetchWithAuth, getAuthHeaders } from '../lib/apiUtils';
import type {
  LiveSessionCallbacks,
  OnlineVisionProviderContract,
  ServerVisionCapabilities,
  VisionAnalysisRequest,
} from './VisionProvider';
import type { AiDetectedObject, AiVisionObservation, EncodedFramePayload, NormalizedBox } from './types';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function sanitizeNormalizedBox(raw: any): NormalizedBox | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const x = Number(raw.x);
  const y = Number(raw.y);
  const w = Number(raw.w);
  const h = Number(raw.h);
  if (![x, y, w, h].every(Number.isFinite)) return undefined;
  if (w <= 0.01 || h <= 0.01) return undefined;
  const cx = clamp01(x);
  const cy = clamp01(y);
  return {
    x: Number(cx.toFixed(4)),
    y: Number(cy.toFixed(4)),
    w: Number(Math.min(1 - cx, clamp01(w)).toFixed(4)),
    h: Number(Math.min(1 - cy, clamp01(h)).toFixed(4)),
  };
}

function sanitizeAiObjects(rawList: any): AiDetectedObject[] {
  if (!Array.isArray(rawList)) return [];
  const out: AiDetectedObject[] = [];
  for (const item of rawList.slice(0, 15)) {
    if (!item || typeof item !== 'object' || typeof item.label !== 'string') continue;
    const label = item.label.trim().slice(0, 64);
    if (!label) continue;
    const conf = Number.isFinite(Number(item.confidence)) ? clamp01(Number(item.confidence)) : 0.7;
    out.push({
      label,
      confidence: Number(conf.toFixed(3)),
      box: sanitizeNormalizedBox(item.box),
      attributes: Array.isArray(item.attributes)
        ? item.attributes.filter((a: any) => typeof a === 'string').slice(0, 4)
        : undefined,
    });
  }
  return out;
}

export class LiveVisionProvider implements OnlineVisionProviderContract {
  readonly id = 'anny_live_vision';
  readonly name = 'ANNY Online Vision Engine';

  private ws: WebSocket | null = null;
  private liveReady = false;
  private intentionalClose = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 4;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSystemContext = '';
  private callbacks: LiveSessionCallbacks = {};
  private lastVideoSentAt = 0;
  private currentModel = 'gemini-3.8-live';
  private currentProvider = 'ANNY Live Vision';
  private outputTranscriptBuffer = '';
  private obsCounter = 1;

  async checkServerCapabilities(): Promise<ServerVisionCapabilities> {
    try {
      const res = await fetchWithAuth('/api/vision/capabilities', { method: 'GET' });
      if (!res.ok) {
        return {
          liveStreamAvailable: false,
          liveModel: null,
          frameAnalysisAvailable: false,
          frameAnalysisModel: null,
          localVlmAvailable: false,
          executionMode: 'UNKNOWN',
          limitations: [`Vision capability probe failed (HTTP ${res.status}).`],
        };
      }
      const data = await res.json();
      return {
        liveStreamAvailable: Boolean(data?.liveStreamAvailable),
        liveModel: data?.liveModel || null,
        frameAnalysisAvailable: Boolean(data?.frameAnalysisAvailable),
        frameAnalysisModel: data?.frameAnalysisModel || null,
        localVlmAvailable: Boolean(data?.localVlmAvailable),
        executionMode: String(data?.executionMode || 'ONLINE'),
        limitations: Array.isArray(data?.limitations) ? data.limitations : [],
      };
    } catch (err: any) {
      return {
        liveStreamAvailable: false,
        liveModel: null,
        frameAnalysisAvailable: false,
        frameAnalysisModel: null,
        localVlmAvailable: false,
        executionMode: 'OFFLINE',
        limitations: [err?.message || 'Unable to reach ANNY vision server.'],
      };
    }
  }

  async analyzeFrame(request: VisionAnalysisRequest): Promise<AiVisionObservation> {
    const start = Date.now();
    const res = await fetchWithAuth('/api/vision/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: request.signal,
      body: JSON.stringify({
        image: request.frame.base64,
        mimeType: request.frame.mimeType,
        prompt: request.prompt,
        temporalContext: request.temporalContext,
        mode: request.mode,
        structured: request.structured !== false,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Vision frame analysis failed (HTTP ${res.status})`);
    }

    const latencyMs = Math.max(1, Date.now() - start);
    const description = String(data?.analysis || data?.description || '').trim();
    if (!description) {
      throw new Error('Vision provider returned an empty analysis.');
    }

    const objects = sanitizeAiObjects(data?.objects);
    return {
      id: `obs_${this.obsCounter++}_${Date.now()}`,
      timestamp: Date.now(),
      description,
      objects,
      sceneSummary: typeof data?.sceneSummary === 'string' ? data.sceneSummary : description,
      transport: 'continuous_frame_analysis',
      provider: String(data?.provider || 'ANNY Vision Core'),
      model: String(data?.model || 'gemini-4-hydrogen'),
      latencyMs,
      confidence: typeof data?.confidence === 'number' ? clamp01(data.confidence) : undefined,
      rawMode: request.mode,
    };
  }

  async connectLiveSession(options: {
    systemContext?: string;
    callbacks: LiveSessionCallbacks;
  }): Promise<boolean> {
    this.disconnectLiveSession();
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.lastSystemContext = options.systemContext || '';
    this.callbacks = options.callbacks;
    return this.openWebSocket();
  }

  private async openWebSocket(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      this.callbacks.onError?.('WebSocket is unavailable in this environment.');
      return false;
    }

    let authToken = '';
    try {
      const headers = await getAuthHeaders();
      const authHeader = headers.get('Authorization') || '';
      if (authHeader.startsWith('Bearer ')) {
        authToken = authHeader.slice(7).trim();
      }
    } catch {
      // Cookie auth may still authenticate same-origin upgrade
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/api/vision/live`;

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (val: boolean) => {
        if (!settled) {
          settled = true;
          resolve(val);
        }
      };

      const socket = new WebSocket(wsUrl);
      this.ws = socket;
      this.liveReady = false;

      const connectTimeout = setTimeout(() => {
        if (!this.liveReady) {
          try {
            socket.close();
          } catch {
            // ignore
          }
          this.callbacks.onError?.('Live AI vision session timed out while connecting.');
          settle(false);
        }
      }, 12_000);

      socket.onopen = () => {
        // Authenticate over the already-upgraded WebSocket frame (never put bearer tokens in URLs)
        try {
          socket.send(
            JSON.stringify({
              type: 'init',
              token: authToken || undefined,
              systemContext: this.lastSystemContext,
            })
          );
        } catch {
          clearTimeout(connectTimeout);
          settle(false);
        }
      };

      socket.onmessage = (event) => {
        let msg: any;
        try {
          msg = JSON.parse(String(event.data || '{}'));
        } catch {
          return;
        }

        switch (msg.type) {
          case 'ready': {
            clearTimeout(connectTimeout);
            this.liveReady = true;
            this.reconnectAttempts = 0;
            this.currentProvider = String(msg.provider || 'Gemini Live API');
            this.currentModel = String(msg.model || 'gemini-3.8-live');
            this.callbacks.onConnected?.({
              provider: this.currentProvider,
              model: this.currentModel,
              transport: 'native_live_stream',
            });
            settle(true);
            break;
          }
          case 'audio': {
            if (typeof msg.data === 'string' && msg.data.length > 0) {
              this.callbacks.onAudioChunk?.(msg.data);
            }
            break;
          }
          case 'input_transcript': {
            if (typeof msg.text === 'string' && msg.text.trim()) {
              this.callbacks.onInputTranscript?.(msg.text, Boolean(msg.final));
            }
            break;
          }
          case 'output_transcript': {
            if (typeof msg.text === 'string' && msg.text.length > 0) {
              this.outputTranscriptBuffer += msg.text;
              this.callbacks.onOutputTranscript?.(msg.text, Boolean(msg.final));
            }
            break;
          }
          case 'interrupted': {
            this.outputTranscriptBuffer = '';
            this.callbacks.onInterrupted?.();
            break;
          }
          case 'turn_complete': {
            const finalized = this.outputTranscriptBuffer.trim();
            this.outputTranscriptBuffer = '';
            if (finalized) {
              this.callbacks.onObservation?.({
                id: `live_obs_${this.obsCounter++}_${Date.now()}`,
                timestamp: Date.now(),
                description: finalized,
                objects: [],
                sceneSummary: finalized,
                transport: 'native_live_stream',
                provider: this.currentProvider,
                model: this.currentModel,
                latencyMs: 0,
                rawMode: 'native_live_stream',
              });
            }
            this.callbacks.onTurnComplete?.();
            break;
          }
          case 'error': {
            const errText = String(msg.error || 'Live AI vision session error');
            this.callbacks.onError?.(errText);
            if (!this.liveReady) {
              clearTimeout(connectTimeout);
              settle(false);
            }
            break;
          }
          default:
            break;
        }
      };

      socket.onerror = () => {
        if (!this.liveReady) {
          clearTimeout(connectTimeout);
          settle(false);
        }
      };

      socket.onclose = (ev) => {
        clearTimeout(connectTimeout);
        const wasReady = this.liveReady;
        this.liveReady = false;
        if (this.ws === socket) {
          this.ws = null;
        }

        if (!settled) {
          settle(false);
        }

        if (this.intentionalClose) {
          this.callbacks.onDisconnected?.('Stopped by user');
          return;
        }

        // Auth rejection (4401) or service unavailable (4503) should not hammer reconnect
        if (ev.code === 4401 || ev.code === 4503) {
          const reason = ev.reason || (ev.code === 4401 ? 'Authentication required for live vision' : 'Live vision provider unavailable on server');
          this.callbacks.onError?.(reason);
          this.callbacks.onDisconnected?.(reason);
          return;
        }

        if (wasReady && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts += 1;
          const delayMs = Math.min(10_000, 1000 * Math.pow(2, this.reconnectAttempts - 1));
          this.callbacks.onReconnecting?.(this.reconnectAttempts, delayMs);
          this.reconnectTimer = setTimeout(() => {
            if (!this.intentionalClose) {
              void this.openWebSocket();
            }
          }, delayMs);
        } else {
          this.callbacks.onDisconnected?.(ev.reason || 'Live AI vision connection closed');
        }
      };
    });
  }

  /**
   * Streams a single JPEG frame to the live session (enforces <= 1 FPS rate cap per Gemini Live guidelines).
   */
  sendLiveVideoFrame(frame: EncodedFramePayload): boolean {
    if (!this.isLiveConnected() || !this.ws) return false;
    const now = Date.now();
    if (now - this.lastVideoSentAt < 950) {
      return false;
    }
    this.lastVideoSentAt = now;
    try {
      this.ws.send(
        JSON.stringify({
          type: 'video',
          data: frame.base64,
          mimeType: frame.mimeType,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  sendLiveAudioChunk(base64Pcm16k: string): boolean {
    if (!this.isLiveConnected() || !this.ws || !base64Pcm16k) return false;
    try {
      this.ws.send(
        JSON.stringify({
          type: 'audio',
          data: base64Pcm16k,
          mimeType: 'audio/pcm;rate=16000',
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  sendLiveTextPrompt(text: string): boolean {
    if (!this.isLiveConnected() || !this.ws || !text.trim()) return false;
    try {
      this.ws.send(
        JSON.stringify({
          type: 'text',
          text: text.trim(),
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  isLiveConnected(): boolean {
    return Boolean(this.liveReady && this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  disconnectLiveSession(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.liveReady = false;
    this.outputTranscriptBuffer = '';
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'stop' }));
        }
        this.ws.close(1000, 'Session closed');
      } catch {
        // ignore close errors
      }
      this.ws = null;
    }
  }
}

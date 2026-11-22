/**
 * ANNY — SERVER-SIDE LIVE VISION WEBSOCKET GATEWAY
 * Bridges authenticated browser WebSocket clients (/api/vision/live)
 * directly to the server-side Gemini Live API (gemini-3.8-live) for real-time
 * synchronized video frames (<= 1 FPS) + bidirectional voice (16kHz in / 24kHz out)
 * + input/output transcriptions + interruption handling.
 *
 * Security & Privacy Guarantees:
 *  - API keys remain strictly server-side (never sent to client).
 *  - Origin check blocks Cross-Site WebSocket Hijacking.
 *  - Every live session requires verified identity (HttpOnly session cookie or verified Bearer token in init frame).
 *  - Base64 image/video/audio payloads are NEVER written to logs or stored on disk.
 *  - Always closes upstream Gemini Live sessions cleanly on disconnect/error.
 */

import type http from 'http';
import type { Duplex } from 'stream';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import { resolveVerifiedIdentity } from './serverAuthService';
import { providerRegistryService } from './providerRegistryService';

const LIVE_VISION_MODEL = 'gemini-3.8-live';
const MAX_VIDEO_BASE64_BYTES = 1_500_000;
const MAX_AUDIO_BASE64_BYTES = 256_000;
const INIT_TIMEOUT_MS = 8_000;

export interface LiveVisionGatewayOptions {
  allowedOrigins: Set<string>;
}

function isOriginAllowed(req: http.IncomingMessage, allowedOrigins: Set<string>): boolean {
  const origin = String(req.headers.origin || '').trim().replace(/\/+$/, '');
  if (!origin) return true; // Non-browser clients / same-host CLI tools
  const host = String(req.headers.host || '').trim();
  const sameHttp = host ? `http://${host}` : '';
  const sameHttps = host ? `https://${host}` : '';
  return origin === sameHttp || origin === sameHttps || allowedOrigins.has(origin);
}

function safeSend(ws: WebSocket, payload: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // ignore send errors on closing socket
    }
  }
}

export function attachLiveVisionGateway(
  httpServer: http.Server,
  options: LiveVisionGatewayOptions
): WebSocketServer {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 2 * 1024 * 1024,
  });

  httpServer.on('upgrade', (req: http.IncomingMessage, socket: Duplex, head: Buffer) => {
    let pathname = '';
    try {
      const parsed = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      pathname = parsed.pathname;
    } catch {
      return;
    }

    if (pathname !== '/api/vision/live') {
      return;
    }

    if (!isOriginAllowed(req, options.allowedOrigins)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    let liveSession: any = null;
    let initialized = false;
    let closed = false;
    let lastVideoFrameAt = 0;

    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearTimeout(initTimer);
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // ignore close errors
        }
        liveSession = null;
      }
    };

    const initTimer = setTimeout(() => {
      if (!initialized && !closed) {
        safeSend(ws, { type: 'error', error: 'Live vision session authentication handshake timed out.' });
        try {
          ws.close(4401, 'Authentication timeout');
        } catch {}
        cleanup();
      }
    }, INIT_TIMEOUT_MS);

    ws.on('close', () => cleanup());
    ws.on('error', () => cleanup());

    ws.on('message', async (rawData) => {
      if (closed) return;
      let msg: any;
      try {
        msg = JSON.parse(String(rawData || '{}'));
      } catch {
        safeSend(ws, { type: 'error', error: 'Invalid JSON frame received.' });
        return;
      }

      if (!initialized) {
        if (msg?.type !== 'init') {
          safeSend(ws, { type: 'error', error: 'Expected init handshake message first.' });
          ws.close(4401, 'Authentication required');
          cleanup();
          return;
        }

        // Authenticate via HttpOnly session cookie or verified Bearer token sent in init frame
        const syntheticReq = {
          headers: {
            cookie: req.headers.cookie || '',
            authorization:
              typeof msg.token === 'string' && msg.token.trim().length > 0
                ? `Bearer ${msg.token.trim()}`
                : String(req.headers.authorization || ''),
          },
        } as any;

        const identity = await resolveVerifiedIdentity(syntheticReq, { allowApiKey: false });
        if (!identity) {
          safeSend(ws, { type: 'error', error: 'Authentication required for live vision streaming.' });
          ws.close(4401, 'Authentication required');
          cleanup();
          return;
        }

        const execPolicy = providerRegistryService.getExecutionPolicy();
        if (execPolicy.mode === 'OFFLINE_ONLY') {
          safeSend(ws, {
            type: 'error',
            error: 'OFFLINE_ONLY policy is active on server. Live cloud vision streaming is disabled.',
          });
          ws.close(4503, 'Offline policy active');
          cleanup();
          return;
        }

        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY;
        if (!geminiKey) {
          safeSend(ws, {
            type: 'error',
            error: 'Live vision provider is not configured on the server. Local offline vision remains available.',
          });
          ws.close(4503, 'Live provider unconfigured');
          cleanup();
          return;
        }

        clearTimeout(initTimer);
        initialized = true;

        const systemContext =
          typeof msg.systemContext === 'string' ? msg.systemContext.slice(0, 2000) : '';
        const systemInstruction = [
          'You are ANNY Live Vision, a real-time multimodal visual and voice intelligence assistant.',
          'Observe the continuous camera/screen video stream and answer the user naturally, concisely, and factually.',
          'Describe only what is genuinely visible in the current frames or temporal context. Never invent objects, text, or motion you cannot see.',
          'For robotics or physical environments, remember visual perception alone is not a certified safety system.',
          systemContext ? `\nCurrent local perception context:\n${systemContext}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        try {
          const ai = new GoogleGenAI({
            apiKey: geminiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });

          liveSession = await ai.live.connect({
            model: LIVE_VISION_MODEL,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              systemInstruction,
            },
            callbacks: {
              onopen: () => {
                if (!closed) {
                  safeSend(ws, {
                    type: 'ready',
                    provider: 'Gemini Live API',
                    model: LIVE_VISION_MODEL,
                    transport: 'native_live_stream',
                  });
                }
              },
              onmessage: (serverMsg: any) => {
                if (closed) return;
                const sc = serverMsg?.serverContent;
                if (!sc) return;

                if (sc.interrupted) {
                  safeSend(ws, { type: 'interrupted' });
                }

                if (sc.inputTranscription?.text) {
                  safeSend(ws, {
                    type: 'input_transcript',
                    text: String(sc.inputTranscription.text),
                    final: Boolean(sc.turnComplete),
                  });
                }

                if (sc.outputTranscription?.text) {
                  safeSend(ws, {
                    type: 'output_transcript',
                    text: String(sc.outputTranscription.text),
                    final: Boolean(sc.turnComplete),
                  });
                }

                const parts = sc.modelTurn?.parts;
                if (Array.isArray(parts)) {
                  for (const part of parts) {
                    const inline = part?.inlineData;
                    if (inline?.data && typeof inline.data === 'string') {
                      safeSend(ws, {
                        type: 'audio',
                        data: inline.data,
                        mimeType: inline.mimeType || 'audio/pcm;rate=24000',
                      });
                    }
                  }
                }

                if (sc.turnComplete) {
                  safeSend(ws, { type: 'turn_complete' });
                }
              },
              onerror: (err: any) => {
                if (!closed) {
                  safeSend(ws, {
                    type: 'error',
                    error: err?.message || 'Upstream Gemini Live session encountered an error.',
                  });
                }
              },
              onclose: () => {
                if (!closed) {
                  try {
                    ws.close(1000, 'Upstream live session closed');
                  } catch {}
                  cleanup();
                }
              },
            },
          });
        } catch (err: any) {
          safeSend(ws, {
            type: 'error',
            error: err?.message || 'Failed to establish upstream Gemini Live session.',
          });
          try {
            ws.close(4503, 'Upstream connection failed');
          } catch {}
          cleanup();
        }
        return;
      }

      if (!liveSession) return;

      switch (msg?.type) {
        case 'video': {
          const now = Date.now();
          // Server-side rate cap (<= ~1.1 FPS) to protect upstream quota and bandwidth
          if (now - lastVideoFrameAt < 850) return;
          if (typeof msg.data !== 'string' || msg.data.length === 0 || msg.data.length > MAX_VIDEO_BASE64_BYTES) {
            return;
          }
          lastVideoFrameAt = now;
          try {
            liveSession.sendRealtimeInput({
              video: {
                data: msg.data,
                mimeType: 'image/jpeg',
              },
            });
          } catch {
            // session closing
          }
          break;
        }
        case 'audio': {
          if (typeof msg.data !== 'string' || msg.data.length === 0 || msg.data.length > MAX_AUDIO_BASE64_BYTES) {
            return;
          }
          try {
            liveSession.sendRealtimeInput({
              audio: {
                data: msg.data,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } catch {
            // session closing
          }
          break;
        }
        case 'text': {
          const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, 1500) : '';
          if (!text) return;
          try {
            liveSession.sendClientContent({
              turns: [{ role: 'user', parts: [{ text }] }],
              turnComplete: true,
            });
          } catch {
            // session closing
          }
          break;
        }
        case 'stop': {
          try {
            ws.close(1000, 'Client requested stop');
          } catch {}
          cleanup();
          break;
        }
        default:
          break;
      }
    });
  });

  return wss;
}

/**
 * ANNY — LOCAL SPEECH-TO-TEXT (STT) SERVICE
 * Self-hosted, offline-capable audio normalization & local transcription router.
 * Supports:
 *   1. Local Whisper HTTP servers (OpenAI-compatible /v1/audio/transcriptions such as
 *      faster-whisper-server, speaches, LocalAI via LOCAL_STT_URL)
 *   2. Local whisper.cpp HTTP servers (/inference via WHISPER_CPP_URL)
 *   3. Local whisper-cli / whisper CLI binaries installed on the host via execFile
 * Zero shell interpolation; all ffmpeg audio transcoding runs in an isolated temp dir.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import axios from 'axios';
import FormData from 'form-data';

const execFileAsync = promisify(execFile);

export const MAX_VOICE_NOTE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MIN_VOICE_NOTE_BYTES = 100;

export const ALLOWED_AUDIO_MIME_TYPES: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
};

export interface ParsedAudioPayload {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  sizeBytes: number;
}

export interface LocalSttStatus {
  available: boolean;
  configured: boolean;
  engine: 'local-whisper-http' | 'local-whisper-cpp' | 'local-whisper-cli' | 'unavailable';
  endpointConfigured: boolean;
  cliBinary: string | null;
  ffmpegAvailable: boolean;
  guidance: string;
}

export interface LocalTranscriptionResult {
  success: boolean;
  transcribed: boolean;
  text: string;
  engine: 'local-whisper-http' | 'local-whisper-cpp' | 'local-whisper-cli' | 'unavailable';
  modelUsed?: string;
  language?: string;
  durationSec: number | null;
  error?: string;
  guidance?: string;
}

export function normalizeAudioMimeType(rawMime?: unknown): string {
  if (typeof rawMime !== 'string' || !rawMime.trim()) return 'audio/webm';
  const base = rawMime.split(';')[0].trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ALLOWED_AUDIO_MIME_TYPES, base)) {
    return base;
  }
  if (base === 'video/webm') return 'audio/webm';
  if (base === 'video/mp4') return 'audio/mp4';
  throw new Error(`UNSUPPORTED_AUDIO_MIME_TYPE: ${base}`);
}

export function parseBase64AudioPayload(rawAudio: unknown, rawMimeType?: unknown): ParsedAudioPayload {
  if (typeof rawAudio !== 'string' || !rawAudio.trim()) {
    throw new Error('AUDIO_PAYLOAD_MISSING');
  }

  let detectedMime: string | undefined;
  let b64 = rawAudio.trim();
  const dataUrlMatch = /^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/is.exec(b64);
  if (dataUrlMatch) {
    detectedMime = dataUrlMatch[1];
    b64 = dataUrlMatch[2];
  } else if (b64.includes(',')) {
    b64 = b64.split(',').pop() || '';
  }

  const mimeType = normalizeAudioMimeType(rawMimeType || detectedMime || 'audio/webm');
  const extension = ALLOWED_AUDIO_MIME_TYPES[mimeType] || 'webm';
  const cleanB64 = b64.replace(/\s+/g, '');

  if (!cleanB64 || !/^[A-Za-z0-9+/=]+$/.test(cleanB64)) {
    throw new Error('INVALID_AUDIO_BASE64');
  }

  const buffer = Buffer.from(cleanB64, 'base64');
  if (buffer.length < MIN_VOICE_NOTE_BYTES) {
    throw new Error('AUDIO_TOO_SHORT');
  }
  if (buffer.length > MAX_VOICE_NOTE_BYTES) {
    throw new Error('AUDIO_TOO_LARGE');
  }

  return {
    buffer,
    mimeType,
    extension,
    sizeBytes: buffer.length,
  };
}

/**
 * Pure-Node RIFF WAVE PCM duration calculation (seconds).
 */
export function measureWavDurationSec(wavBuffer: Buffer): number | null {
  if (!Buffer.isBuffer(wavBuffer) || wavBuffer.length < 44) return null;
  if (wavBuffer.toString('ascii', 0, 4) !== 'RIFF' || wavBuffer.toString('ascii', 8, 12) !== 'WAVE') {
    return null;
  }

  let offset = 12;
  let byteRate = 0;
  let dataBytes = 0;

  while (offset + 8 <= wavBuffer.length) {
    const chunkId = wavBuffer.toString('ascii', offset, offset + 4);
    const chunkSize = wavBuffer.readUInt32LE(offset + 4);
    const bodyStart = offset + 8;

    if (chunkId === 'fmt ' && bodyStart + 12 <= wavBuffer.length) {
      byteRate = wavBuffer.readUInt32LE(bodyStart + 8);
    } else if (chunkId === 'data') {
      dataBytes = Math.min(chunkSize, Math.max(0, wavBuffer.length - bodyStart));
    }

    offset = bodyStart + chunkSize + (chunkSize % 2);
  }

  if (byteRate > 0 && dataBytes > 0) {
    return Number((dataBytes / byteRate).toFixed(2));
  }
  return null;
}

function validateLocalSttUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('INVALID_LOCAL_STT_URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('INVALID_LOCAL_STT_URL_SCHEME');
  }
  return parsed;
}

async function resolveExecutable(candidates: string[]): Promise<string | null> {
  for (const bin of candidates) {
    try {
      const { stdout } = await execFileAsync('which', [bin], { timeout: 1500 });
      const resolved = String(stdout || '').trim().split(/\r?\n/)[0];
      if (resolved) return resolved;
    } catch {
      // candidate not present
    }
  }
  return null;
}

export class LocalSttService {
  private static instance: LocalSttService;

  public static getInstance(): LocalSttService {
    if (!LocalSttService.instance) {
      LocalSttService.instance = new LocalSttService();
    }
    return LocalSttService.instance;
  }

  public async getStatus(): Promise<LocalSttStatus> {
    const localSttUrl = (process.env.LOCAL_STT_URL || '').trim();
    const whisperCppUrl = (process.env.WHISPER_CPP_URL || '').trim();
    const cliBinary = await resolveExecutable(['whisper-cli', 'whisper-cpp', 'whisper', 'faster-whisper']);
    const ffmpegBin = await resolveExecutable(['ffmpeg']);

    if (localSttUrl) {
      try {
        validateLocalSttUrl(localSttUrl);
        return {
          available: true,
          configured: true,
          engine: 'local-whisper-http',
          endpointConfigured: true,
          cliBinary,
          ffmpegAvailable: Boolean(ffmpegBin),
          guidance: 'Local HTTP Whisper transcription endpoint configured via LOCAL_STT_URL.',
        };
      } catch {
        // invalid URL treated below
      }
    }

    if (whisperCppUrl) {
      try {
        validateLocalSttUrl(whisperCppUrl);
        return {
          available: true,
          configured: true,
          engine: 'local-whisper-cpp',
          endpointConfigured: true,
          cliBinary,
          ffmpegAvailable: Boolean(ffmpegBin),
          guidance: 'Local whisper.cpp transcription endpoint configured via WHISPER_CPP_URL.',
        };
      } catch {
        // invalid URL treated below
      }
    }

    if (cliBinary) {
      return {
        available: true,
        configured: true,
        engine: 'local-whisper-cli',
        endpointConfigured: false,
        cliBinary,
        ffmpegAvailable: Boolean(ffmpegBin),
        guidance: `Local CLI speech-to-text binary detected (${path.basename(cliBinary)}).`,
      };
    }

    return {
      available: false,
      configured: false,
      engine: 'unavailable',
      endpointConfigured: false,
      cliBinary: null,
      ffmpegAvailable: Boolean(ffmpegBin),
      guidance:
        'No local STT service is running yet. Start a self-hosted Whisper server (e.g. faster-whisper-server or whisper.cpp) and set LOCAL_STT_URL or WHISPER_CPP_URL.',
    };
  }

  public async normalizeToWav16k(
    audioBuffer: Buffer,
    extension: string
  ): Promise<{ wavBuffer: Buffer | null; durationSec: number | null }> {
    const directWavDuration = extension === 'wav' ? measureWavDurationSec(audioBuffer) : null;
    const ffmpegBin = await resolveExecutable(['ffmpeg']);
    if (!ffmpegBin) {
      return {
        wavBuffer: extension === 'wav' ? audioBuffer : null,
        durationSec: directWavDuration,
      };
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anny-stt-'));
    try {
      const safeExt = /^[a-z0-9]{2,5}$/i.test(extension) ? extension.toLowerCase() : 'webm';
      const inputPath = path.join(tmpDir, `input.${safeExt}`);
      const outputPath = path.join(tmpDir, 'normalized.wav');
      fs.writeFileSync(inputPath, audioBuffer);

      await execFileAsync(
        ffmpegBin,
        ['-y', '-hide_banner', '-loglevel', 'error', '-i', inputPath, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', outputPath],
        { timeout: 25000 }
      );

      if (fs.existsSync(outputPath)) {
        const wavBuffer = fs.readFileSync(outputPath);
        const durationSec = measureWavDurationSec(wavBuffer) ?? directWavDuration;
        return { wavBuffer, durationSec };
      }
    } catch {
      // Fallback safely when container codec fails on synthetic/short chunks
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore temp cleanup errors
      }
    }

    return {
      wavBuffer: extension === 'wav' ? audioBuffer : null,
      durationSec: directWavDuration,
    };
  }

  public async transcribeAudioLocally(params: {
    audioBuffer: Buffer;
    mimeType: string;
    extension: string;
    language?: string;
    promptHint?: string;
  }): Promise<LocalTranscriptionResult> {
    const { audioBuffer, mimeType, extension, language, promptHint } = params;
    const normalized = await this.normalizeToWav16k(audioBuffer, extension);
    const uploadBuffer = normalized.wavBuffer || audioBuffer;
    const uploadMime = normalized.wavBuffer ? 'audio/wav' : mimeType;
    const uploadFilename = normalized.wavBuffer ? 'voice-note.wav' : `voice-note.${extension}`;
    const durationSec = normalized.durationSec;

    const localSttUrl = (process.env.LOCAL_STT_URL || '').trim();
    const whisperCppUrl = (process.env.WHISPER_CPP_URL || '').trim();
    const localModel = (process.env.LOCAL_WHISPER_MODEL || 'base').trim();
    let lastError = '';

    // 1. OpenAI-compatible Local Whisper / Speaches / faster-whisper-server
    if (localSttUrl) {
      try {
        const parsed = validateLocalSttUrl(localSttUrl);
        const form = new FormData();
        form.append('file', uploadBuffer, {
          filename: uploadFilename,
          contentType: uploadMime,
        });
        form.append('model', localModel);
        form.append('response_format', 'json');
        if (language && language !== 'auto') {
          form.append('language', language);
        }
        if (promptHint) {
          form.append('prompt', promptHint.slice(0, 400));
        }

        const resp = await axios.post(parsed.toString(), form, {
          headers: form.getHeaders(),
          timeout: 45000,
          maxBodyLength: MAX_VOICE_NOTE_BYTES + 1024 * 1024,
        });

        const text = typeof resp.data === 'string'
          ? resp.data.trim()
          : String(resp.data?.text || resp.data?.transcription || '').trim();

        return {
          success: true,
          transcribed: Boolean(text),
          text,
          engine: parsed.pathname.endsWith('/inference') ? 'local-whisper-cpp' : 'local-whisper-http',
          modelUsed: resp.data?.model || localModel,
          language: resp.data?.language || language || 'auto',
          durationSec,
          ...(text ? {} : { error: 'No intelligible speech detected in the recording.' }),
        };
      } catch (err: any) {
        lastError = err?.response?.data?.error?.message || err?.response?.data?.error || err?.message || 'Local STT HTTP request failed';
      }
    }

    // 2. Explicit whisper.cpp HTTP server (/inference)
    if (whisperCppUrl) {
      try {
        const parsed = validateLocalSttUrl(whisperCppUrl);
        const form = new FormData();
        form.append('file', uploadBuffer, {
          filename: uploadFilename,
          contentType: uploadMime,
        });
        form.append('response_format', 'json');
        if (language && language !== 'auto') {
          form.append('language', language);
        }

        const resp = await axios.post(parsed.toString(), form, {
          headers: form.getHeaders(),
          timeout: 45000,
          maxBodyLength: MAX_VOICE_NOTE_BYTES + 1024 * 1024,
        });

        const text = typeof resp.data === 'string'
          ? resp.data.trim()
          : String(resp.data?.text || '').trim();

        return {
          success: true,
          transcribed: Boolean(text),
          text,
          engine: 'local-whisper-cpp',
          modelUsed: localModel,
          language: language || 'auto',
          durationSec,
          ...(text ? {} : { error: 'No intelligible speech detected in the recording.' }),
        };
      } catch (err: any) {
        lastError = err?.response?.data?.error || err?.message || 'whisper.cpp HTTP request failed';
      }
    }

    // 3. Local CLI Whisper binary (`whisper-cli` / `whisper`)
    const cliBinary = await resolveExecutable(['whisper-cli', 'whisper-cpp', 'whisper']);
    if (cliBinary && normalized.wavBuffer) {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anny-wcli-'));
      try {
        const wavPath = path.join(tmpDir, 'voice-note.wav');
        fs.writeFileSync(wavPath, normalized.wavBuffer);
        const baseBin = path.basename(cliBinary);
        const args = baseBin.includes('whisper-cli') || baseBin.includes('whisper-cpp')
          ? ['-f', wavPath, '--no-timestamps', ...(process.env.LOCAL_WHISPER_MODEL_PATH ? ['-m', process.env.LOCAL_WHISPER_MODEL_PATH] : [])]
          : [wavPath, '--model', localModel, '--output_format', 'txt', '--output_dir', tmpDir, '--verbose', 'False'];

        const { stdout } = await execFileAsync(cliBinary, args, { timeout: 60000 });
        const txtPath = path.join(tmpDir, 'voice-note.txt');
        const cliText = fs.existsSync(txtPath)
          ? fs.readFileSync(txtPath, 'utf8').trim()
          : String(stdout || '').trim();

        return {
          success: true,
          transcribed: Boolean(cliText),
          text: cliText,
          engine: 'local-whisper-cli',
          modelUsed: localModel,
          language: language || 'auto',
          durationSec,
          ...(cliText ? {} : { error: 'No speech detected by local Whisper CLI.' }),
        };
      } catch (err: any) {
        lastError = err?.message || 'Local Whisper CLI execution failed';
      } finally {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup
        }
      }
    }

    return {
      success: false,
      transcribed: false,
      text: '',
      engine: 'unavailable',
      durationSec,
      error: lastError || 'Local speech-to-text service is not running or configured.',
      guidance:
        'Voice note audio was saved cleanly, but no local STT service is active. Start a local Whisper server (set LOCAL_STT_URL or WHISPER_CPP_URL) or edit the transcript manually before sending.',
    };
  }
}

export const localSttService = LocalSttService.getInstance();

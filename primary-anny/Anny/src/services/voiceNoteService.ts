/**
 * ANNY — DURABLE VOICE NOTE STORAGE & SESSION ATTACHMENT SERVICE
 * Stores recorded voice note audio blobs and local STT transcripts on disk
 * scoped to user ownership and chat sessions, with signed per-note capability
 * tokens for secure <audio> playback without leaking auth headers.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ALLOWED_AUDIO_MIME_TYPES } from './localSttService';

export interface VoiceNoteRecord {
  id: string;
  ownerUserId: string;
  sessionId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  durationSec: number | null;
  transcript: string;
  transcriptionEngine: string;
  transcribed: boolean;
  playbackToken: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVoiceNoteInput {
  ownerUserId: string;
  sessionId: string;
  name?: string;
  mimeType: string;
  audioBuffer: Buffer;
  durationSec: number | null;
  transcript?: string;
  transcriptionEngine?: string;
  transcribed?: boolean;
}

const VALID_VOICE_NOTE_ID_REGEX = /^[a-zA-Z0-9_-]{4,80}$/;

export function isValidVoiceNoteId(id: unknown): id is string {
  return typeof id === 'string' && VALID_VOICE_NOTE_ID_REGEX.test(id.trim());
}

export function sanitizeSessionId(raw: unknown): string {
  const cleaned = typeof raw === 'string' ? raw.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) : '';
  return cleaned || 'workspace_session';
}

export class VoiceNoteService {
  private static instance: VoiceNoteService;
  private baseDir: string;
  private indexPath: string;
  private notesById: Map<string, VoiceNoteRecord> = new Map();

  private constructor() {
    this.baseDir = path.resolve(process.cwd(), '.anny-data', 'voice-notes');
    this.indexPath = path.join(this.baseDir, 'index.json');
    this.loadFromDisk();
  }

  public static getInstance(): VoiceNoteService {
    if (!VoiceNoteService.instance) {
      VoiceNoteService.instance = new VoiceNoteService();
    }
    return VoiceNoteService.instance;
  }

  public setStorageDirForTests(dirPath: string): void {
    this.baseDir = path.resolve(dirPath);
    this.indexPath = path.join(this.baseDir, 'index.json');
    this.notesById.clear();
    this.loadFromDisk();
  }

  private ensureDirs(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.indexPath)) return;
      const raw = fs.readFileSync(this.indexPath, 'utf8');
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed?.notes) ? parsed.notes : [];
      for (const item of list) {
        if (item && isValidVoiceNoteId(item.id) && typeof item.fileName === 'string') {
          this.notesById.set(item.id, item as VoiceNoteRecord);
        }
      }
    } catch {
      // start cleanly if index file does not exist or is unreadable
    }
  }

  private persistIndex(): void {
    this.ensureDirs();
    const tmpPath = `${this.indexPath}.${process.pid}.${Date.now()}.tmp`;
    const payload = JSON.stringify({ notes: Array.from(this.notesById.values()) }, null, 2);
    fs.writeFileSync(tmpPath, payload, 'utf8');
    fs.renameSync(tmpPath, this.indexPath);
  }

  private resolveConfinedAudioPath(fileName: string): string {
    this.ensureDirs();
    const safeName = path.basename(fileName);
    const resolvedBase = path.resolve(this.baseDir);
    const resolvedTarget = path.resolve(resolvedBase, safeName);
    if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
      throw new Error('PATH_TRAVERSAL_BLOCKED');
    }
    return resolvedTarget;
  }

  public saveVoiceNote(input: CreateVoiceNoteInput): VoiceNoteRecord {
    this.ensureDirs();
    const noteId = `vn_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
    const ext = ALLOWED_AUDIO_MIME_TYPES[input.mimeType] || 'webm';
    const fileName = `${noteId}.${ext}`;
    const audioPath = this.resolveConfinedAudioPath(fileName);
    fs.writeFileSync(audioPath, input.audioBuffer);

    const nowIso = new Date().toISOString();
    const safeSession = sanitizeSessionId(input.sessionId);
    const cleanName =
      typeof input.name === 'string' && input.name.trim()
        ? path.basename(input.name.trim()).slice(0, 120)
        : `voice-note-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.${ext}`;

    const record: VoiceNoteRecord = {
      id: noteId,
      ownerUserId: input.ownerUserId,
      sessionId: safeSession,
      name: cleanName,
      mimeType: input.mimeType,
      sizeBytes: input.audioBuffer.length,
      durationSec: input.durationSec,
      transcript: typeof input.transcript === 'string' ? input.transcript.trim() : '',
      transcriptionEngine: input.transcriptionEngine || 'unavailable',
      transcribed: Boolean(input.transcribed && input.transcript?.trim()),
      playbackToken: crypto.randomBytes(24).toString('hex'),
      fileName,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.notesById.set(noteId, record);
    this.persistIndex();
    return record;
  }

  public getVoiceNoteById(noteId: string): VoiceNoteRecord | null {
    if (!isValidVoiceNoteId(noteId)) return null;
    return this.notesById.get(noteId.trim()) || null;
  }

  public getVoiceNoteAudioBuffer(
    noteId: string,
    access: { token?: string; requesterUid?: string; isAdmin?: boolean }
  ): { record: VoiceNoteRecord; buffer: Buffer } {
    const record = this.getVoiceNoteById(noteId);
    if (!record) {
      throw new Error('VOICE_NOTE_NOT_FOUND');
    }

    let authorized = false;
    if (access.token && typeof access.token === 'string') {
      const providedBuf = Buffer.from(access.token.trim());
      const expectedBuf = Buffer.from(record.playbackToken);
      if (providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf)) {
        authorized = true;
      }
    }
    if (!authorized && access.requesterUid) {
      if (access.isAdmin || record.ownerUserId === access.requesterUid) {
        authorized = true;
      }
    }

    if (!authorized) {
      throw new Error('UNAUTHORIZED_VOICE_NOTE_ACCESS');
    }

    const audioPath = this.resolveConfinedAudioPath(record.fileName);
    if (!fs.existsSync(audioPath)) {
      throw new Error('VOICE_NOTE_AUDIO_MISSING');
    }

    return {
      record,
      buffer: fs.readFileSync(audioPath),
    };
  }

  public updateTranscript(
    noteId: string,
    requesterUid: string,
    isAdmin: boolean,
    update: { transcript: string; transcriptionEngine: string; transcribed: boolean }
  ): VoiceNoteRecord {
    const existing = this.getVoiceNoteById(noteId);
    if (!existing) throw new Error('VOICE_NOTE_NOT_FOUND');
    if (!isAdmin && existing.ownerUserId !== requesterUid) {
      throw new Error('FORBIDDEN_VOICE_NOTE_OWNERSHIP');
    }

    const updated: VoiceNoteRecord = {
      ...existing,
      transcript: String(update.transcript || '').trim(),
      transcriptionEngine: update.transcriptionEngine || existing.transcriptionEngine,
      transcribed: Boolean(update.transcribed && String(update.transcript || '').trim()),
      updatedAt: new Date().toISOString(),
    };
    this.notesById.set(existing.id, updated);
    this.persistIndex();
    return updated;
  }

  public listSessionVoiceNotes(
    sessionId: string,
    requesterUid: string,
    isAdmin: boolean
  ): VoiceNoteRecord[] {
    const cleanSession = sanitizeSessionId(sessionId);
    return Array.from(this.notesById.values())
      .filter((note) => note.sessionId === cleanSession && (isAdmin || note.ownerUserId === requesterUid))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public deleteVoiceNote(noteId: string, requesterUid: string, isAdmin: boolean): boolean {
    const existing = this.getVoiceNoteById(noteId);
    if (!existing) return false;
    if (!isAdmin && existing.ownerUserId !== requesterUid) {
      throw new Error('FORBIDDEN_VOICE_NOTE_OWNERSHIP');
    }

    try {
      const audioPath = this.resolveConfinedAudioPath(existing.fileName);
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    } catch {
      // ignore missing file on cleanup
    }

    this.notesById.delete(existing.id);
    this.persistIndex();
    return true;
  }

  public toPublicSummary(note: VoiceNoteRecord) {
    return {
      id: note.id,
      sessionId: note.sessionId,
      name: note.name,
      mimeType: note.mimeType,
      sizeBytes: note.sizeBytes,
      durationSec: note.durationSec,
      transcript: note.transcript,
      transcriptionEngine: note.transcriptionEngine,
      transcribed: note.transcribed,
      audioUrl: `/api/anny/voice-notes/${encodeURIComponent(note.id)}/audio?token=${encodeURIComponent(note.playbackToken)}`,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }
}

export const voiceNoteService = VoiceNoteService.getInstance();

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  localSttService,
  measureWavDurationSec,
  parseBase64AudioPayload,
} from './localSttService';
import { voiceNoteService } from './voiceNoteService';

function buildPcmWavBuffer(durationSeconds = 1, sampleRate = 16000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 8000);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  return buffer;
}

test('parseBase64AudioPayload & measureWavDurationSec validate audio payloads strictly', () => {
  const wav = buildPcmWavBuffer(1, 16000);
  assert.equal(measureWavDurationSec(wav), 1);

  const dataUrl = `data:audio/wav;base64,${wav.toString('base64')}`;
  const parsed = parseBase64AudioPayload(dataUrl, 'audio/wav;codecs=pcm');
  assert.equal(parsed.mimeType, 'audio/wav');
  assert.equal(parsed.extension, 'wav');
  assert.equal(parsed.sizeBytes, wav.length);

  assert.throws(() => parseBase64AudioPayload('', 'audio/webm'), /AUDIO_PAYLOAD_MISSING/);
  assert.throws(() => parseBase64AudioPayload('not_valid_base64$$$', 'audio/webm'), /INVALID_AUDIO_BASE64/);
  assert.throws(() => parseBase64AudioPayload(wav.toString('base64'), 'application/javascript'), /UNSUPPORTED_AUDIO_MIME_TYPE/);
  assert.throws(() => parseBase64AudioPayload(Buffer.from('tiny').toString('base64'), 'audio/wav'), /AUDIO_TOO_SHORT/);
});

test('localSttService transcribes via local HTTP Whisper server and fails honestly when unconfigured', async () => {
  const wav = buildPcmWavBuffer(1, 16000);
  const prevLocalStt = process.env.LOCAL_STT_URL;
  const prevWhisperCpp = process.env.WHISPER_CPP_URL;

  try {
    // 1. Unconfigured local STT must report unavailable honestly (never fake text)
    delete process.env.LOCAL_STT_URL;
    delete process.env.WHISPER_CPP_URL;
    const offlineStatus = await localSttService.getStatus();
    if (!offlineStatus.cliBinary) {
      assert.equal(offlineStatus.available, false);
      const unavail = await localSttService.transcribeAudioLocally({
        audioBuffer: wav,
        mimeType: 'audio/wav',
        extension: 'wav',
      });
      assert.equal(unavail.transcribed, false);
      assert.equal(unavail.text, '');
      assert.equal(unavail.engine, 'unavailable');
      assert.equal(unavail.durationSec, 1);
    }

    // 2. Real local HTTP Whisper server round-trip
    let receivedMultipart = false;
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('latin1');
        receivedMultipart = body.includes('voice-note.wav') && body.includes('RIFF');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            text: 'Build a modern architectural portfolio website for ANNY',
            model: 'whisper-small-local',
            language: 'en',
          })
        );
      });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const addr = server.address();
    assert.ok(addr && typeof addr === 'object');
    process.env.LOCAL_STT_URL = `http://127.0.0.1:${addr.port}/v1/audio/transcriptions`;

    const status = await localSttService.getStatus();
    assert.equal(status.available, true);
    assert.equal(status.engine, 'local-whisper-http');

    const result = await localSttService.transcribeAudioLocally({
      audioBuffer: wav,
      mimeType: 'audio/wav',
      extension: 'wav',
      language: 'en',
    });

    server.close();
    assert.equal(receivedMultipart, true);
    assert.equal(result.success, true);
    assert.equal(result.transcribed, true);
    assert.equal(result.text, 'Build a modern architectural portfolio website for ANNY');
    assert.equal(result.engine, 'local-whisper-http');
    assert.equal(result.durationSec, 1);
  } finally {
    if (prevLocalStt === undefined) delete process.env.LOCAL_STT_URL;
    else process.env.LOCAL_STT_URL = prevLocalStt;
    if (prevWhisperCpp === undefined) delete process.env.WHISPER_CPP_URL;
    else process.env.WHISPER_CPP_URL = prevWhisperCpp;
  }
});

test('voiceNoteService attaches notes to chat sessions, verifies capability tokens, and enforces ownership', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anny-vn-test-'));
  voiceNoteService.setStorageDirForTests(tmpDir);

  const wav = buildPcmWavBuffer(1, 16000);
  const saved = voiceNoteService.saveVoiceNote({
    ownerUserId: 'user_voice_1',
    sessionId: 'chat_session_alpha',
    name: 'sprint-brief.wav',
    mimeType: 'audio/wav',
    audioBuffer: wav,
    durationSec: 1,
    transcript: 'Create an onboarding dashboard with tabular metrics',
    transcriptionEngine: 'local-whisper-http',
    transcribed: true,
  });

  assert.equal(saved.sessionId, 'chat_session_alpha');
  assert.equal(saved.transcribed, true);

  // List only returns notes belonging to owner + session
  assert.equal(voiceNoteService.listSessionVoiceNotes('chat_session_alpha', 'user_voice_1', false).length, 1);
  assert.equal(voiceNoteService.listSessionVoiceNotes('chat_session_alpha', 'user_other_2', false).length, 0);
  assert.equal(voiceNoteService.listSessionVoiceNotes('other_session', 'user_voice_1', false).length, 0);

  // Playback succeeds with valid capability token or owner UID, rejects invalid token/user
  const viaToken = voiceNoteService.getVoiceNoteAudioBuffer(saved.id, { token: saved.playbackToken });
  assert.equal(viaToken.buffer.length, wav.length);

  assert.throws(
    () => voiceNoteService.getVoiceNoteAudioBuffer(saved.id, { token: 'invalid_token_value' }),
    /UNAUTHORIZED_VOICE_NOTE_ACCESS/
  );
  assert.throws(
    () => voiceNoteService.getVoiceNoteAudioBuffer(saved.id, { requesterUid: 'user_other_2', isAdmin: false }),
    /UNAUTHORIZED_VOICE_NOTE_ACCESS/
  );

  // Cross-user update & delete rejected
  assert.throws(
    () =>
      voiceNoteService.updateTranscript(saved.id, 'user_other_2', false, {
        transcript: 'hijacked',
        transcriptionEngine: 'manual',
        transcribed: true,
      }),
    /FORBIDDEN_VOICE_NOTE_OWNERSHIP/
  );
  assert.throws(
    () => voiceNoteService.deleteVoiceNote(saved.id, 'user_other_2', false),
    /FORBIDDEN_VOICE_NOTE_OWNERSHIP/
  );

  // Owner delete removes audio file & metadata
  assert.equal(voiceNoteService.deleteVoiceNote(saved.id, 'user_voice_1', false), true);
  assert.equal(voiceNoteService.getVoiceNoteById(saved.id), null);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

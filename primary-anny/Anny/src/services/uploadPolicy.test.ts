import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_DOCUMENT_BATCH_BYTES,
  MAX_DOCUMENT_FILE_BYTES,
  MAX_DOCUMENT_FILES,
  extractSafeTextForRag,
  normalizeRagSearchLimit,
  sanitizeDownloadFilename,
  validateRagSearchQuery,
  validateDocumentBatch,
} from './uploadPolicy.ts';

describe('document upload policy', () => {
  test('accepts within file and aggregate limits', () => {
    assert.deepEqual(validateDocumentBatch([{ size: 10 }, { size: 20 }]), { valid: true });
  });

  test('rejects excessive file count', () => {
    assert.equal(validateDocumentBatch(Array.from({ length: MAX_DOCUMENT_FILES + 1 }, () => ({ size: 1 }))).valid, false);
  });

  test('rejects a file exceeding the individual limit', () => {
    assert.equal(validateDocumentBatch([{ size: MAX_DOCUMENT_FILE_BYTES + 1 }]).valid, false);
  });

  test('rejects aggregate size above batch limit', () => {
    assert.equal(validateDocumentBatch([{ size: MAX_DOCUMENT_BATCH_BYTES }, { size: 1 }]).valid, false);
  });

  test('sanitizes filenames for safe attachment headers', () => {
    assert.equal(
      sanitizeDownloadFilename('../folder' + String.fromCharCode(92) + 'evil' + String.fromCharCode(13) + String.fromCharCode(10) + 'name.html'),
      '.._folder_evil__name.html'
    );
    assert.equal(sanitizeDownloadFilename(''), 'file');
    assert.equal(sanitizeDownloadFilename('x'.repeat(250)).length, 180);
  });

  test('validates query and clamps result limits', () => {
    assert.deepEqual(validateRagSearchQuery('what is ANNY?'), { valid: true });
    assert.equal(validateRagSearchQuery('   ').valid, false);
    assert.equal(validateRagSearchQuery('x'.repeat(10_001)).valid, false);
    assert.equal(normalizeRagSearchLimit(undefined), 5);
    assert.equal(normalizeRagSearchLimit('3'), 3);
    assert.equal(normalizeRagSearchLimit(0), 1);
    assert.equal(normalizeRagSearchLimit(100), 20);
    assert.equal(normalizeRagSearchLimit('invalid'), 5);
  });

  test('ingests only valid small UTF-8 text with an allowlisted extension', () => {
    assert.equal(extractSafeTextForRag('notes.txt', Buffer.from('Hello ANNY')), 'Hello ANNY');
    assert.equal(extractSafeTextForRag('data.json', Buffer.from('{"ok":true}')), '{"ok":true}');
    assert.equal(extractSafeTextForRag('video.mp4', Buffer.from('not text')), null);
    assert.equal(extractSafeTextForRag('image.png', Buffer.from('not text')), null);
    assert.equal(extractSafeTextForRag('secret.env', Buffer.from('API_KEY=secret')), null);
    assert.equal(extractSafeTextForRag('.env.txt', Buffer.from('ordinary text')), null);
    assert.equal(extractSafeTextForRag('project.env.txt', Buffer.from('ordinary text')), null);
    assert.equal(extractSafeTextForRag('notes.txt', Buffer.from('API_KEY=live_value_123456')), null);
    assert.equal(extractSafeTextForRag('notes.txt', Buffer.from('password: confidential')), null);
    assert.equal(extractSafeTextForRag('settings.json', Buffer.from('{"access_token":"secret"}')), null);
    const syntheticPem = ['-----BEGIN', 'PRIVATE', 'KEY-----'].join(' ');
    assert.equal(extractSafeTextForRag('notes.txt', Buffer.from(syntheticPem)), null);
  });

  test('rejects binary NUL and malformed UTF-8 data', () => {
    assert.equal(extractSafeTextForRag('binary.txt', Buffer.from([0x61, 0x00, 0x62])), null);
    assert.equal(extractSafeTextForRag('bad.txt', Buffer.from([0xff, 0xfe])), null);
  });

  test('rejects large text from RAG ingestion', () => {
    assert.equal(extractSafeTextForRag('large.txt', Buffer.alloc(2 * 1024 * 1024 + 1, 0x61)), null);
  });
});

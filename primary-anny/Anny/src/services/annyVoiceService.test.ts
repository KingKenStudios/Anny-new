import assert from 'node:assert/strict';
import test from 'node:test';
import { annyVoiceService } from './annyVoiceService';

test('voice service persists language-specific dialect hints and rejects mismatches', () => {
  annyVoiceService.setDialectHint('yo', 'yo-ekiti');
  assert.equal(annyVoiceService.getDialectHints().yo, 'yo-ekiti');

  assert.throws(() => annyVoiceService.setDialectHint('yo', 'ha-kano' as any), /must match the selected language/);

  annyVoiceService.setDialectHint('yo', null);
  assert.equal(annyVoiceService.getDialectHints().yo, undefined);
});

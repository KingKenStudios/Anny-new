import assert from 'node:assert/strict';
import test from 'node:test';
import { detectNigerianLanguage } from './NigerianLanguageRouter';

test('detects Nigerian languages from strong orthographic evidence', () => {
  assert.equal(detectNigerianLanguage('Ẹ káàbọ̀, mo dúpẹ́').language, 'yo');
  assert.equal(detectNigerianLanguage('Ị̀ dị mma, daalụ').language, 'ig');
  assert.equal(detectNigerianLanguage('ƙauna, lafiya').language, 'ha');
});

test('distinguishes Nigerian Pidgin from explicit Nigerian English signals', () => {
  assert.equal(detectNigerianLanguage('Wetin dey happen? No wahala.').language, 'pcm');
  assert.equal(detectNigerianLanguage('Please speak Naija English.').language, 'en-ng');
  assert.equal(detectNigerianLanguage('I want to use Nigerian English.').language, 'en-ng');
});

test('does not force a voice language for ambiguous single-word evidence', () => {
  assert.equal(detectNigerianLanguage('na').language, null);
  assert.equal(detectNigerianLanguage('abeg').language, 'pcm');
  assert.equal(detectNigerianLanguage('').language, null);
});

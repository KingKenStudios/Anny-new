import { NigerianLanguageCode } from './types';

/** Speech-only normalization. The displayed chat text is never changed by this layer. */
export function normalizeNigerianSpeechText(text: string, language: NigerianLanguageCode): string {
  let value = String(text || '').replace(/\r\n/g, '\n').trim();
  value = value.replace(/```[\s\S]*?```/g, ' ');
  value = value.replace(/https?:\/\/\S+/g, ' ');
  value = value.replace(/\s{2,}/g, ' ').trim();
  if (language === 'yo') return value.replace(/\bE ku\b/gi, 'Ẹ kú');
  if (language === 'ha') return value.replace(/\bAllah ya\b/gi, 'Allah ya');
  if (language === 'ig') return value.replace(/\bDaalu\b/gi, 'Daalụ');
  return value;
}

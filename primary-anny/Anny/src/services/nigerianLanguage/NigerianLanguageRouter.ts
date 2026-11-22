import { NigerianLanguageCode, NigerianLanguageDetection } from './types';

const RULES: Array<{ language: NigerianLanguageCode; terms: RegExp[] }> = [
  { language: 'yo', terms: [/ẹ|ọ|ṣ|à|á|è|é|ì|í|ò|ó|ù|ú/i, /báwo ni/i, /ẹ káàbọ̀/i, /mo dúpẹ́/i, /ó ṣeun/i, /mo fẹ́/i, /kí ni/i] },
  { language: 'ig', terms: [/ị|ọ|ụ|ṅ/i, /kedu/i, /daalụ/i, /biko/i, /anyị/i, /imeela/i, /nna/i] },
  { language: 'ha', terms: [/ƙ|ɓ|ɗ/i, /sannu/i, /ina kwana/i, /yaya/i, /na gode/i, /don Allah/i, /lafiya/i] },
  { language: 'pcm', terms: [/wetin/i, /dey/i, /abeg/i, /una/i, /na so/i, /no wahala/i, /wan/i, /chop/i, /how you dey/i] },
  { language: 'en-ng', terms: [/abeg/i, /naija/i, /wahala/i, /una/i, /wetin/i, /dey/i]
  },
];

export function detectNigerianLanguage(text: string): NigerianLanguageDetection {
  if (!text?.trim()) return { language: null, confidence: 0 };
  const scores = new Map<NigerianLanguageCode, number>();
  for (const rule of RULES) {
    let score = 0;
    for (const term of rule.terms) if (term.test(text)) score += 1;
    if (score > 0) scores.set(rule.language, score);
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return { language: null, confidence: 0 };
  const [language, score] = ranked[0];
  const confidence = Math.min(0.99, score / Math.max(1, RULES.find(r => r.language === language)?.terms.length || 1));
  if (confidence < 0.34) return { language: null, confidence };
  return { language, confidence };
}

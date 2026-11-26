import { NigerianLanguageCode, NigerianLanguageDetection } from './types';

type LanguageRule = {
  language: NigerianLanguageCode;
  strong: RegExp[];
  phrases: RegExp[];
  common: RegExp[];
};

const RULES: LanguageRule[] = [
  {
    language: 'yo',
    strong: [/ẹ|ọ|ṣ|à|á|è|é|ì|í|ò|ó|ù|ú/i],
    phrases: [/báwo ni/i, /ẹ káàbọ̀/i, /mo dúpẹ́/i, /ó ṣeun/i, /mo fẹ́/i, /kí ni/i],
    common: [/e se/i, /omo/i, /jọ̀ọ́/i],
  },
  {
    language: 'ig',
    strong: [/ị|ọ|ụ|ṅ/i],
    phrases: [/kedu/i, /daalụ/i, /biko/i, /anyị/i, /imeela/i, /nna/i],
    common: [/ndewo/i, /maka/i],
  },
  {
    language: 'ha',
    strong: [/ƙ|ɓ|ɗ/i],
    phrases: [/sannu/i, /ina kwana/i, /yaya/i, /na gode/i, /don Allah/i, /lafiya/i],
    common: [/kai/i, /to/i],
  },
  {
    language: 'pcm',
    strong: [/wetin/i, /dey/i, /una/i, /na so/i, /no wahala/i, /chop/i, /how you dey/i, /wan/i, /pidgin english/i],
    phrases: [/abeg/i, /make we/i, /e don/i, /you sabi/i],
    common: [/na/i, /sha/i],
  },
  {
    language: 'en-ng',
    strong: [/\bnaija\b/i, /\bnigerian english\b/i, /\bpidgin english\b/i],
    phrases: [/\b(?:in|from) lagos nigeria\b/i, /\bnigeria\b/i],
    common: [],
  },
];

export function detectNigerianLanguage(text: string): NigerianLanguageDetection {
  if (!text?.trim()) return { language: null, confidence: 0 };

  const ranked = RULES.map((rule) => {
    const strongCount = rule.strong.reduce((sum, pattern) => sum + Number(pattern.test(text)), 0);
    const phraseCount = rule.phrases.reduce((sum, pattern) => sum + Number(pattern.test(text)), 0);
    const commonCount = rule.common.reduce((sum, pattern) => sum + Number(pattern.test(text)), 0);
    return {
      language: rule.language,
      score: strongCount * 4 + phraseCount * 3 + commonCount,
      strongCount,
      phraseCount,
    };
  }).filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.strongCount - a.strongCount || b.phraseCount - a.phraseCount);

  if (!ranked.length) return { language: null, confidence: 0 };

  const winner = ranked[0];
  const runnerUp = ranked[1];
  // Ambiguous one-word overlaps (e.g. "na" or "abeg") are not confident enough
  // to force a language-specific voice; stronger phrases/orthography take priority.
  const margin = winner.score - (runnerUp?.score || 0);
  const confidence = Math.min(0.99, winner.score / 8) * (runnerUp ? Math.min(1, margin / 3) : 1);
  if (confidence < 0.34) return { language: null, confidence };
  return { language: winner.language, confidence };
}

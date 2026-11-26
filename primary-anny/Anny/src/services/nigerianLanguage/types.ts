export type NigerianLanguageCode = 'yo' | 'ha' | 'ig' | 'pcm' | 'en-ng';

export interface NigerianLanguageDetection {
  language: NigerianLanguageCode | null;
  confidence: number;
}

export interface NigerianSpeechRequest {
  text: string;
  language?: NigerianLanguageCode;
  voiceRole: 'female' | 'male';
  dialectHint?: NigerianDialectHint;
}

export type NigerianDialectHint =
  | 'yo-ekiti' | 'yo-ijebu' | 'yo-oyo' | 'yo-ondo' | 'yo-lagos'
  | 'ha-kano' | 'ha-sokoto' | 'ha-zaria'
  | 'ig-anambra' | 'ig-enugu' | 'ig-imo'
  | 'pcm-lagos' | 'pcm-port-harcourt' | 'pcm-general'
  | 'en-ng-lagos' | 'en-ng-general';

export const NIGERIAN_DIALECT_HINTS: Record<NigerianLanguageCode, readonly NigerianDialectHint[]> = {
  yo: ['yo-ekiti', 'yo-ijebu', 'yo-oyo', 'yo-ondo', 'yo-lagos'],
  ha: ['ha-kano', 'ha-sokoto', 'ha-zaria'],
  ig: ['ig-anambra', 'ig-enugu', 'ig-imo'],
  pcm: ['pcm-lagos', 'pcm-port-harcourt', 'pcm-general'],
  'en-ng': ['en-ng-lagos', 'en-ng-general'],
};

export function isValidNigerianDialectHint(
  language: NigerianLanguageCode,
  hint: unknown,
): hint is NigerianDialectHint {
  return typeof hint === 'string' && NIGERIAN_DIALECT_HINTS[language].includes(hint as NigerianDialectHint);
}

export type NigerianLanguageCode = 'yo' | 'ha' | 'ig' | 'pcm' | 'en-ng';

export interface NigerianLanguageDetection {
  language: NigerianLanguageCode | null;
  confidence: number;
}

export interface NigerianSpeechRequest {
  text: string;
  language?: NigerianLanguageCode;
  voiceRole: 'female' | 'male';
}

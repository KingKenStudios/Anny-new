import { safeStorage } from '../lib/storage';
import { ANNY_VOICE_PROFILES, ANNY_VOICE_STORAGE_KEY, AnnyVoiceRole, DEFAULT_ANNY_VOICE_ROLE } from './annyVoiceRegistry';
import { detectNigerianLanguage } from './nigerianLanguage/NigerianLanguageRouter';
import { speakWithNigerianTTS, stopNigerianTTS } from './nigerianLanguage/NigerianTTSAdapter';
import { isValidNigerianDialectHint, type NigerianDialectHint, type NigerianLanguageCode } from './nigerianLanguage/types';

export class AnnyVoiceService {
  private static instance: AnnyVoiceService;
  private voices: SpeechSynthesisVoice[] = [];
  private activeRole: AnnyVoiceRole = DEFAULT_ANNY_VOICE_ROLE;
  private dialectHints: Partial<Record<NigerianLanguageCode, NigerianDialectHint>> = {};
  private speechGeneration = 0;
  private readonly dialectStorageKey = 'anny_voice_dialect_hints';

  private constructor() {
    this.activeRole = this.getSavedRole();
    this.dialectHints = this.getSavedDialectHints();
    this.refreshVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', () => this.refreshVoices());
    }
  }

  public static getInstance(): AnnyVoiceService {
    if (!this.instance) this.instance = new AnnyVoiceService();
    return this.instance;
  }

  private getSavedDialectHints(): Partial<Record<NigerianLanguageCode, NigerianDialectHint>> {
    try {
      const raw = safeStorage.getItem(this.dialectStorageKey);
      const saved = raw ? JSON.parse(raw) : {};
      const validated: Partial<Record<NigerianLanguageCode, NigerianDialectHint>> = {};
      for (const language of ['yo', 'ha', 'ig', 'pcm', 'en-ng'] as NigerianLanguageCode[]) {
        const hint = saved?.[language];
        if (isValidNigerianDialectHint(language, hint)) validated[language] = hint;
      }
      return validated;
    } catch {
      return {};
    }
  }

  private getSavedRole(): AnnyVoiceRole {
    const saved = safeStorage.getItem(ANNY_VOICE_STORAGE_KEY);
    return saved === 'male' || saved === 'female' ? saved : DEFAULT_ANNY_VOICE_ROLE;
  }

  private refreshVoices(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
  }

  public getVoiceProfiles() { return ANNY_VOICE_PROFILES; }
  public getDialectHints(): Readonly<Partial<Record<NigerianLanguageCode, NigerianDialectHint>>> { return { ...this.dialectHints }; }
  public setDialectHint(language: NigerianLanguageCode, hint: NigerianDialectHint | null): void {
    if (hint !== null && !isValidNigerianDialectHint(language, hint)) {
      throw new Error('Dialect hint must match the selected language.');
    }
    if (hint === null) delete this.dialectHints[language];
    else this.dialectHints[language] = hint;
    safeStorage.setItem(this.dialectStorageKey, JSON.stringify(this.dialectHints));
  }
  public getSelectedRole(): AnnyVoiceRole { return this.activeRole; }
  public setSelectedRole(role: AnnyVoiceRole): void {
    this.activeRole = role;
    safeStorage.setItem(ANNY_VOICE_STORAGE_KEY, role);
  }

  private findBrowserVoice(role: AnnyVoiceRole): SpeechSynthesisVoice | null {
    this.refreshVoices();
    const preferred = role === 'female'
      ? ['Google UK English Female', 'Google US English', 'Microsoft Zira', 'Samantha', 'Karen', 'Moira', 'Victoria']
      : ['Google UK English Male', 'Google US English Male', 'Microsoft David', 'Microsoft Mark', 'Daniel', 'Alex', 'Fred', 'Oliver'];
    for (const name of preferred) {
      const found = this.voices.find(v => v.name.includes(name));
      if (found) return found;
    }
    const english = this.voices.filter(v => /^en(-|_)/i.test(v.lang));
    const genderHint = role === 'female' ? /female|zira|samantha|karen|victoria/i : /male|david|daniel|mark|alex|fred/i;
    return english.find(v => genderHint.test(v.name)) || english[0] || this.voices[0] || null;
  }

  public async speakConversation(text: string, onEnd?: () => void): Promise<void> {
    await this.speakRole(text, this.activeRole, onEnd, true);
  }

  public async speakSpeakerButton(text: string, onEnd?: () => void): Promise<void> {
    // The speaker button follows the user's selected ANNY voice.
    // Do not silently switch to another role when the user has selected one.
    await this.speakRole(text, this.activeRole, onEnd, true);
  }

  public async speak(text: string, mode: 'chat' | 'build' = 'chat', onEnd?: () => void): Promise<void> {
    // Both automatic conversation and explicit speaker playback use the same
    // persisted voice preference. 'build' is a context, not a different voice.
    return this.speakRole(text, this.activeRole, onEnd, true);
  }

  private async speakRole(text: string, role: AnnyVoiceRole, onEnd?: () => void, useNativeRouter = false): Promise<void> {
    if (typeof window === 'undefined') return;
    this.stop();
    const generation = this.speechGeneration;
    window.dispatchEvent(new CustomEvent('anny:speech-start', { detail: { role } }));
    const cleanText = this.cleanForSpeech(text);
    if (!cleanText) {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('anny:speech-end'));
      onEnd?.();
      return;
    }

    if (useNativeRouter) {
      const detected = detectNigerianLanguage(cleanText);
      if (detected.language) {
        const dialectHint = this.dialectHints[detected.language];
        const handled = await speakWithNigerianTTS({ text: cleanText, language: detected.language, voiceRole: role, dialectHint });
        // A newer utterance or explicit stop invalidates this async provider result.
        if (generation !== this.speechGeneration) return;
        if (handled) {
          if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('anny:speech-end'));
          onEnd?.();
          return;
        }
        if (dialectHint) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('anny:speech-error', { detail: { reason: 'DIALECT_TTS_UNAVAILABLE', language: detected.language, dialectHint } }));
            window.dispatchEvent(new CustomEvent('anny:speech-end'));
          }
          onEnd?.();
          return;
        }
      }
    }

    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      window.dispatchEvent(new CustomEvent('anny:speech-error', { detail: { reason: 'BROWSER_TTS_UNAVAILABLE' } }));
      window.dispatchEvent(new CustomEvent('anny:speech-end'));
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = this.findBrowserVoice(role);
    if (voice) utterance.voice = voice;
    utterance.lang = /^en/i.test(voice?.lang || '') ? voice!.lang : 'en-US';
    utterance.rate = role === 'female' ? 1 : 0.95;
    utterance.pitch = role === 'female' ? 1.02 : 0.92;
    utterance.onend = () => {
      if (generation !== this.speechGeneration) return;
      window.dispatchEvent(new CustomEvent('anny:speech-end'));
      onEnd?.();
    };
    utterance.onerror = () => {
      if (generation !== this.speechGeneration) return;
      window.dispatchEvent(new CustomEvent('anny:speech-end'));
      onEnd?.();
    };
    window.speechSynthesis.speak(utterance);
  }

  private cleanForSpeech(text: string): string {
    return String(text || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[*_~`>#|]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 1200);
  }

  public stop(): void {
    this.speechGeneration += 1;
    stopNigerianTTS();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.dispatchEvent(new CustomEvent('anny:speech-end'));
    }
  }

  public isSpeaking(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
  }
}

export const annyVoiceService = AnnyVoiceService.getInstance();

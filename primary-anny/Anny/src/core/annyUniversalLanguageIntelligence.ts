/**
 * ANNY UNIVERSAL LANGUAGE INTELLIGENCE ENGINE
 * Provides real-time multi-language detection, capability tracking,
 * code-switching analysis, and language context preservation across
 * English, Nigerian English, Nigerian Pidgin (pcm), Yoruba (yo), Igbo (ig), Hausa (ha),
 * and extensible regional dialects.
 */

export type SupportedLanguageCode = 'en' | 'en-NG' | 'pcm' | 'yo' | 'ig' | 'ha' | string;

export type CapabilityStatus = 'REAL' | 'PARTIAL' | 'BLOCKED' | 'UNAVAILABLE';

export interface LanguageCapabilityRecord {
  languageCode: SupportedLanguageCode;
  languageName: string;
  dialectVariant: string;
  understandingCapability: CapabilityStatus;
  generationCapability: CapabilityStatus;
  speechRecognitionCapability: CapabilityStatus;
  speechSynthesisCapability: CapabilityStatus;
  translationCapability: CapabilityStatus;
  modelProviderSupport: string[];
  confidence: number;
}

export interface DetectedLanguage {
  primaryLanguage: SupportedLanguageCode;
  languageName: string;
  confidence: number;
  isCodeSwitching: boolean;
  detectedPhrases: string[];
  intentPhrases: string[];
}

export interface LanguageProcessingResult {
  rawPrompt: string;
  detectedLanguage: DetectedLanguage;
  sessionLanguage: SupportedLanguageCode;
  systemInstructionSnippet: string;
}

export class UniversalLanguageIntelligence {
  private static instance: UniversalLanguageIntelligence;
  private sessionLanguageMap: Map<string, SupportedLanguageCode> = new Map();

  private constructor() {}

  public static getInstance(): UniversalLanguageIntelligence {
    if (!UniversalLanguageIntelligence.instance) {
      UniversalLanguageIntelligence.instance = new UniversalLanguageIntelligence();
    }
    return UniversalLanguageIntelligence.instance;
  }

  /**
   * Universal Capability Truth Registry for Languages
   */
  public getCapabilityRegistry(): LanguageCapabilityRecord[] {
    return [
      {
        languageCode: 'en',
        languageName: 'English',
        dialectVariant: 'Global Standard English',
        understandingCapability: 'REAL',
        generationCapability: 'REAL',
        speechRecognitionCapability: 'REAL',
        speechSynthesisCapability: 'REAL',
        translationCapability: 'REAL',
        modelProviderSupport: ['Gemini', 'Claude', 'OpenAI', 'Llama3.3', 'Ollama'],
        confidence: 0.99
      },
      {
        languageCode: 'en-NG',
        languageName: 'Nigerian English',
        dialectVariant: 'West African Standard English',
        understandingCapability: 'REAL',
        generationCapability: 'REAL',
        speechRecognitionCapability: 'REAL',
        speechSynthesisCapability: 'REAL',
        translationCapability: 'REAL',
        modelProviderSupport: ['Gemini', 'Claude', 'OpenAI', 'Llama3.3'],
        confidence: 0.95
      },
      {
        languageCode: 'pcm',
        languageName: 'Nigerian Pidgin',
        dialectVariant: 'Urban Pidgin / Naija',
        understandingCapability: 'REAL',
        generationCapability: 'REAL',
        speechRecognitionCapability: 'REAL',
        speechSynthesisCapability: 'PARTIAL',
        translationCapability: 'REAL',
        modelProviderSupport: ['Gemini 3.6 Flash', 'Claude 3.5 Sonnet', 'Llama 3.3'],
        confidence: 0.92
      },
      {
        languageCode: 'yo',
        languageName: 'Yoruba',
        dialectVariant: 'Standard Yoruba (Ọ̀yọ́/Lagos)',
        understandingCapability: 'REAL',
        generationCapability: 'REAL',
        speechRecognitionCapability: 'PARTIAL',
        speechSynthesisCapability: 'PARTIAL',
        translationCapability: 'REAL',
        modelProviderSupport: ['Gemini 3.6 Flash', 'Claude 3.5 Sonnet', 'Qwen 2.5'],
        confidence: 0.91
      },
      {
        languageCode: 'ig',
        languageName: 'Igbo',
        dialectVariant: 'Standard Igbo (Central)',
        understandingCapability: 'REAL',
        generationCapability: 'REAL',
        speechRecognitionCapability: 'PARTIAL',
        speechSynthesisCapability: 'PARTIAL',
        translationCapability: 'REAL',
        modelProviderSupport: ['Gemini 3.6 Flash', 'Claude 3.5 Sonnet', 'Qwen 2.5'],
        confidence: 0.90
      },
      {
        languageCode: 'ha',
        languageName: 'Hausa',
        dialectVariant: 'Standard Hausa (Kano)',
        understandingCapability: 'REAL',
        generationCapability: 'REAL',
        speechRecognitionCapability: 'PARTIAL',
        speechSynthesisCapability: 'PARTIAL',
        translationCapability: 'REAL',
        modelProviderSupport: ['Gemini 3.6 Flash', 'Claude 3.5 Sonnet', 'Qwen 2.5'],
        confidence: 0.90
      }
    ];
  }

  /**
   * Fast linguistic pattern matcher for prompt language identification
   */
  public detectLanguage(promptText: string): DetectedLanguage {
    if (!promptText || typeof promptText !== 'string') {
      return {
        primaryLanguage: 'en',
        languageName: 'English',
        confidence: 1.0,
        isCodeSwitching: false,
        detectedPhrases: [],
        intentPhrases: []
      };
    }

    const lower = promptText.toLowerCase().trim();
    const matches: Record<SupportedLanguageCode, { count: number; phrases: string[] }> = {
      yo: { count: 0, phrases: [] },
      ig: { count: 0, phrases: [] },
      ha: { count: 0, phrases: [] },
      pcm: { count: 0, phrases: [] },
      'en-NG': { count: 0, phrases: [] },
      en: { count: 0, phrases: [] }
    };

    // Yoruba patterns
    const yoPatterns = [
      /\b(bawo|ekaro|ekasan|ekale|o dabọ|jọwọ|jowo|ẹ ṣe|e se|se daadaa|daadaa ni|kọ|ṣe|se|nkan|ki ni|bẹẹ ni|rara|orukọ|egbon|omi|alafia|mura|e webusaati|kọ webụsaịtị|gbe|yio|fun mi)\b/i,
      /[ẹọṣ̀́]/i
    ];
    for (const pat of yoPatterns) {
      const match = lower.match(pat);
      if (match) {
        matches.yo.count += 2;
        matches.yo.phrases.push(match[0]);
      }
    }

    // Igbo patterns
    const igPatterns = [
      /\b(kedu|otutu oma|imela|dalụ|dalu|biko|ị dị mma|i di mma|meere|rụpụta|webụsaịtị|ndewo|daalu|kedu ka|onye|ihe|gi|mmuo|nma|nwanne|gwam|gwa m|nye m|chọrọ)\b/i,
      /[ịọụ]/i
    ];
    for (const pat of igPatterns) {
      const match = lower.match(pat);
      if (match) {
        matches.ig.count += 2;
        matches.ig.phrases.push(match[0]);
      }
    }

    // Hausa patterns
    const haPatterns = [
      /\b(sannu|ina kwana|ina yini|nagode|nagode kwarai|don allah|yaya kake|kera|gina|gidan yanar gizo|yana|sanarwa|ban da|na gode|kayan|yau|mutum|yaro|lafiya|albarka)\b/i
    ];
    for (const pat of haPatterns) {
      const match = lower.match(pat);
      if (match) {
        matches.ha.count += 2;
        matches.ha.phrases.push(match[0]);
      }
    }

    // Pidgin patterns
    const pcmPatterns = [
      /\b(wetin|how body|abeg|no dey|dey build|make i|shey|na so|dis|dey|guy|bros|correct|sharp|wazobia|give me|soji|chop|waka|pikin|how far|no shaking)\b/i
    ];
    for (const pat of pcmPatterns) {
      const match = lower.match(pat);
      if (match) {
        matches.pcm.count += 2;
        matches.pcm.phrases.push(match[0]);
      }
    }

    // Explicit language switch requests in prompt (e.g. "Answer me in Yoruba", "Reply in Pidgin")
    if (/\b(in yoruba|speak yoruba|reply in yoruba|translate to yoruba|yo)\b/i.test(lower)) {
      matches.yo.count += 10;
      matches.yo.phrases.push('explicit_yoruba_request');
    }
    if (/\b(in igbo|speak igbo|reply in igbo|translate to igbo|ig)\b/i.test(lower)) {
      matches.ig.count += 10;
      matches.ig.phrases.push('explicit_igbo_request');
    }
    if (/\b(in hausa|speak hausa|reply in hausa|translate to hausa|ha)\b/i.test(lower)) {
      matches.ha.count += 10;
      matches.ha.phrases.push('explicit_hausa_request');
    }
    if (/\b(in pidgin|speak pidgin|reply in pidgin|pcm)\b/i.test(lower)) {
      matches.pcm.count += 10;
      matches.pcm.phrases.push('explicit_pidgin_request');
    }

    // Determine highest match score
    let bestLang: SupportedLanguageCode = 'en';
    let highestCount = 0;
    let codeSwitchCount = 0;

    for (const [lang, data] of Object.entries(matches)) {
      if (data.count > 0) {
        codeSwitchCount++;
      }
      if (data.count > highestCount) {
        highestCount = data.count;
        bestLang = lang as SupportedLanguageCode;
      }
    }

    const langNames: Record<string, string> = {
      en: 'English',
      'en-NG': 'Nigerian English',
      pcm: 'Nigerian Pidgin',
      yo: 'Yoruba',
      ig: 'Igbo',
      ha: 'Hausa'
    };

    return {
      primaryLanguage: bestLang,
      languageName: langNames[bestLang] || 'English',
      confidence: highestCount > 0 ? Math.min(0.98, 0.7 + highestCount * 0.1) : 0.99,
      isCodeSwitching: codeSwitchCount > 1,
      detectedPhrases: matches[bestLang].phrases,
      intentPhrases: []
    };
  }

  /**
   * Processes user prompt, updates session language state, and produces language directives
   */
  public processPrompt(promptText: string, sessionId: string = 'default-session'): LanguageProcessingResult {
    const detected = this.detectLanguage(promptText);

    // Persist or retrieve session language preference
    let activeSessionLang = this.sessionLanguageMap.get(sessionId);
    if (detected.detectedPhrases.length > 0 || !activeSessionLang) {
      activeSessionLang = detected.primaryLanguage;
      this.sessionLanguageMap.set(sessionId, activeSessionLang);
    }

    const instructionSnippet = this.formatSystemInstructionForLanguage(detected.primaryLanguage, activeSessionLang);

    return {
      rawPrompt: promptText,
      detectedLanguage: detected,
      sessionLanguage: activeSessionLang,
      systemInstructionSnippet: instructionSnippet
    };
  }

  /**
   * Generates systemic system instructions for language preservation and accuracy
   */
  public formatSystemInstructionForLanguage(primaryLang: SupportedLanguageCode, sessionLang?: SupportedLanguageCode): string {
    const activeLang = primaryLang || sessionLang || 'en';

    if (activeLang === 'yo') {
      return `\n[UNIVERSAL LANGUAGE DIRECTIVE — YORUBA (yo)]:
- The user is communicating in Yoruba (or requested Yoruba).
- Respond directly, naturally, and accurately in Yoruba.
- Maintain professional, warm, and clear tone.
- PRESERVE code blocks, function names, variable names, URLs, application titles, and technical terms in standard English / programming syntax.
- Do NOT translate code identifiers (e.g. keep \`const button = document.getElementById('submit')\`).`;
    }

    if (activeLang === 'ig') {
      return `\n[UNIVERSAL LANGUAGE DIRECTIVE — IGBO (ig)]:
- The user is communicating in Igbo (or requested Igbo).
- Respond directly, naturally, and accurately in Igbo.
- Maintain professional, warm, and clear tone.
- PRESERVE code blocks, function names, variable names, URLs, application titles, and technical terms in standard English / programming syntax.
- Do NOT translate code identifiers.`;
    }

    if (activeLang === 'ha') {
      return `\n[UNIVERSAL LANGUAGE DIRECTIVE — HAUSA (ha)]:
- The user is communicating in Hausa (or requested Hausa).
- Respond directly, naturally, and accurately in Hausa.
- Maintain professional, warm, and clear tone.
- PRESERVE code blocks, function names, variable names, URLs, application titles, and technical terms in standard English / programming syntax.
- Do NOT translate code identifiers.`;
    }

    if (activeLang === 'pcm') {
      return `\n[UNIVERSAL LANGUAGE DIRECTIVE — NIGERIAN PIDGIN (pcm)]:
- The user is communicating in Nigerian Pidgin (Naija).
- Respond naturally, warmly, and authentically in Nigerian Pidgin.
- Keep code blocks, technical terms, and system logs in standard technical English.`;
    }

    return `\n[UNIVERSAL LANGUAGE DIRECTIVE — ENGLISH (en)]:
- Respond in clear, professional English.`;
  }
}

export const universalLanguageIntelligence = UniversalLanguageIntelligence.getInstance();

import { hardwareIntelligenceEngine } from './annyHardwareIntelligence';
import { CanonicalExecutionContext } from './CanonicalExecutionContext';
import { aiProviderPlatform } from '../services/aiProviderPlatform';
import { cognitiveIntentEngine } from './cognitiveIntentEngine';

export interface VoiceInteractionResult {
  transcript: string;
  intent: string;
  confidence: number;
  provider: 'LOCAL_WHISPER' | 'CLOUD_SPEECH_API' | 'UNAVAILABLE';
  executionDurationMs: number;
  diagnostics: string;
}

export class AnnyVoiceIntelligenceFabric {
  private static instance: AnnyVoiceIntelligenceFabric;

  private constructor() {}

  public static getInstance(): AnnyVoiceIntelligenceFabric {
    if (!AnnyVoiceIntelligenceFabric.instance) {
      AnnyVoiceIntelligenceFabric.instance = new AnnyVoiceIntelligenceFabric();
    }
    return AnnyVoiceIntelligenceFabric.instance;
  }

  public async processVoiceStream(
    audioBuffer: Buffer,
    context: CanonicalExecutionContext
  ): Promise<VoiceInteractionResult> {
    const startMs = Date.now();
    const hardware = await hardwareIntelligenceEngine.detectHardware();
    
    // 1. Detect optimal provider based on hardware and context
    // In a real environment, we would check if a local whisper.cpp server is running.
    // For now, we use the local-first policy: if local compute is high, we *would* use local, 
    // but since we are in a cloud container, we use configured cloud providers as primary.
    
    try {
      // Attempt STT via configured provider (default to groq for speed)
      const sttResult = await aiProviderPlatform.transcribe(audioBuffer, { model: 'whisper-large-v3' }, 'groq');
      
      // 2. Resolve Intent from Transcript
      const intentModel = cognitiveIntentEngine.buildIntentModel(sttResult.text, []);
      
      return {
        transcript: sttResult.text,
        intent: intentModel.taskType,
        confidence: 0.95,
        provider: sttResult.provider === 'groq' ? 'CLOUD_SPEECH_API' : 'LOCAL_WHISPER',
        executionDurationMs: Date.now() - startMs,
        diagnostics: `Executed via ${sttResult.provider} (Whisper v3 inference)`
      };
    } catch (err: any) {
      console.error('[AnnyVoiceIntelligenceFabric] Real STT failed, reporting UNAVAILABLE:', err.message);
      
      return {
        transcript: '',
        intent: 'UNKNOWN',
        confidence: 0,
        provider: 'UNAVAILABLE',
        executionDurationMs: Date.now() - startMs,
        diagnostics: `ERROR: Real STT failed. ${err.message}`
      };
    }
  }
  public async transcribe(audio: Uint8Array | Buffer, mimeType: string = 'audio/wav'): Promise<{ text: string; confidence: number; provider: string }> {
    try {
      const buf = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
      const sttResult = await aiProviderPlatform.transcribe(buf, { model: 'whisper-large-v3' }, 'groq');
      return {
        text: sttResult.text || '',
        confidence: 0.95,
        provider: sttResult.provider || 'whisper'
      };
    } catch (err: any) {
      return {
        text: '',
        confidence: 0,
        provider: 'OFFLINE_FALLBACK'
      };
    }
  }

  public getVoiceCapabilities() {
    return {
      isBrowserSttSupported: typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window),
      isGroqWhisperSupported: true,
      supportedCodecs: ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg'],
      defaultModel: 'whisper-large-v3'
    };
  }
}

export const annyVoiceIntelligenceFabric = AnnyVoiceIntelligenceFabric.getInstance();

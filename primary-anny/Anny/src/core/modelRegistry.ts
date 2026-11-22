/**
 * ANNY — Authoritative Central Model & Provider Registry
 *
 * Single source of truth for verified provider model identifiers, API versions,
 * SDK contracts, modalities, local/online status, and truthful runtime availability.
 *
 * Rules:
 *  - ZERO invented or deprecated model IDs (no gemini-3.6-flash, gemini-1.5-*, gemini-2.0-*, imagen-3, sora-api).
 *  - Never report a provider as AVAILABLE solely because an API key string exists without honoring
 *    OFFLINE_ONLY policy and paid-tier / capability constraints.
 *  - Clearly distinguish local offline models, configured online models, and unconfigured/optional paid models.
 */

export type ModelCapability =
  | 'TEXT_CHAT'
  | 'COMPLEX_REASONING'
  | 'DEEP_REASONING'
  | 'CODE_SYNTHESIS'
  | 'IMAGE_UNDERSTANDING'
  | 'IMAGE_GENERATION'
  | 'IMAGE_EDITING'
  | 'VECTOR_LOGO_SYNTHESIS'
  | 'VIDEO_GENERATION'
  | 'VIDEO_EDITING'
  | 'VIDEO_EXTENSION'
  | 'LIVE_AUDIO_VIDEO'
  | 'AUDIO_TRANSCRIPTION'
  | 'TEXT_TO_SPEECH'
  | 'MUSIC_GENERATION'
  | 'EMBEDDINGS';

export type ModelModality = 'text' | 'image' | 'video' | 'audio' | 'svg' | 'embedding';

export type ModelRuntimeAvailability =
  | 'AVAILABLE_OFFLINE'
  | 'CONFIGURED_ONLINE'
  | 'UNCONFIGURED'
  | 'REQUIRES_PAID_KEY'
  | 'DISABLED_BY_OFFLINE_POLICY'
  | 'UNAVAILABLE';

export interface RegisteredModelSpec {
  id: string;
  provider: 'google-gemini' | 'openai' | 'anthropic' | 'groq' | 'ollama' | 'local-sd' | 'anny-local';
  displayName: string;
  capabilities: ModelCapability[];
  inputModalities: ModelModality[];
  outputModalities: ModelModality[];
  apiVersion: string;
  sdkMethod: string;
  authRequirement: 'none' | 'GEMINI_API_KEY' | 'OPENAI_API_KEY' | 'ANTHROPIC_API_KEY' | 'GROQ_API_KEY' | 'SD_WEBUI_URL' | 'OLLAMA_HOST';
  pricingCategory: 'free_local' | 'free_tier_or_paid' | 'paid_api_key_required';
  localOrOnline: 'local_offline' | 'cloud_online';
  inputConstraints: string;
  outputConstraints: string;
  deprecationStatus: 'active' | 'preview' | 'deprecated';
  lastVerifiedAt: string;
}

export interface DiscoveredModelEntry extends RegisteredModelSpec {
  availability: ModelRuntimeAvailability;
  statusDetail: string;
}

export const VERIFIED_MODEL_REGISTRY: readonly RegisteredModelSpec[] = [
  {
    id: 'gemini-4-hydrogen',
    provider: 'google-gemini',
    displayName: 'Gemini 4 Hydrogen (Fast Core & Multimodal)',
    capabilities: ['TEXT_CHAT', 'CODE_SYNTHESIS', 'IMAGE_UNDERSTANDING'],
    inputModalities: ['text', 'image', 'audio', 'video'],
    outputModalities: ['text'],
    apiVersion: 'v1',
    sdkMethod: 'ai.models.generateContent',
    authRequirement: 'GEMINI_API_KEY',
    pricingCategory: 'free_tier_or_paid',
    localOrOnline: 'cloud_online',
    inputConstraints: 'Text and multimodal parts; omit deprecated temperature/topP/topK and thinkingBudget.',
    outputConstraints: 'Text / structured JSON via responseSchema.',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'gemini-3.1-flash-lite',
    provider: 'google-gemini',
    displayName: 'Gemini 3.1 Flash Lite (Low-Latency Text)',
    capabilities: ['TEXT_CHAT', 'IMAGE_UNDERSTANDING'],
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    apiVersion: 'v1',
    sdkMethod: 'ai.models.generateContent',
    authRequirement: 'GEMINI_API_KEY',
    pricingCategory: 'free_tier_or_paid',
    localOrOnline: 'cloud_online',
    inputConstraints: 'Low-latency text and image prompts; supports ThinkingLevel.MINIMAL.',
    outputConstraints: 'Text / JSON.',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'gemini-4-neon',
    provider: 'google-gemini',
    displayName: 'Gemini 4 Neon (Advanced Reasoning & Code)',
    capabilities: ['TEXT_CHAT', 'COMPLEX_REASONING', 'CODE_SYNTHESIS', 'IMAGE_UNDERSTANDING'],
    inputModalities: ['text', 'image', 'audio', 'video'],
    outputModalities: ['text'],
    apiVersion: 'v1',
    sdkMethod: 'ai.models.generateContent',
    authRequirement: 'GEMINI_API_KEY',
    pricingCategory: 'paid_api_key_required',
    localOrOnline: 'cloud_online',
    inputConstraints: 'Complex reasoning/coding; supports ThinkingLevel.LOW..XHIGH.',
    outputConstraints: 'Text / structured JSON.',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'gemini-4-carbon',
    provider: 'google-gemini',
    displayName: 'Gemini 4 Carbon (Deep Architecture & Security)',
    capabilities: ['DEEP_REASONING', 'COMPLEX_REASONING', 'CODE_SYNTHESIS'],
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    apiVersion: 'v1',
    sdkMethod: 'ai.models.generateContent',
    authRequirement: 'GEMINI_API_KEY',
    pricingCategory: 'paid_api_key_required',
    localOrOnline: 'cloud_online',
    inputConstraints: 'Deep root-cause and architectural reasoning; supports ThinkingLevel.LOW..HIGH.',
    outputConstraints: 'Text / structured JSON.',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    provider: 'google-gemini',
    displayName: 'Gemini 3.1 Flash Lite Image (General Image Gen & Edit)',
    capabilities: ['IMAGE_GENERATION', 'IMAGE_EDITING'],
    inputModalities: ['text', 'image'],
    outputModalities: ['image', 'text'],
    apiVersion: 'v1',
    sdkMethod: 'ai.models.generateContent / ai.interactions.create',
    authRequirement: 'GEMINI_API_KEY',
    pricingCategory: 'paid_api_key_required',
    localOrOnline: 'cloud_online',
    inputConstraints: 'Text prompt and optional reference images for editing.',
    outputConstraints: 'PNG/JPEG/WebP raster image bytes.',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'gemini-nano-banana-2.1',
    provider: 'google-gemini',
    displayName: 'Gemini Nano Banana 2.1 (High-Res 1K/2K/4K Image)',
    capabilities: ['IMAGE_GENERATION', 'IMAGE_EDITING'],
    inputModalities: ['text', 'image'],
    outputModalities: ['image', 'text'],
    apiVersion: 'v1',
    sdkMethod: 'ai.models.generateContent / ai.interactions.create',
    authRequirement: 'GEMINI_API_KEY',
    pricingCategory: 'paid_api_key_required',
    localOrOnline: 'cloud_online',
    inputConstraints: 'Text prompt + up to 6 reference images; supports 1K, 2K, 4K.',
    outputConstraints: 'High-resolution PNG/JPEG/WebP raster image bytes.',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'gemini-omni-1.2-flash',
    provider: 'google-gemini',
    displayName: 'Gemini Omni 1.2 Flash (Video Generation, Editing & Extension)',
    capabilities: ['VIDEO_GENERATION', 'VIDEO_EDITING', 'VIDEO_EXTENSION'],
    inputModalities: ['text', 'image', 'video'],
    outputModalities: ['video'],
    apiVersion: 'v1',
    sdkMethod: 'ai.interactions.create (response_format.type = "video")',
    authRequirement: 'GEMINI_API_KEY',
    pricingCategory: 'paid_api_key_required',
    localOrOnline: 'cloud_online',
    inputConstraints: 'Text, up to 6 reference images, or uploaded/previous video; duration 3s-15s; 16:9 or 9:16.',
    outputConstraints: 'MP4 video container via interaction.output_video (base64 data or file URI).',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'gemini-3.8-live',
    provider: 'google-gemini',
    displayName: 'Gemini 3.8 Live (Real-Time Voice & Video Perception)',
    capabilities: ['LIVE_AUDIO_VIDEO', 'IMAGE_UNDERSTANDING'],
    inputModalities: ['audio', 'video', 'text'],
    outputModalities: ['audio', 'text'],
    apiVersion: 'v1',
    sdkMethod: 'ai.live.connect',
    authRequirement: 'GEMINI_API_KEY',
    pricingCategory: 'free_tier_or_paid',
    localOrOnline: 'cloud_online',
    inputConstraints: '16kHz PCM audio + <=1 FPS JPEG video frames via sendRealtimeInput.',
    outputConstraints: '24kHz PCM audio + optional text transcripts.',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'lyria-3-clip-preview',
    provider: 'google-gemini',
    displayName: 'Lyria 3 Clip (30s Music Generation)',
    capabilities: ['MUSIC_GENERATION'],
    inputModalities: ['text', 'image'],
    outputModalities: ['audio', 'text'],
    apiVersion: 'v1',
    sdkMethod: 'ai.models.generateContentStream',
    authRequirement: 'GEMINI_API_KEY',
    pricingCategory: 'paid_api_key_required',
    localOrOnline: 'cloud_online',
    inputConstraints: 'Music prompt and optional reference image.',
    outputConstraints: 'Encoded audio stream (WAV/MP3) + optional lyrics text.',
    deprecationStatus: 'preview',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'lyria-3-pro-preview',
    provider: 'google-gemini',
    displayName: 'Lyria 3 Pro (Full-Length Music Generation)',
    capabilities: ['MUSIC_GENERATION'],
    inputModalities: ['text', 'image'],
    outputModalities: ['audio', 'text'],
    apiVersion: 'v1',
    sdkMethod: 'ai.models.generateContentStream',
    authRequirement: 'GEMINI_API_KEY',
    pricingCategory: 'paid_api_key_required',
    localOrOnline: 'cloud_online',
    inputConstraints: 'Detailed track prompt and optional reference image.',
    outputConstraints: 'Full-length encoded audio stream (WAV/MP3) + lyrics.',
    deprecationStatus: 'preview',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'gemini-3.5-transcribe',
    provider: 'google-gemini',
    displayName: 'Gemini 3.5 Transcribe (Audio STT)',
    capabilities: ['AUDIO_TRANSCRIPTION'],
    inputModalities: ['audio', 'text'],
    outputModalities: ['text'],
    apiVersion: 'v1',
    sdkMethod: 'ai.models.generateContent',
    authRequirement: 'GEMINI_API_KEY',
    pricingCategory: 'free_tier_or_paid',
    localOrOnline: 'cloud_online',
    inputConstraints: 'Pre-recorded audio files/buffers.',
    outputConstraints: 'Transcript text.',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'gemini-3.8-flash-lite-tts',
    provider: 'google-gemini',
    displayName: 'Gemini 3.8 Flash Lite TTS',
    capabilities: ['TEXT_TO_SPEECH'],
    inputModalities: ['text'],
    outputModalities: ['audio'],
    apiVersion: 'v1',
    sdkMethod: 'ai.models.generateContent',
    authRequirement: 'GEMINI_API_KEY',
    pricingCategory: 'free_tier_or_paid',
    localOrOnline: 'cloud_online',
    inputConstraints: 'Text script.',
    outputConstraints: '24kHz PCM / WAV audio.',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'gemini-embedding-2',
    provider: 'google-gemini',
    displayName: 'Gemini Embedding 2',
    capabilities: ['EMBEDDINGS'],
    inputModalities: ['text', 'image'],
    outputModalities: ['embedding'],
    apiVersion: 'v1',
    sdkMethod: 'ai.models.embedContent',
    authRequirement: 'GEMINI_API_KEY',
    pricingCategory: 'free_tier_or_paid',
    localOrOnline: 'cloud_online',
    inputConstraints: 'Text or multimodal inputs.',
    outputConstraints: 'Dense float vector embeddings.',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'anny-vector-svg-v1',
    provider: 'anny-local',
    displayName: 'ANNY Vector Brand & Logo Engine (Offline SVG)',
    capabilities: ['VECTOR_LOGO_SYNTHESIS'],
    inputModalities: ['text'],
    outputModalities: ['svg'],
    apiVersion: 'local-v1',
    sdkMethod: 'generateVectorLogoBundle',
    authRequirement: 'none',
    pricingCategory: 'free_local',
    localOrOnline: 'local_offline',
    inputConstraints: 'Brand name, logo type (wordmark, lettermark, monogram, symbol, combination, emblem, mascot), palette.',
    outputConstraints: 'XSS-sanitized scalable SVG brand kits (dark, light, transparent icon, monogram badge). Not a raster photo model.',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'gpt-image-1',
    provider: 'openai',
    displayName: 'OpenAI GPT Image 1 (Optional Secondary Raster Provider)',
    capabilities: ['IMAGE_GENERATION'],
    inputModalities: ['text'],
    outputModalities: ['image'],
    apiVersion: 'v1',
    sdkMethod: 'POST https://api.openai.com/v1/images/generations',
    authRequirement: 'OPENAI_API_KEY',
    pricingCategory: 'paid_api_key_required',
    localOrOnline: 'cloud_online',
    inputConstraints: 'Text prompt; sizes 1024x1024, 1536x1024, 1024x1536.',
    outputConstraints: 'Base64 PNG image bytes.',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
  {
    id: 'local-sd-checkpoint',
    provider: 'local-sd',
    displayName: 'Local Stable Diffusion / ComfyUI Worker',
    capabilities: ['IMAGE_GENERATION'],
    inputModalities: ['text'],
    outputModalities: ['image'],
    apiVersion: 'sdapi/v1',
    sdkMethod: 'POST ${SD_WEBUI_URL}/sdapi/v1/txt2img',
    authRequirement: 'SD_WEBUI_URL',
    pricingCategory: 'free_local',
    localOrOnline: 'local_offline',
    inputConstraints: 'Requires locally running Automatic1111/ComfyUI bridge at SD_WEBUI_URL.',
    outputConstraints: 'Local raster PNG bytes.',
    deprecationStatus: 'active',
    lastVerifiedAt: '2026-11-22',
  },
] as const;

export const PROHIBITED_OR_INVENTED_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash-thinking',
  'gemini-3.6-flash',
  'imagen-3',
  'sora-api',
] as const;

function isConfiguredSecret(val: string | undefined, placeholderPrefix: string): boolean {
  const trimmed = (val || '').trim();
  if (!trimmed || trimmed.length < 10) return false;
  if (trimmed.toLowerCase().startsWith(placeholderPrefix)) return false;
  return true;
}

export function discoverRegisteredModels(options: {
  env?: Record<string, string | undefined>;
  executionMode?: string;
  ollamaModels?: string[];
} = {}): DiscoveredModelEntry[] {
  const env = options.env || (typeof process !== 'undefined' ? process.env : {});
  const offlineOnly = options.executionMode === 'OFFLINE_ONLY';

  const keyState = {
    GEMINI_API_KEY: isConfiguredSecret(env.GEMINI_API_KEY, 'your_gemini'),
    OPENAI_API_KEY: isConfiguredSecret(env.OPENAI_API_KEY, 'your_openai'),
    ANTHROPIC_API_KEY: isConfiguredSecret(env.ANTHROPIC_API_KEY, 'your_anthropic'),
    GROQ_API_KEY: isConfiguredSecret(env.GROQ_API_KEY, 'your_groq'),
    SD_WEBUI_URL: Boolean((env.SD_WEBUI_URL || '').trim()),
    OLLAMA_HOST: Boolean((options.ollamaModels || []).length > 0),
  };

  const entries: DiscoveredModelEntry[] = VERIFIED_MODEL_REGISTRY.map((spec) => {
    if (spec.localOrOnline === 'local_offline') {
      if (spec.authRequirement === 'none') {
        return {
          ...spec,
          availability: 'AVAILABLE_OFFLINE',
          statusDetail: 'Verified local offline engine ready with zero external API keys.',
        };
      }
      const isSet = spec.authRequirement === 'SD_WEBUI_URL' ? keyState.SD_WEBUI_URL : keyState.OLLAMA_HOST;
      return {
        ...spec,
        availability: isSet ? 'AVAILABLE_OFFLINE' : 'UNCONFIGURED',
        statusDetail: isSet
          ? `Local endpoint configured (${spec.authRequirement}).`
          : `Optional local worker not configured (${spec.authRequirement}).`,
      };
    }

    if (offlineOnly) {
      return {
        ...spec,
        availability: 'DISABLED_BY_OFFLINE_POLICY',
        statusDetail: 'Cloud model disabled while ANNY is running in OFFLINE_ONLY policy.',
      };
    }

    const hasKey =
      spec.authRequirement === 'GEMINI_API_KEY'
        ? keyState.GEMINI_API_KEY
        : spec.authRequirement === 'OPENAI_API_KEY'
          ? keyState.OPENAI_API_KEY
          : spec.authRequirement === 'ANTHROPIC_API_KEY'
            ? keyState.ANTHROPIC_API_KEY
            : spec.authRequirement === 'GROQ_API_KEY'
              ? keyState.GROQ_API_KEY
              : false;

    if (!hasKey) {
      return {
        ...spec,
        availability: 'UNCONFIGURED',
        statusDetail: `Requires server-side ${spec.authRequirement}.`,
      };
    }

    return {
      ...spec,
      availability: spec.pricingCategory === 'paid_api_key_required' ? 'REQUIRES_PAID_KEY' : 'CONFIGURED_ONLINE',
      statusDetail:
        spec.pricingCategory === 'paid_api_key_required'
          ? `Server key present (${spec.authRequirement}); requires billing-enabled/paid entitlement for live invocation.`
          : `Server key configured (${spec.authRequirement}).`,
    };
  });

  // Append dynamically discovered local Ollama models (explicitly text/vision understanding only — NEVER image/video generation)
  for (const ollamaModel of options.ollamaModels || []) {
    const isVision = /llava|vision|moondream|qwen.*vl|minicpm/i.test(ollamaModel);
    entries.push({
      id: `ollama:${ollamaModel}`,
      provider: 'ollama',
      displayName: `Ollama Local (${ollamaModel})`,
      capabilities: isVision ? ['TEXT_CHAT', 'CODE_SYNTHESIS', 'IMAGE_UNDERSTANDING'] : ['TEXT_CHAT', 'CODE_SYNTHESIS'],
      inputModalities: isVision ? ['text', 'image'] : ['text'],
      outputModalities: ['text'],
      apiVersion: 'ollama-http',
      sdkMethod: 'POST ${OLLAMA_HOST}/api/chat',
      authRequirement: 'OLLAMA_HOST',
      pricingCategory: 'free_local',
      localOrOnline: 'local_offline',
      inputConstraints: 'Local text/vision understanding only. Does NOT generate raster images or videos.',
      outputConstraints: 'Text output.',
      deprecationStatus: 'active',
      lastVerifiedAt: new Date().toISOString().slice(0, 10),
      availability: 'AVAILABLE_OFFLINE',
      statusDetail: 'Discovered live from local Ollama runtime.',
    });
  }

  return entries;
}

export function getRegisteredModel(modelId: string): RegisteredModelSpec | undefined {
  return VERIFIED_MODEL_REGISTRY.find((m) => m.id === modelId);
}

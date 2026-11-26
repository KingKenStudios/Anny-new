/**
 * ANNY — Authoritative Server-Side Creative Generation Service
 *
 * Unifies truthful provider discovery and real execution for:
 *  1. Image Generation & Editing:
 *     - Local Vector SVG Logo Pipeline (always available, offline, zero paid keys)
 *     - Google Gemini Image (`gemini-3.1-flash-lite-image` & `gemini-nano-banana-2.1`) via @google/genai
 *     - OpenAI Image (`gpt-image-1` / `dall-e-3`) when OPENAI_API_KEY is configured
 *     - Local Stable Diffusion / ComfyUI worker when SD_WEBUI_URL is configured
 *  2. Video Generation, Storyboard Planning, Image-to-Video, Editing & Extension:
 *     - Google Gemini Omni Video (`gemini-omni-1.2-flash`) via @google/genai Interactions API (`ai.interactions.create`)
 *     - Honest PROVIDER_UNCONFIGURED & STORYBOARD_PLAN_ONLY states (NEVER fakes GENERATED)
 *  3. Music / Audio Generation (King Ken Studios Music Studio):
 *     - Google Lyria (`lyria-3-clip-preview` / `lyria-3-pro-preview`) via @google/genai when configured
 *
 * SECURITY & INTEGRITY:
 *  - All cloud SDK calls remain strictly server-side using process.env keys.
 *  - Uses httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } on GoogleGenAI clients.
 *  - Validates every generated image (PNG/JPEG/WebP/SVG magic bytes + dimensions) & video (MP4/WebM magic bytes).
 *  - NEVER silently falls back to Pollinations or mislabels raster assets as SVG.
 *  - NEVER reports Ollama text/vision models as image or video generators.
 */

import { GoogleGenAI } from '@google/genai';
import { classifyCreativeIntent } from '../creative/CreativeIntentRouter';
import {
  base64ToBytes,
  bytesToBase64,
  validateAudioAsset,
  validateImageAsset,
  validateVideoAsset,
} from '../creative/ImageQualityValidator';
import { generateVectorLogoBundle } from '../creative/LogoGenerationPipeline';
import { attachCanonicalImageFields } from '../creative/mediaNormalization';
import { synthesizeLocalWavAudio } from '../creative/localAudioSynthEngine';
import { buildEnhancedPrompt } from '../creative/PromptEnhancer';
import type {
  ActiveArtifactContext,
  AttachmentMetadata,
  AudioGenerationType,
  CreativeAudioResult,
  CreativeImageResult,
  CreativeProviderCapability,
  GeneratedImageOption,
  ImageQualityReport,
  LogoDesignPlan,
  VideoIntentCategory,
  VideoJobRecord,
  VideoProductionPlan,
} from '../creative/types';

export interface ReferenceMediaInput {
  mimeType: string;
  data: string; // raw base64 or data URL
  name?: string;
}

export interface CreativeImageRequest {
  prompt: string;
  aspectRatio?: string;
  count?: number;
  highResolution?: boolean;
  providerPreference?: 'auto' | 'local-vector-svg' | 'gemini' | 'openai' | 'local-sd';
  referenceImages?: ReferenceMediaInput[];
  activeContext?: ActiveArtifactContext;
  previousLogoPlan?: LogoDesignPlan;
  parentArtifactId?: string;
  previousHashes?: string[];
  enableVisionQa?: boolean;
  ownerUserId?: string;
  ownerOrgId?: string;
}

export interface StoredImageAsset {
  assetKey: string;
  artifactId: string;
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
  ownerUserId?: string;
  ownerOrgId?: string;
  createdAt: string;
}

export type ImageProviderAdapter = (params: {
  prompt: string;
  aspectRatio: string;
  optionIndex: number;
  totalCount: number;
  highResolution?: boolean;
  referenceImages?: ReferenceMediaInput[];
}) => Promise<{ bytes: Uint8Array; mimeType: string; model: string; provider: string }>;

export interface CreativeVideoRequest {
  prompt: string;
  mode?: VideoJobRecord['mode'];
  category?: VideoIntentCategory;
  aspectRatio?: '16:9' | '9:16';
  durationSeconds?: number;
  resolution?: '360p' | '720p' | '1080p' | '4k';
  referenceImages?: ReferenceMediaInput[];
  referenceVideo?: ReferenceMediaInput;
  parentJobId?: string;
  previousInteractionId?: string;
  planOnly?: boolean;
  providerOverride?: 'auto' | 'offline';
  ownerUserId?: string;
  ownerOrgId?: string;
}

export interface VideoProviderExecutionResult {
  videoBytes: Uint8Array;
  mimeType: string;
  interactionId?: string;
  provider: string;
  model: string;
}

export type VideoProviderAdapter = (params: {
  prompt: string;
  mode: VideoJobRecord['mode'];
  aspectRatio: '16:9' | '9:16';
  durationSeconds: number;
  resolution: '360p' | '720p' | '1080p' | '4k';
  referenceImages?: ReferenceMediaInput[];
  referenceVideo?: ReferenceMediaInput;
  previousInteractionId?: string;
}) => Promise<VideoProviderExecutionResult>;

function getGeminiApiKey(): string {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key || key === 'your_gemini_api_key_here' || key.length < 10) return '';
  return key;
}

function getOpenAiApiKey(): string {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key || key === 'your_openai_api_key_here' || key.length < 10) return '';
  return key;
}

function getValidatedLocalSdUrl(): string {
  const raw = (process.env.SD_WEBUI_URL || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.origin;
  } catch {
    return '';
  }
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface StoredAudioAsset {
  assetKey: string;
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
  ownerUserId?: string;
  ownerOrgId?: string;
  createdAt: string;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  label: string
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`${label} timed out after ${timeoutMs}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function stripDataUrlPrefix(input: string): { base64: string; detectedMime?: string } {
  const match = input.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (match) {
    return { detectedMime: match[1], base64: match[2].replace(/\s+/g, '') };
  }
  return { base64: input.replace(/\s+/g, '') };
}

class CreativeGenerationService {
  private videoJobs: Map<string, VideoJobRecord> = new Map();
  private videoBuffers: Map<string, { bytes: Uint8Array; mimeType: string }> = new Map();
  private imageAssets: Map<string, StoredImageAsset> = new Map();
  private audioAssets: Map<string, StoredAudioAsset> = new Map();
  private customVideoAdapter: VideoProviderAdapter | null = null;
  private customImageAdapter: ImageProviderAdapter | null = null;

  /**
   * Test hook for injecting a deterministic provider adapter during automated verification.
   */
  public setCustomVideoAdapterForTests(adapter: VideoProviderAdapter | null): void {
    this.customVideoAdapter = adapter;
  }

  public setCustomImageAdapterForTests(adapter: ImageProviderAdapter | null): void {
    this.customImageAdapter = adapter;
  }

  private storeImageAsset(asset: StoredImageAsset): string {
    // Bounded FIFO cache to prevent unbounded memory growth
    if (this.imageAssets.size >= 80) {
      const oldestKey = this.imageAssets.keys().next().value;
      if (oldestKey) this.imageAssets.delete(oldestKey);
    }
    this.imageAssets.set(asset.assetKey, asset);
    return `/api/creative/image/asset/${encodeURIComponent(asset.assetKey)}`;
  }

  public getImageAsset(
    assetKey: string,
    requester?: { userId?: string; orgId?: string; isAdmin?: boolean }
  ): StoredImageAsset | null {
    const asset = this.imageAssets.get(assetKey);
    if (!asset) return null;
    if (requester?.isAdmin) return asset;
    if (asset.ownerUserId && requester?.userId && asset.ownerUserId !== requester.userId) {
      return null;
    }
    return asset;
  }

  private storeAudioAsset(asset: StoredAudioAsset): string {
    if (this.audioAssets.size >= 80) {
      const oldestKey = this.audioAssets.keys().next().value;
      if (oldestKey) this.audioAssets.delete(oldestKey);
    }
    this.audioAssets.set(asset.assetKey, asset);
    return `/api/creative/audio/asset/${encodeURIComponent(asset.assetKey)}`;
  }

  public getAudioAsset(
    assetKey: string,
    requester?: { userId?: string; orgId?: string; isAdmin?: boolean }
  ): StoredAudioAsset | null {
    const asset = this.audioAssets.get(assetKey);
    if (!asset) return null;
    if (requester?.isAdmin) return asset;
    if (asset.ownerUserId && requester?.userId && asset.ownerUserId !== requester.userId) {
      return null;
    }
    return asset;
  }

  /**
   * Truthful capability discovery across Image, Video, Music, and Vision QA providers.
   * NEVER claims Ollama text/vision models generate images or video.
   */
  public getCreativeProviders(): CreativeProviderCapability[] {
    const hasGemini = Boolean(getGeminiApiKey());
    const hasOpenAi = Boolean(getOpenAiApiKey());
    const localSdUrl = getValidatedLocalSdUrl();

    return [
      {
        id: 'local-vector-svg',
        name: 'ANNY Vector Brand & Logo Engine (SVG)',
        domain: 'IMAGE',
        kind: 'local_vector',
        configured: true,
        offlineCapable: true,
        requiresPaidKey: false,
        supportedFormats: ['image/svg+xml'],
        models: ['anny-vector-svg-v1'],
        status: 'AVAILABLE',
        detail: 'Generates genuine, XSS-sanitized SVG brand logos, monograms, icons, and light/dark kits offline.',
      },
      {
        id: 'gemini-image',
        name: 'Google Gemini Image Generation & Editing',
        domain: 'IMAGE',
        kind: 'cloud_api',
        configured: hasGemini,
        offlineCapable: false,
        requiresPaidKey: true,
        supportedFormats: ['image/png', 'image/jpeg', 'image/webp'],
        models: ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1'],
        status: hasGemini ? 'DEGRADED' : 'UNCONFIGURED',
        detail: hasGemini
          ? 'API key is configured, but raster image generation has not passed a live end-to-end generation check in this session.'
          : 'Configure GEMINI_API_KEY on the server to enable Gemini raster image generation and editing.',
      },
      {
        id: 'openai-image',
        name: 'OpenAI Image API',
        domain: 'IMAGE',
        kind: 'cloud_api',
        configured: hasOpenAi,
        offlineCapable: false,
        requiresPaidKey: true,
        supportedFormats: ['image/png'],
        models: ['gpt-image-1', 'dall-e-3'],
        status: hasOpenAi ? 'DEGRADED' : 'UNCONFIGURED',
        detail: hasOpenAi
          ? 'API key is configured, but image generation has not passed a live end-to-end generation check in this session.'
          : 'Optional: set OPENAI_API_KEY on the server to enable OpenAI image generation.',
      },
      {
        id: 'local-sd-webui',
        name: 'Local Stable Diffusion WebUI Worker',
        domain: 'IMAGE',
        kind: 'local_worker',
        configured: Boolean(localSdUrl),
        offlineCapable: true,
        requiresPaidKey: false,
        supportedFormats: ['image/png'],
        models: ['local-sd-checkpoint'],
        status: localSdUrl ? 'DEGRADED' : 'UNCONFIGURED',
        detail: localSdUrl
          ? 'A local diffusion endpoint URL is configured, but the worker has not passed a live health and generation check.'
          : 'Optional: set SD_WEBUI_URL to a local Stable Diffusion WebUI-compatible API for free offline raster image generation.',
      },
      {
        id: 'gemini-omni-video',
        name: 'Google Gemini Omni Video (Interactions API)',
        domain: 'VIDEO',
        kind: 'cloud_api',
        configured: hasGemini || Boolean(this.customVideoAdapter),
        offlineCapable: false,
        requiresPaidKey: true,
        supportedFormats: ['video/mp4'],
        models: ['gemini-omni-1.2-flash'],
        status: hasGemini || this.customVideoAdapter ? 'DEGRADED' : 'UNCONFIGURED',
        detail:
          hasGemini || this.customVideoAdapter
            ? 'A video provider adapter or API key is configured; real video rendering has not been verified end-to-end.'
            : 'Configure GEMINI_API_KEY on the server to render real MP4 video clips; storyboard planning remains available offline.',
      },
      {
        id: 'gemini-lyria-music',
        name: 'Google Lyria Music Studio',
        domain: 'AUDIO',
        kind: 'cloud_api',
        configured: hasGemini,
        offlineCapable: false,
        requiresPaidKey: true,
        supportedFormats: ['audio/mpeg', 'audio/wav'],
        models: ['lyria-3-clip-preview', 'lyria-3-pro-preview'],
        status: hasGemini ? 'DEGRADED' : 'UNCONFIGURED',
        detail: hasGemini
          ? 'API key is configured, but Lyria music generation has not passed a live end-to-end render check.'
          : 'Configure GEMINI_API_KEY on the server to synthesize cloud Lyria tracks or AI Voice TTS.',
      },
      {
        id: 'local-pcm-audio-synth',
        name: 'ANNY Deterministic WAV Audio Synthesizer',
        domain: 'AUDIO',
        kind: 'local_vector',
        configured: true,
        offlineCapable: true,
        requiresPaidKey: false,
        supportedFormats: ['audio/wav'],
        models: ['anny-wav-synth-v1'],
        status: 'AVAILABLE',
        detail: 'Generates verified 16-bit PCM RIFF/WAV music loops, instrumentals, drum beats, and SFX offline without paid APIs.',
      },
      {
        id: 'gemini-voice-tts',
        name: 'Google Gemini Neural Voice TTS',
        domain: 'AUDIO',
        kind: 'cloud_api',
        configured: hasGemini,
        offlineCapable: false,
        requiresPaidKey: false,
        supportedFormats: ['audio/wav'],
        models: ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'],
        status: hasGemini ? 'DEGRADED' : 'UNCONFIGURED',
        detail: hasGemini
          ? 'API key is configured, but neural speech synthesis has not passed a live end-to-end audio check.'
          : 'Configure GEMINI_API_KEY on the server to enable neural speech synthesis (TTS).',
      },
      {
        id: 'gemini-vision-qa',
        name: 'Gemini Vision Semantic Quality Evaluator',
        domain: 'VISION_QA',
        kind: 'cloud_api',
        configured: hasGemini,
        offlineCapable: false,
        requiresPaidKey: false,
        supportedFormats: ['image/png', 'image/jpeg', 'image/webp'],
        models: ['gemini-4-hydrogen'],
        status: hasGemini ? 'DEGRADED' : 'UNCONFIGURED',
        detail: hasGemini
          ? 'Vision evaluator API key is configured, but semantic image review has not passed a live end-to-end evaluation.'
          : 'Semantic visual verification requires GEMINI_API_KEY; binary/SVG header validation still runs locally.',
      },
    ];
  }

  /**
   * Optional real Gemini Vision semantic verification for raster logos/images.
   * Truthfully reports 'not_run_no_evaluator' when unconfigured; never fakes pass.
   */
  private async runSemanticLogoVisionCheck(
    bytes: Uint8Array,
    mimeType: string,
    brandName: string,
    explicitHumanRequested: boolean
  ): Promise<{ status: ImageQualityReport['semanticReviewStatus']; notes: string }> {
    const ai = createGeminiClient();
    if (!ai) {
      return {
        status: 'not_run_no_evaluator',
        notes: 'Vision semantic evaluator not configured; binary header and dimension validation passed.',
      };
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Inspect this generated image for brand logo "${brandName}". Answer ONLY JSON: {"isCleanLogo": boolean, "containsUnrequestedHumanOrThrone": boolean, "reason": "short explanation"}. Explicit human requested: ${explicitHumanRequested}.`,
              },
              {
                inlineData: {
                  mimeType,
                  data: bytesToBase64(bytes),
                },
              },
            ],
          },
        ],
      });

      const raw = (response.text || '').trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { status: 'not_run_no_evaluator', notes: 'Vision evaluator returned non-JSON summary.' };
      }
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.containsUnrequestedHumanOrThrone && !explicitHumanRequested) {
        return {
          status: 'mismatch',
          notes: parsed.reason || 'Detected unrequested human portrait or throne scene instead of a brand logo.',
        };
      }
      if (parsed.isCleanLogo === false) {
        return {
          status: 'mismatch',
          notes: parsed.reason || 'Generated raster did not meet clean brand logo criteria.',
        };
      }
      return {
        status: 'verified',
        notes: parsed.reason || 'Verified as clean graphic brand mark.',
      };
    } catch (err: any) {
      return {
        status: 'not_run_no_evaluator',
        notes: `Vision evaluator skipped due to transient API error: ${err?.message || 'unknown'}`,
      };
    }
  }

  /**
   * Calls real Gemini Image model (`gemini-3.1-flash-lite-image` or `gemini-nano-banana-2.1`)
   * supporting both text-to-image and reference-image editing.
   */
  private async callGeminiImageProvider(params: {
    prompt: string;
    aspectRatio: string;
    highResolution?: boolean;
    referenceImages?: ReferenceMediaInput[];
  }): Promise<{ bytes: Uint8Array; mimeType: string; model: string }> {
    const ai = createGeminiClient();
    if (!ai) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const nonStandardAspect = !['1:1', '3:4', '4:3', '9:16', '16:9'].includes(params.aspectRatio);
    const model =
      params.highResolution || nonStandardAspect ? 'gemini-nano-banana-2.1' : 'gemini-3.1-flash-lite-image';

    const parts: any[] = [];
    if (params.referenceImages && params.referenceImages.length > 0) {
      for (const ref of params.referenceImages.slice(0, 6)) {
        const { base64, detectedMime } = stripDataUrlPrefix(ref.data);
        parts.push({
          inlineData: {
            mimeType: ref.mimeType || detectedMime || 'image/png',
            data: base64,
          },
        });
      }
    }
    parts.push({ text: params.prompt });

    const response = await promiseWithTimeout(
      ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: {
            aspectRatio: params.aspectRatio as any,
            ...(model === 'gemini-nano-banana-2.1' ? { imageSize: '2K' as any } : {}),
          },
        },
      }),
      35000,
      `Gemini image model ${model}`
    );

    const candidateParts = response.candidates?.[0]?.content?.parts || [];
    for (const part of candidateParts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        const bytes = base64ToBytes(part.inlineData.data);
        return { bytes, mimeType, model };
      }
    }

    const refusalText = candidateParts
      .map((p: any) => p.text)
      .filter(Boolean)
      .join(' ')
      .trim();
    throw new Error(refusalText || `${model} returned no inline image data.`);
  }

  /**
   * Calls OpenAI Image API when OPENAI_API_KEY is configured.
   */
  private async callOpenAiImageProvider(params: {
    prompt: string;
    aspectRatio: string;
  }): Promise<{ bytes: Uint8Array; mimeType: string; model: string }> {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured on the server.');
    }

    const size =
      params.aspectRatio === '16:9'
        ? '1536x1024'
        : params.aspectRatio === '9:16'
          ? '1024x1536'
          : '1024x1024';

    const response = await fetchWithTimeout(
      'https://api.openai.com/v1/images/generations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: params.prompt,
          size,
          n: 1,
        }),
      },
      35000,
      'OpenAI Image API'
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`OpenAI Image API error (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data: any = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error('OpenAI Image API returned no base64 image payload.');
    }

    return {
      bytes: base64ToBytes(b64),
      mimeType: 'image/png',
      model: 'gpt-image-1',
    };
  }

  /**
   * Calls local Stable Diffusion WebUI / ComfyUI bridge when SD_WEBUI_URL is configured.
   */
  private async callLocalSdProvider(params: {
    prompt: string;
    negativePrompt: string;
    aspectRatio: string;
  }): Promise<{ bytes: Uint8Array; mimeType: string; model: string }> {
    const baseUrl = getValidatedLocalSdUrl();
    if (!baseUrl) {
      throw new Error('SD_WEBUI_URL is not configured on the server.');
    }

    const width = params.aspectRatio === '9:16' ? 768 : params.aspectRatio === '16:9' ? 1280 : 1024;
    const height = params.aspectRatio === '9:16' ? 1280 : params.aspectRatio === '16:9' ? 768 : 1024;

    const response = await fetchWithTimeout(
      `${baseUrl}/sdapi/v1/txt2img`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: params.prompt,
          negative_prompt: params.negativePrompt,
          width,
          height,
          steps: 24,
        }),
      },
      45000,
      'Local Stable Diffusion'
    );

    if (!response.ok) {
      throw new Error(`Local Stable Diffusion endpoint error (${response.status}).`);
    }

    const data: any = await response.json();
    const first = data?.images?.[0];
    if (!first) {
      throw new Error('Local Stable Diffusion returned no images.');
    }

    return {
      bytes: base64ToBytes(first),
      mimeType: 'image/png',
      model: 'local-sd-webui',
    };
  }

  /**
   * Main unified Image Generation, Multi-Option Gallery, Non-Destructive Editing & Logo Pipeline entry point.
   */
  public async generateCreativeImage(req: CreativeImageRequest): Promise<CreativeImageResult> {
    const artifactId = `art_img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    // Hydrate selected image reference for conversational non-destructive edits if caller passed activeContext.selectedImageUrl
    const hydratedRefs: ReferenceMediaInput[] = [...(req.referenceImages || [])];
    if (hydratedRefs.length === 0 && req.activeContext?.selectedImageUrl) {
      const selUrl = req.activeContext.selectedImageUrl;
      if (selUrl.startsWith('data:image/')) {
        const parsed = stripDataUrlPrefix(selUrl);
        hydratedRefs.push({
          name: 'selected-image',
          mimeType: req.activeContext.selectedImageMimeType || parsed.detectedMime || 'image/png',
          data: selUrl,
        });
      } else if (selUrl.startsWith('/api/creative/image/asset/')) {
        const assetKey = decodeURIComponent(selUrl.split('/').pop() || '').split('?')[0];
        const cached = this.imageAssets.get(assetKey);
        if (cached && cached.mimeType !== 'image/svg+xml') {
          hydratedRefs.push({
            name: cached.filename,
            mimeType: cached.mimeType,
            data: `data:${cached.mimeType};base64,${bytesToBase64(cached.bytes)}`,
          });
        }
      }
    }

    const attachments: AttachmentMetadata[] = hydratedRefs.map((r) => ({
      name: r.name,
      mimeType: r.mimeType,
      hasData: Boolean(r.data),
    }));

    const classification = classifyCreativeIntent(req.prompt, attachments, req.activeContext);
    const effectiveAspect = (req.aspectRatio || classification.aspectRatio || '1:1') as CreativeImageRequest['aspectRatio'];
    const previousHashes = new Set(req.previousHashes || []);
    const requestedCount = Math.min(4, Math.max(1, Number(req.count) || classification.requestedImageCount || 1));
    const originalImageUrl =
      hydratedRefs[0]?.data || req.activeContext?.selectedImageUrl || undefined;
    const nextRevisionNumber =
      classification.isRevision || req.parentArtifactId
        ? Math.max(2, (req.activeContext?.revisionNumber || 1) + 1)
        : 1;

    const isLogoWorkflow =
      classification.category === 'LOGO_DESIGN' ||
      classification.category === 'BRAND_IDENTITY' ||
      classification.category === 'ICON' ||
      classification.category === 'APP_ICON';

    // 1. DEDICATED LOGO & BRAND IDENTITY PIPELINE
    if (isLogoWorkflow) {
      const previousPlan = req.previousLogoPlan || req.activeContext?.logoPlan;
      const isLogoRevision = Boolean(classification.isRevision || req.parentArtifactId || req.activeContext?.artifactId);
      const effectiveBrandName =
        classification.extractedBrandName || req.activeContext?.brandName || previousPlan?.brandName;
      const logoBundle = generateVectorLogoBundle(
        req.prompt,
        effectiveBrandName,
        isLogoRevision ? previousPlan : undefined
      );
      if (isLogoRevision) {
        logoBundle.plan.revisionNumber = Math.max(
          nextRevisionNumber,
          logoBundle.plan.revisionNumber,
          (req.activeContext?.revisionNumber || 1) + 1
        );
      }
      const enhanced = buildEnhancedPrompt(classification, logoBundle.plan);
      const primaryVariant = logoBundle.variants[0];
      const svgBytes = new TextEncoder().encode(primaryVariant.svgMarkup);
      const quality = validateImageAsset({
        bytes: svgBytes,
        declaredMimeType: 'image/svg+xml',
        previousHashes,
        requireUnique: Boolean(req.parentArtifactId),
      });

      const galleryOptions: GeneratedImageOption[] = logoBundle.variants.map((variant, idx) => {
        const variantBytes = new TextEncoder().encode(variant.svgMarkup);
        const assetKey = `${artifactId}_v${idx + 1}`;
        const safeBrand = logoBundle.plan.brandName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'ANNY_Logo';
        const downloadUrl = this.storeImageAsset({
          assetKey,
          artifactId,
          bytes: variantBytes,
          mimeType: 'image/svg+xml',
          filename: `${safeBrand}_${variant.id}_${String(idx + 1).padStart(2, '0')}.svg`,
          ownerUserId: req.ownerUserId,
          ownerOrgId: req.ownerOrgId,
          createdAt: nowIso,
        });
        return {
          id: `${artifactId}_${variant.id}`,
          index: idx + 1,
          label: variant.label,
          url: variant.dataUrl,
          downloadUrl,
          mimeType: 'image/svg+xml',
          format: 'svg',
          width: variant.width,
          height: variant.height,
          byteLength: variantBytes.byteLength,
          sha256: variant.sha256,
          provider: 'local-vector-svg',
          model: 'anny-vector-svg-v1',
          prompt: req.prompt,
          category: classification.category,
          createdAt: nowIso,
          revisionNumber: logoBundle.plan.revisionNumber,
          parentArtifactId: req.parentArtifactId || req.activeContext?.artifactId,
          originalImageUrl,
          variantType: variant.variantType,
        };
      });

      // Optionally also synthesize a raster master when a cloud/local raster provider is configured
      // and the caller did not explicitly request vector-only.
      if (req.providerPreference !== 'local-vector-svg') {
        try {
          let rasterResult: { bytes: Uint8Array; mimeType: string; model: string; provider: string } | null = null;
          if (this.customImageAdapter) {
            rasterResult = await this.customImageAdapter({
              prompt: enhanced.enhancedPrompt,
              aspectRatio: '1:1',
              optionIndex: 0,
              totalCount: 1,
              highResolution: req.highResolution,
            });
          } else if (getGeminiApiKey() && (req.providerPreference === 'auto' || !req.providerPreference || req.providerPreference === 'gemini')) {
            const g = await this.callGeminiImageProvider({
              prompt: enhanced.enhancedPrompt,
              aspectRatio: '1:1',
              highResolution: req.highResolution,
            });
            rasterResult = { ...g, provider: 'gemini-image' };
          } else if (getOpenAiApiKey() && (req.providerPreference === 'auto' || req.providerPreference === 'openai')) {
            const o = await this.callOpenAiImageProvider({
              prompt: enhanced.enhancedPrompt,
              aspectRatio: '1:1',
            });
            rasterResult = { ...o, provider: 'openai-image' };
          } else if (getValidatedLocalSdUrl() && (req.providerPreference === 'auto' || req.providerPreference === 'local-sd')) {
            const s = await this.callLocalSdProvider({
              prompt: enhanced.enhancedPrompt,
              negativePrompt: enhanced.negativeConstraints.join(', '),
              aspectRatio: '1:1',
            });
            rasterResult = { ...s, provider: 'local-sd-webui' };
          }

          if (rasterResult) {
            const rasterQuality = validateImageAsset({
              bytes: rasterResult.bytes,
              declaredMimeType: rasterResult.mimeType,
            });
            if (rasterQuality.valid) {
              if (req.enableVisionQa !== false && !this.customImageAdapter) {
                const semantic = await this.runSemanticLogoVisionCheck(
                  rasterResult.bytes,
                  rasterQuality.mimeType,
                  logoBundle.plan.brandName,
                  logoBundle.plan.explicitHumanRequested
                );
                rasterQuality.semanticReviewStatus = semantic.status;
                rasterQuality.semanticNotes = semantic.notes;
              }
              if (rasterQuality.semanticReviewStatus !== 'mismatch') {
                const rasterUrl = `data:${rasterQuality.mimeType};base64,${bytesToBase64(rasterResult.bytes)}`;
                logoBundle.rasterMaster = {
                  url: rasterUrl,
                  mimeType: rasterQuality.mimeType,
                  width: rasterQuality.width,
                  height: rasterQuality.height,
                  provider: rasterResult.provider,
                  model: rasterResult.model,
                  quality: rasterQuality,
                };
                const ext = rasterQuality.format === 'jpeg' ? 'jpg' : rasterQuality.format === 'webp' ? 'webp' : 'png';
                const rasterKey = `${artifactId}_raster`;
                const rasterDownloadUrl = this.storeImageAsset({
                  assetKey: rasterKey,
                  artifactId,
                  bytes: rasterResult.bytes,
                  mimeType: rasterQuality.mimeType,
                  filename: `${logoBundle.plan.brandName.replace(/[^a-zA-Z0-9]+/g, '_') || 'ANNY_Logo'}_Master.${ext}`,
                  ownerUserId: req.ownerUserId,
                  ownerOrgId: req.ownerOrgId,
                  createdAt: nowIso,
                });
                galleryOptions.push({
                  id: `${artifactId}_raster_master`,
                  index: galleryOptions.length + 1,
                  label: 'Raster Master',
                  url: rasterUrl,
                  downloadUrl: rasterDownloadUrl,
                  mimeType: rasterQuality.mimeType,
                  format: rasterQuality.format === 'unknown' ? 'png' : rasterQuality.format,
                  width: rasterQuality.width,
                  height: rasterQuality.height,
                  byteLength: rasterQuality.byteLength,
                  sha256: rasterQuality.sha256,
                  provider: rasterResult.provider,
                  model: rasterResult.model,
                  prompt: req.prompt,
                  category: classification.category,
                  createdAt: nowIso,
                  revisionNumber: logoBundle.plan.revisionNumber,
                  parentArtifactId: req.parentArtifactId || req.activeContext?.artifactId,
                  originalImageUrl,
                });
              }
            }
          }
        } catch {
          // Raster master is strictly optional enhancement; verified SVG vector kit always succeeds cleanly!
        }
      }

      return attachCanonicalImageFields({
        success: true,
        artifactId,
        classification,
        enhancedPrompt: enhanced,
        primaryImageUrl: primaryVariant.dataUrl,
        primaryMimeType: 'image/svg+xml',
        primaryFormat: 'svg' as const,
        provider: 'local-vector-svg',
        model: 'anny-vector-svg-v1',
        quality,
        images: galleryOptions,
        requestedCount: galleryOptions.length,
        originalImageUrl,
        logoBundle,
        generatedAt: nowIso,
        revisionNumber: logoBundle.plan.revisionNumber,
        parentArtifactId: req.parentArtifactId || req.activeContext?.artifactId,
      });
    }

    // 2. RASTER IMAGE GENERATION, MULTI-OPTION GALLERY & REFERENCE-PRESERVING IMAGE EDITING PIPELINE
    const enhanced = buildEnhancedPrompt(classification);

    if (classification.requiresReferenceImage && hydratedRefs.length === 0) {
      return attachCanonicalImageFields({
        success: false,
        artifactId,
        classification,
        enhancedPrompt: enhanced,
        primaryImageUrl: '',
        primaryMimeType: 'application/octet-stream',
        primaryFormat: 'png' as const,
        provider: 'none',
        model: 'none',
        quality: {
          valid: false,
          mimeType: 'application/octet-stream',
          format: 'unknown' as const,
          byteLength: 0,
          width: 0,
          height: 0,
          sha256: '',
          isVectorSvg: false,
          sanitizedSvg: false,
          duplicateDetected: false,
          semanticReviewStatus: 'skipped' as const,
          errors: ['Reference image is required for image editing or transformation.'],
          warnings: [],
        },
        generatedAt: nowIso,
        revisionNumber: nextRevisionNumber,
        error: 'Please select a generated image or upload a reference image so ANNY can preserve the original subject and composition while applying your edit.',
        errorCode: 'MISSING_REFERENCE_IMAGE',
        recoveryGuidance: 'Click "Edit" on any generated image or upload a source image into the composer, then submit your edit instruction.',
      });
    }

    const variationAngles = [
      '',
      'Variation 2: Distinct camera framing and balanced architectural lighting while staying completely faithful to the prompt.',
      'Variation 3: Alternative composition perspective with crisp material detail and atmospheric depth.',
      'Variation 4: Distinct editorial framing and lighting contrast, unique visual execution.',
    ];

    const tryGemini = req.providerPreference === 'auto' || !req.providerPreference || req.providerPreference === 'gemini';
    const tryOpenAi =
      hydratedRefs.length === 0 &&
      (req.providerPreference === 'auto' || !req.providerPreference || req.providerPreference === 'openai');
    const tryLocalSd =
      hydratedRefs.length === 0 &&
      (req.providerPreference === 'auto' || !req.providerPreference || req.providerPreference === 'local-sd');

    const attempts: string[] = [];

    const generateSingleOption = async (optionIdx: number): Promise<{
      bytes: Uint8Array;
      mimeType: string;
      model: string;
      provider: string;
    } | null> => {
      const directive = requestedCount > 1 ? variationAngles[optionIdx % variationAngles.length] : '';
      const optionPrompt = directive
        ? `${enhanced.enhancedPrompt}\n\n${directive}`
        : enhanced.enhancedPrompt;

      if (this.customImageAdapter) {
        try {
          return await this.customImageAdapter({
            prompt: optionPrompt,
            aspectRatio: effectiveAspect || '1:1',
            optionIndex: optionIdx,
            totalCount: requestedCount,
            highResolution: req.highResolution,
            referenceImages: hydratedRefs.length > 0 ? hydratedRefs : undefined,
          });
        } catch (e: any) {
          attempts.push(`Custom Image Adapter (option ${optionIdx + 1}): ${e?.message || 'failed'}`);
          return null;
        }
      }

      if (tryGemini && getGeminiApiKey()) {
        try {
          const res = await this.callGeminiImageProvider({
            prompt: optionPrompt,
            aspectRatio: effectiveAspect || '1:1',
            highResolution: req.highResolution,
            referenceImages: hydratedRefs.length > 0 ? hydratedRefs : undefined,
          });
          return { ...res, provider: 'gemini-image' };
        } catch (e: any) {
          attempts.push(`Gemini Image: ${e?.message || 'failed'}`);
        }
      }

      if (tryOpenAi && getOpenAiApiKey()) {
        try {
          const res = await this.callOpenAiImageProvider({
            prompt: optionPrompt,
            aspectRatio: effectiveAspect || '1:1',
          });
          return { ...res, provider: 'openai-image' };
        } catch (e: any) {
          attempts.push(`OpenAI Image: ${e?.message || 'failed'}`);
        }
      }

      if (tryLocalSd && getValidatedLocalSdUrl()) {
        try {
          const res = await this.callLocalSdProvider({
            prompt: optionPrompt,
            negativePrompt: enhanced.negativeConstraints.join(', '),
            aspectRatio: effectiveAspect || '1:1',
          });
          return { ...res, provider: 'local-sd-webui' };
        } catch (e: any) {
          attempts.push(`Local Stable Diffusion: ${e?.message || 'failed'}`);
        }
      }

      return null;
    };

    const collectedOptions: GeneratedImageOption[] = [];
    let primaryQuality: ImageQualityReport | null = null;
    let primaryProvider = '';
    let primaryModel = '';
    const seenHashes = new Set<string>(previousHashes);

    // Run bounded generation for requestedCount options (probe option 0 first so auth/quota errors fail fast instead of burning 4 doomed calls)
    const firstRaw = await generateSingleOption(0);
    const rawResults: Array<{ idx: number; res: { bytes: Uint8Array; mimeType: string; model: string; provider: string } | null }> = [
      { idx: 0, res: firstRaw },
    ];

    if (firstRaw && requestedCount > 1) {
      const remainingIndices = Array.from({ length: requestedCount - 1 }, (_, i) => i + 1);
      const parallelBatch = await Promise.all(
        remainingIndices.map(async (idx) => ({
          idx,
          res: await generateSingleOption(idx),
        }))
      );
      rawResults.push(...parallelBatch);
    }

    for (const item of rawResults) {
      if (!item.res) continue;
      const optionQuality = validateImageAsset({
        bytes: item.res.bytes,
        declaredMimeType: item.res.mimeType,
        previousHashes: seenHashes,
        requireUnique: Boolean(req.parentArtifactId) && collectedOptions.length === 0,
      });
      if (!optionQuality.valid) {
        attempts.push(`Option ${item.idx + 1} failed validation: ${optionQuality.errors.join('; ')}`);
        continue;
      }
      seenHashes.add(optionQuality.sha256);

      const optionFormat = optionQuality.format === 'unknown' ? 'png' : optionQuality.format;
      const ext = optionFormat === 'jpeg' ? 'jpg' : optionFormat;
      const optionIndex = collectedOptions.length + 1;
      const assetKey = `${artifactId}_opt${optionIndex}`;
      const stem = req.prompt
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .trim()
        .split(/\s+/)
        .slice(0, 4)
        .join('_') || 'ANNY_Image';
      const downloadUrl = this.storeImageAsset({
        assetKey,
        artifactId,
        bytes: item.res.bytes,
        mimeType: optionQuality.mimeType,
        filename: `${stem}_${String(optionIndex).padStart(2, '0')}.${ext}`,
        ownerUserId: req.ownerUserId,
        ownerOrgId: req.ownerOrgId,
        createdAt: nowIso,
      });

      const dataUrl = `data:${optionQuality.mimeType};base64,${bytesToBase64(item.res.bytes)}`;
      if (!primaryQuality) {
        primaryQuality = optionQuality;
        primaryProvider = item.res.provider;
        primaryModel = item.res.model;
      }

      collectedOptions.push({
        id: `${artifactId}_option_${optionIndex}`,
        index: optionIndex,
        label: requestedCount > 1 ? `Option ${optionIndex}` : classification.isRevision ? `Revision ${nextRevisionNumber}` : 'Generated Image',
        url: dataUrl,
        downloadUrl,
        mimeType: optionQuality.mimeType,
        format: optionFormat,
        width: optionQuality.width,
        height: optionQuality.height,
        byteLength: optionQuality.byteLength,
        sha256: optionQuality.sha256,
        provider: item.res.provider,
        model: item.res.model,
        prompt: req.prompt,
        category: classification.category,
        createdAt: nowIso,
        revisionNumber: nextRevisionNumber,
        parentArtifactId: req.parentArtifactId || req.activeContext?.artifactId,
        originalImageUrl,
      });
    }

    if (collectedOptions.length === 0 || !primaryQuality) {
      const noProviderConfigured = !this.customImageAdapter && !getGeminiApiKey() && !getOpenAiApiKey() && !getValidatedLocalSdUrl();
      const uniqueAttempts = Array.from(new Set(attempts));
      const errorMsg = noProviderConfigured
        ? `No raster image generation provider is currently configured for ${classification.category.replace(/_/g, ' ').toLowerCase()} generation.`
        : `All configured image providers failed: ${uniqueAttempts.join(' | ')}`;
      return attachCanonicalImageFields({
        success: false,
        artifactId,
        classification,
        enhancedPrompt: enhanced,
        primaryImageUrl: '',
        primaryMimeType: 'application/octet-stream',
        primaryFormat: 'png' as const,
        provider: noProviderConfigured ? 'unconfigured' : 'provider_error',
        model: 'none',
        quality: {
          valid: false,
          mimeType: 'application/octet-stream',
          format: 'unknown' as const,
          byteLength: 0,
          width: 0,
          height: 0,
          sha256: '',
          isVectorSvg: false,
          sanitizedSvg: false,
          duplicateDetected: false,
          semanticReviewStatus: 'skipped' as const,
          errors: [errorMsg],
          warnings: [],
        },
        requestedCount,
        generatedAt: nowIso,
        revisionNumber: nextRevisionNumber,
        error: errorMsg,
        errorCode: noProviderConfigured ? 'NO_IMAGE_PROVIDER_CONFIGURED' : 'IMAGE_GENERATION_FAILED',
        recoveryGuidance:
          'Configure GEMINI_API_KEY, OPENAI_API_KEY, or a free local Stable Diffusion endpoint (SD_WEBUI_URL) on the server. Note: Vector brand logos and icons work 100% locally offline without any external API key.',
      });
    }

    const primary = collectedOptions[0];
    return attachCanonicalImageFields({
      success: true,
      artifactId,
      classification,
      enhancedPrompt: enhanced,
      primaryImageUrl: primary.url,
      primaryMimeType: primary.mimeType,
      primaryFormat: primary.format,
      provider: primaryProvider,
      model: primaryModel,
      quality: primaryQuality,
      images: collectedOptions,
      requestedCount,
      originalImageUrl,
      generatedAt: nowIso,
      revisionNumber: nextRevisionNumber,
      parentArtifactId: req.parentArtifactId || req.activeContext?.artifactId,
    });
  }

  /**
   * Builds a genuine multi-shot Video Production Plan / Storyboard (never misrepresented as a rendered video).
   */
  public async createVideoProductionPlan(req: CreativeVideoRequest): Promise<VideoProductionPlan> {
    const classification = classifyCreativeIntent(req.prompt);
    const category =
      req.category ||
      (classification.domain === 'VIDEO' ? (classification.category as VideoIntentCategory) : 'TEXT_TO_VIDEO');
    const aspectRatio: '16:9' | '9:16' =
      req.aspectRatio || (classification.aspectRatio === '9:16' ? '9:16' : '16:9');
    const duration = Math.min(15, Math.max(3, req.durationSeconds || 8));
    const resolution: '720p' | '1080p' = req.resolution === '1080p' ? '1080p' : '720p';
    const enhanced = buildEnhancedPrompt({
      ...classification,
      domain: 'VIDEO',
      category,
      aspectRatio,
    });

    const brand = classification.extractedBrandName || 'Studio Production';
    const shotDur = Math.max(2, Math.round(duration / 3));

    const ai = createGeminiClient();
    if (ai && req.providerOverride !== 'offline') {
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      try {
        const res = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: `Create a concise directorial video production plan in pure JSON (no markdown fences) for: "${req.prompt}".
Schema: {"title": string, "conceptSummary": string, "narrationScript": string, "musicAndSoundDirection": string, "shots": [{"shotNumber": number, "durationSeconds": number, "visualDescription": string, "cameraMovement": string, "lightingAndMood": string, "audioCue": string, "onScreenText": string}]}.
Provide 3 coherent shots totaling ~${duration} seconds in ${aspectRatio} aspect ratio.`,
          }),
          new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new Error('Storyboard planner timed out')), 8000);
          }),
        ]);
        const match = (res.text || '').match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed.shots) && parsed.shots.length > 0) {
            return {
              title: parsed.title || `${brand} — Video Concept`,
              category,
              conceptSummary: parsed.conceptSummary || req.prompt,
              aspectRatio,
              targetDurationSeconds: duration,
              resolution,
              narrationScript: parsed.narrationScript || '',
              musicAndSoundDirection: parsed.musicAndSoundDirection || 'Modern cinematic percussion with subtle sub-bass swell.',
              shots: parsed.shots,
              providerPrompt: enhanced.enhancedPrompt,
            };
          }
        }
      } catch {
        // Fall through cleanly to deterministic directorial planner
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
    }

    return {
      title: category === 'BRAND_INTRO' ? `${brand} — Animated Logo Intro` : `Production Plan: ${req.prompt.slice(0, 60)}`,
      category,
      conceptSummary: `Directed ${category.toLowerCase().replace(/_/g, ' ')} sequence designed around: ${req.prompt}`,
      aspectRatio,
      targetDurationSeconds: duration,
      resolution,
      narrationScript:
        category === 'BRAND_INTRO'
          ? `${brand}. Engineered for excellence.`
          : `Opening visual sequence establishing mood, motion, and narrative clarity for: ${req.prompt}.`,
      musicAndSoundDirection:
        category === 'BRAND_INTRO'
          ? 'Clean metallic riser into warm low-end cinematic hit with crisp stereo shimmer.'
          : 'Atmospheric score synchronized to camera cuts with natural ambient foley.',
      shots: [
        {
          shotNumber: 1,
          durationSeconds: shotDur,
          visualDescription:
            category === 'BRAND_INTRO'
              ? `Dark studio obsidian void illuminated by a sweeping specular rim light tracing the geometric edges of ${brand}.`
              : `Establishing wide frame introducing the core environment and subject of: ${req.prompt}.`,
          cameraMovement: 'Slow precision dolly-in with shallow depth of field',
          lightingAndMood: 'Controlled volumetric key light with subtle edge highlights',
          audioCue: 'Atmospheric swell building tension',
          onScreenText: '',
        },
        {
          shotNumber: 2,
          durationSeconds: shotDur,
          visualDescription:
            category === 'BRAND_INTRO'
              ? `Precision metallic lockup assembly as the ${brand} monogram and crest converge at center frame.`
              : `Dynamic mid-shot highlighting primary action, texture detail, and kinetic continuity.`,
          cameraMovement: 'Smooth orbital parallax pan',
          lightingAndMood: 'High-contrast studio rim light with crisp specular glint',
          audioCue: 'Rhythmic percussive transition hit',
          onScreenText: category === 'BRAND_INTRO' ? brand.toUpperCase() : '',
        },
        {
          shotNumber: 3,
          durationSeconds: Math.max(2, duration - shotDur * 2),
          visualDescription:
            category === 'BRAND_INTRO'
              ? `Clean hero hold on the full ${brand} brand logo lockup settling into balanced stillness.`
              : `Closing hero frame holding cleanly on final visual resolution with natural light fade.`,
          cameraMovement: 'Controlled micro push-out into locked hero frame',
          lightingAndMood: 'Balanced hero exposure with gentle vignette settle',
          audioCue: 'Warm resonant tail resolve',
          onScreenText: category === 'BRAND_INTRO' ? brand.toUpperCase() : '',
        },
      ],
      providerPrompt: enhanced.enhancedPrompt,
    };
  }

  /**
   * Downloads video bytes safely when Interactions API returns a Google Files API URI
   * instead of inline base64 data. Strictly restricts outbound fetches to Google's API host.
   */
  private async downloadGeminiVideoUri(uri: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
    const parsed = new URL(uri);
    const allowedHosts = new Set(['generativelanguage.googleapis.com', 'storage.googleapis.com']);
    if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) {
      throw new Error(`Blocked untrusted video media download host: ${parsed.hostname}`);
    }
    const apiKey = getGeminiApiKey();
    const headers: Record<string, string> = { 'User-Agent': 'aistudio-build' };
    if (apiKey && parsed.hostname === 'generativelanguage.googleapis.com') {
      headers['x-goog-api-key'] = apiKey;
    }
    const resp = await fetchWithTimeout(parsed.toString(), { headers }, 60000, 'Gemini video asset download');
    if (!resp.ok) {
      throw new Error(`Failed to retrieve generated video media (HTTP ${resp.status}).`);
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    return {
      bytes: buf,
      mimeType: resp.headers.get('content-type') || 'video/mp4',
    };
  }

  /**
   * Executes real video generation via Google Gemini Omni (`gemini-omni-1.2-flash`)
   * using the documented Interactions API (`ai.interactions.create`) contract.
   */
  private async callGeminiOmniVideoProvider(params: {
    prompt: string;
    mode: VideoJobRecord['mode'];
    aspectRatio: '16:9' | '9:16';
    durationSeconds: number;
    resolution: '360p' | '720p' | '1080p' | '4k';
    referenceImages?: ReferenceMediaInput[];
    referenceVideo?: ReferenceMediaInput;
    previousInteractionId?: string;
  }): Promise<VideoProviderExecutionResult> {
    if (this.customVideoAdapter) {
      return this.customVideoAdapter(params);
    }

    const ai = createGeminiClient();
    if (!ai) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const model = 'gemini-omni-1.2-flash';
    let input: any = params.prompt;

    // Interactions API multimodal ordering: media parts first, natural language instruction last
    if (params.mode === 'video_edit' && params.referenceVideo?.data) {
      const { base64, detectedMime } = stripDataUrlPrefix(params.referenceVideo.data);
      input = [
        {
          type: 'video',
          mime_type: params.referenceVideo.mimeType || detectedMime || 'video/mp4',
          data: base64,
        },
        ...(params.referenceImages || []).slice(0, 6).map((img) => {
          const parsed = stripDataUrlPrefix(img.data);
          return {
            type: 'image',
            mime_type: img.mimeType || parsed.detectedMime || 'image/png',
            data: parsed.base64,
          };
        }),
        { type: 'text', text: params.prompt },
      ];
    } else if (
      (params.mode === 'image_to_video' || params.mode === 'storyboard_multi_ref') &&
      params.referenceImages &&
      params.referenceImages.length > 0
    ) {
      input = [
        ...params.referenceImages.slice(0, 6).map((img) => {
          const { base64, detectedMime } = stripDataUrlPrefix(img.data);
          return {
            type: 'image',
            mime_type: img.mimeType || detectedMime || 'image/png',
            data: base64,
          };
        }),
        { type: 'text', text: params.prompt },
      ];
    }

    // gemini-omni-1.2-flash supports 3s..15s (3s..10s for video extension / 2-frame interpolation)
    const maxAllowedSeconds = params.mode === 'video_extend' ? 10 : 15;
    const clampedSeconds = Math.min(maxAllowedSeconds, Math.max(3, Math.round(params.durationSeconds || 8)));

    const interactionPayload: any = {
      model,
      input,
      background: false,
      store: true,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: params.aspectRatio,
        duration: `${clampedSeconds}s`,
        resolution: params.resolution,
      },
    };

    if (params.previousInteractionId) {
      interactionPayload.previous_interaction_id = params.previousInteractionId;
    }

    const interactionsApi = (ai as any).interactions;
    if (!interactionsApi || typeof interactionsApi.create !== 'function') {
      throw new Error('Installed @google/genai SDK does not expose interactions.create.');
    }

    const interaction = await interactionsApi.create(interactionPayload, { timeout: 300000 });

    // Extract video output across all documented Interactions API response fields:
    // 1. interaction.output_video (convenience helper)
    // 2. interaction.steps[].content[] (model_output steps)
    // 3. interaction.outputs[] (legacy fallback)
    let videoPart: any = interaction?.output_video || null;
    if (!videoPart && Array.isArray(interaction?.steps)) {
      for (let i = interaction.steps.length - 1; i >= 0; i--) {
        const step = interaction.steps[i];
        if (step?.type === 'model_output' && Array.isArray(step.content)) {
          const found = step.content.find((c: any) => c?.type === 'video' && (c?.data || c?.uri));
          if (found) {
            videoPart = found;
            break;
          }
        }
      }
    }
    if (!videoPart && Array.isArray(interaction?.outputs)) {
      videoPart = interaction.outputs.find((o: any) => o?.type === 'video' && (o?.data || o?.uri)) || null;
    }

    if (videoPart?.data) {
      const bytes = base64ToBytes(videoPart.data);
      return {
        videoBytes: bytes,
        mimeType: videoPart.mime_type || 'video/mp4',
        interactionId: interaction?.id,
        provider: 'gemini-omni-video',
        model,
      };
    }

    if (videoPart?.uri) {
      const downloaded = await this.downloadGeminiVideoUri(videoPart.uri);
      return {
        videoBytes: downloaded.bytes,
        mimeType: videoPart.mime_type || downloaded.mimeType || 'video/mp4',
        interactionId: interaction?.id,
        provider: 'gemini-omni-video',
        model,
      };
    }

    throw new Error('gemini-omni-1.2-flash completed without returning retrievable video data or URI.');
  }

  private classifyVideoProviderError(err: any): {
    status: VideoJobRecord['status'];
    guidance: string;
  } {
    const msg = String(err?.message || err || '');
    const code = Number(err?.status || err?.code || 0);
    if (
      code === 401 ||
      code === 403 ||
      /API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED|unauthorized|forbidden/i.test(msg)
    ) {
      return {
        status: 'AUTHENTICATION_FAILED',
        guidance:
          'Verify your billing-enabled GEMINI_API_KEY in server Secrets/environment settings with access to gemini-omni-1.2-flash.',
      };
    }
    if (
      code === 404 ||
      code === 429 ||
      code === 503 ||
      /RESOURCE_EXHAUSTED|NOT_FOUND|quota|billing|paid|unavailable|overloaded/i.test(msg)
    ) {
      return {
        status: 'PROVIDER_UNAVAILABLE',
        guidance:
          'gemini-omni-1.2-flash requires a paid/billing-enabled API key and available quota. Review the generated storyboard plan or upgrade billing tier.',
      };
    }
    return {
      status: 'FAILED',
      guidance: 'Check the prompt/media constraints (3s-15s, 16:9 or 9:16) and retry rendering.',
    };
  }

  /**
   * Starts a real tracked Video Job with user/org ownership isolation.
   * - If `planOnly` -> returns STORYBOARD_PLAN_ONLY (never COMPLETED).
   * - If no video provider configured -> returns PROVIDER_UNCONFIGURED + storyboard plan (never COMPLETED).
   * - If configured -> returns QUEUED/GENERATING immediately and executes real render + full MP4 box validation.
   */
  public async startVideoJob(req: CreativeVideoRequest): Promise<VideoJobRecord> {
    const jobId = `vid_job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const attachments: AttachmentMetadata[] = [
      ...(req.referenceImages || []).map((r) => ({ name: r.name, mimeType: r.mimeType, hasData: true })),
      ...(req.referenceVideo ? [{ name: req.referenceVideo.name, mimeType: req.referenceVideo.mimeType, hasData: true }] : []),
    ];

    const classification = classifyCreativeIntent(req.prompt, attachments);
    const category: VideoIntentCategory =
      req.category ||
      (classification.domain === 'VIDEO' ? (classification.category as VideoIntentCategory) : 'TEXT_TO_VIDEO');

    const mode: VideoJobRecord['mode'] =
      req.planOnly || category === 'VIDEO_STORYBOARD'
        ? 'storyboard_plan'
        : req.mode ||
          (req.previousInteractionId
            ? /\bextend\b/i.test(req.prompt)
              ? 'video_extend'
              : 'video_edit'
            : req.referenceVideo
              ? 'video_edit'
              : req.referenceImages && req.referenceImages.length > 1
                ? 'storyboard_multi_ref'
                : req.referenceImages && req.referenceImages.length === 1
                  ? 'image_to_video'
                  : 'text_to_video');

    const aspectRatio: '16:9' | '9:16' =
      req.aspectRatio || (classification.aspectRatio === '9:16' ? '9:16' : '16:9');
    const durationSeconds = Math.min(15, Math.max(3, Math.round(req.durationSeconds || 8)));
    const resolution: VideoJobRecord['resolution'] =
      req.resolution === '360p' || req.resolution === '1080p' || req.resolution === '4k'
        ? req.resolution
        : '720p';

    const productionPlan = await this.createVideoProductionPlan({
      ...req,
      category,
      aspectRatio,
      durationSeconds,
      resolution: resolution === '1080p' || resolution === '4k' ? '1080p' : '720p',
    });

    // 1. Storyboard / Planning mode — explicitly labeled STORYBOARD_PLAN_ONLY, NEVER COMPLETED!
    if (mode === 'storyboard_plan') {
      const planJob: VideoJobRecord = {
        jobId,
        ownerUserId: req.ownerUserId,
        ownerOrgId: req.ownerOrgId,
        status: 'STORYBOARD_PLAN_ONLY',
        mode,
        category,
        prompt: req.prompt,
        enhancedPrompt: productionPlan.providerPrompt,
        provider: 'anny-directorial-planner',
        model: getGeminiApiKey() ? 'gemini-4-hydrogen' : 'local-storyboard-planner',
        aspectRatio,
        durationSeconds,
        resolution,
        progressPct: 100,
        stageMessage: 'Storyboard & shot list ready (no MP4 video rendered in planning mode).',
        createdAt: now,
        updatedAt: now,
        playableValidated: false,
        productionPlan,
      };
      this.videoJobs.set(jobId, planJob);
      return planJob;
    }

    // 2. Check if real video provider is actually configured
    const hasVideoProvider = req.providerOverride !== 'offline' && (Boolean(getGeminiApiKey()) || Boolean(this.customVideoAdapter));
    if (!hasVideoProvider) {
      const unconfiguredJob: VideoJobRecord = {
        jobId,
        ownerUserId: req.ownerUserId,
        ownerOrgId: req.ownerOrgId,
        status: 'PROVIDER_UNCONFIGURED',
        mode,
        category,
        prompt: req.prompt,
        enhancedPrompt: productionPlan.providerPrompt,
        provider: 'unconfigured',
        model: 'none',
        aspectRatio,
        durationSeconds,
        resolution,
        progressPct: 0,
        stageMessage: 'Real video rendering requires a configured video provider; directorial storyboard plan prepared instead.',
        createdAt: now,
        updatedAt: now,
        playableValidated: false,
        productionPlan,
        error: 'No real video rendering provider is configured on the server.',
        errorCode: 'VIDEO_RENDERER_NOT_CONFIGURED',
        recoveryGuidance:
          'Configure a billing-enabled GEMINI_API_KEY on the server to enable real MP4 video rendering via gemini-omni-1.2-flash (Interactions API). You can review and refine the generated storyboard plan right now.',
      };
      this.videoJobs.set(jobId, unconfiguredJob);
      return unconfiguredJob;
    }

    // 3. Create real async job & run rendering in background while returning tracked jobId immediately
    const job: VideoJobRecord = {
      jobId,
      ownerUserId: req.ownerUserId,
      ownerOrgId: req.ownerOrgId,
      status: 'GENERATING',
      mode,
      category,
      prompt: req.prompt,
      enhancedPrompt: productionPlan.providerPrompt,
      provider: 'gemini-omni-video',
      model: 'gemini-omni-1.2-flash',
      aspectRatio,
      durationSeconds,
      resolution,
      progressPct: 15,
      stageMessage: 'Submitting video render request to gemini-omni-1.2-flash...',
      createdAt: now,
      updatedAt: now,
      parentJobId: req.parentJobId,
      productionPlan,
    };
    this.videoJobs.set(jobId, job);

    // Execute async job with real container structure validation
    void this.executeVideoJobAsync(jobId, req, productionPlan.providerPrompt);

    return { ...job };
  }

  private async executeVideoJobAsync(
    jobId: string,
    req: CreativeVideoRequest,
    enhancedPrompt: string
  ): Promise<void> {
    const job = this.videoJobs.get(jobId);
    if (!job || job.status === 'CANCELLED') return;

    try {
      job.status = 'PROCESSING';
      job.progressPct = 40;
      job.stageMessage = 'Rendering video frames and synchronizing motion...';
      job.updatedAt = new Date().toISOString();

      const result = await this.callGeminiOmniVideoProvider({
        prompt: job.mode === 'video_edit' || job.mode === 'video_extend' ? req.prompt : enhancedPrompt,
        mode: job.mode,
        aspectRatio: job.aspectRatio,
        durationSeconds: job.durationSeconds,
        resolution: job.resolution,
        referenceImages: req.referenceImages,
        referenceVideo: req.referenceVideo,
        previousInteractionId: req.previousInteractionId,
      });

      // Respect user cancellation if cancelled mid-flight
      if (this.videoJobs.get(jobId)?.status === 'CANCELLED') {
        return;
      }

      job.status = 'VALIDATING';
      job.progressPct = 90;
      job.stageMessage = 'Validating full MP4/WebM container structure (ftyp/moov/mdat)...';
      job.updatedAt = new Date().toISOString();

      const validation = validateVideoAsset(result.videoBytes);
      if (!validation.valid) {
        throw new Error(validation.error || 'Video output failed container playability validation.');
      }

      this.videoBuffers.set(jobId, {
        bytes: result.videoBytes,
        mimeType: validation.mimeType,
      });

      job.status = 'COMPLETED';
      job.provider = result.provider;
      job.model = result.model;
      job.interactionId = result.interactionId;
      job.mimeType = validation.mimeType;
      job.byteLength = validation.byteLength;
      job.playableValidated = true;
      job.containerDetails = validation.containerDetails;
      job.videoUrl = `/api/creative/video/jobs/${encodeURIComponent(jobId)}/media`;
      job.progressPct = 100;
      job.stageMessage = 'Playable video container verified and ready for preview & download.';
      job.completedAt = new Date().toISOString();
      job.updatedAt = job.completedAt;
    } catch (err: any) {
      if (this.videoJobs.get(jobId)?.status === 'CANCELLED') return;
      const classified = this.classifyVideoProviderError(err);
      job.status = classified.status;
      job.playableValidated = false;
      job.progressPct = 0;
      job.error = err?.message || 'Video generation failed.';
      job.stageMessage = `Video rendering ${classified.status.toLowerCase().replace(/_/g, ' ')}: ${job.error}`;
      job.recoveryGuidance = classified.guidance;
      job.updatedAt = new Date().toISOString();
    }
  }

  public canAccessVideoJob(job: VideoJobRecord, requester?: { userId?: string; orgId?: string; isAdmin?: boolean }): boolean {
    if (!requester) return true;
    if (requester.isAdmin) return true;
    if (!job.ownerUserId) return false;
    if (job.ownerUserId !== requester.userId) return false;
    if (job.ownerOrgId && requester.orgId && job.ownerOrgId !== requester.orgId) return false;
    return true;
  }

  public getVideoJob(jobId: string, requester?: { userId?: string; orgId?: string; isAdmin?: boolean }): VideoJobRecord | undefined {
    const job = this.videoJobs.get(jobId);
    if (!job) return undefined;
    if (requester && !this.canAccessVideoJob(job, requester)) return undefined;
    return { ...job };
  }

  public listVideoJobs(requester?: { userId?: string; orgId?: string; isAdmin?: boolean }): VideoJobRecord[] {
    return Array.from(this.videoJobs.values())
      .filter((job) => !requester || this.canAccessVideoJob(job, requester))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((j) => ({ ...j }));
  }

  public cancelVideoJob(
    jobId: string,
    requester?: { userId?: string; orgId?: string; isAdmin?: boolean }
  ): VideoJobRecord | null {
    const job = this.videoJobs.get(jobId);
    if (!job) return null;
    if (requester && !this.canAccessVideoJob(job, requester)) return null;
    if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
      return { ...job };
    }
    job.status = 'CANCELLED';
    job.playableValidated = false;
    job.progressPct = 0;
    job.stageMessage = 'Video job cancelled by operator.';
    job.updatedAt = new Date().toISOString();
    this.videoBuffers.delete(jobId);
    return { ...job };
  }

  public getVideoMediaBuffer(
    jobId: string,
    requester?: { userId?: string; orgId?: string; isAdmin?: boolean }
  ): { bytes: Uint8Array; mimeType: string } | undefined {
    const job = this.videoJobs.get(jobId);
    if (!job) return undefined;
    if (requester && !this.canAccessVideoJob(job, requester)) return undefined;
    return this.videoBuffers.get(jobId);
  }

  /**
   * Unified Audio, Music, Beat, SFX & Voice TTS Generation Engine:
   * - VOICE: Google Gemini Neural TTS (`gemini-3.8-flash-lite-tts`) when GEMINI_API_KEY is configured;
   *   honest AUDIO_RENDERER_NOT_CONFIGURED error when unconfigured.
   * - MUSIC / INSTRUMENTAL / BEAT / SFX: Uses Google Lyria (`lyria-3-clip-preview` / `lyria-3-pro-preview`)
   *   when configured & online (unless mode === 'offline' or beat/sfx local synthesis is selected);
   *   falls back cleanly or runs offline via ANNY's deterministic 16-bit PCM RIFF/WAV synthesizer.
   *   Every output is verified with `validateAudioAsset()` so zero empty or malformed audio is ever returned.
   */
  public async generateCreativeAudio(params: {
    prompt: string;
    type?: AudioGenerationType;
    fullTrack?: boolean;
    mode?: 'auto' | 'cloud' | 'offline';
    voiceName?: string;
    ownerUserId?: string;
    ownerOrgId?: string;
  }): Promise<CreativeAudioResult> {
    const cleanPrompt = (params.prompt || '').trim();
    const audioType: AudioGenerationType = params.type || 'MUSIC';
    const mode = params.mode || 'auto';
    const assetKey = `art_aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    if (!cleanPrompt) {
      return {
        success: false,
        audioType,
        provider: 'validation',
        model: 'none',
        audioUrl: '',
        url: '',
        mimeType: 'audio/wav',
        byteLength: 0,
        errorCode: 'INVALID_AUDIO_PROMPT',
        error: 'Please enter a prompt describing the audio, music, beat, SFX, or voiceover to generate.',
      };
    }

    const ai = mode === 'offline' ? null : createGeminiClient();

    // 1. CLOUD VOICE / TEXT-TO-SPEECH (TTS)
    if (audioType === 'VOICE') {
      if (!ai) {
        return {
          success: false,
          audioType: 'VOICE',
          provider: 'unconfigured',
          model: 'none',
          audioUrl: '',
          url: '',
          mimeType: 'audio/wav',
          byteLength: 0,
          errorCode: 'AUDIO_RENDERER_NOT_CONFIGURED',
          error: 'Cloud Voice TTS requires a configured GEMINI_API_KEY on the server (or offline speech is unsupported here).',
          recoveryGuidance: 'Set GEMINI_API_KEY on the server to synthesize natural speech via gemini-3.8-flash-lite-tts, or select Music / Instrumental / Beat / SFX for instant local WAV synthesis.',
        };
      }

      try {
        const ttsModel = 'gemini-3.8-flash-lite-tts';
        const resp = await promiseWithTimeout(
          ai.models.generateContent({
            model: ttsModel,
            contents: [{ role: 'user', parts: [{ text: cleanPrompt }] }],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: params.voiceName || 'Kore' },
                },
              },
            },
          }),
          30000,
          'Gemini Voice TTS'
        );

        const audioPart = resp.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
        if (!audioPart?.inlineData?.data) {
          throw new Error(`${ttsModel} returned no inline audio payload.`);
        }
        const rawBytes = base64ToBytes(audioPart.inlineData.data);
        const declaredMime = audioPart.inlineData.mimeType || 'audio/wav';
        const validation = validateAudioAsset(new Uint8Array(rawBytes), declaredMime);
        if (!validation.valid) {
          throw new Error(validation.error || 'Gemini TTS audio output failed container validation.');
        }

        const storedUrl = this.storeAudioAsset({
          assetKey,
          bytes: rawBytes,
          mimeType: validation.mimeType,
          filename: `ANNY_Voice_${assetKey}.${validation.format === 'mp3' ? 'mp3' : 'wav'}`,
          ownerUserId: params.ownerUserId,
          ownerOrgId: params.ownerOrgId,
          createdAt: new Date().toISOString(),
        });
        const dataUrl = `data:${validation.mimeType};base64,${bytesToBase64(rawBytes)}`;

        return {
          success: true,
          audioType: 'VOICE',
          provider: 'gemini-voice-tts',
          model: ttsModel,
          audioUrl: dataUrl,
          url: storedUrl,
          assetKey,
          mimeType: validation.mimeType,
          byteLength: rawBytes.byteLength,
          durationSeconds: validation.durationSeconds,
          metadata: { voiceName: params.voiceName || 'Kore' },
        };
      } catch (err: any) {
        const msg = String(err?.message || 'Cloud Voice TTS failed.');
        return {
          success: false,
          audioType: 'VOICE',
          provider: 'gemini-voice-tts',
          model: 'gemini-3.8-flash-lite-tts',
          audioUrl: '',
          url: '',
          mimeType: 'audio/wav',
          byteLength: 0,
          errorCode: 'VOICE_TTS_FAILED',
          error: msg,
          recoveryGuidance: 'Verify GEMINI_API_KEY permissions and try a shorter narration prompt.',
        };
      }
    }

    // 2. CLOUD MUSIC GENERATION VIA LYRIA (when configured and mode permits)
    const shouldTryLyria = Boolean(ai) && (mode === 'cloud' || audioType === 'MUSIC' || audioType === 'INSTRUMENTAL');
    if (shouldTryLyria && ai) {
      const model = params.fullTrack ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
      try {
        const streamPromise = ai.models.generateContentStream({
          model,
          contents: audioType === 'INSTRUMENTAL' ? `${cleanPrompt} (instrumental only, no vocals)` : cleanPrompt,
        });
        const stream = await promiseWithTimeout(streamPromise, 20000, `Lyria ${model}`);

        const audioChunks: Buffer[] = [];
        let mimeType = 'audio/mpeg';
        let hasMime = false;
        let lyrics = '';

        await promiseWithTimeout(
          (async () => {
            for await (const chunk of stream) {
              const parts = chunk.candidates?.[0]?.content?.parts || [];
              for (const part of parts) {
                if (part.inlineData?.data) {
                  if (!hasMime && part.inlineData.mimeType) {
                    mimeType = part.inlineData.mimeType;
                    hasMime = true;
                  }
                  audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
                }
                if (part.text) {
                  lyrics += part.text;
                }
              }
            }
          })(),
          45000,
          `Lyria stream ${model}`
        );

        const combined = new Uint8Array(Buffer.concat(audioChunks));
        const validation = validateAudioAsset(combined, mimeType);
        if (validation.valid) {
          const ext = validation.format === 'mp3' ? 'mp3' : validation.format === 'ogg' ? 'ogg' : 'wav';
          const storedUrl = this.storeAudioAsset({
            assetKey,
            bytes: combined,
            mimeType: validation.mimeType,
            filename: `ANNY_${audioType}_${assetKey}.${ext}`,
            ownerUserId: params.ownerUserId,
            ownerOrgId: params.ownerOrgId,
            createdAt: new Date().toISOString(),
          });
          return {
            success: true,
            audioType,
            provider: 'gemini-lyria-music',
            model,
            audioUrl: `data:${validation.mimeType};base64,${bytesToBase64(combined)}`,
            url: storedUrl,
            assetKey,
            mimeType: validation.mimeType,
            byteLength: combined.byteLength,
            durationSeconds: validation.durationSeconds,
            lyrics: lyrics.trim() || undefined,
          };
        }
      } catch (err: any) {
        if (mode === 'cloud') {
          const msg = String(err?.message || 'Lyria audio synthesis failed.');
          const isPaidOrAuth = /401|403|429|PERMISSION_DENIED|RESOURCE_EXHAUSTED|API_KEY_INVALID/i.test(msg);
          return {
            success: false,
            audioType,
            provider: 'gemini-lyria-music',
            model,
            audioUrl: '',
            url: '',
            mimeType: 'audio/mpeg',
            byteLength: 0,
            errorCode: isPaidOrAuth ? 'AUDIO_RENDERER_AUTH_OR_QUOTA' : 'AUDIO_RENDERER_FAILED',
            error: msg,
            recoveryGuidance: isPaidOrAuth
              ? 'Lyria 3 requires a billing-enabled GEMINI_API_KEY. Switch mode to Auto or Offline to synthesize local WAV audio without paid keys.'
              : 'Retry or switch to Local WAV Synth mode.',
          };
        }
        // In 'auto' mode, cleanly fall through to local deterministic WAV synthesis
      }
    }

    if (mode === 'cloud' && !ai) {
      return {
        success: false,
        audioType,
        provider: 'unconfigured',
        model: 'none',
        audioUrl: '',
        url: '',
        mimeType: 'audio/wav',
        byteLength: 0,
        errorCode: 'AUDIO_RENDERER_NOT_CONFIGURED',
        error: 'Cloud audio generation requested, but GEMINI_API_KEY is not configured on the server.',
        recoveryGuidance: 'Set GEMINI_API_KEY for cloud Lyria generation, or use Auto/Local Synth mode for instant playable WAV generation.',
      };
    }

    // 3. LOCAL DETERMINISTIC PCM RIFF/WAV SYNTHESIS (MUSIC, INSTRUMENTAL, BEAT, SFX)
    const synthType = audioType === 'BEAT' || audioType === 'SFX' || audioType === 'INSTRUMENTAL' ? audioType : 'MUSIC';
    const synth = synthesizeLocalWavAudio({ prompt: cleanPrompt, audioType: synthType });
    const validation = validateAudioAsset(synth.audioBytes, synth.mimeType);
    if (!validation.valid) {
      return {
        success: false,
        audioType,
        provider: synth.provider,
        model: synth.model,
        audioUrl: '',
        url: '',
        mimeType: 'audio/wav',
        byteLength: 0,
        errorCode: 'LOCAL_AUDIO_VALIDATION_FAILED',
        error: validation.error || 'Local WAV synthesizer failed container validation.',
      };
    }

    const storedUrl = this.storeAudioAsset({
      assetKey,
      bytes: synth.audioBytes,
      mimeType: validation.mimeType,
      filename: `ANNY_${synthType}_${assetKey}.wav`,
      ownerUserId: params.ownerUserId,
      ownerOrgId: params.ownerOrgId,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      audioType,
      provider: synth.provider,
      model: synth.model,
      audioUrl: `data:${validation.mimeType};base64,${bytesToBase64(synth.audioBytes)}`,
      url: storedUrl,
      assetKey,
      mimeType: validation.mimeType,
      byteLength: synth.audioBytes.byteLength,
      durationSeconds: synth.durationSeconds,
      metadata: synth.metadata,
    };
  }
}

export const creativeGenerationService = new CreativeGenerationService();

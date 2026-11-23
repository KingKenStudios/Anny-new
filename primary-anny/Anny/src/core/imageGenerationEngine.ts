/**
 * ANNY — Repaired Image Generation Engine (Client/Shared Facade)
 *
 * REPAIRS APPLIED:
 *  - Removed hardcoded seedDefaultAssets() fake logo.png proof.
 *  - Removed dishonest LOCAL_OLLAMA image generator listing (Ollama text/vision does not generate images).
 *  - Removed silent Pollinations URL fallback that mislabeled external raster images as VECTOR_SVG_ENGINE.
 *  - Routes every request through CreativeIntentRouter, LogoGenerationPipeline (for verified offline SVG logos),
 *    and the authenticated server-side /api/creative/image endpoint for raster/edit generation.
 *  - Preserves backwards-compatible exports (GeneratedAssetRecord, ImageProviderType, generateImageArtifact)
 *    for existing ANNY kernel and capability modules.
 */

import { classifyCreativeIntent } from '../creative/CreativeIntentRouter';
import { generateVectorLogoBundle } from '../creative/LogoGenerationPipeline';
import { normalizeImageSource } from '../creative/mediaNormalization';
import { buildEnhancedPrompt } from '../creative/PromptEnhancer';
import type { CreativeImageResult, CreativeProviderCapability, LogoDesignPlan } from '../creative/types';
import { fetchWithAuth } from '../lib/apiUtils';

export type ImageProviderType =
  | 'VECTOR_SVG_ENGINE'
  | 'GEMINI_IMAGEN'
  | 'OPENAI_IMAGE'
  | 'LOCAL_SD_WEBUI';

export interface ImageGenerationRequest {
  prompt?: string;
  promptText?: string;
  category?: string;
  assetCategory?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  highResolution?: boolean;
  providerPreference?: 'auto' | 'local-vector-svg' | 'gemini' | 'openai' | 'local-sd';
  referenceImages?: Array<{ mimeType: string; data: string; name?: string }>;
  previousLogoPlan?: LogoDesignPlan;
  parentArtifactId?: string;
  projectId?: string;
  userId?: string;
  organizationScope?: string;
  dimensions?: { width: number; height: number };
}

export interface GeneratedImageAsset {
  id: string;
  artifactId: string;
  assetId: string;
  userId: string;
  title: string;
  workspacePath: string;
  prompt: string;
  enhancedPrompt: string;
  category: string;
  url: string;
  assetUrl: string;
  dataUrlOrPath: string;
  mimeType: string;
  format: 'svg' | 'png' | 'jpeg' | 'webp';
  provider: string;
  providerUsed: string;
  modelUsed: string;
  status: 'VERIFIED' | 'FAILED';
  dimensions: { width: number; height: number };
  logoBundle?: CreativeImageResult['logoBundle'];
  quality?: CreativeImageResult['quality'];
  timestamp: string;
  error?: string;
}

export type GeneratedAssetRecord = GeneratedImageAsset;

class ImageGenerationEngine {
  private static instance: ImageGenerationEngine;
  private generatedAssets: Map<string, GeneratedImageAsset> = new Map();
  private cachedProviders: CreativeProviderCapability[] = [];

  private constructor() {
    // Zero hardcoded seed assets — gallery only reflects genuinely generated & verified outputs.
  }

  public static getInstance(): ImageGenerationEngine {
    if (!ImageGenerationEngine.instance) {
      ImageGenerationEngine.instance = new ImageGenerationEngine();
    }
    return ImageGenerationEngine.instance;
  }

  public async fetchAvailableProviders(): Promise<CreativeProviderCapability[]> {
    try {
      const res = await fetchWithAuth('/api/creative/providers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.providers)) {
          this.cachedProviders = data.providers.filter((p: CreativeProviderCapability) => p.domain === 'IMAGE');
          return this.cachedProviders;
        }
      }
    } catch {
      // Offline fallback reports truthful local capability only
    }

    this.cachedProviders = [
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
        detail: 'Offline vector SVG logo & icon synthesis available locally.',
      },
    ];
    return this.cachedProviders;
  }

  public getAvailableProviders(): CreativeProviderCapability[] {
    if (this.cachedProviders.length > 0) return [...this.cachedProviders];
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
        detail: 'Offline vector SVG logo & icon synthesis available locally.',
      },
    ];
  }

  public async generateImage(request: ImageGenerationRequest): Promise<GeneratedImageAsset> {
    const rawPrompt = (request.prompt || request.promptText || '').trim();
    const effectivePrompt =
      request.assetCategory && !rawPrompt.toLowerCase().includes(request.assetCategory.toLowerCase())
        ? `${rawPrompt} (${request.assetCategory})`
        : rawPrompt || 'Create brand logo';

    const classification = classifyCreativeIntent(
      effectivePrompt,
      (request.referenceImages || []).map((r) => ({ name: r.name, mimeType: r.mimeType, hasData: Boolean(r.data) }))
    );

    const isLogoLike =
      classification.category === 'LOGO_DESIGN' ||
      classification.category === 'BRAND_IDENTITY' ||
      classification.category === 'ICON' ||
      classification.category === 'APP_ICON' ||
      /logo|icon|emblem|brand/i.test(request.assetCategory || '');

    // Try authoritative server creative endpoint first
    try {
      const response = await fetchWithAuth('/api/creative/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: effectivePrompt,
          aspectRatio: request.aspectRatio || classification.aspectRatio,
          highResolution: request.highResolution,
          providerPreference: request.providerPreference || 'auto',
          referenceImages: request.referenceImages,
          previousLogoPlan: request.previousLogoPlan,
          parentArtifactId: request.parentArtifactId,
        }),
      });

      const payload: CreativeImageResult = await response.json();
      const normalized = normalizeImageSource({
        imageUrl: payload.imageUrl,
        primaryImageUrl: payload.primaryImageUrl,
        url: payload.url,
        base64: payload.base64,
        mimeType: payload.mimeType || payload.primaryMimeType,
      });
      if (!response.ok || !payload.success || !normalized.valid || !normalized.src || payload.quality?.valid === false) {
        throw new Error(payload.error || normalized.error || `Image generation failed (${response.status})`);
      }

      const resolvedFormat = payload.primaryFormat || (normalized.mimeType === 'image/svg+xml' ? 'svg' : normalized.mimeType === 'image/jpeg' ? 'jpeg' : normalized.mimeType === 'image/webp' ? 'webp' : 'png');
      const title = payload.logoBundle?.plan.brandName
        ? `${payload.logoBundle.plan.brandName} Logo`
        : effectivePrompt.slice(0, 60);
      const workspacePath = `/assets/generated/${payload.artifactId}.${resolvedFormat}`;
      const asset: GeneratedImageAsset = {
        id: payload.artifactId,
        artifactId: payload.artifactId,
        assetId: payload.artifactId,
        userId: request.userId || 'local',
        title,
        workspacePath,
        prompt: effectivePrompt,
        enhancedPrompt: payload.enhancedPrompt?.enhancedPrompt || effectivePrompt,
        category: payload.classification?.category || classification.category,
        url: normalized.src,
        assetUrl: normalized.src,
        dataUrlOrPath: normalized.src,
        mimeType: normalized.mimeType,
        format: resolvedFormat,
        provider: payload.provider,
        providerUsed: payload.provider,
        modelUsed: payload.model,
        status: 'VERIFIED',
        dimensions: { width: payload.quality?.width || 1024, height: payload.quality?.height || 1024 },
        logoBundle: payload.logoBundle,
        quality: payload.quality,
        timestamp: payload.generatedAt || new Date().toISOString(),
      };
      this.generatedAssets.set(asset.assetId, asset);
      return asset;
    } catch (serverErr: any) {
      // ONLY logo/icon requests have a genuine local offline vector fallback.
      // Raster scenes/portraits NEVER fall back to unverified external URLs!
      if (isLogoLike) {
        const logoBundle = generateVectorLogoBundle(
          effectivePrompt,
          classification.extractedBrandName,
          request.previousLogoPlan
        );
        const enhanced = buildEnhancedPrompt(classification, logoBundle.plan);
        const primary = logoBundle.variants[0];
        const fallbackId = `img_vec_${Date.now().toString(36)}`;
        const asset: GeneratedImageAsset = {
          id: fallbackId,
          artifactId: fallbackId,
          assetId: fallbackId,
          userId: request.userId || 'local',
          title: `${logoBundle.plan.brandName} Logo`,
          workspacePath: `/assets/generated/${fallbackId}.svg`,
          prompt: effectivePrompt,
          enhancedPrompt: enhanced.enhancedPrompt,
          category: classification.category,
          url: primary.dataUrl,
          assetUrl: primary.dataUrl,
          dataUrlOrPath: primary.dataUrl,
          mimeType: 'image/svg+xml',
          format: 'svg',
          provider: 'local-vector-svg',
          providerUsed: 'local-vector-svg',
          modelUsed: 'anny-vector-svg-v1',
          status: 'VERIFIED',
          dimensions: { width: primary.width, height: primary.height },
          logoBundle,
          timestamp: new Date().toISOString(),
        };
        this.generatedAssets.set(asset.assetId, asset);
        return asset;
      }

      throw new Error(serverErr?.message || 'Image generation provider unavailable.');
    }
  }

  /**
   * Backwards-compatible alias for capability fabric & reality test callers.
   */
  public async generateImageArtifact(request: ImageGenerationRequest): Promise<GeneratedImageAsset> {
    return this.generateImage(request);
  }

  public getGeneratedAssets(userId?: string): GeneratedImageAsset[] {
    const all = Array.from(this.generatedAssets.values());
    if (userId) return all.filter((a) => a.userId === userId);
    return all;
  }

  public getAssetById(assetId: string): GeneratedImageAsset | undefined {
    return this.generatedAssets.get(assetId);
  }
}

export const imageGenerationEngine = ImageGenerationEngine.getInstance();

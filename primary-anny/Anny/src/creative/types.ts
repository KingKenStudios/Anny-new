/**
 * ANNY — Unified Creative Generation Architecture Types
 * Covers Image (23 categories), Video (15 categories), Application (9 categories),
 * Logo Design Pipeline, Quality Control, Provider Truthfulness, and Artifact Revisions.
 */

export type CreativeDomain = 'IMAGE' | 'VIDEO' | 'APPLICATION' | 'AUDIO' | 'CONVERSATION';

export type ImageIntentCategory =
  | 'LOGO_DESIGN'
  | 'BRAND_IDENTITY'
  | 'ICON'
  | 'APP_ICON'
  | 'ILLUSTRATION'
  | 'PORTRAIT'
  | 'PRODUCT_PHOTOGRAPHY'
  | 'CONCEPT_ART'
  | 'CHARACTER_DESIGN'
  | 'ENVIRONMENT_ART'
  | 'ARCHITECTURE'
  | 'INTERIOR_DESIGN'
  | 'FASHION_DESIGN'
  | 'UI_DESIGN'
  | 'WEBSITE_MOCKUP'
  | 'APP_MOCKUP'
  | 'POSTER'
  | 'FLYER'
  | 'ALBUM_COVER'
  | 'THUMBNAIL'
  | 'INFOGRAPHIC'
  | 'TECHNICAL_DIAGRAM'
  | 'SCHEMATIC'
  | 'PHOTOREALISTIC_SCENE'
  | 'IMAGE_EDIT'
  | 'IMAGE_VARIATION'
  | 'STYLE_TRANSFER'
  | 'BACKGROUND_REMOVAL'
  | 'UPSCALING_ENHANCEMENT';

export type VideoIntentCategory =
  | 'TEXT_TO_VIDEO'
  | 'IMAGE_TO_VIDEO'
  | 'VIDEO_STORYBOARD'
  | 'PROMO_VIDEO'
  | 'MUSIC_VIDEO_CONCEPT'
  | 'COMMERCIAL_AD'
  | 'PRODUCT_SHOWCASE_VIDEO'
  | 'EXPLAINER_VIDEO'
  | 'ANIMATION'
  | 'MOTION_GRAPHICS'
  | 'BRAND_INTRO'
  | 'SHORT_REEL_VERTICAL'
  | 'CINEMATIC_SCENE'
  | 'EDUCATIONAL_VIDEO'
  | 'VIDEO_EDITING';

export type ApplicationIntentCategory =
  | 'WEBSITE_GENERATION'
  | 'WEB_APP_GENERATION'
  | 'FULLSTACK_APPLICATION'
  | 'MOBILE_UI_GENERATION'
  | 'DASHBOARD'
  | 'SAAS_PLATFORM'
  | 'PORTFOLIO'
  | 'LANDING_PAGE'
  | 'ADMIN_PANEL';

export type CreativeCategory =
  | ImageIntentCategory
  | VideoIntentCategory
  | ApplicationIntentCategory
  | 'MUSIC_GENERATION'
  | 'GENERAL_CHAT';

export type LogoType =
  | 'monogram'
  | 'combination_mark'
  | 'wordmark'
  | 'emblem'
  | 'symbol'
  | 'lettermark'
  | 'mascot';

export type LogoAesthetic =
  | 'luxury'
  | 'minimal'
  | 'modern_tech'
  | 'studio_media'
  | 'royal_heritage'
  | 'bold_geometric'
  | 'editorial';

export interface AttachmentMetadata {
  name?: string;
  type?: string;
  mimeType?: string;
  hasData?: boolean;
  dataUrl?: string;
}

export interface ActiveArtifactContext {
  artifactId?: string;
  domain?: CreativeDomain;
  category?: CreativeCategory;
  prompt?: string;
  brandName?: string;
  logoPlan?: LogoDesignPlan;
  videoInteractionId?: string;
  videoJobId?: string;
  hasVfsProject?: boolean;
}

export interface CreativeIntentClassification {
  domain: CreativeDomain;
  category: CreativeCategory;
  confidence: number;
  isRevision: boolean;
  revisionInstruction?: string;
  extractedBrandName?: string;
  extractedMonogram?: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';
  requiresReferenceImage: boolean;
  requiresReferenceVideo: boolean;
  reasoning: string;
  preservedOriginalPrompt: string;
}

export interface ColorSwatch {
  name: string;
  hex: string;
  role: 'primary' | 'secondary' | 'accent' | 'background_dark' | 'background_light' | 'text_on_dark' | 'text_on_light';
}

export interface LogoDesignPlan {
  brandName: string;
  monogram: string;
  tagline?: string;
  logoType: LogoType;
  aesthetic: LogoAesthetic;
  motif: 'crown' | 'geometric_hex' | 'soundwave' | 'shield' | 'diamond' | 'orbit' | 'prism' | 'minimal_grid';
  includeCrown: boolean;
  explicitHumanRequested: boolean;
  palette: ColorSwatch[];
  typography: {
    displayFont: string;
    secondaryFont: string;
    letterSpacing: string;
    weight: string;
  };
  compositionNotes: string;
  avoidList: string[];
  revisionNumber: number;
}

export interface LogoVariant {
  id: string;
  label: string;
  variantType: 'primary_dark' | 'light_background' | 'icon_transparent' | 'monogram_badge';
  format: 'svg';
  mimeType: 'image/svg+xml';
  svgMarkup: string;
  dataUrl: string;
  width: number;
  height: number;
  sha256: string;
}

export interface LogoAssetBundle {
  plan: LogoDesignPlan;
  variants: LogoVariant[];
  rasterMaster?: {
    url: string;
    mimeType: string;
    width: number;
    height: number;
    provider: string;
    model: string;
    quality: ImageQualityReport;
  };
}

export interface EnhancedPromptResult {
  originalPrompt: string;
  enhancedPrompt: string;
  negativeConstraints: string[];
  category: CreativeCategory;
  aspectRatio: string;
  styleDirectives: string[];
  brandPlan?: LogoDesignPlan;
}

export interface ImageQualityReport {
  valid: boolean;
  mimeType: string;
  format: 'png' | 'jpeg' | 'webp' | 'svg' | 'unknown';
  byteLength: number;
  width: number;
  height: number;
  sha256: string;
  isVectorSvg: boolean;
  sanitizedSvg: boolean;
  duplicateDetected: boolean;
  semanticReviewStatus: 'verified' | 'mismatch' | 'not_run_no_evaluator' | 'skipped';
  semanticNotes?: string;
  errors: string[];
  warnings: string[];
}

export interface CreativeImageResult {
  success: boolean;
  artifactId: string;
  classification: CreativeIntentClassification;
  enhancedPrompt: EnhancedPromptResult;
  primaryImageUrl: string;
  primaryMimeType: string;
  primaryFormat: 'svg' | 'png' | 'jpeg' | 'webp';
  provider: string;
  model: string;
  quality: ImageQualityReport;
  logoBundle?: LogoAssetBundle;
  generatedAt: string;
  revisionNumber: number;
  parentArtifactId?: string;
  error?: string;
  recoveryGuidance?: string;
}

export interface VideoStoryboardShot {
  shotNumber: number;
  durationSeconds: number;
  visualDescription: string;
  cameraMovement: string;
  lightingAndMood: string;
  audioCue: string;
  onScreenText?: string;
}

export interface VideoProductionPlan {
  title: string;
  category: VideoIntentCategory;
  conceptSummary: string;
  aspectRatio: '16:9' | '9:16';
  targetDurationSeconds: number;
  resolution: '720p' | '1080p';
  narrationScript: string;
  musicAndSoundDirection: string;
  shots: VideoStoryboardShot[];
  providerPrompt: string;
}

export type VideoJobStatus =
  | 'QUEUED'
  | 'PLANNING'
  | 'GENERATING'
  | 'VALIDATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'STORYBOARD_PLAN_ONLY'
  | 'PROVIDER_UNCONFIGURED';

export interface VideoJobRecord {
  jobId: string;
  status: VideoJobStatus;
  mode: 'text_to_video' | 'image_to_video' | 'storyboard_multi_ref' | 'video_edit' | 'video_extend' | 'storyboard_plan';
  category: VideoIntentCategory;
  prompt: string;
  enhancedPrompt: string;
  provider: string;
  model: string;
  aspectRatio: '16:9' | '9:16';
  durationSeconds: number;
  resolution: '720p' | '1080p';
  progressPct: number;
  stageMessage: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  videoUrl?: string;
  mimeType?: string;
  byteLength?: number;
  playableValidated?: boolean;
  interactionId?: string;
  parentJobId?: string;
  productionPlan?: VideoProductionPlan;
  error?: string;
  recoveryGuidance?: string;
}

export interface CreativeProviderCapability {
  id: string;
  name: string;
  domain: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VISION_QA';
  kind: 'local_vector' | 'cloud_api' | 'local_worker';
  configured: boolean;
  offlineCapable: boolean;
  requiresPaidKey: boolean;
  supportedFormats: string[];
  models: string[];
  status: 'AVAILABLE' | 'UNCONFIGURED' | 'DEGRADED';
  detail: string;
}

export interface CreativeArtifactRecord {
  id: string;
  projectId: string;
  studio: 'graphics' | 'video' | 'music' | 'web' | 'chat';
  domain: CreativeDomain;
  category: CreativeCategory;
  title: string;
  prompt: string;
  enhancedPrompt?: string;
  provider: string;
  model: string;
  format: string;
  mimeType: string;
  url?: string;
  thumbnailUrl?: string;
  revisionNumber: number;
  parentArtifactId?: string;
  createdAt: string;
  metadata: Record<string, any>;
}

export interface StudioProject {
  id: string;
  name: string;
  organization: string;
  createdAt: string;
  updatedAt: string;
  artifactIds: string[];
}

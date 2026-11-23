/**
 * ANNY — Professional Creative Intent Router
 *
 * Context-aware multi-signal intent classification across:
 *  - 23+ Image generation & editing categories
 *  - 15 Video generation, storyboard & editing categories
 *  - 9 Website & full-stack application generation categories
 *  - Iterative conversational refinement on active artifacts
 *
 * CRITICAL DESIGN RULES:
 *  1. NEVER strip category terms like "logo", "portrait", "poster", or "video" from the prompt.
 *  2. Resolve ambiguous entities (e.g., "King Ken") using semantic intent, NOT literal noun imagery:
 *     - "Create a logo for King Ken" -> IMAGE / LOGO_DESIGN (brandName = "King Ken", NOT a human king)
 *     - "Create a portrait of King Ken" -> IMAGE / PORTRAIT
 *     - "Create a king sitting on a throne" -> IMAGE / CHARACTER_DESIGN
 *     - "Create a royal logo with a crown" -> IMAGE / LOGO_DESIGN
 *     - "Create an animated logo intro for King Ken Studios" -> VIDEO / BRAND_INTRO
 *  3. Video motion verbs ("animated", "video", "intro", "reel", "cinematic moving", "turn into video")
 *     take precedence over static image keywords like "logo" or "picture".
 */

import type {
  ActiveArtifactContext,
  ApplicationIntentCategory,
  AttachmentMetadata,
  CreativeIntentClassification,
  ImageIntentCategory,
  VideoIntentCategory,
} from './types';

function extractAspectRatio(prompt: string, domain: 'IMAGE' | 'VIDEO' | 'APPLICATION'): CreativeIntentClassification['aspectRatio'] {
  const lower = prompt.toLowerCase();
  if (/\b(9:16|vertical|reel|tiktok|shorts|stories|mobile portrait|phone wallpaper)\b/.test(lower)) return '9:16';
  if (/\b(16:9|widescreen|youtube thumbnail|youtube banner|banner|cinematic wide|landscape)\b/.test(lower)) return '16:9';
  if (/\b(4:3)\b/.test(lower)) return '4:3';
  if (/\b(3:4|poster|flyer|magazine cover)\b/.test(lower)) return '3:4';
  if (/\b(3:2)\b/.test(lower)) return '3:2';
  if (/\b(2:3)\b/.test(lower)) return '2:3';
  if (/\b(1:1|square|avatar|icon|logo|album cover|emblem|monogram)\b/.test(lower)) return '1:1';
  if (domain === 'VIDEO') return '16:9';
  return '1:1';
}

export function extractRequestedImageCount(prompt: string): number {
  const lower = prompt.toLowerCase();
  const numericMatch = lower.match(
    /\b([1-6])\s+(?:different\s+|distinct\s+|unique\s+|high[- ]resolution\s+|hd\s+|modern\s+|realistic\s+|creative\s+)?(?:images?|pictures?|photos?|photographs?|variations?|options?|concepts?|versions?|logos?|designs?|renders?|artworks?|illustrations?|posters?|wallpapers?)\b/
  );
  if (numericMatch?.[1]) {
    return Math.min(4, Math.max(1, Number(numericMatch[1])));
  }
  const wordMap: Record<string, number> = { two: 2, three: 3, four: 4 };
  const wordMatch = lower.match(
    /\b(two|three|four)\s+(?:different\s+|distinct\s+|unique\s+|modern\s+|realistic\s+)?(?:images?|pictures?|photos?|photographs?|variations?|options?|concepts?|versions?|logos?|designs?|renders?|artworks?|illustrations?)\b/
  );
  if (wordMatch?.[1] && wordMap[wordMatch[1]]) {
    return wordMap[wordMatch[1]];
  }
  if (/\b(multiple|several|a few|gallery of|set of|batch of)\s+(?:images?|pictures?|photos?|variations?|options?|concepts?)\b/.test(lower)) {
    return 4;
  }
  return 1;
}

/**
 * Extracts clean brand / company / artist name from logo & branding prompts
 * without destroying the user's intent.
 */
export function extractBrandName(prompt: string): string | undefined {
  const trimmed = prompt.trim();

  // Quoted brand name has highest precision: e.g. logo for "King Ken Studios"
  const quoted = trimmed.match(/["“']([^"”']{2,48})["”']/);
  if (quoted?.[1]) {
    return cleanBrandPhrase(quoted[1]);
  }

  // Pattern: "... logo/brand/emblem/monogram/icon/intro for <Brand Name>"
  const forMatch = trimmed.match(
    /\b(?:logo|brand(?:\s+identity)?|wordmark|monogram|emblem|icon|mascot|badge|crest|intro|bumper|opener|identity)\b(?:\s+(?:design|mark|concept|pack|kit|intro|animation))?\s+(?:for|of|named|called)\s+([a-z0-9&'.+\-\s]{2,48}?)(?=(?:\s+(?:with|in|using|on|that|which|style|minimal|luxury|modern|gold|black|dark|light|clean|featuring|incorporating|inspired|focused|company|brand|logo|please|and\s+make)|[.,;!?]|$))/i
  );
  if (forMatch?.[1]) {
    const cleaned = cleanBrandPhrase(forMatch[1]);
    if (cleaned.length >= 2) return cleaned;
  }

  // Pattern: "<Brand Name> logo" e.g. "King Ken Studios logo" or "Akinwumi Group brand identity"
  const prefixMatch = trimmed.match(
    /^(?:(?:please|can you|could you)\s+)?(?:create|design|make|generate|build|craft)\s+(?:me\s+)?(?:a|an|the)?\s*(?:(?:premium|modern|luxury|minimal|minimalist|sleek|bold|royal|professional|clean|custom|vector|3d|animated)\s+)*([A-Z0-9][A-Za-z0-9&'.+\-]+(?:\s+[A-Z0-9][A-Za-z0-9&'.+\-]+){0,4})\s+(?:logo|brand\s+identity|monogram|wordmark|emblem|icon|intro)\b/
  );
  if (prefixMatch?.[1]) {
    const cleaned = cleanBrandPhrase(prefixMatch[1]);
    if (cleaned.length >= 2 && !/^(a|an|the|my|our|new|royal|luxury|modern|minimal|premium)$/i.test(cleaned)) {
      return cleaned;
    }
  }

  // Fallback for lowercase "create logo for king ken"
  const fallbackFor = trimmed.match(/\bfor\s+(?:my\s+|our\s+|the\s+)?([a-z0-9&'.+\-]+(?:\s+[a-z0-9&'.+\-]+){0,3})/i);
  if (fallbackFor?.[1]) {
    const candidate = cleanBrandPhrase(fallbackFor[1]);
    if (candidate.length >= 2 && !/^(a|an|the|me|us|it|this|that)$/i.test(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function cleanBrandPhrase(raw: string): string {
  const stripped = raw
    .replace(/^(?:a|an|the|my|our)\s+/i, '')
    .replace(/\s+(?:with|in|using|style|theme|colors?|palette|background|design|logo)$/i, '')
    .replace(/[.,;!?]+$/g, '')
    .trim();

  if (!stripped) return '';

  // Title-case any lowercase words ("king Ken" -> "King Ken", "king ken studios" -> "King Ken Studios")
  return stripped
    .split(/\s+/)
    .map((w) => (w.length > 0 && w === w.toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function deriveMonogram(brandName: string): string {
  const words = brandName
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'AN';
  if (words.length === 1) {
    const w = words[0];
    return (w.slice(0, 2)).toUpperCase();
  }
  // Ignore trailing generic business suffixes when picking crisp 2-letter monogram ("King Ken Studios" -> "KK")
  const coreWords = words.filter(
    (w, i) => !(i === words.length - 1 && words.length >= 3 && /^(studios?|inc|llc|ltd|corp|co|group|labs?|company|records|media|enterprises)$/i.test(w))
  );
  const chosen = coreWords.length >= 2 ? coreWords : words;
  return chosen
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join('')
    .slice(0, 2);
}

function hasImageAttachment(attachments: AttachmentMetadata[]): boolean {
  return attachments.some((a) => {
    const mime = (a.mimeType || a.type || '').toLowerCase();
    const name = (a.name || '').toLowerCase();
    return mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(name);
  });
}

function hasVideoAttachment(attachments: AttachmentMetadata[]): boolean {
  return attachments.some((a) => {
    const mime = (a.mimeType || a.type || '').toLowerCase();
    const name = (a.name || '').toLowerCase();
    return mime.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi)$/i.test(name);
  });
}

function detectConversationalRevision(
  prompt: string,
  activeContext?: ActiveArtifactContext
): { isRevision: boolean; domain?: CreativeIntentClassification['domain']; category?: CreativeIntentClassification['category']; reason?: string } {
  const ctxAny = activeContext as (ActiveArtifactContext & { artifactType?: string }) | undefined;
  const effectiveDomain: CreativeIntentClassification['domain'] | undefined =
    ctxAny?.domain ||
    (ctxAny?.selectedImageUrl ||
    ctxAny?.logoPlan ||
    (ctxAny?.artifactType && /(image|logo|brand|photo)/i.test(ctxAny.artifactType))
      ? 'IMAGE'
      : ctxAny?.videoInteractionId
        ? 'VIDEO'
        : ctxAny?.hasVfsProject
          ? 'APPLICATION'
          : undefined);
  const effectiveCategory =
    ctxAny?.category ||
    (ctxAny?.logoPlan || (ctxAny?.artifactType && /logo/i.test(ctxAny.artifactType))
      ? 'LOGO_DESIGN'
      : effectiveDomain === 'IMAGE'
        ? 'IMAGE_EDIT'
        : undefined);

  if (!effectiveDomain) return { isRevision: false };

  const lower = prompt.toLowerCase().trim();

  // Explicit new-topic override cancels revision inheritance
  if (/^(new|start over|forget that|different topic|now build|instead create a new)\b/i.test(lower)) {
    return { isRevision: false };
  }

  // Logo / Image iterative edits
  const logoRefinementPattern =
    /\b(make (?:the |this )?(?:logo|icon|mark|emblem|it)|change (?:the |this )?(?:logo|it|colors?|palette|font|background)|more minimal|simpler|cleaner|bolder|gold and black|dark background|light background|add a crown|remove the crown|use a monogram|circular emblem|wordmark|emerald|silver|minimalist geometric)\b/i;

  if (
    effectiveDomain === 'IMAGE' &&
    (effectiveCategory === 'LOGO_DESIGN' || effectiveCategory === 'BRAND_IDENTITY' || effectiveCategory === 'ICON') &&
    logoRefinementPattern.test(lower) &&
    !/\b(video|animate|website|web app|store|dashboard|song|music)\b/i.test(lower)
  ) {
    return {
      isRevision: true,
      domain: 'IMAGE',
      category: effectiveCategory,
      reason: 'Iterative conversational revision on active logo/brand artifact.',
    };
  }

  // General raster image follow-up edits ("Make this image more realistic", "Change the background...", "Make the colors warmer")
  const imageEditRefinementPattern =
    /\b(make (?:this|the) (?:image|picture|photo|it)|change (?:the )?(?:background|lighting|colors?|palette|style|mood|sky|outfit|setting|angle|composition)|remove (?:this|the) (?:object|background|person|text|watermark)|replace (?:the )?|more realistic|photorealistic|warmer|cooler|brighter|darker|landscape|portrait|vertical|widescreen|another variation|create a variation|keep (?:the )?(?:composition|subject|person|face|layout)|improve (?:the )?(?:lighting|details|quality|sharpness)|upscale|enhance)\b/i;

  if (
    effectiveDomain === 'IMAGE' &&
    imageEditRefinementPattern.test(lower) &&
    !/\b(video|animate|website|web app|store|dashboard|song|music)\b/i.test(lower)
  ) {
    const editCategory: ImageIntentCategory = /\b(remove (?:the )?background|transparent background)\b/i.test(lower)
      ? 'BACKGROUND_REMOVAL'
      : /\b(variation|another variation|alternate version)\b/i.test(lower)
        ? 'IMAGE_VARIATION'
        : /\b(upscale|enhance resolution|sharpen)\b/i.test(lower)
          ? 'UPSCALING_ENHANCEMENT'
          : 'IMAGE_EDIT';
    return {
      isRevision: true,
      domain: 'IMAGE',
      category: editCategory,
      reason: 'Conversational non-destructive edit on active/selected image.',
    };
  }

  // Video iterative edits ("Change scene two to nighttime", "Extend this video", "Make the intro slower")
  const videoRefinementPattern =
    /\b(scene\s+(?:\d+|one|two|three|four|five)|shot\s+\d+|extend (?:the |this )?video|make (?:the |this )?(?:video|intro|clip|motion|camera|pacing)|change (?:scene|lighting|camera|shot|it to nighttime|the ending)|add (?:narration|voiceover|captions|transitions))\b/i;

  if (effectiveDomain === 'VIDEO' && videoRefinementPattern.test(lower)) {
    return {
      isRevision: true,
      domain: 'VIDEO',
      category: 'VIDEO_EDITING',
      reason: 'Iterative conversational revision on active video artifact.',
    };
  }

  // Application / Website iterative edits ("Add a mobile navigation menu", "Make the homepage more premium")
  const appRefinementPattern =
    /\b(homepage|navigation menu|navbar|sidebar|footer|checkout|cart|hero section|dark mode|light mode|mobile menu|responsive|database|api route|login page|dashboard tab|add a page|make the (?:site|website|app|homepage|ui|layout))\b/i;

  if ((effectiveDomain === 'APPLICATION' || ctxAny?.hasVfsProject) && appRefinementPattern.test(lower)) {
    return {
      isRevision: true,
      domain: 'APPLICATION',
      category: (effectiveCategory as ApplicationIntentCategory) || 'WEBSITE_GENERATION',
      reason: 'Iterative conversational revision on active generated application/website.',
    };
  }

  return { isRevision: false };
}

function classifyVideoCategory(lower: string, imageAttached: boolean, videoAttached: boolean): VideoIntentCategory | null {
  const hasVideoSignal =
    /\b(video|videos|reel|reels|tiktok|short film|commercial|promo video|explainer video|music video|storyboard|shot list|motion graphics|animated logo|logo intro|brand intro|video intro|video opener|cinematic scene|cinematic clip|movie trailer|trailer|animation|animate|turn (?:this|the) (?:image|picture|photo|logo) into (?:a )?(?:moving |cinematic )?video|image[- ]to[- ]video|text[- ]to[- ]video|extend (?:this |the )?video|edit (?:this |the )?video)\b/i.test(
      lower
    );

  if (!hasVideoSignal && !(videoAttached && /\b(edit|trim|change|replace|restyle|extend|slow down|speed up|add|make)\b/i.test(lower))) {
    return null;
  }

  // Guard: "Make a website for my video company" -> APPLICATION, not VIDEO
  if (/\b(website|web app|landing page|portfolio|online store|ecommerce|e-commerce|saas|dashboard|admin panel)\s+for\b/i.test(lower)) {
    return null;
  }

  if (videoAttached || /\b(edit (?:this |the )?video|video[- ]to[- ]video|extend (?:this |the )?video|change scene \w+ in)\b/i.test(lower)) {
    return 'VIDEO_EDITING';
  }
  if (imageAttached || /\b(image[- ]to[- ]video|turn (?:this|the) (?:image|picture|photo|artwork|logo) into (?:a )?(?:moving |cinematic )?video|animate (?:this|the) (?:image|picture|photo|logo))\b/i.test(lower)) {
    return 'IMAGE_TO_VIDEO';
  }
  if (/\b(animated logo|logo intro|brand intro|logo reveal|studio intro|channel intro|title opener)\b/i.test(lower)) {
    return 'BRAND_INTRO';
  }
  if (/\b(motion graphics?|kinetic typography|lower thirds?|title animation)\b/i.test(lower)) {
    return 'MOTION_GRAPHICS';
  }
  if (/\b(storyboard|shot list|scene breakdown|pre-?viz)\b/i.test(lower)) {
    return 'VIDEO_STORYBOARD';
  }
  if (/\b(music video)\b/i.test(lower)) {
    return 'MUSIC_VIDEO_CONCEPT';
  }
  if (/\b(commercial|ad spot|advertisement|tv spot)\b/i.test(lower)) {
    return 'COMMERCIAL_AD';
  }
  if (/\b(promo video|promotional video|launch teaser|teaser video)\b/i.test(lower)) {
    return 'PROMO_VIDEO';
  }
  if (/\b(product showcase|product demo video|product reveal)\b/i.test(lower)) {
    return 'PRODUCT_SHOWCASE_VIDEO';
  }
  if (/\b(explainer video|product explainer|how it works video)\b/i.test(lower)) {
    return 'EXPLAINER_VIDEO';
  }
  if (/\b(educational video|tutorial video|lesson video|training video)\b/i.test(lower)) {
    return 'EDUCATIONAL_VIDEO';
  }
  if (/\b(short reel|vertical video|tiktok|instagram reel|youtube short|9:16 video)\b/i.test(lower)) {
    return 'SHORT_REEL_VERTICAL';
  }
  if (/\b(animation|animated|2d animation|3d animation|cartoon clip)\b/i.test(lower)) {
    return 'ANIMATION';
  }
  if (/\b(cinematic|short film|movie scene|film scene|trailer)\b/i.test(lower)) {
    return 'CINEMATIC_SCENE';
  }
  return 'TEXT_TO_VIDEO';
}

function classifyApplicationCategory(lower: string): ApplicationIntentCategory | null {
  // Guard: "website mockup" / "app mockup" / "UI design screenshot" / "wireframe image" -> IMAGE, NOT code build
  if (/\b(website mockup|app mockup|ui mockup|mockup image|static mockup|wireframe image|dribbble shot|render of a ui)\b/i.test(lower)) {
    return null;
  }

  const buildVerb =
    /\b(build|create|make|generate|develop|design|construct|scaffold|code|implement|ship|launch)\b/i.test(lower);
  const appNoun =
    /\b(website|web\s*app|webapp|application|full[- ]?stack|online store|e-?commerce|storefront|marketplace|saas|dashboard|admin panel|portal|inventory(?:\s+management)?\s+app|crm|erp|booking system|portfolio site|portfolio website|landing page|mobile\s*(?:app|ui)|platform|management system|school portal|pos system)\b/i.test(
      lower
    );

  if (!buildVerb || !appNoun) return null;

  if (/\b(admin panel|back[- ]?office|moderation panel|control panel)\b/i.test(lower)) return 'ADMIN_PANEL';
  if (/\b(saas|multi[- ]?tenant|subscription platform)\b/i.test(lower)) return 'SAAS_PLATFORM';
  if (/\b(dashboard|analytics board|kpi board|monitoring console)\b/i.test(lower)) return 'DASHBOARD';
  if (/\b(landing page|waitlist page|launch page|promo page)\b/i.test(lower)) return 'LANDING_PAGE';
  if (/\b(portfolio)\b/i.test(lower)) return 'PORTFOLIO';
  if (/\b(mobile\s*(?:ui|app)|ios app|android app)\b/i.test(lower)) return 'MOBILE_UI_GENERATION';
  if (
    /\b(full[- ]?stack|inventory|online store|e-?commerce|storefront|marketplace|crm|erp|booking|management app|management system|with backend|with database|with api|with auth)\b/i.test(
      lower
    )
  ) {
    return 'FULLSTACK_APPLICATION';
  }
  if (/\b(web\s*app|webapp|application|tool|workspace|studio app)\b/i.test(lower)) return 'WEB_APP_GENERATION';
  return 'WEBSITE_GENERATION';
}

function classifyImageCategory(lower: string, imageAttached: boolean): ImageIntentCategory | null {
  // 1. Image editing / transformation when reference image is attached or explicitly requested
  if (
    imageAttached &&
    /\b(keep|preserve|change|replace|remove background|background removal|upscale|enhance|restyle|style transfer|variation|edit|put|wear|outfit|suit|color|lighting|retouch|turn into|make it)\b/i.test(
      lower
    )
  ) {
    if (/\b(remove (?:the )?background|transparent background|cutout|isolate subject)\b/i.test(lower)) {
      return 'BACKGROUND_REMOVAL';
    }
    if (/\b(upscale|enhance resolution|sharpen|denoise|restore photo|4k enhance)\b/i.test(lower)) {
      return 'UPSCALING_ENHANCEMENT';
    }
    if (/\b(style transfer|in the style of|convert to (?:oil painting|watercolor|anime|cyberpunk|pencil sketch))\b/i.test(lower)) {
      return 'STYLE_TRANSFER';
    }
    if (/\b(variation|variations|alternate versions?)\b/i.test(lower)) {
      return 'IMAGE_VARIATION';
    }
    return 'IMAGE_EDIT';
  }

  // Explicit text-only edit phrasing even before attachment check
  if (/\b(keep the (?:person|subject|face|composition)|change the outfit|remove the background from)\b/i.test(lower)) {
    return /\bremove the background\b/i.test(lower) ? 'BACKGROUND_REMOVAL' : 'IMAGE_EDIT';
  }

  // 2. Logo & Brand Identity — MUST resolve BEFORE portrait/character/king heuristics!
  if (
    /\b(logo|wordmark|monogram|lettermark|brand mark|brand identity|brand kit|emblem|crest|company badge|studio mark|mascot logo)\b/i.test(
      lower
    )
  ) {
    if (/\b(brand identity|brand kit|brand system|brand guidelines|visual identity)\b/i.test(lower)) {
      return 'BRAND_IDENTITY';
    }
    return 'LOGO_DESIGN';
  }

  // 3. App Icons & UI Icons
  if (/\b(app icon|ios icon|android icon|launcher icon|favicon)\b/i.test(lower)) {
    return 'APP_ICON';
  }
  if (/\b(icon|icons|glyph|vector icon|badge icon)\b/i.test(lower) && /\b(create|design|generate|make|draw|render)\b/i.test(lower)) {
    return 'ICON';
  }

  // 4. UI / Website / App Mockups (static visual assets)
  if (/\b(website mockup|web mockup|landing page mockup)\b/i.test(lower)) return 'WEBSITE_MOCKUP';
  if (/\b(app mockup|mobile mockup|device mockup)\b/i.test(lower)) return 'APP_MOCKUP';
  if (/\b(ui design|interface mockup|ui concept|dribbble)\b/i.test(lower)) return 'UI_DESIGN';

  // 5. Marketing & Editorial Graphics
  if (/\b(album cover|single cover|ep cover|mixtape cover|cover art|record sleeve)\b/i.test(lower)) return 'ALBUM_COVER';
  if (/\b(thumbnail|youtube thumbnail)\b/i.test(lower)) return 'THUMBNAIL';
  if (/\b(poster|movie poster|concert poster|event poster)\b/i.test(lower)) return 'POSTER';
  if (/\b(flyer|brochure|leaflet|handbill)\b/i.test(lower)) return 'FLYER';
  if (/\b(infographic|data visual|chart graphic)\b/i.test(lower)) return 'INFOGRAPHIC';

  // 6. Technical & Architectural Visuals
  if (/\b(schematic|circuit diagram|wiring diagram|pcb diagram|blueprint)\b/i.test(lower)) return 'SCHEMATIC';
  if (/\b(technical diagram|architecture diagram|system diagram|exploded view|cutaway diagram|flowchart image)\b/i.test(lower)) {
    return 'TECHNICAL_DIAGRAM';
  }
  if (/\b(interior design|living room design|kitchen render|bedroom render|office interior)\b/i.test(lower)) return 'INTERIOR_DESIGN';
  if (/\b(architecture|architectural render|building exterior|skyscraper design|modern house render)\b/i.test(lower)) return 'ARCHITECTURE';
  if (/\b(fashion design|couture|garment design|streetwear lookbook|runway outfit)\b/i.test(lower)) return 'FASHION_DESIGN';

  // 7. Commercial Product Photography
  if (/\b(product photography|product photo|product shot|packshot|commercial photo|studio shot of (?:a |the )?(?:bottle|watch|shoe|sneaker|headphones|perfume|camera|phone|package))\b/i.test(lower)) {
    return 'PRODUCT_PHOTOGRAPHY';
  }

  // 8. Portrait vs Character Design vs Environment vs Concept Art vs Illustration
  if (/\b(portrait|headshot|self-?portrait|editorial portrait|studio portrait|avatar of)\b/i.test(lower)) {
    return 'PORTRAIT';
  }
  if (/\b(character design|character sheet|king sitting on a throne|warrior|hero character|villain|creature design|game character|mascot character)\b/i.test(lower)) {
    return 'CHARACTER_DESIGN';
  }
  if (/\b(environment art|landscape concept|sci-?fi city|fantasy world|matte painting|worldbuilding scene)\b/i.test(lower)) {
    return 'ENVIRONMENT_ART';
  }
  if (/\b(concept art|keyframe art|visual development)\b/i.test(lower)) {
    return 'CONCEPT_ART';
  }
  if (/\b(illustration|drawing|sketch|watercolor|oil painting|digital painting|vector art|artwork|comic art|anime art)\b/i.test(lower)) {
    return 'ILLUSTRATION';
  }
  if (/\b(photorealistic|hyperrealistic|photograph of|photo of|picture of|image of|render of|wallpaper)\b/i.test(lower)) {
    return 'PHOTOREALISTIC_SCENE';
  }

  // Explicit general visual creation command (supports singular & plural: "generate 4 images of...")
  if (
    /\b(generate|draw|create|make|render|produce|design|paint|sketch|visualize|show me)\b/i.test(lower) &&
    /\b(images?|pictures?|photos?|photographs?|graphics?|artworks?|art|visuals?|scenes?|wallpapers?|illustrations?|renders?|concepts?|throne|castle|car|landscape)\b/i.test(lower)
  ) {
    return 'PHOTOREALISTIC_SCENE';
  }

  return null;
}

/**
 * Primary entry point for classifying any creative or conversational prompt.
 */
export function classifyCreativeIntent(
  prompt: string,
  attachments: AttachmentMetadata[] = [],
  activeContext?: ActiveArtifactContext
): CreativeIntentClassification {
  const preservedOriginalPrompt = prompt.trim();
  const lower = preservedOriginalPrompt.toLowerCase();
  const imageAttached = hasImageAttachment(attachments);
  const videoAttached = hasVideoAttachment(attachments);

  // 0. Pure greeting or factual question guard (unless attachments or explicit revision)
  const isPureGreeting = /^(hello|hi|hey|how are you|what'?s up|good morning|good afternoon|good evening|ping|test)\b/i.test(lower) && lower.length < 48;
  const isPureQuestion = /^(what is|why does|how does|explain|tell me about|define|who is)\b/i.test(lower) && !/\b(create|generate|build|make|draw|design)\b/i.test(lower);
  if ((isPureGreeting || isPureQuestion) && !imageAttached && !videoAttached) {
    return {
      domain: 'CONVERSATION',
      category: 'GENERAL_CHAT',
      confidence: 0.96,
      isRevision: false,
      aspectRatio: '1:1',
      requiresReferenceImage: false,
      requiresReferenceVideo: false,
      reasoning: 'Conversational greeting or informational question.',
      preservedOriginalPrompt,
    };
  }

  // 1. Check conversational revision against active artifact BEFORE fresh creation
  const revision = detectConversationalRevision(preservedOriginalPrompt, activeContext);
  if (revision.isRevision && revision.domain && revision.category) {
    const brandName = activeContext?.brandName || extractBrandName(preservedOriginalPrompt);
    return {
      domain: revision.domain,
      category: revision.category,
      confidence: 0.92,
      isRevision: true,
      revisionInstruction: preservedOriginalPrompt,
      extractedBrandName: brandName,
      extractedMonogram: brandName ? deriveMonogram(brandName) : activeContext?.logoPlan?.monogram,
      requestedImageCount: revision.domain === 'IMAGE' ? extractRequestedImageCount(preservedOriginalPrompt) : undefined,
      aspectRatio: extractAspectRatio(preservedOriginalPrompt, revision.domain === 'VIDEO' ? 'VIDEO' : revision.domain === 'APPLICATION' ? 'APPLICATION' : 'IMAGE'),
      requiresReferenceImage:
        (revision.category === 'IMAGE_EDIT' ||
          revision.category === 'IMAGE_VARIATION' ||
          revision.category === 'BACKGROUND_REMOVAL' ||
          revision.category === 'UPSCALING_ENHANCEMENT' ||
          revision.category === 'IMAGE_TO_VIDEO') &&
        !activeContext?.selectedImageUrl,
      requiresReferenceVideo: revision.category === 'VIDEO_EDITING' && !activeContext?.videoInteractionId,
      reasoning: revision.reason || 'Conversational refinement on active artifact.',
      preservedOriginalPrompt,
    };
  }

  // 2. Music / Audio / Beat / SFX / Voice TTS generation check (Studio & Chat)
  const hasAudioCreationVerb = /\b(generate|create|compose|make|produce|synthesize|speak|narrate|voice|say|play|design)\b/i.test(lower);
  const hasMusicOrSoundNoun =
    /\b(song|track|beat|drum beat|afrobeat|lo-?fi beat|instrumental|soundtrack|music|jingle|audio track|theme music|sound effect|sound effects|sfx|foley|audio clip|voiceover|voice over|tts|text[- ]to[- ]speech)\b/i.test(lower);
  if (
    (hasAudioCreationVerb && hasMusicOrSoundNoun && !/\b(music video|website|web app|app|album cover|logo|poster)\b/i.test(lower)) ||
    /^(tts|speak|narrate|voiceover)\s*[:\-]/i.test(lower)
  ) {
    let audioCategory: CreativeIntentClassification['category'] = 'MUSIC_GENERATION';
    if (/\b(sound effect|sound effects|sfx|foley)\b/i.test(lower)) {
      audioCategory = 'AUDIO_SFX';
    } else if (/\b(voiceover|voice over|tts|text[- ]to[- ]speech|narrate|speak)\b/i.test(lower)) {
      audioCategory = 'AUDIO_VOICE_TTS';
    } else if (/\b(drum beat|lo-?fi beat|trap beat|hip[- ]?hop beat|beats?)\b/i.test(lower) || (/\bafrobeat\b/i.test(lower) && !/\b(instrumental|song|music|soundtrack|track)\b/i.test(lower))) {
      audioCategory = 'AUDIO_BEAT';
    }
    return {
      domain: 'AUDIO',
      category: audioCategory,
      confidence: 0.92,
      isRevision: false,
      aspectRatio: '1:1',
      requiresReferenceImage: false,
      requiresReferenceVideo: false,
      reasoning: `Detected ${audioCategory} request for Audio/Music generation.`,
      preservedOriginalPrompt,
    };
  }

  // 3. Video intent check FIRST (so "animated logo intro" or "turn this picture into video" is NEVER misrouted to static image!)
  const videoCategory = classifyVideoCategory(lower, imageAttached, videoAttached);
  if (videoCategory) {
    const brandName = extractBrandName(preservedOriginalPrompt);
    return {
      domain: 'VIDEO',
      category: videoCategory,
      confidence: 0.94,
      isRevision: false,
      extractedBrandName: brandName,
      extractedMonogram: brandName ? deriveMonogram(brandName) : undefined,
      aspectRatio: extractAspectRatio(preservedOriginalPrompt, 'VIDEO'),
      requiresReferenceImage: videoCategory === 'IMAGE_TO_VIDEO',
      requiresReferenceVideo: videoCategory === 'VIDEO_EDITING',
      reasoning: `Classified as VIDEO/${videoCategory} based on motion/video production semantics.`,
      preservedOriginalPrompt,
    };
  }

  // 4. Application / Website build check (before generic image verbs so "design a website for my music company" builds a real website, unless mockup was requested)
  const appCategory = classifyApplicationCategory(lower);
  if (appCategory) {
    const brandName = extractBrandName(preservedOriginalPrompt);
    return {
      domain: 'APPLICATION',
      category: appCategory,
      confidence: 0.94,
      isRevision: false,
      extractedBrandName: brandName,
      aspectRatio: '16:9',
      requiresReferenceImage: false,
      requiresReferenceVideo: false,
      reasoning: `Classified as APPLICATION/${appCategory} for real code synthesis and preview.`,
      preservedOriginalPrompt,
    };
  }

  // 5. Image generation & editing check (23+ categories with strict logo vs portrait disambiguation)
  const imageCategory = classifyImageCategory(lower, imageAttached);
  if (imageCategory) {
    const isLogoLike = imageCategory === 'LOGO_DESIGN' || imageCategory === 'BRAND_IDENTITY' || imageCategory === 'APP_ICON';
    const brandName = isLogoLike ? extractBrandName(preservedOriginalPrompt) : undefined;
    return {
      domain: 'IMAGE',
      category: imageCategory,
      confidence: isLogoLike ? 0.97 : 0.92,
      isRevision: false,
      extractedBrandName: brandName,
      extractedMonogram: brandName ? deriveMonogram(brandName) : undefined,
      requestedImageCount: extractRequestedImageCount(preservedOriginalPrompt),
      aspectRatio: extractAspectRatio(preservedOriginalPrompt, 'IMAGE'),
      requiresReferenceImage:
        imageCategory === 'IMAGE_EDIT' ||
        imageCategory === 'IMAGE_VARIATION' ||
        imageCategory === 'STYLE_TRANSFER' ||
        imageCategory === 'BACKGROUND_REMOVAL' ||
        imageCategory === 'UPSCALING_ENHANCEMENT',
      requiresReferenceVideo: false,
      reasoning: isLogoLike
        ? `Classified as IMAGE/${imageCategory} for brand "${brandName || 'unspecified'}"; enforces clean vector brand mark composition and blocks literal character/portrait hallucinations.`
        : `Classified as IMAGE/${imageCategory} using category-specific visual prompt routing.`,
      preservedOriginalPrompt,
    };
  }

  // 6. Default conversational fallback
  return {
    domain: 'CONVERSATION',
    category: 'GENERAL_CHAT',
    confidence: 0.75,
    isRevision: false,
    aspectRatio: '1:1',
    requiresReferenceImage: false,
    requiresReferenceVideo: false,
    reasoning: 'No explicit media or application generation intent detected; routed to conversation.',
    preservedOriginalPrompt,
  };
}

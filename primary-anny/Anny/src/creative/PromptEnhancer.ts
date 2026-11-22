/**
 * ANNY — Category-Specific Prompt Enhancement Engine
 *
 * Transforms raw user requests into structured, category-specialized prompts
 * with explicit composition rules, visual style directives, and negative constraints.
 *
 * Specifically eliminates the failure mode where a logo prompt like
 * "Create logo for king Ken" becomes a literal portrait of a king sitting on a throne.
 */

import type {
  CreativeIntentClassification,
  EnhancedPromptResult,
  LogoDesignPlan,
} from './types';

const LOGO_NEGATIVE_CONSTRAINTS = [
  'no human person',
  'no photorealistic portrait',
  'no king sitting on a throne',
  'no medieval character scene',
  'no realistic room or palace interior',
  'no busy photographic background',
  'no cluttered small text or gibberish watermarks',
  'no 3D angled paper/wall mockup photo',
];

export function buildEnhancedPrompt(
  classification: CreativeIntentClassification,
  logoPlan?: LogoDesignPlan
): EnhancedPromptResult {
  const original = classification.preservedOriginalPrompt;
  const cat = classification.category;

  if (cat === 'LOGO_DESIGN' || cat === 'BRAND_IDENTITY') {
    const brandName = logoPlan?.brandName || classification.extractedBrandName || 'Brand';
    const monogram = logoPlan?.monogram || classification.extractedMonogram || brandName.slice(0, 2).toUpperCase();
    const paletteDesc = logoPlan?.palette
      ? logoPlan.palette
          .filter((c) => c.role === 'primary' || c.role === 'accent' || c.role === 'background_dark')
          .map((c) => `${c.name} (${c.hex})`)
          .join(', ')
      : 'Metallic Gold (#D4AF37), Deep Obsidian (#0B0D14), Crisp Ivory (#F8F9FA)';

    const explicitHuman = logoPlan?.explicitHumanRequested === true;
    const negativeConstraints = explicitHuman
      ? ['no messy cluttered background', 'no unreadable distorted text', 'no watermark']
      : [...LOGO_NEGATIVE_CONSTRAINTS];

    const motifInstruction = logoPlan?.includeCrown
      ? `incorporating a refined minimalist geometric crown emblem seamlessly paired with a sharp "${monogram}" monogram`
      : `featuring a crisp, balanced geometric "${monogram}" symbol and brand mark`;

    const styleDirectives = [
      'Flat 2D vector corporate identity design',
      `Logo type: ${logoPlan?.logoType || 'combination_mark'}`,
      `Aesthetic: ${logoPlan?.aesthetic || 'luxury'}`,
      `Color palette: ${paletteDesc}`,
      'Centered layout with generous negative space on a solid clean background',
      'Scalable from 16px favicon to billboard print',
    ];

    const enhancedPrompt = [
      `Professional graphic design brand logo for "${brandName}", ${motifInstruction}.`,
      `Style: ${logoPlan?.aesthetic || 'luxury'} corporate identity, clean precision vector geometry, symmetrical proportions, crisp edges, balanced negative space, studio-grade typography reading "${brandName}".`,
      `Color palette: ${paletteDesc}.`,
      `Presentation: flat centered logo mark on a clean solid background, production brand identity asset.`,
      explicitHuman
        ? 'Keep composition iconic, clean, and logo-ready.'
        : 'STRICT CONSTRAINTS: Pure graphic brand logo only. Do NOT depict a human person, man, king sitting on a throne, photorealistic face, medieval portrait, room interior, or photographic mockup.',
    ].join(' ');

    return {
      originalPrompt: original,
      enhancedPrompt,
      negativeConstraints,
      category: cat,
      aspectRatio: '1:1',
      styleDirectives,
      brandPlan: logoPlan,
    };
  }

  if (cat === 'ICON' || cat === 'APP_ICON') {
    const styleDirectives = [
      'Clean vector icon mark',
      'Centered within safe rounded-square padding',
      'High legibility at 32px and 1024px',
      'Minimal geometric strokes, zero tiny text',
    ];
    return {
      originalPrompt: original,
      enhancedPrompt: `Professional ${cat === 'APP_ICON' ? 'mobile app launcher icon' : 'vector UI icon'} for: ${original}. Clean geometric silhouette, centered composition with generous safe-zone margin, crisp vector edges, cohesive modern color gradient, high contrast legibility at small sizes. No cluttered scenes, no small unreadable text, no watermarks.`,
      negativeConstraints: ['no small text', 'no busy background', 'no photographic clutter', 'no watermark'],
      category: cat,
      aspectRatio: '1:1',
      styleDirectives,
    };
  }

  if (cat === 'PRODUCT_PHOTOGRAPHY') {
    const styleDirectives = [
      'Commercial studio product photography',
      'Controlled key/rim lighting and natural shadow falloff',
      'Sharp material textures and realistic reflections',
      'Clean uncluttered commercial backdrop',
    ];
    return {
      originalPrompt: original,
      enhancedPrompt: `Commercial studio product photography of: ${original}. Shot on medium-format camera with 85mm macro lens, crisp material reflections, softbox key lighting with subtle rim highlight, natural contact shadow, clean minimalist commercial set, editorial luxury advertising finish. No distorted labels, no floating artifacts, no watermarks.`,
      negativeConstraints: ['no distorted packaging text', 'no floating physics errors', 'no watermark'],
      category: cat,
      aspectRatio: classification.aspectRatio,
      styleDirectives,
    };
  }

  if (cat === 'PORTRAIT') {
    const styleDirectives = [
      'Natural facial anatomy and lifelike skin texture',
      'Intentional key/fill portrait lighting',
      'Shallow depth of field (85mm portrait lens)',
      'Authentic subject expression',
    ];
    return {
      originalPrompt: original,
      enhancedPrompt: `High-craft editorial portrait: ${original}. Photographed with 85mm prime lens, natural skin texture, balanced Rembrandt studio lighting, authentic expression, clean compositional framing, crisp eye focus, soft background bokeh. No anatomical distortions, no extra fingers, no artificial plastic skin, no watermark.`,
      negativeConstraints: ['no extra limbs', 'no anatomical errors', 'no plastic over-smoothed skin', 'no watermark'],
      category: cat,
      aspectRatio: classification.aspectRatio,
      styleDirectives,
    };
  }

  if (cat === 'CHARACTER_DESIGN' || cat === 'CONCEPT_ART' || cat === 'ENVIRONMENT_ART') {
    const styleDirectives = [
      'Production visual development art direction',
      'Strong silhouette readability and atmospheric depth',
      'Cohesive color script and lighting mood',
    ];
    return {
      originalPrompt: original,
      enhancedPrompt: `Production-grade ${cat.toLowerCase().replace(/_/g, ' ')}: ${original}. Strong visual storytelling, clear silhouette readability, intentional three-point atmospheric depth, rich material rendering, cohesive film-studio color script, dramatic composition. No accidental watermarks, no broken anatomy.`,
      negativeConstraints: ['no watermark', 'no low-res blur', 'no deformed anatomy'],
      category: cat,
      aspectRatio: classification.aspectRatio,
      styleDirectives,
    };
  }

  if (cat === 'UI_DESIGN' || cat === 'WEBSITE_MOCKUP' || cat === 'APP_MOCKUP') {
    const styleDirectives = [
      'Clean grid alignment and typographic hierarchy',
      'Realistic spacing, navigation, and product imagery',
      'No gibberish placeholder text',
    ];
    return {
      originalPrompt: original,
      enhancedPrompt: `High-resolution modern ${cat.toLowerCase().replace(/_/g, ' ')} presentation for: ${original}. Crisp 12-column grid alignment, authentic industry-appropriate typography and color system, clean navigation bar, clear visual hierarchy, high-contrast legible interface components, refined whitespace. No garbled unreadable text, no cluttered generic neon boxes.`,
      negativeConstraints: ['no gibberish text', 'no misaligned grids', 'no low-contrast elements'],
      category: cat,
      aspectRatio: classification.aspectRatio,
      styleDirectives,
    };
  }

  if (cat === 'POSTER' || cat === 'FLYER' || cat === 'ALBUM_COVER' || cat === 'THUMBNAIL') {
    const styleDirectives = [
      'Bold focal point with immediate visual impact',
      'Disciplined typographic hierarchy and safe margins',
      'Print/social-ready framing',
    ];
    return {
      originalPrompt: original,
      enhancedPrompt: `Art-directed ${cat.toLowerCase().replace(/_/g, ' ')} graphic design for: ${original}. Striking primary focal point, disciplined Swiss/editorial layout balance, vibrant intentional color grading, clear negative space for headline hierarchy, bold visual storytelling. No accidental misspellings, no stock watermarks.`,
      negativeConstraints: ['no misspelled text', 'no watermark', 'no chaotic clutter'],
      category: cat,
      aspectRatio: classification.aspectRatio,
      styleDirectives,
    };
  }

  if (cat === 'ARCHITECTURE' || cat === 'INTERIOR_DESIGN') {
    const styleDirectives = [
      'Accurate architectural perspective and scale',
      'Natural daylighting and authentic material finishes',
      'Zero structural warping',
    ];
    return {
      originalPrompt: original,
      enhancedPrompt: `Photorealistic ${cat.toLowerCase().replace(/_/g, ' ')} visualization: ${original}. Accurate two-point architectural perspective, natural sunlight and global illumination, realistic concrete/wood/glass/metal textures, human-scale proportions, editorial architectural digest framing. No warped vertical lines, no impossible geometry.`,
      negativeConstraints: ['no warped verticals', 'no impossible architecture', 'no watermark'],
      category: cat,
      aspectRatio: classification.aspectRatio,
      styleDirectives,
    };
  }

  if (cat === 'TECHNICAL_DIAGRAM' || cat === 'SCHEMATIC' || cat === 'INFOGRAPHIC') {
    const styleDirectives = [
      'Clean orthographic / schematic linework',
      'High legibility and logical visual flow',
      'Minimal flat background for clear readability',
    ];
    return {
      originalPrompt: original,
      enhancedPrompt: `Precision ${cat.toLowerCase().replace(/_/g, ' ')} illustrating: ${original}. Clean vector linework, logical component hierarchy, crisp contrast on a clean neutral background, structured callout spacing, engineering-grade clarity. No garbled overlapping labels, no decorative clutter.`,
      negativeConstraints: ['no unreadable overlapping labels', 'no photographic noise'],
      category: cat,
      aspectRatio: classification.aspectRatio,
      styleDirectives,
    };
  }

  if (
    cat === 'IMAGE_EDIT' ||
    cat === 'IMAGE_VARIATION' ||
    cat === 'STYLE_TRANSFER' ||
    cat === 'BACKGROUND_REMOVAL' ||
    cat === 'UPSCALING_ENHANCEMENT'
  ) {
    const preserveDirective =
      cat === 'BACKGROUND_REMOVAL'
        ? 'Preserve the exact primary subject with clean crisp edges and remove the background cleanly to pure neutral/transparent separation.'
        : cat === 'UPSCALING_ENHANCEMENT'
          ? 'Preserve the exact subject, identity, and composition while enhancing fine texture sharpness, clarity, and dynamic range.'
          : 'Strictly preserve the reference subject identity, facial features, pose, and composition except for the exact requested edit.';

    return {
      originalPrompt: original,
      enhancedPrompt: `${preserveDirective} Requested edit: ${original}. Maintain seamless lighting, shadows, and natural photographic realism.`,
      negativeConstraints: ['no unintended identity drift', 'no altered face unless requested', 'no artifacts'],
      category: cat,
      aspectRatio: classification.aspectRatio,
      styleDirectives: ['Reference fidelity preservation', 'Seamless lighting & edge matching'],
    };
  }

  // Video categories
  if (classification.domain === 'VIDEO') {
    const brandPart = classification.extractedBrandName ? ` for "${classification.extractedBrandName}"` : '';
    const isBrandIntro = cat === 'BRAND_INTRO' || cat === 'MOTION_GRAPHICS';
    const enhancedPrompt = isBrandIntro
      ? `Sleek broadcast-grade animated motion graphics brand intro${brandPart}: ${original}. Smooth 3D metallic/geometric logo reveal, subtle volumetric rim light sweep, clean studio obsidian backdrop, refined kinetic typography settle, crisp 24fps cinematic motion, synchronized modern sound-design feel. Zero flickering text or distorted letters.`
      : `Cinematic ${cat.toLowerCase().replace(/_/g, ' ')} production: ${original}. Smooth deliberate camera movement, coherent lighting and color grading, natural physical motion, crisp focus, filmic depth of field, seamless temporal continuity across every frame.`;

    return {
      originalPrompt: original,
      enhancedPrompt,
      negativeConstraints: ['no temporal flicker', 'no morphing glitches', 'no garbled text'],
      category: cat,
      aspectRatio: classification.aspectRatio,
      styleDirectives: ['Temporal coherence', 'Deliberate camera choreography', 'Consistent lighting & color grade'],
    };
  }

  // Default illustration / photorealistic scene
  return {
    originalPrompt: original,
    enhancedPrompt: `${cat === 'ILLUSTRATION' ? 'Expressive high-craft illustration' : 'High-resolution photorealistic visual'} of: ${original}. Balanced composition, intentional lighting, rich detail, clean framing, zero watermarks or visual artifacts.`,
    negativeConstraints: ['no watermark', 'no visual artifacts', 'no cropped awkward framing'],
    category: cat,
    aspectRatio: classification.aspectRatio,
    styleDirectives: ['Intentional composition', 'High detail clarity'],
  };
}

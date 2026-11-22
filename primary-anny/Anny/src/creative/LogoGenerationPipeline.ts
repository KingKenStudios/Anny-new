/**
 * ANNY — Dedicated Professional Logo Generation Pipeline
 *
 * Solves the root problem where "Create logo for king Ken" previously produced
 * a literal human king sitting on a throne.
 *
 * Pipeline stages:
 *  1. Brand Identity Analysis (brand name, monogram initials, industry/aesthetic,
 *     crown/geometric/soundwave/shield motif selection, palette extraction)
 *  2. Logo Type Selection (combination_mark, monogram, wordmark, emblem, symbol, lettermark)
 *  3. Genuine Vector SVG Kit Synthesis (4 validated, XSS-sanitized XML vector variants:
 *     Primary Dark Lockup, Light Background Lockup, Transparent Icon/Monogram Mark,
 *     Alternate Emblem Badge) — works 100% locally offline with zero paid API dependency!
 *  4. Iterative Conversational Revision support (mutates existing LogoDesignPlan when user says
 *     "Make the logo more minimal", "Change it to gold and black", "Remove the crown", etc.)
 */

import { deriveMonogram, extractBrandName } from './CreativeIntentRouter';
import { bytesToBase64, sanitizeAndValidateSvg, utf8ToBytes, validateImageAsset } from './ImageQualityValidator';
import type {
  ColorSwatch,
  LogoAesthetic,
  LogoAssetBundle,
  LogoDesignPlan,
  LogoType,
  LogoVariant,
} from './types';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function selectColorPalette(prompt: string, aesthetic: LogoAesthetic): ColorSwatch[] {
  const lower = prompt.toLowerCase();

  if (/\b(gold|golden|luxury|royal|king|champagne)\b/.test(lower) && !/\b(emerald|blue|cyan|red|crimson|purple)\b/.test(lower)) {
    return [
      { name: 'Imperial Gold', hex: '#D4AF37', role: 'primary' },
      { name: 'Warm Champagne', hex: '#F3DC8A', role: 'accent' },
      { name: 'Deep Bronze', hex: '#8E6B1E', role: 'secondary' },
      { name: 'Obsidian Matte', hex: '#0B0D14', role: 'background_dark' },
      { name: 'Alabaster Paper', hex: '#F8F7F4', role: 'background_light' },
      { name: 'Ivory Ink', hex: '#F8F9FA', role: 'text_on_dark' },
      { name: 'Charcoal Ink', hex: '#11131A', role: 'text_on_light' },
    ];
  }

  if (/\b(emerald|green|eco|organic|forest)\b/.test(lower)) {
    return [
      { name: 'Emerald Crest', hex: '#10B981', role: 'primary' },
      { name: 'Mint Highlight', hex: '#6EE7B7', role: 'accent' },
      { name: 'Deep Forest', hex: '#065F46', role: 'secondary' },
      { name: 'Night Pine', hex: '#071412', role: 'background_dark' },
      { name: 'Clean Mist', hex: '#F4F9F6', role: 'background_light' },
      { name: 'Snow White', hex: '#F8FAFC', role: 'text_on_dark' },
      { name: 'Deep Slate', hex: '#0F172A', role: 'text_on_light' },
    ];
  }

  if (/\b(red|crimson|ruby|fire|scarlet)\b/.test(lower)) {
    return [
      { name: 'Studio Crimson', hex: '#E11D48', role: 'primary' },
      { name: 'Coral Edge', hex: '#FB7185', role: 'accent' },
      { name: 'Garnet Depth', hex: '#881337', role: 'secondary' },
      { name: 'Carbon Black', hex: '#0C0A0E', role: 'background_dark' },
      { name: 'Pure Ivory', hex: '#FAF8F8', role: 'background_light' },
      { name: 'Pure White', hex: '#FFFFFF', role: 'text_on_dark' },
      { name: 'Obsidian Text', hex: '#111115', role: 'text_on_light' },
    ];
  }

  if (/\b(cyan|electric blue|tech|ai|cyber|cobalt|navy|blue)\b/.test(lower) || aesthetic === 'modern_tech') {
    return [
      { name: 'Electric Cobalt', hex: '#2563EB', role: 'primary' },
      { name: 'Precision Cyan', hex: '#22D3EE', role: 'accent' },
      { name: 'Deep Indigo', hex: '#1E3A8A', role: 'secondary' },
      { name: 'Midnight Carbon', hex: '#070B16', role: 'background_dark' },
      { name: 'Studio White', hex: '#F8FAFC', role: 'background_light' },
      { name: 'Crisp White', hex: '#F8FAFC', role: 'text_on_dark' },
      { name: 'Ink Navy', hex: '#0B1224', role: 'text_on_light' },
    ];
  }

  if (/\b(monochrome|black and white|minimal|minimalist|bw|graphite)\b/.test(lower) || aesthetic === 'minimal') {
    return [
      { name: 'Pure Graphite', hex: '#18181B', role: 'primary' },
      { name: 'Brushed Silver', hex: '#D4D4D8', role: 'accent' },
      { name: 'Warm Zinc', hex: '#71717A', role: 'secondary' },
      { name: 'Matte Black', hex: '#09090B', role: 'background_dark' },
      { name: 'Crisp White', hex: '#FFFFFF', role: 'background_light' },
      { name: 'Pure White', hex: '#FAFAFA', role: 'text_on_dark' },
      { name: 'Deep Black', hex: '#09090B', role: 'text_on_light' },
    ];
  }

  // Default studio luxury/editorial palette
  return [
    { name: 'Sovereign Gold', hex: '#D4AF37', role: 'primary' },
    { name: 'Champagne Foil', hex: '#F0D57A', role: 'accent' },
    { name: 'Burnished Amber', hex: '#9A7420', role: 'secondary' },
    { name: 'Obsidian Slate', hex: '#0B0D14', role: 'background_dark' },
    { name: 'Gallery Ivory', hex: '#F9F8F5', role: 'background_light' },
    { name: 'Crisp Alabaster', hex: '#F8FAFC', role: 'text_on_dark' },
    { name: 'Deep Charcoal', hex: '#12141D', role: 'text_on_light' },
  ];
}

function detectLogoType(prompt: string, previous?: LogoType): LogoType {
  const lower = prompt.toLowerCase();
  if (/\b(wordmark|typographic|text only|logotype)\b/.test(lower)) return 'wordmark';
  if (/\b(monogram|initials|interlocking letters)\b/.test(lower)) return 'monogram';
  if (/\b(lettermark)\b/.test(lower)) return 'lettermark';
  if (/\b(emblem|crest|seal|badge|circular emblem|shield)\b/.test(lower)) return 'emblem';
  if (/\b(mascot)\b/.test(lower)) return 'mascot';
  if (/\b(symbol only|icon only|pictorial mark)\b/.test(lower)) return 'symbol';
  if (previous) return previous;
  return 'combination_mark';
}

function detectAesthetic(prompt: string, previous?: LogoAesthetic): LogoAesthetic {
  const lower = prompt.toLowerCase();
  if (/\b(minimal|minimalist|simpler|clean|flat|swiss|ultra-clean)\b/.test(lower)) return 'minimal';
  if (/\b(luxury|premium|gold|high-end|bespoke|prestigious|elite)\b/.test(lower)) return 'luxury';
  if (/\b(royal|crown|king|sovereign|heritage|dynasty)\b/.test(lower)) return 'royal_heritage';
  if (/\b(music|studio|records|audio|film|media|production|entertainment)\b/.test(lower)) return 'studio_media';
  if (/\b(tech|ai|software|cyber|cloud|robotics|engineering|startup)\b/.test(lower)) return 'modern_tech';
  if (/\b(editorial|fashion|atelier|magazine|boutique)\b/.test(lower)) return 'editorial';
  if (previous) return previous;
  return 'luxury';
}

function detectMotif(prompt: string, brandName: string, aesthetic: LogoAesthetic): LogoDesignPlan['motif'] {
  const lower = `${prompt} ${brandName}`.toLowerCase();
  if (/\b(no crown|remove crown|without crown)\b/.test(lower)) return 'geometric_hex';
  if (/\b(crown|king|queen|royal|imperial|sovereign|monarch)\b/.test(lower)) return 'crown';
  if (/\b(music|audio|sound|records|studio|beats|radio|podcast)\b/.test(lower)) return 'soundwave';
  if (/\b(security|defense|shield|guard|safe|bank|pay|finance|legal)\b/.test(lower)) return 'shield';
  if (/\b(diamond|jewel|luxury|atelier|fashion|gem)\b/.test(lower)) return 'diamond';
  if (/\b(space|orbit|global|ai|tech|cloud|network|robotics|aero)\b/.test(lower)) return 'orbit';
  if (aesthetic === 'minimal') return 'minimal_grid';
  return 'prism';
}

/**
 * Builds or iteratively revises a structured LogoDesignPlan.
 */
export function buildLogoDesignPlan(
  prompt: string,
  extractedBrandName?: string,
  previousPlan?: LogoDesignPlan
): LogoDesignPlan {
  const lower = prompt.toLowerCase();
  const brandName =
    (previousPlan && !extractBrandName(prompt) ? previousPlan.brandName : extractedBrandName || extractBrandName(prompt)) ||
    previousPlan?.brandName ||
    'Brand Studio';

  const monogram = deriveMonogram(brandName);
  const aesthetic = detectAesthetic(prompt, previousPlan?.aesthetic);
  const logoType = detectLogoType(prompt, previousPlan?.logoType);
  const motif = detectMotif(prompt, brandName, aesthetic);
  const removeCrown = /\b(no crown|remove (?:the )?crown|without (?:a )?crown)\b/.test(lower);
  const includeCrown = !removeCrown && (motif === 'crown' || /\bcrown\b/.test(lower));
  const explicitHumanRequested = /\b(portrait logo|face of|human figure|person in logo|character mascot)\b/.test(lower);

  // Determine whether palette changed in revision or should keep/update
  const hasExplicitColorCue = /\b(gold|black|white|emerald|green|red|crimson|blue|cyan|silver|monochrome|minimal)\b/.test(lower);
  const palette = previousPlan && !hasExplicitColorCue ? previousPlan.palette : selectColorPalette(prompt, aesthetic);

  const typography =
    aesthetic === 'modern_tech'
      ? { displayFont: "'Inter', 'Helvetica Neue', Arial, sans-serif", secondaryFont: "'Inter', Arial, sans-serif", letterSpacing: '0.18em', weight: '700' }
      : aesthetic === 'minimal'
        ? { displayFont: "'Helvetica Neue', 'Inter', Arial, sans-serif", secondaryFont: "'Inter', Arial, sans-serif", letterSpacing: '0.24em', weight: '600' }
        : { displayFont: "'Cinzel', 'Didot', 'Georgia', serif", secondaryFont: "'Inter', 'Helvetica Neue', Arial, sans-serif", letterSpacing: '0.22em', weight: '700' };

  const taglineMatch = prompt.match(/\b(?:tagline|subtitle|motto)\s*[:\-]?\s*["']([^"']{2,42})["']/i);
  const defaultTagline = /\bstudios?\b/i.test(brandName)
    ? 'CREATIVE PRODUCTION'
    : /\b(music|records)\b/i.test(prompt)
      ? 'MUSIC & MEDIA'
      : undefined;

  return {
    brandName,
    monogram,
    tagline: taglineMatch?.[1] || previousPlan?.tagline || defaultTagline,
    logoType,
    aesthetic,
    motif,
    includeCrown,
    explicitHumanRequested,
    palette,
    typography,
    compositionNotes: includeCrown
      ? `Symmetrical geometric crown motif integrated above a balanced "${monogram}" monogram with studio-grade "${brandName}" wordmark.`
      : `Precision geometric ${motif.replace(/_/g, ' ')} emblem paired with "${monogram}" monogram and crisp "${brandName}" typography.`,
    avoidList: explicitHumanRequested
      ? ['cluttered photographic background', 'distorted unreadable text']
      : ['human person or portrait', 'king sitting on a throne', 'medieval room scene', 'photorealistic face', '3D mockup distortion'],
    revisionNumber: (previousPlan?.revisionNumber || 0) + 1,
  };
}

function getColor(palette: ColorSwatch[], role: ColorSwatch['role'], fallback: string): string {
  return palette.find((c) => c.role === role)?.hex || fallback;
}

function renderCrownGeometry(cx: number, yTop: number, width: number, primary: string, accent: string, minimal: boolean): string {
  const half = width / 2;
  const h = minimal ? width * 0.36 : width * 0.44;
  const left = cx - half;
  const right = cx + half;
  const baseY = yTop + h;

  if (minimal) {
    // Sleek minimal geometric 3-point crown bar
    return `
      <g id="crown-motif">
        <path d="M ${left + width * 0.08} ${baseY} L ${left} ${yTop + h * 0.25} L ${cx - width * 0.2} ${yTop + h * 0.62} L ${cx} ${yTop} L ${cx + width * 0.2} ${yTop + h * 0.62} L ${right} ${yTop + h * 0.25} L ${right - width * 0.08} ${baseY} Z"
              fill="url(#brand-grad)" stroke="${accent}" stroke-width="2" stroke-linejoin="miter" />
        <rect x="${left + width * 0.1}" y="${baseY + 7}" width="${width * 0.8}" height="5" rx="2.5" fill="${primary}" />
      </g>`;
  }

  // Luxury faceted geometric 5-point royal crown emblem
  return `
    <g id="crown-motif">
      <polygon points="${left + width * 0.08},${baseY} ${left},${yTop + h * 0.22} ${cx - width * 0.22},${yTop + h * 0.62} ${cx},${yTop} ${cx + width * 0.22},${yTop + h * 0.62} ${right},${yTop + h * 0.22} ${right - width * 0.08},${baseY}"
               fill="url(#brand-grad)" stroke="${accent}" stroke-width="2.5" stroke-linejoin="round" />
      <polygon points="${cx},${yTop + 8} ${cx + width * 0.12},${yTop + h * 0.68} ${cx},${baseY - 4} ${cx - width * 0.12},${yTop + h * 0.68}"
               fill="${accent}" opacity="0.35" />
      <circle cx="${cx}" cy="${yTop - 8}" r="5.5" fill="${accent}" />
      <circle cx="${left}" cy="${yTop + h * 0.14}" r="4.2" fill="${primary}" />
      <circle cx="${right}" cy="${yTop + h * 0.14}" r="4.2" fill="${primary}" />
      <rect x="${left + width * 0.08}" y="${baseY + 8}" width="${width * 0.84}" height="7" rx="3.5" fill="url(#brand-grad)" />
    </g>`;
}

function renderAbstractMotif(plan: LogoDesignPlan, cx: number, cy: number, size: number, primary: string, accent: string): string {
  const half = size / 2;
  if (plan.motif === 'soundwave') {
    const bars = [-48, -28, -8, 12, 32, 52];
    const heights = [26, 54, 78, 62, 44, 24];
    return `<g id="soundwave-motif">${bars
      .map(
        (dx, idx) =>
          `<rect x="${cx + dx - 5}" y="${cy - heights[idx] / 2}" width="10" height="${heights[idx]}" rx="5" fill="${idx % 2 === 0 ? 'url(#brand-grad)' : accent}" />`
      )
      .join('')}</g>`;
  }
  if (plan.motif === 'shield') {
    return `<g id="shield-motif">
      <path d="M ${cx} ${cy - half} L ${cx + half * 0.86} ${cy - half * 0.62} L ${cx + half * 0.78} ${cy + half * 0.18} Q ${cx + half * 0.45} ${cy + half * 0.78} ${cx} ${cy + half} Q ${cx - half * 0.45} ${cy + half * 0.78} ${cx - half * 0.78} ${cy + half * 0.18} L ${cx - half * 0.86} ${cy - half * 0.62} Z"
            fill="none" stroke="url(#brand-grad)" stroke-width="8" stroke-linejoin="round" />
      <path d="M ${cx} ${cy - half * 0.76} L ${cx + half * 0.64} ${cy - half * 0.46} L ${cx + half * 0.58} ${cy + half * 0.14} Q ${cx + half * 0.32} ${cy + half * 0.58} ${cx} ${cy + half * 0.76} Q ${cx - half * 0.32} ${cy + half * 0.58} ${cx - half * 0.58} ${cy + half * 0.14} L ${cx - half * 0.64} ${cy - half * 0.46} Z"
            fill="url(#brand-grad)" opacity="0.14" />
    </g>`;
  }
  if (plan.motif === 'orbit') {
    return `<g id="orbit-motif">
      <circle cx="${cx}" cy="${cy}" r="${half * 0.82}" fill="none" stroke="url(#brand-grad)" stroke-width="5" />
      <ellipse cx="${cx}" cy="${cy}" rx="${half * 0.96}" ry="${half * 0.38}" transform="rotate(-28 ${cx} ${cy})" fill="none" stroke="${accent}" stroke-width="3.5" opacity="0.85" />
      <circle cx="${cx + half * 0.78}" cy="${cy - half * 0.42}" r="7" fill="${accent}" />
    </g>`;
  }
  // Geometric diamond / hexagon luxury crest frame
  return `<g id="geometric-frame">
    <polygon points="${cx},${cy - half} ${cx + half * 0.88},${cy - half * 0.48} ${cx + half * 0.88},${cy + half * 0.48} ${cx},${cy + half} ${cx - half * 0.88},${cy + half * 0.48} ${cx - half * 0.88},${cy - half * 0.48}"
             fill="none" stroke="url(#brand-grad)" stroke-width="6.5" stroke-linejoin="miter" />
    <polygon points="${cx},${cy - half * 0.84} ${cx + half * 0.74},${cy - half * 0.4} ${cx + half * 0.74},${cy + half * 0.4} ${cx},${cy + half * 0.84} ${cx - half * 0.74},${cy + half * 0.4} ${cx - half * 0.74},${cy - half * 0.4}"
             fill="none" stroke="${primary}" stroke-width="1.8" opacity="0.45" />
  </g>`;
}

function renderMonogramLockupSvg(
  plan: LogoDesignPlan,
  mode: LogoVariant['variantType']
): string {
  const primary = getColor(plan.palette, 'primary', '#D4AF37');
  const accent = getColor(plan.palette, 'accent', '#F0D57A');
  const secondary = getColor(plan.palette, 'secondary', '#8E6B1E');
  const darkBg = getColor(plan.palette, 'background_dark', '#0B0D14');
  const lightBg = getColor(plan.palette, 'background_light', '#F8F7F4');
  const textOnDark = getColor(plan.palette, 'text_on_dark', '#F8F9FA');
  const textOnLight = getColor(plan.palette, 'text_on_light', '#11131A');

  const isMinimal = plan.aesthetic === 'minimal';
  const isLight = mode === 'light_background';
  const isTransparentIcon = mode === 'icon_transparent';
  const isBadge = mode === 'monogram_badge';

  const bgFill = isTransparentIcon ? 'none' : isLight ? lightBg : darkBg;
  const fgText = isLight ? textOnLight : textOnDark;
  const strokePrimary = isLight && primary.toLowerCase() === '#d4d4d8' ? '#18181B' : primary;
  const gradStop1 = isLight && isMinimal ? '#18181B' : accent;
  const gradStop2 = isLight && isMinimal ? '#3F3F46' : strokePrimary;
  const gradStop3 = isLight && isMinimal ? '#09090B' : secondary;

  const safeBrand = escapeXml(plan.brandName.toUpperCase());
  const safeMonogram = escapeXml(plan.monogram.toUpperCase());
  const safeTagline = plan.tagline ? escapeXml(plan.tagline.toUpperCase()) : '';
  const brandFontSize = safeBrand.length > 18 ? 34 : safeBrand.length > 12 ? 44 : 54;

  const defs = `
    <defs>
      <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${gradStop1}" />
        <stop offset="52%" stop-color="${gradStop2}" />
        <stop offset="100%" stop-color="${gradStop3}" />
      </linearGradient>
      <linearGradient id="bg-vignette" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${isLight ? '#FFFFFF' : '#141827'}" />
        <stop offset="100%" stop-color="${bgFill === 'none' ? '#0B0D14' : bgFill}" />
      </linearGradient>
    </defs>`;

  // Variant 3: Pure Transparent Icon / Monogram Mark (1:1 scalable app icon / favicon)
  if (isTransparentIcon) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="${safeBrand} Icon Mark">
      ${defs}
      <g id="icon-mark">
        <rect x="36" y="36" width="440" height="440" rx="${isMinimal ? '64' : '96'}" fill="${darkBg}" stroke="url(#brand-grad)" stroke-width="10" />
        ${plan.includeCrown ? renderCrownGeometry(256, 104, 152, strokePrimary, accent, isMinimal) : renderAbstractMotif(plan, 256, 256, 300, strokePrimary, accent)}
        <text x="256" y="${plan.includeCrown ? 336 : 292}" text-anchor="middle" fill="url(#brand-grad)" font-family="${escapeXml(plan.typography.displayFont)}" font-size="148" font-weight="800" letter-spacing="0.06em">${safeMonogram}</text>
        <line x1="156" y1="378" x2="356" y2="378" stroke="url(#brand-grad)" stroke-width="4" stroke-linecap="round" opacity="0.8" />
      </g>
    </svg>`;
  }

  // Variant 4: Circular Emblem / Seal Badge
  if (isBadge) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="${safeBrand} Emblem Badge">
      ${defs}
      <rect width="800" height="800" fill="url(#bg-vignette)" />
      <g id="emblem-seal">
        <circle cx="400" cy="400" r="300" fill="none" stroke="url(#brand-grad)" stroke-width="9" />
        <circle cx="400" cy="400" r="276" fill="none" stroke="${strokePrimary}" stroke-width="2" opacity="0.55" />
        ${plan.includeCrown ? renderCrownGeometry(400, 178, 172, strokePrimary, accent, isMinimal) : ''}
        <text x="400" y="${plan.includeCrown ? 430 : 412}" text-anchor="middle" fill="url(#brand-grad)" font-family="${escapeXml(plan.typography.displayFont)}" font-size="172" font-weight="800" letter-spacing="0.08em">${safeMonogram}</text>
        <line x1="230" y1="480" x2="570" y2="480" stroke="url(#brand-grad)" stroke-width="3" opacity="0.75" />
        <text x="400" y="544" text-anchor="middle" fill="${fgText}" font-family="${escapeXml(plan.typography.displayFont)}" font-size="${Math.min(brandFontSize, 40)}" font-weight="700" letter-spacing="${plan.typography.letterSpacing}">${safeBrand}</text>
        ${safeTagline ? `<text x="400" y="588" text-anchor="middle" fill="${strokePrimary}" font-family="${escapeXml(plan.typography.secondaryFont)}" font-size="18" font-weight="600" letter-spacing="0.34em" opacity="0.9">${safeTagline}</text>` : ''}
      </g>
    </svg>`;
  }

  // Variant 1 (Primary Dark) & Variant 2 (Light Background)
  const isWordmarkOnly = plan.logoType === 'wordmark';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" role="img" aria-label="${safeBrand} Brand Logo">
    ${defs}
    <rect width="1024" height="1024" fill="${isLight ? lightBg : 'url(#bg-vignette)'}" />
    ${
      isWordmarkOnly
        ? `<g id="wordmark-lockup">
            ${plan.includeCrown ? renderCrownGeometry(512, 326, 148, strokePrimary, accent, isMinimal) : `<line x1="362" y1="418" x2="662" y2="418" stroke="url(#brand-grad)" stroke-width="4" />`}
            <text x="512" y="538" text-anchor="middle" fill="${fgText}" font-family="${escapeXml(plan.typography.displayFont)}" font-size="${brandFontSize + 20}" font-weight="800" letter-spacing="${plan.typography.letterSpacing}">${safeBrand}</text>
            <line x1="332" y1="590" x2="692" y2="590" stroke="url(#brand-grad)" stroke-width="4" stroke-linecap="round" />
            ${safeTagline ? `<text x="512" y="646" text-anchor="middle" fill="${strokePrimary}" font-family="${escapeXml(plan.typography.secondaryFont)}" font-size="22" font-weight="600" letter-spacing="0.38em">${safeTagline}</text>` : ''}
          </g>`
        : `<g id="brand-lockup">
            ${
              plan.includeCrown
                ? `
                  ${isMinimal ? '' : `<polygon points="512,174 714,290 714,522 512,638 310,522 310,290" fill="none" stroke="url(#brand-grad)" stroke-width="7" stroke-linejoin="miter" />`}
                  ${isMinimal ? `<rect x="332" y="210" width="360" height="360" rx="44" fill="none" stroke="url(#brand-grad)" stroke-width="6" />` : `<polygon points="512,196 694,300 694,512 512,616 330,512 330,300" fill="none" stroke="${strokePrimary}" stroke-width="2" opacity="0.4" />`}
                  ${renderCrownGeometry(512, isMinimal ? 256 : 244, isMinimal ? 148 : 176, strokePrimary, accent, isMinimal)}
                  <text x="512" y="${isMinimal ? 496 : 514}" text-anchor="middle" fill="url(#brand-grad)" font-family="${escapeXml(plan.typography.displayFont)}" font-size="${isMinimal ? 156 : 168}" font-weight="800" letter-spacing="0.06em">${safeMonogram}</text>
                `
                : `
                  ${renderAbstractMotif(plan, 512, 396, 360, strokePrimary, accent)}
                  ${plan.motif === 'soundwave' ? '' : `<text x="512" y="454" text-anchor="middle" fill="url(#brand-grad)" font-family="${escapeXml(plan.typography.displayFont)}" font-size="164" font-weight="800" letter-spacing="0.06em">${safeMonogram}</text>`}
                `
            }
            <line x1="272" y1="696" x2="752" y2="696" stroke="url(#brand-grad)" stroke-width="3" opacity="0.65" />
            <text x="512" y="778" text-anchor="middle" fill="${fgText}" font-family="${escapeXml(plan.typography.displayFont)}" font-size="${brandFontSize}" font-weight="700" letter-spacing="${plan.typography.letterSpacing}">${safeBrand}</text>
            ${
              safeTagline
                ? `<text x="512" y="834" text-anchor="middle" fill="${strokePrimary}" font-family="${escapeXml(plan.typography.secondaryFont)}" font-size="22" font-weight="600" letter-spacing="0.36em" opacity="0.92">${safeTagline}</text>`
                : `<text x="512" y="832" text-anchor="middle" fill="${strokePrimary}" font-family="${escapeXml(plan.typography.secondaryFont)}" font-size="18" font-weight="600" letter-spacing="0.42em" opacity="0.72">EST. BRAND IDENTITY</text>`
            }
          </g>`
    }
  </svg>`;
}

/**
 * Generates a complete, validated, XSS-sanitized SVG Brand Logo Kit locally (offline-capable).
 */
export function generateVectorLogoBundle(
  prompt: string,
  extractedBrandName?: string,
  previousPlan?: LogoDesignPlan
): LogoAssetBundle {
  const plan = buildLogoDesignPlan(prompt, extractedBrandName, previousPlan);

  const variantSpecs: Array<{
    id: string;
    label: string;
    variantType: LogoVariant['variantType'];
  }> = [
    { id: 'primary-dark', label: 'Primary Lockup (Dark)', variantType: 'primary_dark' },
    { id: 'light-bg', label: 'Light Background Variant', variantType: 'light_background' },
    { id: 'icon-mark', label: 'Icon / Monogram Mark', variantType: 'icon_transparent' },
    { id: 'emblem-badge', label: 'Alternate Emblem Seal', variantType: 'monogram_badge' },
  ];

  const variants: LogoVariant[] = variantSpecs.map((spec) => {
    const rawSvg = renderMonogramLockupSvg(plan, spec.variantType);
    const sanitized = sanitizeAndValidateSvg(rawSvg);
    if (!sanitized.valid) {
      throw new Error(`LOGO_SVG_VALIDATION_FAILED (${spec.id}): ${sanitized.errors.join('; ')}`);
    }
    const bytes = utf8ToBytes(sanitized.sanitizedSvg);
    const quality = validateImageAsset({ bytes, declaredMimeType: 'image/svg+xml' });
    if (!quality.valid) {
      throw new Error(`LOGO_QUALITY_VALIDATION_FAILED (${spec.id}): ${quality.errors.join('; ')}`);
    }
    const base64 = bytesToBase64(bytes);
    return {
      id: `${spec.id}-r${plan.revisionNumber}`,
      label: spec.label,
      variantType: spec.variantType,
      format: 'svg',
      mimeType: 'image/svg+xml',
      svgMarkup: sanitized.sanitizedSvg,
      dataUrl: `data:image/svg+xml;base64,${base64}`,
      width: quality.width,
      height: quality.height,
      sha256: quality.sha256,
    };
  });

  return {
    plan,
    variants,
  };
}

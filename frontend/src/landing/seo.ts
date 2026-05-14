/**
 * Landing page SEO source of truth.
 *
 * Every meta tag, OG / Twitter Card value, and JSON-LD field
 * referenced by the landing route is exported from here. Tweaking
 * SEO is a single-file diff.
 *
 * Resolution rules:
 * - Public URL comes from `VITE_PUBLIC_URL` (set at build time);
 *   falls back to `window.location.origin` at runtime so previews
 *   and local dev still work.
 * - OG image path is relative; resolved against the public URL.
 */

export const LANDING_SEO_TITLE = "AI Blog Generator — Ship drafts that don't read like AI";
export const LANDING_SEO_DESCRIPTION =
  'Generate SEO-ready, authentic-sounding blog drafts in minutes. Built-in AI authenticity check with rule-level evidence and surgical fixes.';

export const LANDING_OG_IMAGE_PATH = '/og-image.png';
export const LANDING_OG_IMAGE_WIDTH = 1200;
export const LANDING_OG_IMAGE_HEIGHT = 630;
export const LANDING_OG_IMAGE_ALT =
  'AI Blog Generator workspace with authenticity score and SEO panel';

export const LANDING_OG_LOCALE = 'en_US';

/**
 * Resolves the canonical public URL at runtime.
 * Build-time `VITE_PUBLIC_URL` wins (set in CI for prod / staging);
 * runtime `window.location.origin` is the dev/preview fallback.
 */
export function getPublicUrl(): string {
  const envUrl = import.meta.env['VITE_PUBLIC_URL'] as string | undefined;
  if (envUrl && envUrl !== '') {
    return envUrl.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

/**
 * JSON-LD `SoftwareApplication` payload for landing.
 * Validates against Google's Rich Results Test (PRD US-7).
 * Pricing offers mirror the dummy tiers from `content.ts` § pricing.
 */
export function landingJsonLd(): Record<string, unknown> {
  const base = getPublicUrl();
  const url = base || '/';

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AI Blog Generator',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any (Web)',
    url,
    description: LANDING_SEO_DESCRIPTION,
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '19',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Team',
        price: '49',
        priceCurrency: 'USD',
        availability: 'https://schema.org/PreOrder',
      },
    ],
  };
}

/**
 * JSON-LD `Organization` payload — publisher identity for the landing page.
 * Rendered as a second `ld+json` block alongside `landingJsonLd()` so search
 * engines can tie the `SoftwareApplication` to a named publisher.
 */
export function organizationJsonLd(): Record<string, unknown> {
  const base = getPublicUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AI Blog Generator',
    url: base || '/',
    logo: `${base}/icon-512.png`,
    description: LANDING_SEO_DESCRIPTION,
  };
}

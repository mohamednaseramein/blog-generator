import { Helmet } from 'react-helmet-async';
import {
  LANDING_OG_IMAGE_ALT,
  LANDING_OG_IMAGE_HEIGHT,
  LANDING_OG_IMAGE_PATH,
  LANDING_OG_IMAGE_WIDTH,
  LANDING_SEO_DESCRIPTION,
  LANDING_SEO_TITLE,
  getPublicUrl,
  landingJsonLd,
} from './seo';

/**
 * `<head>` for the landing page. Per AgDR-0034, every public-route head
 * is rendered through `react-helmet-async`; the Group G prerender script
 * captures the post-render `<head>` as-is.
 */
export function LandingHead() {
  const publicUrl = getPublicUrl();
  const ogImageUrl = `${publicUrl}${LANDING_OG_IMAGE_PATH}`;
  const canonicalUrl = publicUrl || '/';

  return (
    <Helmet>
      <title>{LANDING_SEO_TITLE}</title>
      <meta name="description" content={LANDING_SEO_DESCRIPTION} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={LANDING_SEO_TITLE} />
      <meta property="og:description" content={LANDING_SEO_DESCRIPTION} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content={String(LANDING_OG_IMAGE_WIDTH)} />
      <meta property="og:image:height" content={String(LANDING_OG_IMAGE_HEIGHT)} />
      <meta property="og:image:alt" content={LANDING_OG_IMAGE_ALT} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={LANDING_SEO_TITLE} />
      <meta name="twitter:description" content={LANDING_SEO_DESCRIPTION} />
      <meta name="twitter:image" content={ogImageUrl} />
      <meta name="twitter:image:alt" content={LANDING_OG_IMAGE_ALT} />

      <script type="application/ld+json">{JSON.stringify(landingJsonLd())}</script>
    </Helmet>
  );
}

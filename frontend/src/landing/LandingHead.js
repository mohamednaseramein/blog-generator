import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Helmet } from 'react-helmet-async';
import { LANDING_OG_IMAGE_ALT, LANDING_OG_IMAGE_HEIGHT, LANDING_OG_IMAGE_PATH, LANDING_OG_IMAGE_WIDTH, LANDING_SEO_DESCRIPTION, LANDING_SEO_TITLE, getPublicUrl, landingJsonLd, } from './seo';
/**
 * `<head>` for the landing page. Per AgDR-0034, every public-route head
 * is rendered through `react-helmet-async`; the Group G prerender script
 * captures the post-render `<head>` as-is.
 */
export function LandingHead() {
    const publicUrl = getPublicUrl();
    const ogImageUrl = `${publicUrl}${LANDING_OG_IMAGE_PATH}`;
    const canonicalUrl = publicUrl || '/';
    return (_jsxs(Helmet, { children: [_jsx("title", { children: LANDING_SEO_TITLE }), _jsx("meta", { name: "description", content: LANDING_SEO_DESCRIPTION }), _jsx("link", { rel: "canonical", href: canonicalUrl }), _jsx("meta", { property: "og:type", content: "website" }), _jsx("meta", { property: "og:title", content: LANDING_SEO_TITLE }), _jsx("meta", { property: "og:description", content: LANDING_SEO_DESCRIPTION }), _jsx("meta", { property: "og:url", content: canonicalUrl }), _jsx("meta", { property: "og:image", content: ogImageUrl }), _jsx("meta", { property: "og:image:width", content: String(LANDING_OG_IMAGE_WIDTH) }), _jsx("meta", { property: "og:image:height", content: String(LANDING_OG_IMAGE_HEIGHT) }), _jsx("meta", { property: "og:image:alt", content: LANDING_OG_IMAGE_ALT }), _jsx("meta", { name: "twitter:card", content: "summary_large_image" }), _jsx("meta", { name: "twitter:title", content: LANDING_SEO_TITLE }), _jsx("meta", { name: "twitter:description", content: LANDING_SEO_DESCRIPTION }), _jsx("meta", { name: "twitter:image", content: ogImageUrl }), _jsx("meta", { name: "twitter:image:alt", content: LANDING_OG_IMAGE_ALT }), _jsx("script", { type: "application/ld+json", children: JSON.stringify(landingJsonLd()) })] }));
}

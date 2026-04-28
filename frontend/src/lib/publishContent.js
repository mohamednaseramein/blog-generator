/// <reference types="vite/client" />
import { marked } from 'marked';
import DOMPurify from 'dompurify';
marked.setOptions({ gfm: true, breaks: true });
export function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
/** Turn markdown into safe HTML for preview and copy. */
export function markdownToSafeHtml(markdown) {
    const raw = marked.parse(markdown, { async: false });
    return DOMPurify.sanitize(String(raw), { USE_PROFILES: { html: true } });
}
const DEFAULT_BASE_URL = 'https://blog-generator.mnaser.me';
/** HTML `<head>` snippet with SEO meta tags. Paste into your CMS head section. */
export function buildSeoMetaSnippet(opts) {
    const baseUrl = import.meta.env['VITE_BASE_URL']?.replace(/\/$/, '') || DEFAULT_BASE_URL;
    const displayTitle = opts.seoTitle?.trim() || opts.title.trim();
    const canonicalSlug = opts.suggestedSlug?.trim() ?? '';
    const lines = [
        `<!-- SEO meta tags. Paste into your CMS <head> section -->`,
        `<title>${escapeHtml(displayTitle)}</title>`,
    ];
    if (opts.metaDescription?.trim()) {
        lines.push(`<meta name=”description” content=”${escapeHtml(opts.metaDescription.trim())}”>`);
    }
    if (opts.primaryKeyword.trim()) {
        lines.push(`<meta name=”keywords” content=”${escapeHtml(opts.primaryKeyword.trim())}”>`);
    }
    if (canonicalSlug) {
        lines.push(`<link rel=”canonical” href=”${baseUrl}/${canonicalSlug}”>`);
    }
    lines.push(`<meta property=”og:type” content=”article”>`);
    if (displayTitle) {
        lines.push(`<meta property=”og:title” content=”${escapeHtml(displayTitle)}”>`);
    }
    if (opts.metaDescription?.trim()) {
        lines.push(`<meta property=”og:description” content=”${escapeHtml(opts.metaDescription.trim())}”>`);
    }
    return lines.join('\n');
}
/** Full article as an HTML string (for pasting into CMS “HTML” modes). */
export function buildFullDocumentHtml(opts) {
    const blocks = [];
    if (opts.title.trim()) {
        blocks.push(`<h1>${escapeHtml(opts.title.trim())}</h1>`);
    }
    if (opts.suggestedSlug?.trim() || opts.metaDescription?.trim()) {
        const inner = [];
        if (opts.suggestedSlug?.trim()) {
            inner.push(`<p><strong>Slug:</strong> ${escapeHtml(opts.suggestedSlug.trim())}</p>`);
        }
        if (opts.metaDescription?.trim()) {
            inner.push(`<p><strong>Meta:</strong> ${escapeHtml(opts.metaDescription.trim())}</p>`);
        }
        blocks.push(`<div class="doc-meta">${inner.join('')}</div>`);
    }
    blocks.push(`<div class="doc-body">${markdownToSafeHtml(opts.bodyMarkdown)}</div>`);
    return `<article>\n${blocks.join('\n')}\n</article>`;
}

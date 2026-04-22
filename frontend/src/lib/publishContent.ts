import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Turn markdown into safe HTML for preview and copy. */
export function markdownToSafeHtml(markdown: string): string {
  const raw = marked.parse(markdown, { async: false });
  return DOMPurify.sanitize(String(raw), { USE_PROFILES: { html: true } });
}

export interface FullDocumentHtmlOptions {
  title: string;
  suggestedSlug: string | null;
  metaDescription: string | null;
  bodyMarkdown: string;
  disclosure: boolean;
  disclosureText: string;
}

/** Full article as an HTML string (for pasting into CMS “HTML” modes). */
export function buildFullDocumentHtml(opts: FullDocumentHtmlOptions): string {
  const blocks: string[] = [];
  if (opts.title.trim()) {
    blocks.push(`<h1>${escapeHtml(opts.title.trim())}</h1>`);
  }
  if (opts.suggestedSlug?.trim() || opts.metaDescription?.trim()) {
    const inner: string[] = [];
    if (opts.suggestedSlug?.trim()) {
      inner.push(`<p><strong>Slug:</strong> ${escapeHtml(opts.suggestedSlug.trim())}</p>`);
    }
    if (opts.metaDescription?.trim()) {
      inner.push(`<p><strong>Meta:</strong> ${escapeHtml(opts.metaDescription.trim())}</p>`);
    }
    blocks.push(`<div class="doc-meta">${inner.join('')}</div>`);
  }
  blocks.push(`<div class="doc-body">${markdownToSafeHtml(opts.bodyMarkdown)}</div>`);
  if (opts.disclosure) {
    blocks.push(`<hr><p><em>${escapeHtml(opts.disclosureText)}</em></p>`);
  }
  return `<article>\n${blocks.join('\n')}\n</article>`;
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, Copy, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { getDraft, getBrief, recordExportEvent, completeBlog } from '../api/blog-api.js';
import { buildFullDocumentHtml, buildSeoMetaSnippet, markdownToSafeHtml } from '../lib/publishContent.js';
import { Button } from './ui/button.js';
import { Toast } from './ui/toast.js';
function useCopyFeedback() {
    const [status, setStatus] = useState({});
    async function copy(key, text, blogId, section) {
        try {
            await navigator.clipboard.writeText(text);
            setStatus((s) => ({ ...s, [key]: 'success' }));
            void recordExportEvent(blogId, section);
        }
        catch {
            setStatus((s) => ({ ...s, [key]: 'error' }));
        }
        setTimeout(() => setStatus((s) => ({ ...s, [key]: 'idle' })), 2500);
    }
    return { status, copy };
}
function CopyButton({ label: idleLabel, onCopy, statusKey, copyStatus, }) {
    const state = copyStatus[statusKey] ?? 'idle';
    const text = state === 'success' ? 'Copied' : state === 'error' ? 'Copy failed' : idleLabel;
    const icon = state === 'success' ? (_jsx(Check, { className: "h-3.5 w-3.5 shrink-0 stroke-[2.5]", "aria-hidden": true })) : state === 'error' ? (_jsx(XCircle, { className: "h-3.5 w-3.5 shrink-0", "aria-hidden": true })) : (_jsx(Copy, { className: "h-3.5 w-3.5 shrink-0", "aria-hidden": true }));
    return (_jsxs(Button, { type: "button", variant: "ghost", size: "sm", onClick: onCopy, "aria-label": idleLabel, className: clsx('gap-1.5 font-medium', state === 'success' &&
            'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-emerald-500/40', state === 'error' &&
            'text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-500/40'), children: [icon, _jsx("span", { "aria-live": "polite", children: text })] }));
}
const htmlPreviewProse = [
    'min-h-0',
    'max-h-[min(65vh,32rem)]',
    'sm:max-h-[min(70vh,36rem)]',
    'overflow-y-auto',
    'rounded-xl',
    'border border-slate-200',
    'bg-white',
    'px-4',
    'py-4',
    'text-sm',
    'text-slate-800',
    '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mb-3',
    '[&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900',
    '[&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-medium',
    '[&_p]:mb-3 [&_p]:leading-relaxed',
    '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
    '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
    '[&_li]:my-0.5',
    '[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em]',
    '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-3',
    '[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:text-slate-600',
    '[&_a]:text-indigo-600 [&_a]:underline',
    '[&_hr]:my-4 [&_hr]:border-slate-200',
].join(' ');
function DisclosureHeader({ id, open, onToggle, children, }) {
    return (_jsxs("button", { type: "button", id: `${id}-header`, className: "flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-800 hover:bg-slate-50", onClick: onToggle, "aria-expanded": open, "aria-controls": `${id}-panel`, children: [children, _jsx("span", { className: "shrink-0 text-slate-400", "aria-hidden": true, children: open ? '▲' : '▼' })] }));
}
function charCountClass(len, min, max) {
    if (len >= min && len <= max)
        return 'text-emerald-600';
    if (len >= min - 20 && len <= max + 20)
        return 'text-amber-500';
    return 'text-red-500';
}
function seoTitleCountClass(len) {
    if (len === 0)
        return 'text-slate-400';
    if (len <= 60)
        return 'text-emerald-600';
    return 'text-red-500';
}
export function PublishStep({ blogId, onBack, onFinish }) {
    const [markdown, setMarkdown] = useState(null);
    const [title, setTitle] = useState('');
    const [primaryKeyword, setPrimaryKeyword] = useState('');
    const [metaDescription, setMetaDescription] = useState(null);
    const [suggestedSlug, setSuggestedSlug] = useState(null);
    const [seoTitle, setSeoTitle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fieldsOpen, setFieldsOpen] = useState(false);
    const [seoOpen, setSeoOpen] = useState(false);
    const [viewMode, setViewMode] = useState('preview');
    const { status: copyStatus, copy } = useCopyFeedback();
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const draftRes = await getDraft(blogId);
            if (!draftRes.draft.draftConfirmed) {
                setError('Draft is not confirmed - go back to Step 4 and confirm the draft first.');
                return;
            }
            setMarkdown(draftRes.draft.markdown);
            setMetaDescription(draftRes.draft.metaDescription);
            setSuggestedSlug(draftRes.draft.suggestedSlug);
            setSeoTitle(draftRes.draft.seoTitle);
            try {
                const briefRes = await getBrief(blogId);
                setTitle(briefRes.title);
                setPrimaryKeyword(briefRes.primaryKeyword ?? '');
            }
            catch {
                setTitle('');
            }
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setLoading(false);
        }
    }, [blogId]);
    useEffect(() => { void load(); }, [load]);
    const bodyForExport = useMemo(() => markdown ?? '', [markdown]);
    const bodyHtml = useMemo(() => markdownToSafeHtml(bodyForExport), [bodyForExport]);
    function buildFullBlockMarkdown() {
        const lines = [];
        if (title)
            lines.push(`# ${title}\n`);
        if (suggestedSlug)
            lines.push(`slug: ${suggestedSlug}`);
        if (metaDescription)
            lines.push(`meta: ${metaDescription}`);
        if (lines.length > 1)
            lines.push('');
        if (markdown)
            lines.push(markdown);
        return lines.join('\n');
    }
    function buildFullBlockHtml() {
        return buildFullDocumentHtml({
            title,
            suggestedSlug,
            metaDescription,
            seoTitle,
            primaryKeyword,
            bodyMarkdown: markdown ?? '',
        });
    }
    function buildSeoSnippet() {
        return buildSeoMetaSnippet({ seoTitle, metaDescription, suggestedSlug, primaryKeyword, title });
    }
    return (_jsxs("div", { className: "flex min-h-0 flex-col gap-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-800", children: "Step 5: Publish" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Review your post, then use Export to copy Markdown or HTML for your CMS. Copied full posts include the title, optional slug and meta, and body, matching the preview." })] }), loading && (_jsxs("div", { className: "flex flex-col items-center gap-3 py-10 text-slate-500", children: [_jsx("span", { className: "inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" }), _jsx("p", { className: "text-sm", children: "Loading your draft\u2026" })] })), error && _jsx(Toast, { variant: "error", children: error }), markdown && !loading && (_jsxs("div", { className: "flex min-h-0 w-full flex-col gap-6", children: [_jsxs("div", { className: "min-w-0 flex w-full flex-col gap-3", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsx("h3", { className: "text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Post preview" }), _jsxs("div", { className: "inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5", role: "group", "aria-label": "Preview format", children: [_jsx("button", { type: "button", onClick: () => setViewMode('preview'), className: `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'preview'
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-600 hover:text-slate-900'}`, children: "Preview" }), _jsx("button", { type: "button", onClick: () => setViewMode('markdown'), className: `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'markdown'
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-600 hover:text-slate-900'}`, children: "Markdown" })] })] }), viewMode === 'preview' && (_jsxs("div", { className: htmlPreviewProse, children: [title ? (_jsx("h1", { className: "text-2xl font-bold text-slate-900 mb-2", children: title })) : null, (suggestedSlug || metaDescription) ? (_jsxs("div", { className: "mb-4 space-y-0.5 border-b border-slate-100 pb-3 text-xs text-slate-500", children: [suggestedSlug ? _jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Slug:" }), " ", suggestedSlug] }) : null, metaDescription ? _jsxs("p", { children: [_jsx("span", { className: "font-medium", children: "Meta:" }), " ", metaDescription] }) : null] })) : null, _jsx("div", { className: "publish-preview-body", 
                                        // eslint-disable-next-line react/no-danger -- sanitized via DOMPurify in markdownToSafeHtml
                                        dangerouslySetInnerHTML: { __html: bodyHtml } })] })), viewMode === 'markdown' && (_jsx("pre", { className: "max-h-[min(65vh,32rem)] min-h-0 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-sans text-sm text-slate-800 sm:max-h-[min(70vh,36rem)]", children: buildFullBlockMarkdown() }))] }), _jsx("div", { className: "min-w-0 w-full", children: _jsxs("div", { className: "flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-1 shadow-sm", children: [_jsxs("div", { className: "px-3 pt-3", children: [_jsx("h3", { className: "text-sm font-semibold text-slate-800", children: "Export" }), _jsx("p", { className: "mt-0.5 text-xs text-slate-500", children: "Full document or specific fields, as Markdown or HTML." })] }), _jsxs("div", { className: "flex flex-col gap-2 border-t border-slate-100 px-3 py-3", children: [_jsx("p", { className: "text-xs font-medium text-slate-600", children: "Full post" }), _jsx("p", { className: "text-xs text-slate-500", children: "Title, optional slug and meta, and body in one paste." }), _jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2", children: [_jsx(CopyButton, { label: "Copy all (Markdown)", statusKey: "all", copyStatus: copyStatus, onCopy: () => void copy('all', buildFullBlockMarkdown(), blogId, 'all') }), _jsx(CopyButton, { label: "Copy all (HTML)", statusKey: "all_html", copyStatus: copyStatus, onCopy: () => void copy('all_html', buildFullBlockHtml(), blogId, 'all_html') })] })] }), _jsxs("div", { className: "border-t border-slate-100", children: [_jsx(DisclosureHeader, { id: "publish-fields", open: fieldsOpen, onToggle: () => setFieldsOpen((o) => !o), children: _jsx("span", { children: "Individual fields" }) }), fieldsOpen && (_jsxs("div", { id: "publish-fields-panel", className: "flex flex-col gap-2 border-t border-slate-100 px-3 py-2 pb-3", role: "region", "aria-labelledby": "publish-fields-header", children: [title && (_jsxs("div", { className: "flex items-center justify-between gap-2 py-1", children: [_jsx("span", { className: "min-w-0 max-w-[55%] truncate text-sm text-slate-700", title: title, children: title }), _jsx(CopyButton, { label: "Copy title", statusKey: "title", copyStatus: copyStatus, onCopy: () => void copy('title', title, blogId, 'title') })] })), _jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2 py-1", children: [_jsx("span", { className: "shrink-0 text-sm text-slate-600", children: "Post body" }), _jsxs("div", { className: "flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-1", children: [_jsx(CopyButton, { label: "Copy as Markdown", statusKey: "body", copyStatus: copyStatus, onCopy: () => void copy('body', bodyForExport, blogId, 'body') }), _jsx(CopyButton, { label: "Copy as HTML", statusKey: "body_html", copyStatus: copyStatus, onCopy: () => void copy('body_html', bodyHtml, blogId, 'body_html') })] })] })] }))] }), _jsxs("div", { className: "border-t border-slate-100", children: [_jsx(DisclosureHeader, { id: "publish-seo", open: seoOpen, onToggle: () => setSeoOpen((o) => !o), children: _jsxs("div", { className: "min-w-0", children: [_jsx("span", { children: "SEO and social" }), !seoOpen && (suggestedSlug || metaDescription || seoTitle) && (_jsx("p", { className: "mt-0.5 text-xs font-normal text-slate-500", children: "SEO title, slug, and meta available. Expand to view and copy." }))] }) }), seoOpen && (_jsxs("div", { id: "publish-seo-panel", className: "flex flex-col gap-3 border-t border-slate-100 px-3 py-2 pb-3", role: "region", "aria-labelledby": "publish-seo-header", children: [seoTitle ? (_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0 flex flex-col gap-0.5", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs uppercase tracking-wide text-slate-400", children: "SEO title" }), _jsxs("span", { className: `text-xs font-medium ${seoTitleCountClass(seoTitle.length)}`, children: [seoTitle.length, "/60"] })] }), _jsx("span", { className: "text-sm leading-snug text-slate-700", children: seoTitle })] }), _jsx(CopyButton, { label: "Copy SEO title", statusKey: "seo_title", copyStatus: copyStatus, onCopy: () => void copy('seo_title', seoTitle, blogId, 'seo_title') })] })) : (_jsx("p", { className: "text-xs text-slate-400", children: "SEO title not yet generated. Confirm the draft to generate." })), suggestedSlug ? (_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "min-w-0 flex flex-col", children: [_jsx("span", { className: "text-xs uppercase tracking-wide text-slate-400", children: "Suggested slug" }), _jsx("span", { className: "truncate font-mono text-sm text-slate-700", children: suggestedSlug })] }), _jsx(CopyButton, { label: "Copy slug", statusKey: "slug", copyStatus: copyStatus, onCopy: () => void copy('slug', suggestedSlug, blogId, 'slug') })] })) : (_jsx("p", { className: "text-xs text-slate-400", children: "Slug not yet generated. Confirm the draft to generate." })), metaDescription ? (_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0 flex flex-col gap-0.5", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs uppercase tracking-wide text-slate-400", children: "Meta description" }), _jsxs("span", { className: `text-xs font-medium ${charCountClass(metaDescription.length, 150, 160)}`, children: [metaDescription.length, " chars"] })] }), _jsx("span", { className: "text-sm leading-snug text-slate-700", children: metaDescription })] }), _jsx(CopyButton, { label: "Copy meta", statusKey: "meta", copyStatus: copyStatus, onCopy: () => void copy('meta', metaDescription, blogId, 'meta') })] })) : (_jsx("p", { className: "text-xs text-slate-400", children: "Meta not yet generated. Confirm the draft to generate." })), (seoTitle || metaDescription || suggestedSlug || primaryKeyword) && (_jsxs("div", { className: "flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-xs uppercase tracking-wide text-slate-400", children: "SEO meta snippet" }), _jsx("span", { className: "text-xs text-slate-500", children: "Paste into your CMS <head> section" })] }), _jsx(CopyButton, { label: "Copy snippet", statusKey: "seo_snippet", copyStatus: copyStatus, onCopy: () => void copy('seo_snippet', buildSeoSnippet(), blogId, 'seo_snippet') })] }), _jsx("pre", { className: "mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded text-xs text-slate-500", children: buildSeoSnippet() })] }))] }))] })] }) })] })), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 pt-1", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: onBack, disabled: loading, children: "\u2190 Back to Draft" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => {
                            void (async () => {
                                try {
                                    await completeBlog(blogId);
                                }
                                catch {
                                    // still leave the wizard; completion is best-effort
                                }
                                finally {
                                    onFinish();
                                }
                            })();
                        }, children: "Finish \u2192" })] })] }));
}

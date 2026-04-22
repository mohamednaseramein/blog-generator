import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { getDraft, getBrief, recordExportEvent } from '../api/blog-api.js';
import { Button } from './ui/button.js';
import { Toast } from './ui/toast.js';
const AI_DISCLOSURE = 'This post was created with AI assistance.';
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
function CopyButton({ label, onCopy, statusKey, copyStatus, }) {
    const state = copyStatus[statusKey] ?? 'idle';
    return (_jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: onCopy, "aria-label": label, children: state === 'success' ? '✓ Copied' : state === 'error' ? '✗ Failed' : label }));
}
export function PublishStep({ blogId, onBack, onFinish }) {
    const [markdown, setMarkdown] = useState(null);
    const [title, setTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState(null);
    const [suggestedSlug, setSuggestedSlug] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [seoOpen, setSeoOpen] = useState(false);
    const [disclosureOn, setDisclosureOn] = useState(false);
    const { status: copyStatus, copy } = useCopyFeedback();
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const draftRes = await getDraft(blogId);
            if (!draftRes.draft.draftConfirmed) {
                setError('Draft is not confirmed — go back to Step 4 and confirm the draft first.');
                return;
            }
            setMarkdown(draftRes.draft.markdown);
            setMetaDescription(draftRes.draft.metaDescription);
            setSuggestedSlug(draftRes.draft.suggestedSlug);
            try {
                const briefRes = await getBrief(blogId);
                setTitle(briefRes.title);
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
    function buildFullBlock() {
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
        if (disclosureOn)
            lines.push(`\n---\n${AI_DISCLOSURE}`);
        return lines.join('\n');
    }
    function withDisclosure(text) {
        return disclosureOn ? `${text}\n\n---\n${AI_DISCLOSURE}` : text;
    }
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-800", children: "Step 5 \u2014 Publish" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Copy your post to the clipboard \u2014 all at once or section by section." })] }), loading && (_jsxs("div", { className: "flex flex-col items-center gap-3 py-10 text-slate-500", children: [_jsx("span", { className: "inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" }), _jsx("p", { className: "text-sm", children: "Loading your draft\u2026" })] })), error && _jsx(Toast, { variant: "error", children: error }), markdown && !loading && (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("div", { className: "flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-indigo-800", children: "Copy all" }), _jsxs("p", { className: "text-xs text-indigo-600", children: ["Title \u00B7 slug \u00B7 meta \u00B7 full post", disclosureOn ? ' · disclosure' : ''] })] }), _jsx(CopyButton, { label: "Copy all", statusKey: "all", copyStatus: copyStatus, onCopy: () => void copy('all', buildFullBlock(), blogId, 'all') })] }), _jsxs("div", { className: "flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: "Copy by section" }), title && (_jsxs("div", { className: "flex items-center justify-between py-1", children: [_jsx("span", { className: "text-sm text-slate-700 truncate max-w-xs", children: title }), _jsx(CopyButton, { label: "Copy title", statusKey: "title", copyStatus: copyStatus, onCopy: () => void copy('title', title, blogId, 'title') })] })), _jsxs("div", { className: "flex items-center justify-between py-1", children: [_jsx("span", { className: "text-sm text-slate-500 italic truncate max-w-xs", children: "Post body" }), _jsx(CopyButton, { label: "Copy body", statusKey: "body", copyStatus: copyStatus, onCopy: () => void copy('body', withDisclosure(markdown), blogId, 'body') })] })] }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-white", children: [_jsxs("button", { type: "button", className: "flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50", onClick: () => setSeoOpen((o) => !o), "aria-expanded": seoOpen, children: [_jsx("span", { children: "SEO & social" }), _jsx("span", { className: "text-slate-400", children: seoOpen ? '▲' : '▼' })] }), seoOpen && (_jsxs("div", { className: "flex flex-col gap-3 border-t border-slate-100 px-4 py-3", children: [suggestedSlug ? (_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex flex-col min-w-0", children: [_jsx("span", { className: "text-xs text-slate-400 uppercase tracking-wide", children: "Suggested slug" }), _jsx("span", { className: "text-sm text-slate-700 font-mono truncate", children: suggestedSlug })] }), _jsx(CopyButton, { label: "Copy slug", statusKey: "slug", copyStatus: copyStatus, onCopy: () => void copy('slug', suggestedSlug, blogId, 'slug') })] })) : (_jsx("p", { className: "text-xs text-slate-400", children: "Slug not yet generated \u2014 confirm the draft to generate." })), metaDescription ? (_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "flex flex-col min-w-0", children: [_jsx("span", { className: "text-xs text-slate-400 uppercase tracking-wide", children: "Meta description" }), _jsx("span", { className: "text-sm text-slate-700 leading-snug", children: metaDescription })] }), _jsx(CopyButton, { label: "Copy meta", statusKey: "meta", copyStatus: copyStatus, onCopy: () => void copy('meta', metaDescription, blogId, 'meta') })] })) : (_jsx("p", { className: "text-xs text-slate-400", children: "Meta description not yet generated \u2014 confirm the draft to generate." }))] }))] }), _jsxs("label", { className: "flex items-center gap-3 cursor-pointer select-none", children: [_jsx("input", { type: "checkbox", checked: disclosureOn, onChange: (e) => setDisclosureOn(e.target.checked), className: "h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" }), _jsxs("span", { className: "text-sm text-slate-600", children: ["Append AI disclosure footer: ", _jsxs("em", { className: "text-slate-400", children: ["\"", AI_DISCLOSURE, "\""] })] })] }), _jsx("div", { className: "max-h-[min(50vh,24rem)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3", children: _jsx("pre", { className: "whitespace-pre-wrap break-words font-sans text-sm text-slate-800", children: markdown }) })] })), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 pt-1", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: onBack, disabled: loading, children: "\u2190 Back to Draft" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: onFinish, children: "Finish \u2192" })] })] }));
}

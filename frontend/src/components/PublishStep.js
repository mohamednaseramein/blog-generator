import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { getDraft, getBrief } from '../api/blog-api.js';
import { Button } from './ui/button.js';
import { Toast } from './ui/toast.js';
function downloadFilename(title, blogId) {
    const slug = title?.trim()
        ? title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80)
        : '';
    const base = slug || `blog-${blogId.slice(0, 8)}`;
    return `${base}.md`;
}
function triggerDownload(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.click();
    URL.revokeObjectURL(url);
}
export function PublishStep({ blogId, onBack, onFinish }) {
    const [markdown, setMarkdown] = useState(null);
    const [title, setTitle] = useState(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copyStatus, setCopyStatus] = useState('idle');
    const [copyMessage, setCopyMessage] = useState('');
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        setCopyStatus('idle');
        setCopyMessage('');
        try {
            const draftRes = await getDraft(blogId);
            if (!draftRes.draft.draftConfirmed) {
                setError('Draft is not confirmed — go back to Step 4 and confirm the draft first.');
                setMarkdown(null);
                return;
            }
            setMarkdown(draftRes.draft.markdown);
            try {
                const briefRes = await getBrief(blogId);
                setTitle(briefRes.title);
            }
            catch {
                setTitle(undefined);
            }
        }
        catch (e) {
            setError(e.message);
            setMarkdown(null);
        }
        finally {
            setLoading(false);
        }
    }, [blogId]);
    useEffect(() => {
        void load();
    }, [load]);
    async function copyToClipboard() {
        if (markdown == null)
            return;
        setCopyStatus('idle');
        setCopyMessage('');
        try {
            await navigator.clipboard.writeText(markdown);
            setCopyStatus('success');
            setCopyMessage('Full post copied to clipboard.');
        }
        catch {
            setCopyStatus('error');
            setCopyMessage('Could not copy — use Download instead, or check browser permissions.');
        }
    }
    function download() {
        if (markdown == null)
            return;
        const name = downloadFilename(title, blogId);
        try {
            triggerDownload(name, markdown);
        }
        catch {
            setError('Download failed. Try again or copy the text below.');
        }
    }
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-800", children: "Step 5 \u2014 Publish" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Copy the markdown into any CMS, doc, or email. Download a file if the clipboard is blocked." })] }), loading && (_jsxs("div", { className: "flex flex-col items-center gap-3 py-10 text-slate-500", children: [_jsx("span", { className: "inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" }), _jsx("p", { className: "text-sm", children: "Loading your draft\u2026" })] })), error && _jsx(Toast, { variant: "error", children: error }), copyMessage && copyStatus === 'success' && (_jsx("p", { className: "text-sm text-green-700", role: "status", "aria-live": "polite", children: copyMessage })), copyMessage && copyStatus === 'error' && (_jsx("p", { className: "text-sm text-amber-800", role: "status", "aria-live": "polite", children: copyMessage })), markdown && !loading && (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("div", { className: "max-h-[min(50vh,24rem)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3", children: _jsx("pre", { className: "whitespace-pre-wrap break-words font-sans text-sm text-slate-800", children: markdown }) }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { type: "button", onClick: () => void copyToClipboard(), children: "Copy full post" }), _jsx(Button, { type: "button", variant: "ghost", onClick: download, children: "Download .md" })] })] })), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 pt-1", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: onBack, disabled: loading, children: "\u2190 Back to Draft" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: onFinish, children: "Finish \u2192" })] })] }));
}

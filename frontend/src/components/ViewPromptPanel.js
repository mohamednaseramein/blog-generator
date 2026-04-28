import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
async function fetchPrompt(blogId, step) {
    const res = await fetch(`/api/blogs/${blogId}/prompts/${step}`);
    if (!res.ok)
        return null;
    return (await res.json());
}
export function ViewPromptPanel({ blogId, step }) {
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!isOpen || prompt)
            return;
        setLoading(true);
        setError(null);
        void fetchPrompt(blogId, step)
            .then((data) => {
            setPrompt(data);
            if (!data)
                setError('No prompt recorded for this step yet.');
        })
            .catch(() => setError('Failed to load prompt.'))
            .finally(() => setLoading(false));
    }, [isOpen, blogId, step, prompt]);
    return (_jsxs("div", { className: "mt-4 rounded-lg border border-slate-200 bg-slate-50", children: [_jsxs("button", { onClick: () => setIsOpen((o) => !o), className: "flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-slate-400", children: "\u2699" }), "View system prompt sent to Claude"] }), _jsx("svg", { className: `h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) })] }), isOpen && (_jsxs("div", { className: "border-t border-slate-200 px-4 py-3", children: [loading && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-slate-500", children: [_jsx("span", { className: "inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" }), "Loading prompt\u2026"] })), error && _jsx("p", { className: "text-sm text-slate-500", children: error }), prompt && !loading && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-3 text-xs text-slate-400", children: [_jsxs("span", { children: ["Model: ", _jsx("span", { className: "font-mono", children: prompt.model })] }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: ["Step: ", prompt.step] }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: new Date(prompt.generatedAt).toLocaleString() })] }), _jsx("pre", { className: "overflow-x-auto rounded bg-slate-900 p-3 text-xs leading-relaxed text-slate-100 whitespace-pre-wrap", children: prompt.systemPrompt })] }))] }))] }));
}

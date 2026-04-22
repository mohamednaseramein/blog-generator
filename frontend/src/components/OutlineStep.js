import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { generateOutline, confirmOutline } from '../api/blog-api.js';
import { Button } from './ui/button.js';
import { Textarea } from './ui/textarea.js';
import { Toast } from './ui/toast.js';
import { Field } from './ui/field.js';
export function OutlineStep({ blogId, onBack, onConfirmed }) {
    const [outline, setOutline] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [generating, setGenerating] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState(null);
    const [iterations, setIterations] = useState(0);
    async function generate(feedbackText) {
        setError(null);
        setGenerating(true);
        try {
            const res = await generateOutline(blogId, feedbackText);
            setOutline(res.outline);
            setFeedback('');
            setIterations((i) => i + 1);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setGenerating(false);
        }
    }
    async function confirm() {
        setError(null);
        setConfirming(true);
        try {
            await confirmOutline(blogId);
            onConfirmed();
        }
        catch (e) {
            setError(e.message);
            setConfirming(false);
        }
    }
    useEffect(() => { void generate(); }, []);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-800", children: "Step 3 \u2014 Blog Outline" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Review the AI-generated structure. Provide feedback or confirm to proceed to drafting." })] }), generating && (_jsxs("div", { className: "flex flex-col items-center gap-3 py-10 text-slate-500", children: [_jsx("span", { className: "inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" }), _jsx("p", { className: "text-sm", children: iterations === 0 ? 'Generating outline…' : 'Regenerating with your feedback…' })] })), outline && !generating && (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("p", { className: "text-xs text-slate-400 font-medium uppercase tracking-wide", children: [outline.sections.length, " sections \u00B7 ~", outline.totalEstimatedWords.toLocaleString(), " words"] }), iterations > 0 && (_jsxs("p", { className: "text-xs text-slate-400", children: ["Iteration ", iterations] }))] }), outline.sections.map((section, idx) => (_jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("p", { className: "text-sm font-semibold text-slate-800", children: ["H2 \u00B7 ", section.title] }), _jsxs("span", { className: "shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600", children: ["~", section.estimatedWords.toLocaleString(), " words"] })] }), _jsx("p", { className: "mt-1 text-xs text-slate-500", children: section.description }), section.subsections.length > 0 && (_jsx("ul", { className: "mt-2 space-y-1", children: section.subsections.map((sub, sIdx) => (_jsxs("li", { className: "flex items-start gap-1.5 text-xs text-slate-600", children: [_jsx("span", { className: "mt-0.5 shrink-0 text-indigo-300", children: "\u203A" }), _jsx("span", { children: sub })] }, sIdx))) }))] }, idx)))] })), error && _jsx(Toast, { variant: "error", children: error }), outline && !generating && (_jsx(Field, { label: "Something off? Tell the AI what to change:", hint: "Leave blank if the outline looks good.", children: _jsx(Textarea, { rows: 3, placeholder: "e.g. Add a section on pricing comparisons, and make the intro shorter\u2026", value: feedback, onChange: (e) => setFeedback(e.target.value) }) })), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 pt-1", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: onBack, disabled: generating || confirming, children: "\u2190 Back to Alignment" }), _jsxs("div", { className: "flex gap-2", children: [outline && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => void generate(feedback || undefined), disabled: generating || confirming, children: feedback ? 'Regenerate with feedback' : 'Regenerate' })), _jsx(Button, { onClick: () => void confirm(), disabled: !outline || generating || confirming, "aria-busy": confirming, children: confirming ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" }), "Confirming\u2026"] })) : ('Confirm Outline →') })] })] })] }));
}

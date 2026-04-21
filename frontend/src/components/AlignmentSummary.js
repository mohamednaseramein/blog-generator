import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { generateAlignment, confirmAlignment } from '../api/blog-api.js';
import { Button } from './ui/button.js';
import { Textarea } from './ui/textarea.js';
import { Toast } from './ui/toast.js';
import { Field } from './ui/field.js';
const SECTIONS = [
    { key: 'blogGoal', label: 'Blog Goal', icon: '🎯' },
    { key: 'targetAudience', label: 'Target Audience', icon: '👥' },
    { key: 'seoIntent', label: 'SEO Intent', icon: '🔍' },
    { key: 'tone', label: 'Tone & Voice', icon: '✍️' },
    { key: 'scope', label: 'Scope', icon: '📋' },
];
export function AlignmentSummary({ blogId, onEdit, onConfirmed }) {
    const [summary, setSummary] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [generating, setGenerating] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState(null);
    const [iterations, setIterations] = useState(0);
    async function generate(feedbackText) {
        setError(null);
        setGenerating(true);
        try {
            const res = await generateAlignment(blogId, feedbackText);
            setSummary(res.summary);
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
            await confirmAlignment(blogId);
            onConfirmed();
        }
        catch (e) {
            setError(e.message);
            setConfirming(false);
        }
    }
    // Auto-generate on first render
    if (!summary && !generating && !error) {
        void generate();
    }
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-800", children: "Step 2 \u2014 AI Alignment Summary" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Review what the AI has understood. Edit or confirm before generation begins." })] }), generating && (_jsxs("div", { className: "flex flex-col items-center gap-3 py-10 text-slate-500", children: [_jsx("span", { className: "inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" }), _jsx("p", { className: "text-sm", children: iterations === 0 ? 'Generating alignment summary…' : 'Regenerating with your feedback…' })] })), summary && !generating && (_jsxs("div", { className: "flex flex-col gap-3", children: [SECTIONS.map(({ key, label, icon }) => (_jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3", children: [_jsxs("p", { className: "mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400", children: [icon, " ", label] }), _jsx("p", { className: "text-sm text-slate-700", children: summary[key] })] }, key))), iterations > 0 && (_jsxs("p", { className: "text-right text-xs text-slate-400", children: ["Iteration ", iterations] }))] })), error && _jsx(Toast, { variant: "error", children: error }), summary && !generating && (_jsx(Field, { label: "Something off? Tell the AI what to fix:", hint: "Leave blank if the summary looks good.", children: _jsx(Textarea, { rows: 3, placeholder: "e.g. The tone should be more technical, and focus more on enterprise buyers\u2026", value: feedback, onChange: (e) => setFeedback(e.target.value) }) })), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 pt-1", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: onEdit, disabled: generating || confirming, children: "\u2190 Edit Inputs" }), _jsxs("div", { className: "flex gap-2", children: [summary && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => void generate(feedback || undefined), disabled: generating || confirming, children: feedback ? 'Regenerate with feedback' : 'Regenerate' })), _jsx(Button, { onClick: () => void confirm(), disabled: !summary || generating || confirming, "aria-busy": confirming, children: confirming ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" }), "Confirming\u2026"] })) : ('Confirm & Proceed →') })] })] })] }));
}

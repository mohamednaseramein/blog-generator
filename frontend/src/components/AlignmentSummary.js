import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { getBrief, generateAlignment, confirmAlignment, parseAlignmentSummaryFromStorage, } from '../api/blog-api.js';
import { Button } from './ui/button.js';
import { Textarea } from './ui/textarea.js';
import { Toast } from './ui/toast.js';
import { Field } from './ui/field.js';
const BASE_SECTIONS = [
    { key: 'blogGoal', label: 'Blog Goal', icon: '🎯' },
    { key: 'targetAudience', label: 'Target Audience', icon: '👥' },
    { key: 'seoIntent', label: 'SEO Intent', icon: '🔍' },
    { key: 'tone', label: 'Tone & Voice', icon: '✍️' },
    { key: 'scope', label: 'Scope', icon: '📋' },
];
const REFERENCE_SECTIONS = [
    { key: 'differentiationAngle', label: 'Differentiation angle', icon: '✨', variant: 'violet' },
    { key: 'referenceUnderstanding', label: 'Reference understanding', icon: '🔗', variant: 'indigo' },
];
export function AlignmentSummary({ blogId, onEdit, onConfirmed }) {
    const [summary, setSummary] = useState(null);
    const [referencesAnalysis, setReferencesAnalysis] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [generating, setGenerating] = useState(false);
    const [loadingSaved, setLoadingSaved] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState(null);
    const [iterations, setIterations] = useState(0);
    /** True when we hydrated this screen from DB without calling POST /alignment. */
    const [fromSavedRun, setFromSavedRun] = useState(false);
    const bootstrapped = useRef(false);
    async function generate(feedbackText) {
        setError(null);
        setFromSavedRun(false);
        setGenerating(true);
        try {
            const res = await generateAlignment(blogId, feedbackText);
            setSummary(res.summary);
            setReferencesAnalysis(res.referencesAnalysis ?? null);
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
    useEffect(() => {
        if (bootstrapped.current)
            return;
        bootstrapped.current = true;
        let cancelled = false;
        void (async () => {
            setError(null);
            setLoadingSaved(true);
            setFromSavedRun(false);
            try {
                const brief = await getBrief(blogId);
                const raw = (brief.alignmentSummary?.trim() || brief.alignment_summary?.trim()) ?? '';
                if (raw) {
                    try {
                        const { summary, referencesAnalysis: refA } = parseAlignmentSummaryFromStorage(raw);
                        if (cancelled)
                            return;
                        setSummary(summary);
                        setReferencesAnalysis(refA);
                        setIterations(brief.alignmentIterations ?? brief.alignment_iterations ?? 0);
                        setFromSavedRun(true);
                        setLoadingSaved(false);
                        return;
                    }
                    catch {
                        // stored JSON invalid — fall through to fresh generation
                    }
                }
            }
            catch {
                // brief missing — fall through
            }
            if (cancelled)
                return;
            setLoadingSaved(false);
            if (cancelled)
                return;
            await generate();
        })();
        return () => {
            cancelled = true;
        };
    }, [blogId]);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-800", children: "Step 2: AI Alignment Summary" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Review what the AI has understood. Edit or confirm before generation begins." })] }), (loadingSaved || generating) && (_jsxs("div", { className: "flex flex-col items-center gap-3 py-10 text-slate-500", children: [_jsx("span", { className: "inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" }), _jsx("p", { className: "text-sm", children: loadingSaved
                            ? 'Loading your alignment…'
                            : iterations === 0
                                ? 'Calling the model to create your alignment…'
                                : 'Calling the model with your feedback…' })] })), summary && !generating && !loadingSaved && (_jsxs("div", { className: "flex flex-col gap-3", children: [fromSavedRun && (_jsx("div", { className: "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900", role: "status", children: "Restored your last saved alignment." })), referencesAnalysis === 'none_usable' && (_jsx("div", { className: "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950", children: "Your reference URLs could not be turned into structured insights (scrape or analysis did not yield usable content). The summary below is based on your brief only. You can still paste key ideas into the brief and run a new version." })), BASE_SECTIONS.map(({ key, label, icon }) => {
                        const value = summary[key];
                        return (_jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3", children: [_jsxs("p", { className: "mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400", children: [icon, " ", label] }), _jsx("p", { className: "text-sm text-slate-700", children: value })] }, key));
                    }), REFERENCE_SECTIONS.map(({ key, label, icon, variant }) => {
                        const value = summary[key];
                        if (!value || typeof value !== 'string')
                            return null;
                        const isViolet = variant === 'violet';
                        return (_jsxs("div", { className: isViolet
                                ? 'rounded-xl border border-violet-200 bg-violet-50 px-4 py-3'
                                : 'rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3', children: [_jsxs("p", { className: isViolet
                                        ? 'mb-1 text-xs font-semibold uppercase tracking-wide text-violet-500'
                                        : 'mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-400', children: [icon, " ", label] }), _jsx("p", { className: "text-sm text-slate-700", children: value })] }, key));
                    }), iterations > 0 && (_jsxs("p", { className: "text-right text-xs text-slate-400", children: ["Iteration ", iterations] }))] })), error && _jsx(Toast, { variant: "error", children: error }), summary && !generating && !loadingSaved && (_jsx(Field, { label: "Something off? Tell the AI what to fix:", hint: "Leave blank if the summary looks good.", children: _jsx(Textarea, { rows: 3, placeholder: "e.g. The tone should be more technical, and focus more on enterprise buyers\u2026", value: feedback, onChange: (e) => setFeedback(e.target.value) }) })), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 pt-1", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: onEdit, disabled: loadingSaved || generating || confirming, children: "\u2190 Edit Inputs" }), _jsxs("div", { className: "flex gap-2", children: [summary && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => void generate(feedback.trim() || undefined), disabled: loadingSaved || generating || confirming, children: feedback.trim()
                                    ? 'Regenerate alignment with your feedback'
                                    : 'Regenerate alignment' })), _jsx(Button, { onClick: () => void confirm(), disabled: !summary || loadingSaved || generating || confirming, "aria-busy": confirming, children: confirming ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" }), "Confirming\u2026"] })) : ('Confirm & Proceed →') })] })] })] }));
}

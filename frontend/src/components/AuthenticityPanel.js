import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { runAiCheck, recordBlogAnalyticsEvent, } from '../api/blog-api.js';
import { Button } from './ui/button.js';
function scoreBadgeClass(score) {
    if (score === null)
        return 'bg-slate-100 text-slate-600 ring-slate-200';
    if (score <= 30)
        return 'bg-emerald-50 text-emerald-900 ring-emerald-200';
    if (score <= 69)
        return 'bg-amber-50 text-amber-950 ring-amber-200';
    return 'bg-red-50 text-red-900 ring-red-200';
}
function modeLabel(mode) {
    switch (mode) {
        case 'pure_ai':
            return 'Pure AI';
        case 'ai_assisted':
            return 'AI-assisted';
        case 'human_polish':
            return 'Human polish';
        case 'pure_human':
            return 'Pure human';
        case 'language_unsupported':
            return 'Language not supported';
        default:
            return mode;
    }
}
function modeTooltip(mode) {
    switch (mode) {
        case 'pure_ai':
            return 'Score ≥80 — reads like templated machine drafting.';
        case 'ai_assisted':
            return 'Score 50–79 — mixed signals; editing usually helps.';
        case 'human_polish':
            return 'Score 25–49 — human voice emerging over generic structure.';
        case 'pure_human':
            return 'Score ≤24 — strong human-like signals for this rubric.';
        case 'language_unsupported':
            return 'Only English is scored in v1.';
        default:
            return '';
    }
}
function scrollToSnippet(container, fullText, snippet) {
    if (!container || !snippet.trim())
        return;
    const needle = snippet.trim().slice(0, 60);
    const idx = fullText.indexOf(needle);
    if (idx < 0)
        return;
    const ratio = idx / Math.max(fullText.length, 1);
    container.scrollTop = Math.max(0, ratio * (container.scrollHeight - container.clientHeight) - 24);
    container.classList.add('ring-2', 'ring-indigo-300');
    window.setTimeout(() => {
        container.classList.remove('ring-2', 'ring-indigo-300');
    }, 2000);
}
export function AuthenticityPanel({ blogId, markdownForPreview, disabled, disabledTooltip, previewRef, }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [sectionsOpen, setSectionsOpen] = useState(false);
    const run = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            const res = await runAiCheck(blogId);
            setResult(res);
            void recordBlogAnalyticsEvent(blogId, {
                type: res.cached ? 'ai_check_cache_hit' : 'ai_check_run',
            });
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setLoading(false);
        }
    }, [blogId]);
    const busy = loading;
    return (_jsxs("section", { className: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm", "aria-labelledby": "authenticity-heading", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h3", { id: "authenticity-heading", className: "text-sm font-semibold text-slate-800", children: "Authenticity check" }), _jsx("p", { className: "mt-0.5 text-xs text-slate-500", children: "Heuristic AI-writing-style score \u2014 transparent rules, not a forensic detector." })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Button, { type: "button", size: "sm", disabled: disabled || busy, "aria-busy": busy, title: disabled ? disabledTooltip : undefined, onClick: () => void run(), children: busy ? 'Running…' : 'Run AI check' }), _jsx(Link, { to: "/help/ai-detector-rules", className: "text-xs font-medium text-indigo-600 hover:underline", children: "How does this score work?" })] })] }), error && (_jsxs("p", { className: "mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800", role: "alert", children: [error, ' ', _jsx("button", { type: "button", className: "font-medium text-red-900 underline", onClick: () => void run(), children: "Retry" })] })), result && (_jsxs("div", { className: "mt-4 space-y-4", children: [result.cached && (_jsx("p", { className: "text-xs font-medium text-slate-500", role: "status", children: "Cached result \u2014 same draft text and rubric version as a previous run." })), result.mode === 'language_unsupported' ? (_jsx("p", { className: "text-sm text-slate-700", children: "Language not supported in v1 \u2014 scoring was skipped. English drafts only for now." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("div", { className: clsx('inline-flex min-w-[5rem] items-center justify-center rounded-lg px-4 py-2 text-2xl font-semibold tabular-nums ring-1', scoreBadgeClass(result.ai_likelihood_percent)), "aria-label": `AI likelihood ${result.ai_likelihood_percent ?? 'unknown'} percent`, children: [result.ai_likelihood_percent ?? '—', "%"] }), _jsxs("div", { className: "flex flex-col gap-1 text-xs text-slate-600", children: [_jsxs("span", { children: ["Human-like estimate:", ' ', _jsxs("strong", { className: "text-slate-800", children: [result.human_likelihood_percent, "%"] })] }), _jsxs("span", { children: ["Uncertainty:", ' ', _jsxs("strong", { className: "text-slate-800", children: [result.uncertainty_percent, "%"] })] })] }), _jsx("span", { className: "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800", title: modeTooltip(result.mode), children: modeLabel(result.mode) })] }), result.truncation_note && (_jsx("p", { className: "text-xs text-slate-500", children: result.truncation_note })), result.excluded_segments.length > 0 && (_jsxs("div", { className: "text-xs text-slate-600", children: [_jsx("span", { className: "font-medium text-slate-700", children: "Excluded from scoring: " }), result.excluded_segments.map((e) => `${e.count} ${e.type}`).join(', '), _jsx("span", { className: "ml-1 text-slate-400", title: result.excluded_segments.map((e) => e.example_snippet).join(' · '), children: "(hover for examples)" })] })), result.creator_tips.length > 0 && (_jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-500", children: "What to change" }), _jsx("ul", { className: "mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700", children: result.creator_tips.map((t, i) => (_jsx("li", { children: t }, i))) })] })), _jsxs("div", { className: "border-t border-slate-100 pt-3", children: [_jsxs("button", { type: "button", className: "flex w-full items-center justify-between text-left text-sm font-medium text-slate-800", onClick: () => setSectionsOpen((o) => !o), "aria-expanded": sectionsOpen, children: ["Section scores", _jsx("span", { className: "text-slate-400", children: sectionsOpen ? '▲' : '▼' })] }), sectionsOpen && result.section_scores.length > 0 && (_jsx("ul", { className: "mt-2 space-y-1 text-sm", children: result.section_scores.map((s, i) => (_jsxs("li", { className: "flex flex-wrap justify-between gap-2 border-b border-slate-50 py-1 last:border-0", children: [_jsx("span", { className: "text-slate-700", children: s.section }), _jsxs("span", { className: clsx('tabular-nums font-medium', s.ai_likelihood_percent <= 30 && 'text-emerald-700', s.ai_likelihood_percent >= 31 &&
                                                        s.ai_likelihood_percent <= 69 &&
                                                        'text-amber-700', s.ai_likelihood_percent >= 70 && 'text-red-700'), children: [s.ai_likelihood_percent, "%"] })] }, `${s.section}-${i}`))) })), sectionsOpen && result.section_scores.length === 0 && (_jsx("p", { className: "mt-2 text-xs text-slate-500", children: "No section breakdown returned." }))] }), _jsxs("div", { className: "border-t border-slate-100 pt-3", children: [_jsxs("button", { type: "button", className: "flex w-full items-center justify-between text-left text-sm font-medium text-slate-800", onClick: () => setRulesOpen((o) => !o), "aria-expanded": rulesOpen, children: ["Why this score?", _jsx("span", { className: "text-slate-400", children: rulesOpen ? '▲' : '▼' })] }), rulesOpen && (_jsx("ul", { className: "mt-2 space-y-2", children: result.rule_breakdown.map((r) => (_jsxs("li", { className: clsx('rounded-lg border px-3 py-2 text-sm', r.direction === 'ai_like'
                                                ? 'border-red-100 bg-red-50/60'
                                                : 'border-emerald-100 bg-emerald-50/60'), children: [_jsxs("div", { className: "flex flex-wrap items-baseline justify-between gap-2", children: [_jsx("span", { className: "font-medium text-slate-900", children: r.rule_id }), _jsxs("span", { className: "text-xs text-slate-600", children: [r.points_applied > 0 ? '+' : '', r.points_applied, " pts \u00B7 ", r.field] })] }), _jsxs("button", { type: "button", className: "mt-1 block w-full text-left text-xs text-indigo-700 underline decoration-indigo-300 hover:text-indigo-900", onClick: () => {
                                                        scrollToSnippet(previewRef?.current ?? null, markdownForPreview, r.evidence_snippet);
                                                        void recordBlogAnalyticsEvent(blogId, {
                                                            type: 'ai_check_rule_expanded',
                                                            ruleId: r.rule_id,
                                                        });
                                                    }, children: ["\u201C", r.evidence_snippet, "\u201D"] }), _jsx("p", { className: "mt-1 text-xs text-slate-600", children: r.suggested_fix })] }, `${r.rule_id}-${r.evidence_snippet.slice(0, 24)}`))) })), rulesOpen && result.rule_breakdown.length === 0 && (_jsx("p", { className: "mt-2 text-xs text-slate-500", children: "No individual rules quoted \u2014 try editing and re-run." }))] })] })), result.llm && (_jsxs("p", { className: "text-[11px] text-slate-400", children: ["Model: ", result.llm.model, " \u00B7 tokens in ", result.tokens?.input ?? 0, " / out ", result.tokens?.output ?? 0] }))] }))] }));
}

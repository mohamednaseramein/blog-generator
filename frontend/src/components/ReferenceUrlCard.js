import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getReferenceStatus, removeReference, retryReferenceExtraction, } from '../api/blog-api.js';
import { Button } from './ui/button.js';
const SCRAPE_SETTLED = ['success', 'failed', 'timeout', 'skipped'];
const EXTRACTION_SETTLED = ['success', 'failed', 'irrelevant'];
const POLL_INTERVAL_MS = 2_000;
function parseStoredExtractionError(json, status) {
    if (status !== 'failed' || !json)
        return null;
    try {
        const o = JSON.parse(json);
        if (o._extractionError && typeof o.message === 'string' && o.message.trim()) {
            return o.message;
        }
    }
    catch {
        /* ignore */
    }
    return null;
}
function parseExtractionPreview(json) {
    if (!json)
        return null;
    try {
        const o = JSON.parse(json);
        if (typeof o.summary !== 'string' || typeof o.keyAngle !== 'string')
            return null;
        const rel = typeof o.relevance === 'string' ? o.relevance : '';
        return { relevance: rel, summary: o.summary, keyAngle: o.keyAngle };
    }
    catch {
        return null;
    }
}
function ScrapeLine({ status, error }) {
    if (status === 'pending') {
        return (_jsxs("span", { className: "flex items-center gap-1.5 text-xs text-slate-500", children: [_jsx("span", { className: "inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" }), "Scraping\u2026"] }));
    }
    if (status === 'success') {
        return _jsx("span", { className: "text-xs font-medium text-green-600", children: "\u2713 Page fetched" });
    }
    if (status === 'timeout') {
        return (_jsxs("span", { className: "text-xs text-amber-600", children: ["\u26A0 ", error ?? 'Request timed out - the URL may be slow or unreachable.'] }));
    }
    return (_jsxs("span", { className: "text-xs text-red-600", children: ["\u2717 ", error ?? 'Could not fetch this URL. Copy relevant content into your Blog Brief instead.'] }));
}
function ExtractionLine({ scrapeStatus, extractionStatus, extractionJson, errorDetail, onRetry, retrying, }) {
    if (scrapeStatus !== 'success')
        return null;
    if (extractionStatus === 'pending') {
        return (_jsxs("span", { className: "flex items-center gap-1.5 text-xs text-slate-500", children: [_jsx("span", { className: "inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-violet-500" }), "Analysing reference\u2026"] }));
    }
    if (extractionStatus === 'failed') {
        return (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("p", { className: "text-xs text-amber-800 leading-snug", children: errorDetail?.trim() ?? 'Reference analysis failed - alignment can still use the raw page text.' }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "h-8 w-fit border border-amber-200 text-xs text-amber-900 hover:bg-amber-50", onClick: onRetry, disabled: retrying, children: retrying ? 'Retrying…' : 'Retry analysis' })] }));
    }
    if (extractionStatus === 'irrelevant') {
        return _jsx("span", { className: "text-xs text-slate-600", children: "Marked as low relevance to your brief." });
    }
    if (extractionStatus === 'success') {
        const preview = parseExtractionPreview(extractionJson);
        if (!preview) {
            return _jsx("span", { className: "text-xs font-medium text-violet-700", children: "\u2713 Reference analysed" });
        }
        return (_jsxs("div", { className: "mt-1 space-y-1 rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2 text-xs text-slate-700", children: [preview.relevance ? (_jsxs("p", { children: [_jsx("span", { className: "font-semibold text-violet-800", children: "Relevance:" }), " ", preview.relevance] })) : null, _jsxs("p", { children: [_jsx("span", { className: "font-semibold text-violet-800", children: "Summary:" }), " ", preview.summary] }), _jsxs("p", { children: [_jsx("span", { className: "font-semibold text-violet-800", children: "Angle:" }), " ", preview.keyAngle] })] }));
    }
    return null;
}
export function ReferenceUrlCard({ blogId, refId, url, initialStatus, initialError, initialExtractionStatus, initialExtractionJson, onRemove, onReferenceUpdate, }) {
    const [scrapeStatus, setScrapeStatus] = useState(initialStatus);
    const [scrapeError, setScrapeError] = useState(initialError);
    const [extractionStatus, setExtractionStatus] = useState(initialExtractionStatus);
    const [extractionJson, setExtractionJson] = useState(initialExtractionJson);
    const [extractionErrorDetail, setExtractionErrorDetail] = useState(() => parseStoredExtractionError(initialExtractionJson, initialExtractionStatus));
    const [retrying, setRetrying] = useState(false);
    useEffect(() => {
        setScrapeStatus(initialStatus);
        setScrapeError(initialError);
        setExtractionStatus(initialExtractionStatus);
        setExtractionJson(initialExtractionJson);
        setExtractionErrorDetail(parseStoredExtractionError(initialExtractionJson, initialExtractionStatus));
    }, [initialStatus, initialError, initialExtractionStatus, initialExtractionJson]);
    useEffect(() => {
        const scrapeDone = SCRAPE_SETTLED.includes(scrapeStatus);
        const extractionDone = scrapeStatus !== 'success' || EXTRACTION_SETTLED.includes(extractionStatus);
        if (scrapeDone && extractionDone)
            return;
        let cancelled = false;
        let consecutiveErrors = 0;
        const MAX_CONSECUTIVE_ERRORS = 5;
        const timer = setInterval(() => {
            if (cancelled)
                return;
            getReferenceStatus(blogId, refId)
                .then((s) => {
                if (cancelled)
                    return;
                consecutiveErrors = 0;
                setScrapeStatus(s.scrapeStatus);
                setScrapeError(s.scrapeError);
                setExtractionStatus(s.extractionStatus);
                setExtractionJson(s.extractionJson);
                setExtractionErrorDetail(s.extractionError ?? parseStoredExtractionError(s.extractionJson, s.extractionStatus));
                onReferenceUpdate(refId, {
                    scrapeStatus: s.scrapeStatus,
                    scrapeError: s.scrapeError,
                    extractionStatus: s.extractionStatus,
                    extractionJson: s.extractionJson,
                });
                const doneNow = SCRAPE_SETTLED.includes(s.scrapeStatus) &&
                    (s.scrapeStatus !== 'success' || EXTRACTION_SETTLED.includes(s.extractionStatus));
                if (doneNow)
                    clearInterval(timer);
            })
                .catch(() => {
                if (cancelled)
                    return;
                consecutiveErrors++;
                if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS)
                    clearInterval(timer);
            });
        }, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [blogId, refId, scrapeStatus, extractionStatus, onReferenceUpdate]);
    async function handleRetryExtraction() {
        setRetrying(true);
        try {
            await retryReferenceExtraction(blogId, refId);
            setExtractionStatus('pending');
            setExtractionJson(null);
            setExtractionErrorDetail(null);
            onReferenceUpdate(refId, { extractionStatus: 'pending', extractionJson: null });
        }
        catch {
            // leave UI state; user can try again
        }
        finally {
            setRetrying(false);
        }
    }
    async function handleRemove() {
        try {
            await removeReference(blogId, refId);
        }
        finally {
            onRemove(refId);
        }
    }
    return (_jsxs("div", { className: "flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("p", { className: "break-all text-sm text-slate-700", children: url }), _jsx("button", { type: "button", onClick: () => void handleRemove(), className: "shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600", "aria-label": "Remove reference", children: "\u2715" })] }), _jsx(ScrapeLine, { status: scrapeStatus, error: scrapeError }), _jsx(ExtractionLine, { scrapeStatus: scrapeStatus, extractionStatus: extractionStatus, extractionJson: extractionJson, errorDetail: extractionErrorDetail, onRetry: () => void handleRetryExtraction(), retrying: retrying })] }));
}

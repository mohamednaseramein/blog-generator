import { useEffect, useState } from 'react';
import {
  getReferenceStatus,
  removeReference,
  retryReferenceExtraction,
  type ReferenceScrapeStatus,
  type ReferenceExtractionStatus,
} from '../api/blog-api.js';
import { Button } from './ui/button.js';

interface Props {
  blogId: string;
  refId: string;
  url: string;
  initialStatus: ReferenceScrapeStatus;
  initialError: string | null;
  initialExtractionStatus: ReferenceExtractionStatus;
  initialExtractionJson: string | null;
  onRemove: (refId: string) => void;
  onReferenceUpdate: (
    refId: string,
    patch: Partial<{
      scrapeStatus: ReferenceScrapeStatus;
      scrapeError: string | null;
      extractionStatus: ReferenceExtractionStatus;
      extractionJson: string | null;
    }>,
  ) => void;
}

const SCRAPE_SETTLED: ReferenceScrapeStatus[] = ['success', 'failed', 'timeout', 'skipped'];
const EXTRACTION_SETTLED: ReferenceExtractionStatus[] = ['success', 'failed', 'irrelevant'];
const POLL_INTERVAL_MS = 2_000;

function parseStoredExtractionError(
  json: string | null,
  status: ReferenceExtractionStatus,
): string | null {
  if (status !== 'failed' || !json) return null;
  try {
    const o = JSON.parse(json) as { _extractionError?: boolean; message?: string };
    if (o._extractionError && typeof o.message === 'string' && o.message.trim()) {
      return o.message;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function parseExtractionPreview(json: string | null): {
  relevance: string;
  summary: string;
  keyAngle: string;
} | null {
  if (!json) return null;
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    if (typeof o.summary !== 'string' || typeof o.keyAngle !== 'string') return null;
    const rel = typeof o.relevance === 'string' ? o.relevance : '';
    return { relevance: rel, summary: o.summary, keyAngle: o.keyAngle };
  } catch {
    return null;
  }
}

function ScrapeLine({ status, error }: { status: ReferenceScrapeStatus; error: string | null }) {
  if (status === 'pending') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
        Scraping…
      </span>
    );
  }
  if (status === 'success') {
    return <span className="text-xs font-medium text-green-600">✓ Page fetched</span>;
  }
  if (status === 'timeout') {
    return (
      <span className="text-xs text-amber-600">
        ⚠ {error ?? 'Request timed out - the URL may be slow or unreachable.'}
      </span>
    );
  }
  return (
    <span className="text-xs text-red-600">
      ✗ {error ?? 'Could not fetch this URL. Copy relevant content into your Blog Brief instead.'}
    </span>
  );
}

function ExtractionLine({
  scrapeStatus,
  extractionStatus,
  extractionJson,
  errorDetail,
  onRetry,
  retrying,
}: {
  scrapeStatus: ReferenceScrapeStatus;
  extractionStatus: ReferenceExtractionStatus;
  extractionJson: string | null;
  errorDetail: string | null;
  onRetry: () => void;
  retrying: boolean;
}) {
  if (scrapeStatus !== 'success') return null;

  if (extractionStatus === 'pending') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-violet-500" />
        Analysing reference…
      </span>
    );
  }

  if (extractionStatus === 'failed') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-amber-800 leading-snug">
          {errorDetail?.trim() ?? 'Reference analysis failed - alignment can still use the raw page text.'}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-fit border border-amber-200 text-xs text-amber-900 hover:bg-amber-50"
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? 'Retrying…' : 'Retry analysis'}
        </Button>
      </div>
    );
  }

  if (extractionStatus === 'irrelevant') {
    return <span className="text-xs text-slate-600">Marked as low relevance to your brief.</span>;
  }

  if (extractionStatus === 'success') {
    const preview = parseExtractionPreview(extractionJson);
    if (!preview) {
      return <span className="text-xs font-medium text-violet-700">✓ Reference analysed</span>;
    }
    return (
      <div className="mt-1 space-y-1 rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2 text-xs text-slate-700">
        {preview.relevance ? (
          <p>
            <span className="font-semibold text-violet-800">Relevance:</span> {preview.relevance}
          </p>
        ) : null}
        <p>
          <span className="font-semibold text-violet-800">Summary:</span> {preview.summary}
        </p>
        <p>
          <span className="font-semibold text-violet-800">Angle:</span> {preview.keyAngle}
        </p>
      </div>
    );
  }

  return null;
}

export function ReferenceUrlCard({
  blogId,
  refId,
  url,
  initialStatus,
  initialError,
  initialExtractionStatus,
  initialExtractionJson,
  onRemove,
  onReferenceUpdate,
}: Props) {
  const [scrapeStatus, setScrapeStatus] = useState<ReferenceScrapeStatus>(initialStatus);
  const [scrapeError, setScrapeError] = useState<string | null>(initialError);
  const [extractionStatus, setExtractionStatus] = useState<ReferenceExtractionStatus>(initialExtractionStatus);
  const [extractionJson, setExtractionJson] = useState<string | null>(initialExtractionJson);
  const [extractionErrorDetail, setExtractionErrorDetail] = useState<string | null>(() =>
    parseStoredExtractionError(initialExtractionJson, initialExtractionStatus),
  );
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
    const extractionDone =
      scrapeStatus !== 'success' || EXTRACTION_SETTLED.includes(extractionStatus);
    if (scrapeDone && extractionDone) return;

    let cancelled = false;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;

    const timer = setInterval(() => {
      if (cancelled) return;
      getReferenceStatus(blogId, refId)
        .then((s) => {
          if (cancelled) return;
          consecutiveErrors = 0;
          setScrapeStatus(s.scrapeStatus);
          setScrapeError(s.scrapeError);
          setExtractionStatus(s.extractionStatus);
          setExtractionJson(s.extractionJson);
          setExtractionErrorDetail(
            s.extractionError ?? parseStoredExtractionError(s.extractionJson, s.extractionStatus),
          );
          onReferenceUpdate(refId, {
            scrapeStatus: s.scrapeStatus,
            scrapeError: s.scrapeError,
            extractionStatus: s.extractionStatus,
            extractionJson: s.extractionJson,
          });
          const doneNow =
            SCRAPE_SETTLED.includes(s.scrapeStatus) &&
            (s.scrapeStatus !== 'success' || EXTRACTION_SETTLED.includes(s.extractionStatus));
          if (doneNow) clearInterval(timer);
        })
        .catch(() => {
          if (cancelled) return;
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) clearInterval(timer);
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
    } catch {
      // leave UI state; user can try again
    } finally {
      setRetrying(false);
    }
  }

  async function handleRemove() {
    try {
      await removeReference(blogId, refId);
    } finally {
      onRemove(refId);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="break-all text-sm text-slate-700">{url}</p>
        <button
          type="button"
          onClick={() => void handleRemove()}
          className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          aria-label="Remove reference"
        >
          ✕
        </button>
      </div>
      <ScrapeLine status={scrapeStatus} error={scrapeError} />
      <ExtractionLine
        scrapeStatus={scrapeStatus}
        extractionStatus={extractionStatus}
        extractionJson={extractionJson}
        errorDetail={extractionErrorDetail}
        onRetry={() => void handleRetryExtraction()}
        retrying={retrying}
      />
    </div>
  );
}

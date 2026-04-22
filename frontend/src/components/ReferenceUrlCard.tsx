import { useEffect, useRef } from 'react';
import { getReferenceStatus, removeReference, type ReferenceScrapeStatus } from '../api/blog-api.js';

interface Props {
  blogId: string;
  refId: string;
  url: string;
  initialStatus: ReferenceScrapeStatus;
  initialError: string | null;
  onRemove: (refId: string) => void;
  onStatusChange: (refId: string, status: ReferenceScrapeStatus) => void;
}

const SETTLED: ReferenceScrapeStatus[] = ['success', 'failed', 'timeout', 'skipped'];
const POLL_INTERVAL_MS = 2_000;

function StatusBadge({ status, error }: { status: ReferenceScrapeStatus; error: string | null }) {
  if (status === 'pending') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
        Scraping…
      </span>
    );
  }
  if (status === 'success') {
    return (
      <span className="text-xs font-medium text-green-600">✓ Scraped</span>
    );
  }
  if (status === 'timeout') {
    return (
      <span className="text-xs text-amber-600">
        ⚠ {error ?? 'Request timed out — the URL may be slow or unreachable.'}
      </span>
    );
  }
  return (
    <span className="text-xs text-red-600">
      ✗ {error ?? 'Could not fetch this URL. Copy relevant content into your Blog Brief instead.'}
    </span>
  );
}

export function ReferenceUrlCard({
  blogId,
  refId,
  url,
  initialStatus,
  initialError,
  onRemove,
  onStatusChange,
}: Props) {
  const statusRef = useRef<ReferenceScrapeStatus>(initialStatus);

  useEffect(() => {
    if (SETTLED.includes(initialStatus)) return;

    let cancelled = false;
    const timer = setInterval(() => {
      if (cancelled) return;
      getReferenceStatus(blogId, refId)
        .then(({ scrapeStatus }) => {
          if (cancelled) return;
          onStatusChange(refId, scrapeStatus);
          statusRef.current = scrapeStatus;
          if (SETTLED.includes(scrapeStatus)) clearInterval(timer);
        })
        .catch(() => {
          if (!cancelled) clearInterval(timer);
        });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [blogId, refId, initialStatus, onStatusChange]);

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
      <StatusBadge status={initialStatus} error={initialError} />
    </div>
  );
}

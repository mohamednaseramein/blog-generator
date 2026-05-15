import type { UsageRow } from '../api/subscription-api.js';

const METRIC_LABELS: Record<UsageRow['metric'], string> = {
  blogs: 'Blogs created',
  ai_checks: 'AI authenticity checks',
  author_profiles: 'Author profiles',
  reference_extractions: 'Reference extractions',
};

function formatLimit(limit: number | null): string {
  return limit === null ? 'Unlimited' : String(limit);
}

interface UsageMeterProps {
  row: UsageRow;
  periodLabel?: string;
}

export function UsageMeter({ row, periodLabel }: UsageMeterProps) {
  const label = METRIC_LABELS[row.metric];
  const limitText = formatLimit(row.limit);
  const isMonthly = row.metric !== 'author_profiles';
  const usageText =
    row.limit === null
      ? `${row.used} used${isMonthly && periodLabel ? ` ${periodLabel}` : ''} — Unlimited`
      : `${row.used} of ${limitText}${isMonthly && periodLabel ? ` ${periodLabel}` : ''}`;

  const pct =
    row.limit === null || row.limit === 0 ? 0 : Math.min(100, Math.round((row.used / row.limit) * 100));

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        <span className={row.exceeded ? 'font-medium text-red-700' : 'text-slate-600'} aria-live="polite">
          {usageText}
        </span>
      </div>
      {row.limit !== null && (
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={row.used}
          aria-valuemin={0}
          aria-valuemax={row.limit}
          aria-label={`${label}: ${usageText}`}
        >
          <div
            className={`h-full rounded-full transition-all ${row.exceeded ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

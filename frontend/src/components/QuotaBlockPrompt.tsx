import { Link } from 'react-router-dom';
import type { QuotaMetric } from '../api/subscription-api.js';
import { Button } from './ui/button.js';

const METRIC_LABELS: Record<QuotaMetric, string> = {
  blogs: 'blogs this month',
  ai_checks: 'AI checks this month',
  author_profiles: 'author profiles',
  reference_extractions: 'reference extractions this month',
};

interface QuotaBlockPromptProps {
  metric: QuotaMetric;
  limit: number;
  usage: number;
  message?: string;
}

export function QuotaBlockPrompt({ metric, limit, usage, message }: QuotaBlockPromptProps) {
  const label = METRIC_LABELS[metric];
  const body =
    message ??
    `You have used ${usage} of ${limit} ${label} on your current plan. Upgrade to continue.`;

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p className="font-medium">Plan limit reached</p>
      <p className="mt-1">{body}</p>
      <div className="mt-3">
        <Link to="/plan">
          <Button type="button" size="sm">
            View plan &amp; usage
          </Button>
        </Link>
      </div>
    </div>
  );
}

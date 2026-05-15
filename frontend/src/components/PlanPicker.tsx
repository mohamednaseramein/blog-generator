import { useState } from 'react';
import type { DowngradeConflict, PlanSummary } from '../api/subscription-api.js';
import { SubscriptionApiError, changeMyPlan } from '../api/subscription-api.js';
import { Button } from './ui/button';
import { Toast } from './ui/toast';

const METRIC_LABELS: Record<DowngradeConflict['metric'], string> = {
  blogs: 'Blogs this month',
  ai_checks: 'AI checks this month',
  author_profiles: 'Author profiles',
  reference_extractions: 'Reference extractions this month',
};

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
}

function formatLimit(n: number | null): string {
  return n === null ? 'Unlimited' : String(n);
}

interface PlanPickerProps {
  currentPlanId: string;
  plans: PlanSummary[];
  onChanged: (fromSlug: string, toSlug: string, toName: string) => void;
  onReload: () => Promise<void>;
}

export function PlanPicker({ currentPlanId, plans, onChanged, onReload }: PlanPickerProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);

  const alternatives = plans.filter((p) => p.id !== currentPlanId);

  async function handleSwitch(plan: PlanSummary) {
    const from = plans.find((p) => p.id === currentPlanId);
    if (!from) return;

    const preview =
      plan.priceCents >= from.priceCents
        ? `Switch to ${plan.name}? Your new limits apply immediately. Billing is not enabled yet — this preview is free.`
        : `Switch to ${plan.name}? Your usage counts carry over. Billing is not enabled yet — this preview is free.`;

    if (!window.confirm(preview)) return;

    setBusyId(plan.id);
    setError(null);
    setBlockMessage(null);
    try {
      await changeMyPlan(plan.id);
      onChanged(from.slug, plan.slug, plan.name);
      await onReload();
    } catch (e) {
      if (e instanceof SubscriptionApiError && e.code === 'DOWNGRADE_BLOCKED') {
        const lines = e.conflicts.map(
          (c) =>
            `${METRIC_LABELS[c.metric]}: you have ${c.used}, but ${plan.name} allows ${c.limit}. ` +
            'Reduce usage or wait for your monthly counters to reset, then try again.',
        );
        setBlockMessage(lines.join(' '));
      } else {
        setError((e as Error).message);
      }
    } finally {
      setBusyId(null);
    }
  }

  if (alternatives.length === 0) {
    return <p className="text-sm text-slate-600">No other public plans are available to switch to.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Billing is not enabled yet — plan changes are instant and free during this preview.
      </p>
      {blockMessage && (
        <Toast variant="error">
          {blockMessage}
        </Toast>
      )}
      {error && (
        <Toast variant="error">
          {error}
        </Toast>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {alternatives.map((plan) => {
          const busy = busyId === plan.id;
          return (
            <li
              key={plan.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatPrice(plan.priceCents, plan.currency)}
                <span className="text-sm font-normal text-slate-500"> / month</span>
              </p>
              <p className="mt-2 flex-1 text-sm text-slate-600">{plan.description}</p>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                <li>Blogs / month: {formatLimit(plan.limits.blogQuota)}</li>
                <li>AI checks / month: {formatLimit(plan.limits.aiCheckQuota)}</li>
                <li>Author profiles: {formatLimit(plan.limits.authorProfileLimit)}</li>
                <li>Reference extractions / month: {formatLimit(plan.limits.referenceExtractionQuota)}</li>
              </ul>
              <Button
                type="button"
                className="mt-4 w-full"
                size="sm"
                disabled={busy}
                onClick={() => void handleSwitch(plan)}
              >
                {busy ? 'Switching…' : `Switch to ${plan.name}`}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { listAdminPlans, type AdminPlanRow } from '../api/admin-api';
import {
  SubscriptionApiError,
  changeAdminUserSubscription,
  getAdminUserSubscription,
  type DowngradeConflict,
  type SubscriptionView,
} from '../api/subscription-api';
import { UsageMeter } from './UsageMeter';
import { Button } from './ui/button';
import { Toast } from './ui/toast';

const METRIC_LABELS: Record<DowngradeConflict['metric'], string> = {
  blogs: 'Blogs per month',
  ai_checks: 'AI checks per month',
  author_profiles: 'Author profiles',
  reference_extractions: 'Reference extractions per month',
};

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
}

function formatResetDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

interface AdminUserSubscriptionPanelProps {
  userId: string;
  disabled: boolean;
  onUpdated?: () => void;
}

export function AdminUserSubscriptionPanel({ userId, disabled, onUpdated }: AdminUserSubscriptionPanelProps) {
  const [view, setView] = useState<SubscriptionView | null>(null);
  const [plans, setPlans] = useState<AdminPlanRow[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [sub, { plans: catalogue }] = await Promise.all([
        getAdminUserSubscription(userId),
        listAdminPlans(),
      ]);
      setView(sub);
      setPlans(catalogue.filter((p) => !p.archivedAt));
      setSelectedPlanId(sub.plan.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleChange(override = false) {
    if (!selectedPlanId || selectedPlanId === view?.plan.id) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await changeAdminUserSubscription(userId, selectedPlanId, override);
      setView(updated);
      setSelectedPlanId(updated.plan.id);
      setSuccess(`Subscription updated to ${updated.plan.name}.`);
      onUpdated?.();
    } catch (e) {
      if (e instanceof SubscriptionApiError && e.code === 'DOWNGRADE_BLOCKED') {
        const lines = e.conflicts.map(
          (c) => `${METRIC_LABELS[c.metric]}: ${c.used} used, target plan allows ${c.limit}`,
        );
        const ok = window.confirm(
          `Usage exceeds the target plan on: ${lines.join('; ')}. Override and move this user anyway? They keep grandfathered limits until the period resets.`,
        );
        if (ok) {
          await handleChange(true);
          return;
        }
        setError('Plan change cancelled. Reduce usage or choose override to proceed.');
      } else {
        setError((e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading && !view) {
    return <p className="text-sm text-slate-500">Loading subscription…</p>;
  }

  if (!view) {
    return error ? <Toast variant="error">{error}</Toast> : null;
  }

  const activePlans = plans.filter((p) => p.id !== view.plan.id);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Subscription</h2>
        <p className="mt-1 text-sm text-slate-600">
          Current plan: <span className="font-medium text-slate-900">{view.plan.name}</span> (
          {formatPrice(view.plan.priceCents, view.plan.currency)} / month, display only)
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Period resets{' '}
          <time dateTime={view.periodResetsAt}>{formatResetDate(view.periodResetsAt)}</time>
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usage this period</p>
        {view.usage.map((row) => (
          <UsageMeter key={row.metric} row={row} periodLabel="this month" />
        ))}
      </div>

      {error && <Toast variant="error">{error}</Toast>}
      {success && <Toast variant="info">{success}</Toast>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm">
          <span className="mb-1 block font-medium text-slate-700">Move to plan</span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-slate-100"
            value={selectedPlanId}
            disabled={disabled || busy}
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            <option value={view.plan.id}>{view.plan.name} (current)</option>
            {activePlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isPublic ? '' : ' (private)'}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          size="sm"
          disabled={disabled || busy || selectedPlanId === view.plan.id}
          onClick={() => void handleChange(false)}
        >
          {busy ? 'Updating…' : 'Update plan'}
        </Button>
      </div>

      {disabled && (
        <p className="text-xs text-amber-800">Plan changes are disabled while this account is deactivated.</p>
      )}
    </div>
  );
}

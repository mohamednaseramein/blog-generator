import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getPublicPlans } from '../api/plan-api';
import {
  getMySubscription,
  type PlanSummary,
  type SubscriptionView,
} from '../api/subscription-api';
import { PlanPicker } from '../components/PlanPicker';
import { UsageMeter } from '../components/UsageMeter';
import { Toast } from '../components/ui/toast';
import { WorkspaceLayout } from '../components/WorkspaceLayout';
import { WorkspaceSidebar } from '../components/WorkspaceSidebar';
import { recordPlanChanged, recordPlanViewed } from '../lib/plan-analytics';
import { useAuth } from '../context/AuthContext';

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

export default function PlanUsagePage() {
  const { user, role } = useAuth();
  const viewedRef = useRef(false);
  const [view, setView] = useState<SubscriptionView | null>(null);
  const [publicPlans, setPublicPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [sub, { plans }] = await Promise.all([getMySubscription(), getPublicPlans()]);
      setView(sub);
      setPublicPlans(plans);
      if (!viewedRef.current) {
        viewedRef.current = true;
        recordPlanViewed();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return <Navigate to="/login" replace />;

  const showAdmin = role === 'admin';

  return (
    <WorkspaceLayout
      sidebar={<WorkspaceSidebar mode="router" active="plan" showAdmin={showAdmin} />}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Plan &amp; usage</h1>
        <p className="mt-1 text-sm text-slate-600">
          View your subscription tier, monthly usage, and switch plans. Billing is display-only during this preview.
        </p>

        {error && (
          <div className="mt-4">
            <Toast variant="error">{error}</Toast>
          </div>
        )}
        {success && (
          <div className="mt-4">
            <Toast variant="info">{success}</Toast>
          </div>
        )}

        {loading && !view ? (
          <p className="mt-8 text-center text-slate-500">Loading your plan…</p>
        ) : view ? (
          <div className="mt-8 space-y-8">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Current plan</h2>
              <p className="mt-2 text-3xl font-bold text-slate-900">{view.plan.name}</p>
              <p className="mt-1 text-slate-600">
                {formatPrice(view.plan.priceCents, view.plan.currency)} / month (display only — not charged)
              </p>
              {view.plan.description && <p className="mt-3 text-sm text-slate-600">{view.plan.description}</p>}
              <p className="mt-4 text-sm text-slate-600">
                Monthly counters reset on{' '}
                <time dateTime={view.periodResetsAt}>{formatResetDate(view.periodResetsAt)}</time>
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Usage this period</h2>
              <div className="mt-4 space-y-4">
                {view.usage.map((row) => (
                  <UsageMeter key={row.metric} row={row} periodLabel="this month" />
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Change plan</h2>
              <div className="mt-4">
                <PlanPicker
                  currentPlanId={view.plan.id}
                  plans={publicPlans}
                  onChanged={(fromSlug, toSlug, toName) => {
                    recordPlanChanged({ from_plan_slug: fromSlug, to_plan_slug: toSlug });
                    setSuccess(`You are now on the ${toName} plan.`);
                  }}
                  onReload={load}
                />
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </WorkspaceLayout>
  );
}

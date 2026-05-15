/** Subscription plan analytics — wire to product SDK when available. */

import type { QuotaMetric } from '../api/subscription-api.js';

export type PlanChangedPayload = {
  from_plan_slug: string;
  to_plan_slug: string;
};

export function recordPlanViewed(): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- dev-only funnel debugging
    console.debug('[plan analytics] plan_viewed');
  }
}

export function recordPlanChanged(payload: PlanChangedPayload): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- dev-only funnel debugging
    console.debug('[plan analytics] plan_changed', payload);
  }
}

export function recordQuotaBlocked(metric: QuotaMetric): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- dev-only funnel debugging
    console.debug('[plan analytics] quota_blocked', { metric });
  }
}

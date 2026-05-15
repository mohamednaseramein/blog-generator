import type { QuotaMetric } from '../domain/subscription-types.js';
import { AppError } from '../middleware/error-handler.js';
import { getPlanById } from '../repositories/plan-repository.js';
import { getActiveSubscriptionByUserId } from '../repositories/subscription-repository.js';
import { computeUsage, QUOTA_METRIC_LABELS } from './quota-service.js';

/**
 * Throws when the user is at or over the plan limit for `metric`.
 * No-ops when under the limit or the plan grants unlimited usage for that metric.
 */
export async function assertWithinQuota(userId: string, metric: QuotaMetric): Promise<void> {
  const subscription = await getActiveSubscriptionByUserId(userId);
  if (!subscription) {
    throw new AppError(404, 'NO_SUBSCRIPTION', 'No active subscription found for this account');
  }

  const plan = await getPlanById(subscription.planId);
  if (!plan) {
    throw new AppError(500, 'PLAN_MISSING', 'Subscription references a plan that no longer exists');
  }

  const usage = await computeUsage(
    userId,
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd,
    plan.limits,
  );

  const row = usage.find((u) => u.metric === metric);
  if (!row) {
    throw new Error(`Unknown quota metric: ${metric}`);
  }

  if (!row.exceeded) return;

  const label = QUOTA_METRIC_LABELS[metric];
  throw new AppError(
    402,
    'QUOTA_EXCEEDED',
    `You have reached your ${label}. Upgrade your plan to continue.`,
    { metric, limit: row.limit, usage: row.used },
  );
}

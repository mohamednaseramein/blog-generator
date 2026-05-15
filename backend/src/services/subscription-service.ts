import type {
  DowngradeConflict,
  Plan,
  PlanLimits,
  SubscriptionView,
  UsageSnapshot,
} from '../domain/subscription-types.js';
import { AppError } from '../middleware/error-handler.js';
import { getPlanById } from '../repositories/plan-repository.js';
import {
  getActiveSubscriptionByUserId,
  updateSubscriptionPlan,
} from '../repositories/subscription-repository.js';
import { computeUsage } from './quota-service.js';

export const METRIC_LABELS: Record<string, string> = {
  blogs: 'blogs this month',
  ai_checks: 'AI checks this month',
  author_profiles: 'author profiles',
  reference_extractions: 'reference extractions this month',
};

function findDowngradeConflicts(usage: UsageSnapshot[], targetLimits: PlanLimits): DowngradeConflict[] {
  const limitByMetric: Record<string, number | null> = {
    blogs: targetLimits.blogQuota,
    ai_checks: targetLimits.aiCheckQuota,
    author_profiles: targetLimits.authorProfileLimit,
    reference_extractions: targetLimits.referenceExtractionQuota,
  };

  const conflicts: DowngradeConflict[] = [];
  for (const row of usage) {
    const targetLimit = limitByMetric[row.metric];
    if (targetLimit === null) continue;
    if (row.used > targetLimit) {
      conflicts.push({ metric: row.metric, used: row.used, limit: targetLimit });
    }
  }
  return conflicts;
}

export async function getSubscriptionView(userId: string): Promise<SubscriptionView> {
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

  return {
    subscription,
    plan,
    usage,
    periodResetsAt: subscription.currentPeriodEnd,
  };
}

export interface ChangePlanOptions {
  /** Admin user id when admin-initiated; null for self-serve. */
  actor?: string | null;
  /** Admin override — bypass downgrade block (US-SUB-04; not used in self-serve). */
  override?: boolean;
}

export async function changePlan(
  userId: string,
  targetPlanId: string,
  options: ChangePlanOptions = {},
): Promise<SubscriptionView> {
  const subscription = await getActiveSubscriptionByUserId(userId);
  if (!subscription) {
    throw new AppError(404, 'NO_SUBSCRIPTION', 'No active subscription found for this account');
  }

  if (subscription.planId === targetPlanId) {
    return getSubscriptionView(userId);
  }

  const targetPlan = await getPlanById(targetPlanId);
  if (!targetPlan || targetPlan.archivedAt || !targetPlan.isPublic) {
    throw new AppError(404, 'NOT_FOUND', 'Plan not found or not available for self-serve');
  }

  const currentPlan = await getPlanById(subscription.planId);
  if (!currentPlan) {
    throw new AppError(500, 'PLAN_MISSING', 'Current subscription plan could not be loaded');
  }

  const usage = await computeUsage(
    userId,
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd,
    currentPlan.limits,
  );

  const conflicts = findDowngradeConflicts(usage, targetPlan.limits);
  if (conflicts.length > 0 && !options.override) {
    const parts = conflicts.map(
      (c) => `${METRIC_LABELS[c.metric] ?? c.metric}: ${c.used} used, plan allows ${c.limit}`,
    );
    throw new AppError(409, 'DOWNGRADE_BLOCKED', `Cannot switch to this plan: ${parts.join('; ')}`, {
      conflicts,
    });
  }

  const changedBy = options.actor ?? null;
  await updateSubscriptionPlan(subscription.id, targetPlanId, changedBy);
  return getSubscriptionView(userId);
}

/** Exposed for tests — compares usage against target plan limits. */
export function downgradeConflictsForPlan(usage: UsageSnapshot[], targetPlan: Plan): DowngradeConflict[] {
  return findDowngradeConflicts(usage, targetPlan.limits);
}

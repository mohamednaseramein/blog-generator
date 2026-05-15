import type { Request, Response, NextFunction } from 'express';
import type { Plan, Subscription, SubscriptionView, UsageSnapshot } from '../domain/subscription-types.js';
import { AppError } from '../middleware/error-handler.js';
import { getUserId } from '../middleware/auth.js';
import { changePlan, getSubscriptionView } from '../services/subscription-service.js';

function planToJson(plan: Plan) {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    priceCents: plan.priceCents,
    currency: plan.currency,
    billingPeriod: plan.billingPeriod,
    limits: plan.limits,
    isPublic: plan.isPublic,
    sortOrder: plan.sortOrder,
  };
}

function subscriptionToJson(sub: Subscription) {
  return {
    id: sub.id,
    planId: sub.planId,
    status: sub.status,
    currentPeriodStart: sub.currentPeriodStart.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    changedBy: sub.changedBy,
  };
}

function usageToJson(usage: UsageSnapshot[]) {
  return usage.map((u) => ({
    metric: u.metric,
    used: u.used,
    limit: u.limit,
    exceeded: u.exceeded,
  }));
}

function viewToJson(view: SubscriptionView) {
  return {
    subscription: subscriptionToJson(view.subscription),
    plan: planToJson(view.plan),
    usage: usageToJson(view.usage),
    periodResetsAt: view.periodResetsAt.toISOString(),
  };
}

export async function getMySubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const view = await getSubscriptionView(userId);
    res.json(viewToJson(view));
  } catch (err) {
    next(err);
  }
}

export async function changeMyPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const body = req.body as Record<string, unknown>;
    const planId = typeof body.planId === 'string' ? body.planId : typeof body.plan_id === 'string' ? body.plan_id : '';
    if (!planId.trim()) {
      throw new AppError(400, 'VALIDATION', 'planId is required');
    }

    const view = await changePlan(userId, planId.trim(), { actor: null, override: false });
    res.json(viewToJson(view));
  } catch (err) {
    next(err);
  }
}

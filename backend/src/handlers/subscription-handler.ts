import type { Request, Response, NextFunction } from 'express';
import type { Plan, Subscription, SubscriptionView, UsageSnapshot } from '../domain/subscription-types.js';
import { getSupabase } from '../db/supabase.js';
import { AppError } from '../middleware/error-handler.js';
import { getUserId } from '../middleware/auth.js';
import { changePlan, getSubscriptionView } from '../services/subscription-service.js';

function routeParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

async function assertUserAllowsPlanChange(userId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from('users')
    .select('deactivated_at')
    .eq('id', userId)
    .single<{ deactivated_at: string | null }>();

  if (error?.code === 'PGRST116') {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }
  if (error) throw new Error(error.message);
  if (data.deactivated_at) {
    throw new AppError(400, 'USER_DEACTIVATED', 'Cannot change plan for a deactivated user');
  }
}

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

export async function getUserSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = routeParam(req.params.id);
    if (!userId) throw new AppError(400, 'VALIDATION', 'Missing user id');

    const view = await getSubscriptionView(userId);
    res.json(viewToJson(view));
  } catch (err) {
    next(err);
  }
}

export async function changeUserSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = getUserId(req);
    const userId = routeParam(req.params.id);
    if (!userId) throw new AppError(400, 'VALIDATION', 'Missing user id');

    await assertUserAllowsPlanChange(userId);

    const body = req.body as Record<string, unknown>;
    const planId = typeof body.planId === 'string' ? body.planId : typeof body.plan_id === 'string' ? body.plan_id : '';
    if (!planId.trim()) {
      throw new AppError(400, 'VALIDATION', 'planId is required');
    }
    const override = Boolean(body.override);

    const view = await changePlan(userId, planId.trim(), { actor: adminId, override });
    res.json(viewToJson(view));
  } catch (err) {
    next(err);
  }
}

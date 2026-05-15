import type { Request, Response, NextFunction } from 'express';
import type { Plan } from '../domain/subscription-types.js';
import { listPublicPlans } from '../repositories/plan-repository.js';

function publicPlanToJson(plan: Plan) {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    priceCents: plan.priceCents,
    currency: plan.currency,
    billingPeriod: plan.billingPeriod,
    limits: plan.limits,
    sortOrder: plan.sortOrder,
  };
}

/** Public catalogue for landing + self-serve plan picker (US-SUB-09 / US-SUB-06). */
export async function listPublicPlansHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const plans = await listPublicPlans();
    res.json({ plans: plans.map(publicPlanToJson) });
  } catch (err) {
    next(err);
  }
}

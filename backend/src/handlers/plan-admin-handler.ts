import type { Request, Response, NextFunction } from 'express';
import type { Plan } from '../domain/subscription-types.js';
import { AppError } from '../middleware/error-handler.js';
import {
  countActiveSubscribersForPlan,
  getPlanById,
  getPlanBySlug,
  insertPlan,
  listAllPlans,
  setPlanDefault as setDefaultPlanInDb,
  updatePlanById,
  type InsertPlanRow,
  type PatchPlanRow,
} from '../repositories/plan-repository.js';

function routeParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function planToJson(plan: Plan, activeSubscriberCount: number) {
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
    isDefault: plan.isDefault,
    archivedAt: plan.archivedAt?.toISOString() ?? null,
    sortOrder: plan.sortOrder,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    activeSubscriberCount,
  };
}

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return s.length > 0 ? s : 'plan';
}

async function allocateUniqueSlug(base: string): Promise<string> {
  let candidate = base;
  for (let n = 0; n < 50; n += 1) {
    const existing = await getPlanBySlug(candidate);
    if (!existing) return candidate;
    const suffix = n === 0 ? '-2' : `-${n + 2}`;
    candidate = `${base.slice(0, Math.max(1, 50 - suffix.length))}${suffix}`;
  }
  throw new AppError(500, 'SLUG_ALLOCATION_FAILED', 'Could not allocate a unique plan slug');
}

function parseOptionalLimit(v: unknown, field: string): number | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) {
    throw new AppError(400, 'VALIDATION', `${field} must be a whole number or empty for unlimited`);
  }
  if (v < 0) throw new AppError(400, 'VALIDATION', `${field} cannot be negative`);
  return v;
}

function parseRequiredName(v: unknown): string {
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new AppError(400, 'VALIDATION', 'Name is required');
  }
  if (v.length > 120) throw new AppError(400, 'VALIDATION', 'Name must be at most 120 characters');
  return v.trim();
}

function parseDescription(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') throw new AppError(400, 'VALIDATION', 'Description must be a string');
  return v;
}

function parsePriceCents(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) {
    throw new AppError(400, 'VALIDATION', 'priceCents must be a whole number');
  }
  if (v < 0) throw new AppError(400, 'VALIDATION', 'priceCents cannot be negative');
  return v;
}

function parseCurrency(v: unknown): string {
  const c = typeof v === 'string' && v.length === 3 ? v.toUpperCase() : 'USD';
  if (!/^[A-Z]{3}$/.test(c)) throw new AppError(400, 'VALIDATION', 'currency must be a 3-letter ISO code');
  return c;
}

function parseSortOrder(v: unknown, fallback: number): number {
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) {
    throw new AppError(400, 'VALIDATION', 'sortOrder must be an integer');
  }
  if (v < 0 || v > 32767) throw new AppError(400, 'VALIDATION', 'sortOrder out of range');
  return v;
}

export async function listAdminPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const plans = await listAllPlans();
    const rows = await Promise.all(
      plans.map(async (plan) => {
        const activeSubscriberCount = await countActiveSubscribersForPlan(plan.id);
        return planToJson(plan, activeSubscriberCount);
      }),
    );
    res.json({ plans: rows });
  } catch (err) {
    next(err);
  }
}

export async function createAdminPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const name = parseRequiredName(body.name);
    const description = parseDescription(body.description);
    const priceCents = parsePriceCents(body.priceCents ?? body.price_cents ?? 0);
    const currency = parseCurrency(body.currency);

    const blogQuota = parseOptionalLimit(body.blogQuota ?? body.blog_quota, 'blogQuota');
    const aiCheckQuota = parseOptionalLimit(body.aiCheckQuota ?? body.ai_check_quota, 'aiCheckQuota');
    const authorProfileLimit = parseOptionalLimit(
      body.authorProfileLimit ?? body.author_profile_limit,
      'authorProfileLimit',
    );
    const referenceExtractionQuota = parseOptionalLimit(
      body.referenceExtractionQuota ?? body.reference_extraction_quota,
      'referenceExtractionQuota',
    );

    const isPublic = Boolean(body.isPublic ?? body.is_public);

    const plans = await listAllPlans();
    const maxSort = plans.reduce((m, p) => Math.max(m, p.sortOrder), 0);
    const sortOrder = parseSortOrder(body.sortOrder ?? body.sort_order, maxSort + 1);

    let slug: string;
    if (typeof body.slug === 'string' && body.slug.trim().length > 0) {
      slug = body.slug.trim().toLowerCase().slice(0, 50);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new AppError(400, 'VALIDATION', 'slug must be lowercase letters, digits, and single hyphens');
      }
      if (await getPlanBySlug(slug)) throw new AppError(409, 'SLUG_TAKEN', 'That slug is already in use');
    } else {
      slug = await allocateUniqueSlug(slugify(name));
    }

    const row: InsertPlanRow = {
      slug,
      name,
      description,
      price_cents: priceCents,
      currency,
      blog_quota: blogQuota,
      ai_check_quota: aiCheckQuota,
      author_profile_limit: authorProfileLimit,
      reference_extraction_quota: referenceExtractionQuota,
      is_public: isPublic,
      is_default: false,
      sort_order: sortOrder,
    };

    const plan = await insertPlan(row);
    const activeSubscriberCount = await countActiveSubscribersForPlan(plan.id);
    res.status(201).json({ plan: planToJson(plan, activeSubscriberCount) });
  } catch (err) {
    next(err);
  }
}

export async function patchAdminPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = routeParam(req.params.id);
    if (!id) throw new AppError(400, 'VALIDATION', 'Missing plan id');

    const existing = await getPlanById(id);
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Plan not found');
    if (existing.archivedAt) throw new AppError(400, 'ARCHIVED', 'Cannot edit an archived plan');

    const body = req.body as Record<string, unknown>;
    const subscribers = await countActiveSubscribersForPlan(id);

    const patch: PatchPlanRow = {};

    if (body.slug !== undefined || body.name !== undefined) {
      const nextSlug =
        typeof body.slug === 'string' && body.slug.trim().length > 0
          ? body.slug.trim().toLowerCase().slice(0, 50)
          : existing.slug;
      if (nextSlug !== existing.slug) {
        if (subscribers > 0) {
          throw new AppError(
            409,
            'SLUG_LOCKED',
            'Cannot change slug while the plan has active subscribers',
          );
        }
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) {
          throw new AppError(400, 'VALIDATION', 'slug must be lowercase letters, digits, and single hyphens');
        }
        const taken = await getPlanBySlug(nextSlug);
        if (taken && taken.id !== id) throw new AppError(409, 'SLUG_TAKEN', 'That slug is already in use');
        patch.slug = nextSlug;
      }
    }

    if (body.name !== undefined) patch.name = parseRequiredName(body.name);
    if (body.description !== undefined) patch.description = parseDescription(body.description);
    if (body.priceCents !== undefined || body.price_cents !== undefined) {
      patch.price_cents = parsePriceCents(body.priceCents ?? body.price_cents);
    }
    if (body.currency !== undefined) patch.currency = parseCurrency(body.currency);
    if (body.blogQuota !== undefined || body.blog_quota !== undefined) {
      patch.blog_quota = parseOptionalLimit(body.blogQuota ?? body.blog_quota, 'blogQuota');
    }
    if (body.aiCheckQuota !== undefined || body.ai_check_quota !== undefined) {
      patch.ai_check_quota = parseOptionalLimit(body.aiCheckQuota ?? body.ai_check_quota, 'aiCheckQuota');
    }
    if (body.authorProfileLimit !== undefined || body.author_profile_limit !== undefined) {
      patch.author_profile_limit = parseOptionalLimit(
        body.authorProfileLimit ?? body.author_profile_limit,
        'authorProfileLimit',
      );
    }
    if (body.referenceExtractionQuota !== undefined || body.reference_extraction_quota !== undefined) {
      patch.reference_extraction_quota = parseOptionalLimit(
        body.referenceExtractionQuota ?? body.reference_extraction_quota,
        'referenceExtractionQuota',
      );
    }
    if (body.isPublic !== undefined || body.is_public !== undefined) {
      patch.is_public = Boolean(body.isPublic ?? body.is_public);
    }
    if (body.sortOrder !== undefined || body.sort_order !== undefined) {
      patch.sort_order = parseSortOrder(body.sortOrder ?? body.sort_order, existing.sortOrder);
    }

    if (Object.keys(patch).length === 0) {
      const activeSubscriberCount = await countActiveSubscribersForPlan(id);
      res.json({ plan: planToJson(existing, activeSubscriberCount) });
      return;
    }

    const plan = await updatePlanById(id, patch);
    const activeSubscriberCount = await countActiveSubscribersForPlan(plan.id);
    res.json({ plan: planToJson(plan, activeSubscriberCount) });
  } catch (err) {
    next(err);
  }
}

export async function archiveAdminPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = routeParam(req.params.id);
    if (!id) throw new AppError(400, 'VALIDATION', 'Missing plan id');

    const plan = await getPlanById(id);
    if (!plan) throw new AppError(404, 'NOT_FOUND', 'Plan not found');
    if (plan.archivedAt) throw new AppError(400, 'ALREADY_ARCHIVED', 'Plan is already archived');
    if (plan.isDefault) {
      throw new AppError(
        409,
        'DEFAULT_PLAN',
        'Cannot archive the default plan. Designate another plan as default first.',
      );
    }
    const n = await countActiveSubscribersForPlan(id);
    if (n > 0) {
      throw new AppError(
        409,
        'HAS_SUBSCRIBERS',
        `Cannot archive: ${n} active subscriber(s). Move them to another plan first.`,
      );
    }

    const archived = await updatePlanById(id, {
      archived_at: new Date().toISOString(),
      is_public: false,
      is_default: false,
    });
    const activeSubscriberCount = await countActiveSubscribersForPlan(archived.id);
    res.json({ plan: planToJson(archived, activeSubscriberCount) });
  } catch (err) {
    next(err);
  }
}

export async function setDefaultAdminPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = routeParam(req.params.id);
    if (!id) throw new AppError(400, 'VALIDATION', 'Missing plan id');

    const plan = await getPlanById(id);
    if (!plan) throw new AppError(404, 'NOT_FOUND', 'Plan not found');
    if (plan.archivedAt) throw new AppError(400, 'ARCHIVED', 'Cannot set an archived plan as default');

    const updated = await setDefaultPlanInDb(id);
    const activeSubscriberCount = await countActiveSubscribersForPlan(updated.id);
    res.json({ plan: planToJson(updated, activeSubscriberCount) });
  } catch (err) {
    next(err);
  }
}

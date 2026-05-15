import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Plan, UsageSnapshot } from '../../domain/subscription-types.js';
import { AppError } from '../../middleware/error-handler.js';
import * as planRepo from '../../repositories/plan-repository.js';
import * as subRepo from '../../repositories/subscription-repository.js';
import * as quotaService from '../quota-service.js';
import { assertWithinQuota } from '../quota-enforcement.js';

vi.mock('../../repositories/plan-repository.js');
vi.mock('../../repositories/subscription-repository.js');
vi.mock('../quota-service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../quota-service.js')>();
  return {
    ...actual,
    computeUsage: vi.fn(),
  };
});

const PLAN: Plan = {
  id: 'plan-free',
  slug: 'free',
  name: 'Free',
  description: '',
  priceCents: 0,
  currency: 'USD',
  billingPeriod: 'monthly',
  limits: { blogQuota: 3, aiCheckQuota: 5, authorProfileLimit: 1, referenceExtractionQuota: 10 },
  isPublic: true,
  isDefault: true,
  archivedAt: null,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const SUBSCRIPTION = {
  id: 'sub-1',
  userId: 'user-1',
  planId: 'plan-free',
  status: 'active' as const,
  currentPeriodStart: new Date('2026-05-01T00:00:00Z'),
  currentPeriodEnd: new Date('2026-06-01T00:00:00Z'),
  stripeSubscriptionId: null,
  changedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function usageFor(metric: UsageSnapshot['metric'], used: number, limit: number | null): UsageSnapshot[] {
  return [
    { metric: 'blogs', used: 0, limit: 3, exceeded: false },
    { metric: 'ai_checks', used: 0, limit: 5, exceeded: false },
    { metric: 'author_profiles', used: 0, limit: 1, exceeded: false },
    { metric: 'reference_extractions', used: 0, limit: 10, exceeded: false },
  ].map((row) =>
    row.metric === metric
      ? { ...row, used, limit, exceeded: limit !== null && used >= limit }
      : row,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(subRepo.getActiveSubscriptionByUserId).mockResolvedValue(SUBSCRIPTION);
  vi.mocked(planRepo.getPlanById).mockResolvedValue(PLAN);
});

describe('assertWithinQuota', () => {
  it('blocks when used equals the limit (inclusive max)', async () => {
    vi.mocked(quotaService.computeUsage).mockResolvedValue(usageFor('blogs', 3, 3));

    await expect(assertWithinQuota('user-1', 'blogs')).rejects.toMatchObject({
      status: 402,
      code: 'QUOTA_EXCEEDED',
      details: { metric: 'blogs', limit: 3, usage: 3 },
    });
  });

  it('allows when used is below the limit', async () => {
    vi.mocked(quotaService.computeUsage).mockResolvedValue(usageFor('blogs', 2, 3));

    await expect(assertWithinQuota('user-1', 'blogs')).resolves.toBeUndefined();
  });

  it('never blocks when the plan limit is unlimited', async () => {
    const unlimitedPlan: Plan = {
      ...PLAN,
      limits: { blogQuota: null, aiCheckQuota: null, authorProfileLimit: null, referenceExtractionQuota: null },
    };
    vi.mocked(planRepo.getPlanById).mockResolvedValue(unlimitedPlan);
    vi.mocked(quotaService.computeUsage).mockResolvedValue(usageFor('blogs', 999, null));

    await expect(assertWithinQuota('user-1', 'blogs')).resolves.toBeUndefined();
  });

  it('throws 402 for ai_checks, author_profiles, and reference_extractions at limit', async () => {
    for (const metric of ['ai_checks', 'author_profiles', 'reference_extractions'] as const) {
      vi.mocked(quotaService.computeUsage).mockResolvedValue(usageFor(metric, 10, 10));
      await expect(assertWithinQuota('user-1', metric)).rejects.toBeInstanceOf(AppError);
    }
  });
});

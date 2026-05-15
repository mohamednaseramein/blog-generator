import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Plan, UsageSnapshot } from '../../domain/subscription-types.js';
import { AppError } from '../../middleware/error-handler.js';
import * as planRepo from '../../repositories/plan-repository.js';
import * as subRepo from '../../repositories/subscription-repository.js';
import * as quotaService from '../quota-service.js';
import { changePlan, downgradeConflictsForPlan } from '../subscription-service.js';

vi.mock('../../repositories/plan-repository.js');
vi.mock('../../repositories/subscription-repository.js');
vi.mock('../quota-service.js');

const FREE_PLAN: Plan = {
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

const PRO_PLAN: Plan = {
  ...FREE_PLAN,
  id: 'plan-pro',
  slug: 'pro',
  name: 'Pro',
  priceCents: 1900,
  limits: { blogQuota: 50, aiCheckQuota: 200, authorProfileLimit: 10, referenceExtractionQuota: 300 },
  isDefault: false,
  sortOrder: 2,
};

const SUBSCRIPTION = {
  id: 'sub-1',
  userId: 'user-1',
  planId: 'plan-pro',
  status: 'active' as const,
  currentPeriodStart: new Date('2026-05-01T00:00:00Z'),
  currentPeriodEnd: new Date('2026-06-01T00:00:00Z'),
  stripeSubscriptionId: null,
  changedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const USAGE_WITH_PROFILES: UsageSnapshot[] = [
  { metric: 'blogs', used: 2, limit: 50, exceeded: false },
  { metric: 'ai_checks', used: 1, limit: 200, exceeded: false },
  { metric: 'author_profiles', used: 3, limit: 10, exceeded: false },
  { metric: 'reference_extractions', used: 0, limit: 300, exceeded: false },
];

beforeEach(() => vi.clearAllMocks());

describe('downgradeConflictsForPlan', () => {
  it('flags author_profiles when used exceeds target limit', () => {
    const conflicts = downgradeConflictsForPlan(USAGE_WITH_PROFILES, FREE_PLAN);
    expect(conflicts).toEqual([{ metric: 'author_profiles', used: 3, limit: 1 }]);
  });

  it('returns no conflicts when usage fits every capped metric', () => {
    const usage: UsageSnapshot[] = [
      { metric: 'blogs', used: 2, limit: 50, exceeded: false },
      { metric: 'ai_checks', used: 1, limit: 200, exceeded: false },
      { metric: 'author_profiles', used: 1, limit: 10, exceeded: false },
      { metric: 'reference_extractions', used: 5, limit: 300, exceeded: false },
    ];
    expect(downgradeConflictsForPlan(usage, FREE_PLAN)).toEqual([]);
  });

  it('ignores unlimited target limits', () => {
    const teamPlan: Plan = {
      ...PRO_PLAN,
      limits: { blogQuota: null, aiCheckQuota: null, authorProfileLimit: 50, referenceExtractionQuota: null },
    };
    const usage: UsageSnapshot[] = [
      { metric: 'blogs', used: 100, limit: 50, exceeded: true },
      { metric: 'ai_checks', used: 0, limit: 200, exceeded: false },
      { metric: 'author_profiles', used: 2, limit: 10, exceeded: false },
      { metric: 'reference_extractions', used: 0, limit: 300, exceeded: false },
    ];
    expect(downgradeConflictsForPlan(usage, teamPlan)).toEqual([]);
  });
});

describe('changePlan', () => {
  it('blocks downgrade when usage exceeds target limits', async () => {
    vi.mocked(subRepo.getActiveSubscriptionByUserId).mockResolvedValue(SUBSCRIPTION);
    vi.mocked(planRepo.getPlanById).mockImplementation(async (id: string) => {
      if (id === 'plan-pro') return PRO_PLAN;
      if (id === 'plan-free') return FREE_PLAN;
      return null;
    });
    vi.mocked(quotaService.computeUsage).mockResolvedValue(USAGE_WITH_PROFILES);

    await expect(changePlan('user-1', 'plan-free')).rejects.toMatchObject({
      status: 409,
      code: 'DOWNGRADE_BLOCKED',
    });
    expect(subRepo.updateSubscriptionPlan).not.toHaveBeenCalled();
  });

  it('allows upgrade and preserves subscription period (no period reset)', async () => {
    vi.mocked(subRepo.getActiveSubscriptionByUserId)
      .mockResolvedValueOnce({ ...SUBSCRIPTION, planId: 'plan-free' })
      .mockResolvedValueOnce({ ...SUBSCRIPTION, planId: 'plan-pro' });
    vi.mocked(planRepo.getPlanById).mockImplementation(async (id: string) => {
      if (id === 'plan-free') return FREE_PLAN;
      if (id === 'plan-pro') return PRO_PLAN;
      return null;
    });
    vi.mocked(quotaService.computeUsage).mockResolvedValue([
      { metric: 'blogs', used: 2, limit: 3, exceeded: false },
      { metric: 'ai_checks', used: 1, limit: 5, exceeded: false },
      { metric: 'author_profiles', used: 1, limit: 1, exceeded: true },
      { metric: 'reference_extractions', used: 0, limit: 10, exceeded: false },
    ]);
    vi.mocked(subRepo.updateSubscriptionPlan).mockResolvedValue({ ...SUBSCRIPTION, planId: 'plan-pro' });

    const view = await changePlan('user-1', 'plan-pro');
    expect(subRepo.updateSubscriptionPlan).toHaveBeenCalledWith('sub-1', 'plan-pro', null);
    expect(view.plan.id).toBe('plan-pro');
    expect(view.usage).toHaveLength(4);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { Plan, Subscription, SubscriptionView } from '../../domain/subscription-types.js';
import { changeUserSubscription, getUserSubscription } from '../subscription-handler.js';
import * as subscriptionService from '../../services/subscription-service.js';
import { getSupabase } from '../../db/supabase.js';

vi.mock('../../services/subscription-service.js');
vi.mock('../../db/supabase.js', () => ({
  getSupabase: vi.fn(),
}));

const VIEW: SubscriptionView = {
  subscription: {
    id: 'sub-1',
    userId: 'user-1',
    planId: 'plan-pro',
    status: 'active',
    currentPeriodStart: new Date('2026-05-01T00:00:00Z'),
    currentPeriodEnd: new Date('2026-06-01T00:00:00Z'),
    stripeSubscriptionId: null,
    changedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  plan: {
    id: 'plan-pro',
    slug: 'pro',
    name: 'Pro',
    description: '',
    priceCents: 1900,
    currency: 'USD',
    billingPeriod: 'monthly',
    limits: { blogQuota: 50, aiCheckQuota: 200, authorProfileLimit: 10, referenceExtractionQuota: 300 },
    isPublic: true,
    isDefault: false,
    archivedAt: null,
    sortOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Plan,
  usage: [],
  periodResetsAt: new Date('2026-06-01T00:00:00Z'),
};

function makeReq(body: unknown = {}, params: Record<string, string> = {}, userId = 'admin-1'): Request {
  return { body, params, userId } as unknown as Request;
}

function makeRes(): { res: Response; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const res = { json, status: vi.fn().mockReturnThis() } as unknown as Response;
  return { res, json };
}

const next: NextFunction = vi.fn();

function mockActiveUser() {
  vi.mocked(getSupabase).mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { deactivated_at: null }, error: null }),
        }),
      }),
    }),
  } as unknown as ReturnType<typeof getSupabase>);
}

beforeEach(() => vi.clearAllMocks());

describe('getUserSubscription', () => {
  it('returns subscription view JSON', async () => {
    vi.mocked(subscriptionService.getSubscriptionView).mockResolvedValue(VIEW);
    const { res, json } = makeRes();
    await getUserSubscription(makeReq({}, { id: 'user-1' }), res, next);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ plan: expect.objectContaining({ slug: 'pro' }) }));
  });
});

describe('changeUserSubscription', () => {
  it('records admin actor and respects downgrade block without override', async () => {
    mockActiveUser();
    const { AppError } = await import('../../middleware/error-handler.js');
    vi.mocked(subscriptionService.changePlan).mockRejectedValue(
      new AppError(409, 'DOWNGRADE_BLOCKED', 'blocked', {
        conflicts: [{ metric: 'blogs', used: 5, limit: 3 }],
      }),
    );

    await changeUserSubscription(
      makeReq({ planId: 'plan-free', override: false }, { id: 'user-1' }, 'admin-9'),
      makeRes().res,
      next,
    );
    expect(subscriptionService.changePlan).toHaveBeenCalledWith('user-1', 'plan-free', {
      actor: 'admin-9',
      override: false,
    });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'DOWNGRADE_BLOCKED' }));
  });

  it('allows override and returns updated view', async () => {
    mockActiveUser();
    vi.mocked(subscriptionService.changePlan).mockResolvedValue({
      ...VIEW,
      subscription: { ...VIEW.subscription, planId: 'plan-free', changedBy: 'admin-9' },
    });

    const { res, json } = makeRes();
    await changeUserSubscription(
      makeReq({ planId: 'plan-free', override: true }, { id: 'user-1' }, 'admin-9'),
      res,
      next,
    );

    expect(subscriptionService.changePlan).toHaveBeenCalledWith('user-1', 'plan-free', {
      actor: 'admin-9',
      override: true,
    });
    expect(json).toHaveBeenCalled();
  });

  it('rejects plan change for deactivated users', async () => {
    vi.mocked(getSupabase).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { deactivated_at: '2026-05-01T00:00:00Z' },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof getSupabase>);

    await changeUserSubscription(
      makeReq({ planId: 'plan-free' }, { id: 'user-1' }),
      makeRes().res,
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'USER_DEACTIVATED' }));
    expect(subscriptionService.changePlan).not.toHaveBeenCalled();
  });
});

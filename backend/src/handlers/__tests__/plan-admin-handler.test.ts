import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { Plan } from '../../domain/subscription-types.js';
import {
  createAdminPlan,
  archiveAdminPlan,
  patchAdminPlan,
  setDefaultAdminPlan,
} from '../plan-admin-handler.js';
import * as repo from '../../repositories/plan-repository.js';

vi.mock('../../repositories/plan-repository.js');

const BASE_PLAN: Plan = {
  id: 'plan-1',
  slug: 'pro',
  name: 'Pro',
  description: 'For creators',
  priceCents: 1900,
  currency: 'USD',
  billingPeriod: 'monthly',
  limits: {
    blogQuota: 50,
    aiCheckQuota: 200,
    authorProfileLimit: 10,
    referenceExtractionQuota: 300,
  },
  isPublic: true,
  isDefault: false,
  archivedAt: null,
  sortOrder: 2,
  createdAt: new Date('2026-05-14T00:00:00Z'),
  updatedAt: new Date('2026-05-14T00:00:00Z'),
};

function makeReq(body: unknown = {}, params: Record<string, string> = {}): Request {
  return { body, params } as unknown as Request;
}

function makeRes(): { res: Response; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  const res = { json, status, send: vi.fn() } as unknown as Response;
  return { res, json, status };
}

const next: NextFunction = vi.fn();

beforeEach(() => vi.clearAllMocks());

describe('createAdminPlan', () => {
  it('rejects missing name', async () => {
    const { res } = makeRes();
    await createAdminPlan(makeReq({ priceCents: 0 }), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('creates a plan with 201', async () => {
    vi.mocked(repo.listAllPlans).mockResolvedValue([BASE_PLAN]);
    vi.mocked(repo.getPlanBySlug).mockResolvedValue(null);
    vi.mocked(repo.insertPlan).mockResolvedValue({ ...BASE_PLAN, id: 'new-id', slug: 'new-plan' });
    vi.mocked(repo.countActiveSubscribersForPlan).mockResolvedValue(0);

    const { res, status, json } = makeRes();
    await createAdminPlan(
      makeReq({
        name: 'Starter',
        description: 'Hi',
        priceCents: 0,
        blogQuota: null,
        aiCheckQuota: 10,
      }),
      res,
      next,
    );

    expect(status).toHaveBeenCalledWith(201);
    expect(repo.insertPlan).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({ slug: 'new-plan', activeSubscriberCount: 0 }),
      }),
    );
  });
});

describe('archiveAdminPlan', () => {
  it('refuses when plan is default', async () => {
    vi.mocked(repo.getPlanById).mockResolvedValue({ ...BASE_PLAN, isDefault: true });
    await archiveAdminPlan(makeReq({}, { id: 'plan-1' }), makeRes().res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 409, code: 'DEFAULT_PLAN' }));
  });

  it('refuses when there are active subscribers', async () => {
    vi.mocked(repo.getPlanById).mockResolvedValue(BASE_PLAN);
    vi.mocked(repo.countActiveSubscribersForPlan).mockResolvedValue(2);
    await archiveAdminPlan(makeReq({}, { id: 'plan-1' }), makeRes().res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 409, code: 'HAS_SUBSCRIBERS' }));
  });

  it('archives when allowed', async () => {
    vi.mocked(repo.getPlanById).mockResolvedValue(BASE_PLAN);
    vi.mocked(repo.countActiveSubscribersForPlan).mockResolvedValue(0);
    const archived = {
      ...BASE_PLAN,
      archivedAt: new Date('2026-05-14T12:00:00Z'),
      isPublic: false,
      isDefault: false,
    };
    vi.mocked(repo.updatePlanById).mockResolvedValue(archived);
    vi.mocked(repo.countActiveSubscribersForPlan).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    const { res, json } = makeRes();
    await archiveAdminPlan(makeReq({}, { id: 'plan-1' }), res, next);

    expect(repo.updatePlanById).toHaveBeenCalledWith(
      'plan-1',
      expect.objectContaining({ archived_at: expect.any(String), is_public: false, is_default: false }),
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ plan: expect.objectContaining({ archivedAt: expect.any(String) }) }),
    );
  });
});

describe('patchAdminPlan', () => {
  it('blocks slug change when there are active subscribers', async () => {
    vi.mocked(repo.getPlanById).mockResolvedValue(BASE_PLAN);
    vi.mocked(repo.countActiveSubscribersForPlan).mockResolvedValue(1);

    await patchAdminPlan(
      makeReq({ slug: 'new-slug', name: 'Pro' }, { id: 'plan-1' }),
      makeRes().res,
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 409, code: 'SLUG_LOCKED' }));
  });
});

describe('setDefaultAdminPlan', () => {
  it('sets default and returns JSON', async () => {
    vi.mocked(repo.getPlanById).mockResolvedValue(BASE_PLAN);
    const updated = { ...BASE_PLAN, isDefault: true };
    vi.mocked(repo.setPlanDefault).mockResolvedValue(updated);
    vi.mocked(repo.countActiveSubscribersForPlan).mockResolvedValue(3);

    const { res, json } = makeRes();
    await setDefaultAdminPlan(makeReq({}, { id: 'plan-1' }), res, next);

    expect(repo.setPlanDefault).toHaveBeenCalledWith('plan-1');
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({ id: 'plan-1', isDefault: true, activeSubscriberCount: 3 }),
      }),
    );
  });
});

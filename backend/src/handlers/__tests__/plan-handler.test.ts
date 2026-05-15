import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { Plan } from '../../domain/subscription-types.js';
import { listPublicPlansHandler } from '../plan-handler.js';
import * as repo from '../../repositories/plan-repository.js';

vi.mock('../../repositories/plan-repository.js');

const PUBLIC_PLAN: Plan = {
  id: 'plan-free',
  slug: 'free',
  name: 'Free',
  description: 'Get started',
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

function makeRes(): { res: Response; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const res = { json, status: vi.fn().mockReturnThis() } as unknown as Response;
  return { res, json };
}

const next: NextFunction = vi.fn();

beforeEach(() => vi.clearAllMocks());

describe('listPublicPlansHandler', () => {
  it('returns only public plans from the repository', async () => {
    vi.mocked(repo.listPublicPlans).mockResolvedValue([PUBLIC_PLAN]);

    const { res, json } = makeRes();
    await listPublicPlansHandler({} as Request, res, next);

    expect(repo.listPublicPlans).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({
      plans: [
        expect.objectContaining({
          slug: 'free',
          name: 'Free',
          priceCents: 0,
        }),
      ],
    });
    const payload = json.mock.calls[0][0] as { plans: { slug: string }[] };
    expect(payload.plans[0]).not.toHaveProperty('isDefault');
    expect(payload.plans[0]).not.toHaveProperty('archivedAt');
  });
});

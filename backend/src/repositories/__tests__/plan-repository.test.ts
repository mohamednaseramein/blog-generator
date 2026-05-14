import { describe, it, expect } from 'vitest';
import { planRowToModel, type PlanRow } from '../plan-repository.js';

const baseRow: PlanRow = {
  id: 'plan-1',
  slug: 'pro',
  name: 'Pro',
  description: 'For regular content creators.',
  price_cents: 1900,
  currency: 'USD',
  billing_period: 'monthly',
  blog_quota: 50,
  ai_check_quota: 200,
  author_profile_limit: 10,
  reference_extraction_quota: 300,
  is_public: true,
  is_default: false,
  archived_at: null,
  sort_order: 2,
  created_at: '2026-05-14T00:00:00Z',
  updated_at: '2026-05-14T00:00:00Z',
};

describe('planRowToModel', () => {
  it('assembles the four flat limit columns into a nested PlanLimits object', () => {
    expect(planRowToModel(baseRow).limits).toEqual({
      blogQuota: 50,
      aiCheckQuota: 200,
      authorProfileLimit: 10,
      referenceExtractionQuota: 300,
    });
  });

  it('preserves null limit columns as null (unlimited)', () => {
    const plan = planRowToModel({
      ...baseRow,
      blog_quota: null,
      ai_check_quota: null,
      reference_extraction_quota: null,
    });
    expect(plan.limits).toEqual({
      blogQuota: null,
      aiCheckQuota: null,
      authorProfileLimit: 10,
      referenceExtractionQuota: null,
    });
  });

  it('maps archived_at null to null and a timestamp to a Date', () => {
    expect(planRowToModel(baseRow).archivedAt).toBeNull();
    expect(planRowToModel({ ...baseRow, archived_at: '2026-05-14T12:00:00Z' }).archivedAt).toEqual(
      new Date('2026-05-14T12:00:00Z'),
    );
  });

  it('maps snake_case row fields to camelCase domain fields', () => {
    const plan = planRowToModel(baseRow);
    expect(plan.priceCents).toBe(1900);
    expect(plan.isPublic).toBe(true);
    expect(plan.isDefault).toBe(false);
    expect(plan.sortOrder).toBe(2);
    expect(plan.createdAt).toEqual(new Date('2026-05-14T00:00:00Z'));
  });
});

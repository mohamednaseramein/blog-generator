import { describe, it, expect } from 'vitest';
import {
  computeCurrentPeriod,
  needsPeriodRoll,
  subscriptionRowToModel,
  type SubscriptionRow,
} from '../subscription-repository.js';

describe('computeCurrentPeriod', () => {
  it('returns the calendar-month bounds (UTC) containing a mid-month date', () => {
    const { start, end } = computeCurrentPeriod(new Date('2026-05-14T10:30:00Z'));
    expect(start).toEqual(new Date('2026-05-01T00:00:00Z'));
    expect(end).toEqual(new Date('2026-06-01T00:00:00Z'));
  });

  it('rolls the year over for a December date', () => {
    const { start, end } = computeCurrentPeriod(new Date('2026-12-20T08:00:00Z'));
    expect(start).toEqual(new Date('2026-12-01T00:00:00Z'));
    expect(end).toEqual(new Date('2027-01-01T00:00:00Z'));
  });

  it('treats an exact period-start instant as inside that period', () => {
    const { start, end } = computeCurrentPeriod(new Date('2026-01-01T00:00:00Z'));
    expect(start).toEqual(new Date('2026-01-01T00:00:00Z'));
    expect(end).toEqual(new Date('2026-02-01T00:00:00Z'));
  });
});

describe('needsPeriodRoll', () => {
  const periodEnd = new Date('2026-06-01T00:00:00Z');

  it('is false before the period end', () => {
    expect(needsPeriodRoll(periodEnd, new Date('2026-05-31T23:59:59Z'))).toBe(false);
  });

  it('is true at the exact period end (end is exclusive)', () => {
    expect(needsPeriodRoll(periodEnd, new Date('2026-06-01T00:00:00Z'))).toBe(true);
  });

  it('is true after the period end', () => {
    expect(needsPeriodRoll(periodEnd, new Date('2026-06-02T12:00:00Z'))).toBe(true);
  });
});

describe('subscriptionRowToModel', () => {
  const row: SubscriptionRow = {
    id: 'sub-1',
    user_id: 'user-1',
    plan_id: 'plan-1',
    status: 'active',
    current_period_start: '2026-05-01T00:00:00Z',
    current_period_end: '2026-06-01T00:00:00Z',
    stripe_subscription_id: null,
    changed_by: null,
    created_at: '2026-05-14T00:00:00Z',
    updated_at: '2026-05-14T00:00:00Z',
  };

  it('maps snake_case columns to camelCase domain fields with Date conversion', () => {
    const sub = subscriptionRowToModel(row);
    expect(sub.userId).toBe('user-1');
    expect(sub.planId).toBe('plan-1');
    expect(sub.currentPeriodStart).toEqual(new Date('2026-05-01T00:00:00Z'));
    expect(sub.currentPeriodEnd).toEqual(new Date('2026-06-01T00:00:00Z'));
  });

  it('preserves the null Stripe seam and null self-serve attribution', () => {
    const sub = subscriptionRowToModel(row);
    expect(sub.stripeSubscriptionId).toBeNull();
    expect(sub.changedBy).toBeNull();
  });

  it('keeps admin attribution when changed_by is set', () => {
    expect(subscriptionRowToModel({ ...row, changed_by: 'admin-9' }).changedBy).toBe('admin-9');
  });
});

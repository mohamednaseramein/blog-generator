import { getSupabase } from '../db/supabase.js';
import type { Subscription, SubscriptionStatus } from '../domain/subscription-types.js';

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  stripe_subscription_id: string | null;
  changed_by: string | null;
  created_at: string;
  updated_at: string;
}

export function subscriptionRowToModel(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    status: row.status as SubscriptionStatus,
    currentPeriodStart: new Date(row.current_period_start),
    currentPeriodEnd: new Date(row.current_period_end),
    stripeSubscriptionId: row.stripe_subscription_id,
    changedBy: row.changed_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Calendar-month period bounds (UTC) containing `now` — the v1 usage window (AgDR-0035 KD-2).
 * `start` is inclusive, `end` is exclusive. `Date.UTC` with month+1 handles the year rollover.
 */
export function computeCurrentPeriod(now: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/** True once `now` has reached or passed the end of the subscription's current period. */
export function needsPeriodRoll(currentPeriodEnd: Date, now: Date): boolean {
  return now.getTime() >= currentPeriodEnd.getTime();
}

/**
 * Fetch the user's active subscription, lazily rolling the period window forward if it has
 * elapsed. Plan changes never reset the period — only the calendar advancing does.
 */
export async function getActiveSubscriptionByUserId(
  userId: string,
  now: Date = new Date(),
): Promise<Subscription | null> {
  const { data, error } = await getSupabase()
    .from('subscriptions')
    .select()
    .eq('user_id', userId)
    .eq('status', 'active')
    .single<SubscriptionRow>();

  if (error?.code === 'PGRST116') return null; // no active subscription
  if (error) throw new Error(error.message);

  const subscription = subscriptionRowToModel(data);
  if (!needsPeriodRoll(subscription.currentPeriodEnd, now)) {
    return subscription;
  }
  return rollSubscriptionPeriod(subscription.id, now);
}

/** Advance a subscription's period window to the calendar month containing `now`. */
export async function rollSubscriptionPeriod(
  subscriptionId: string,
  now: Date = new Date(),
): Promise<Subscription> {
  const { start, end } = computeCurrentPeriod(now);

  const { data, error } = await getSupabase()
    .from('subscriptions')
    .update({
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single<SubscriptionRow>();

  if (error) throw new Error(error.message);
  console.log(`[subscription-repository] rolled period for subscription id=${subscriptionId}`);
  return subscriptionRowToModel(data);
}

/** Self-serve or admin plan change — period window is not reset. */
export async function updateSubscriptionPlan(
  subscriptionId: string,
  planId: string,
  changedBy: string | null,
): Promise<Subscription> {
  const now = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from('subscriptions')
    .update({
      plan_id: planId,
      changed_by: changedBy,
      updated_at: now,
    })
    .eq('id', subscriptionId)
    .select()
    .single<SubscriptionRow>();

  if (error) throw new Error(error.message);
  return subscriptionRowToModel(data);
}

/**
 * Domain types for the Subscription Plans epic (#149).
 * Schema: AgDR-0035 (migration) + AgDR-0036 (data-model decisions).
 */

/** The four metered capabilities a plan can cap. */
export type QuotaMetric =
  | 'blogs' // monthly creation quota
  | 'ai_checks' // monthly creation quota
  | 'reference_extractions' // monthly creation quota
  | 'author_profiles'; // standing total cap

/** Only `monthly` in v1; the column exists so Stripe can add others without a reshape. */
export type BillingPeriod = 'monthly';

/** Only `active` in v1; `past_due` / `canceled` are reserved for the Stripe integration. */
export type SubscriptionStatus = 'active';

/** A limit value of `null` means unlimited for that metric. */
export interface PlanLimits {
  blogQuota: number | null;
  aiCheckQuota: number | null;
  authorProfileLimit: number | null;
  referenceExtractionQuota: number | null;
}

export interface Plan {
  id: string;
  /** Stable identifier — immutable once the plan has subscribers. */
  slug: string;
  name: string;
  description: string;
  /** Display-only in v1 — no payment provider is integrated. */
  priceCents: number;
  /** ISO 4217 currency code. */
  currency: string;
  billingPeriod: BillingPeriod;
  limits: PlanLimits;
  /** Shown on the landing page and in the user self-serve picker. */
  isPublic: boolean;
  /** Exactly one non-archived plan is the default (new users land here). */
  isDefault: boolean;
  /** Soft-delete marker — non-null means archived. */
  archivedAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  /** Inclusive start of the current usage period. */
  currentPeriodStart: Date;
  /** Exclusive end of the current usage period — when the monthly quotas reset. */
  currentPeriodEnd: Date;
  /** Stripe seam — unused in v1. */
  stripeSubscriptionId: string | null;
  /** Admin user id when the last change was admin-initiated; null for self-serve. */
  changedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Per-metric usage vs limit for the active subscription period. */
export interface UsageSnapshot {
  metric: QuotaMetric;
  used: number;
  /** null = unlimited on the active plan. */
  limit: number | null;
  /** true when `limit` is set and `used >= limit`. */
  exceeded: boolean;
}

export interface SubscriptionView {
  subscription: Subscription;
  plan: Plan;
  usage: UsageSnapshot[];
  /** When monthly metered counters reset (= currentPeriodEnd). */
  periodResetsAt: Date;
}

export interface DowngradeConflict {
  metric: QuotaMetric;
  used: number;
  limit: number;
}

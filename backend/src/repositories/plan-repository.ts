import { getSupabase } from '../db/supabase.js';
import type { BillingPeriod, Plan, PlanLimits } from '../domain/subscription-types.js';

export interface PlanRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  billing_period: string;
  blog_quota: number | null;
  ai_check_quota: number | null;
  author_profile_limit: number | null;
  reference_extraction_quota: number | null;
  is_public: boolean;
  is_default: boolean;
  archived_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Map a `plans` row to the domain model — assembles the four flat limit columns into `PlanLimits`. */
export function planRowToModel(row: PlanRow): Plan {
  const limits: PlanLimits = {
    blogQuota: row.blog_quota,
    aiCheckQuota: row.ai_check_quota,
    authorProfileLimit: row.author_profile_limit,
    referenceExtractionQuota: row.reference_extraction_quota,
  };

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    currency: row.currency,
    billingPeriod: row.billing_period as BillingPeriod,
    limits,
    isPublic: row.is_public,
    isDefault: row.is_default,
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function getPlanById(id: string): Promise<Plan | null> {
  const { data, error } = await getSupabase()
    .from('plans')
    .select()
    .eq('id', id)
    .single<PlanRow>();

  if (error?.code === 'PGRST116') return null; // row not found
  if (error) throw new Error(error.message);
  return planRowToModel(data);
}

export async function getPlanBySlug(slug: string): Promise<Plan | null> {
  const { data, error } = await getSupabase()
    .from('plans')
    .select()
    .eq('slug', slug)
    .single<PlanRow>();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(error.message);
  return planRowToModel(data);
}

/** The plan new users are subscribed to. Exactly one non-archived plan carries this flag. */
export async function getDefaultPlan(): Promise<Plan | null> {
  const { data, error } = await getSupabase()
    .from('plans')
    .select()
    .eq('is_default', true)
    .is('archived_at', null)
    .single<PlanRow>();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(error.message);
  return planRowToModel(data);
}

/** Every plan, including private and archived — for the admin catalogue. */
export async function listAllPlans(): Promise<Plan[]> {
  const { data, error } = await getSupabase()
    .from('plans')
    .select()
    .order('sort_order', { ascending: true })
    .returns<PlanRow[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map(planRowToModel);
}

/** Public, non-archived plans ordered for display — for the landing page + self-serve picker. */
export async function listPublicPlans(): Promise<Plan[]> {
  const { data, error } = await getSupabase()
    .from('plans')
    .select()
    .eq('is_public', true)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })
    .returns<PlanRow[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map(planRowToModel);
}

/** Count of users currently on a plan — used by the archive guard (US-SUB-03). */
export async function countActiveSubscribersForPlan(planId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', planId)
    .eq('status', 'active');

  if (error) throw new Error(error.message);
  return count ?? 0;
}

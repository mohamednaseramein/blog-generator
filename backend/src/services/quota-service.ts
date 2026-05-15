import { getSupabase } from '../db/supabase.js';
import type { PlanLimits, QuotaMetric, UsageSnapshot } from '../domain/subscription-types.js';

function snapshot(metric: QuotaMetric, used: number, limit: number | null): UsageSnapshot {
  const exceeded = limit !== null && used >= limit;
  return { metric, used, limit, exceeded };
}

/**
 * Count metered usage for the subscription's current period window.
 * Monthly metrics filter by `created_at` in [periodStart, periodEnd); author profiles are a standing total.
 */
export async function computeUsage(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  limits: PlanLimits,
): Promise<UsageSnapshot[]> {
  const supabase = getSupabase();
  const startIso = periodStart.toISOString();
  const endIso = periodEnd.toISOString();

  const { count: blogCount, error: blogErr } = await supabase
    .from('blogs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startIso)
    .lt('created_at', endIso);
  if (blogErr) throw new Error(blogErr.message);

  const { count: profileCount, error: profileErr } = await supabase
    .from('author_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_predefined', false);
  if (profileErr) throw new Error(profileErr.message);

  const { data: blogRows, error: blogListErr } = await supabase.from('blogs').select('id').eq('user_id', userId);
  if (blogListErr) throw new Error(blogListErr.message);
  const blogIds = (blogRows ?? []).map((r: { id: string }) => r.id);

  let aiCheckCount = 0;
  let referenceCount = 0;
  if (blogIds.length > 0) {
    const { count: ac, error: acErr } = await supabase
      .from('blog_ai_checks')
      .select('*', { count: 'exact', head: true })
      .in('blog_id', blogIds)
      .gte('created_at', startIso)
      .lt('created_at', endIso);
    if (acErr) throw new Error(acErr.message);
    aiCheckCount = ac ?? 0;

    const { count: rc, error: rcErr } = await supabase
      .from('blog_references')
      .select('*', { count: 'exact', head: true })
      .in('blog_id', blogIds)
      .gte('created_at', startIso)
      .lt('created_at', endIso);
    if (rcErr) throw new Error(rcErr.message);
    referenceCount = rc ?? 0;
  }

  return [
    snapshot('blogs', blogCount ?? 0, limits.blogQuota),
    snapshot('ai_checks', aiCheckCount, limits.aiCheckQuota),
    snapshot('author_profiles', profileCount ?? 0, limits.authorProfileLimit),
    snapshot('reference_extractions', referenceCount, limits.referenceExtractionQuota),
  ];
}

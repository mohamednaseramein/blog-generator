import { useEffect, useState } from 'react';
import { getPublicPlans } from '../api/plan-api';
import type { PlanSummary } from '../api/subscription-api';
import { PlanCard } from '../components/PlanCard';
import { landingContent } from './content';
import { recordLandingCtaClick, recordLandingPricingCtaClick } from './analytics';

function planToAnalyticsPlan(slug: string): 'free' | 'pro' | 'team_waitlist' | null {
  if (slug === 'free') return 'free';
  if (slug === 'pro') return 'pro';
  if (slug === 'team') return 'team_waitlist';
  return null;
}

export function Pricing() {
  const { pricing } = landingContent;
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPublicPlans()
      .then(({ plans: rows }) => {
        if (!cancelled) setPlans(rows);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="pricing"
      aria-labelledby="landing-pricing-heading"
      className="border-t border-slate-200/80 bg-white/80 px-4 py-16 sm:px-6 lg:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="landing-pricing-heading"
            className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            {pricing.sectionTitle}
          </h2>
          <p className="mt-4 text-lg text-slate-600">{pricing.sectionSubtitle}</p>
        </div>

        {error && (
          <p className="mt-10 text-center text-sm text-red-700" role="alert">
            Could not load plans: {error}
          </p>
        )}

        {loading && plans.length === 0 ? (
          <p className="mt-14 text-center text-slate-500">Loading plans…</p>
        ) : !loading && plans.length === 0 ? (
          <p className="mt-14 text-center text-slate-500">Plans are not available right now. Please try again later.</p>
        ) : (
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => {
              const analyticsPlan = planToAnalyticsPlan(plan.slug);
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  comingSoon={plan.slug === 'team'}
                  onCtaClick={() => {
                    if (analyticsPlan) {
                      recordLandingPricingCtaClick({ plan: analyticsPlan });
                    }
                    recordLandingCtaClick({
                      cta_id: `pricing_${plan.slug}`,
                      destination_url:
                        plan.slug === 'team'
                          ? '/register?plan=team_waitlist&source=landing_pricing'
                          : `/register?plan=${plan.slug}&source=landing_pricing`,
                      current_section_id: 'pricing',
                    });
                  }}
                />
              );
            })}
          </div>
        )}

        <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-slate-500">
          {pricing.disclaimer}
        </p>
      </div>
    </section>
  );
}

import type { PlanSummary } from '../api/subscription-api.js';
import { SmartNavLink } from '../landing/SmartNavLink';

function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return '$0';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

function formatLimit(value: number | null, singular: string, plural: string): string {
  if (value === null) return `Unlimited ${plural}`;
  return `${value} ${value === 1 ? singular : plural}`;
}

export function planLimitsToBullets(limits: PlanSummary['limits']): string[] {
  return [
    `${formatLimit(limits.blogQuota, 'blog draft', 'blog drafts')} / month`,
    limits.aiCheckQuota === null
      ? 'Unlimited AI authenticity checks'
      : `${formatLimit(limits.aiCheckQuota, 'AI check', 'AI checks')} / month`,
    `${formatLimit(limits.authorProfileLimit, 'author profile', 'author profiles')}`,
    `${formatLimit(limits.referenceExtractionQuota, 'reference extraction', 'reference extractions')} / month`,
  ];
}

export interface PlanCardProps {
  plan: PlanSummary;
  /** Team tier keeps waitlist UX until billing ships. */
  comingSoon?: boolean;
  onCtaClick?: () => void;
}

export function PlanCard({ plan, comingSoon = false, onCtaClick }: PlanCardProps) {
  const isTeam = comingSoon || plan.slug === 'team';
  const ctaClass = isTeam
    ? 'inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
    : 'inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2';

  const ctaLabel = isTeam ? 'Notify me' : plan.slug === 'free' ? 'Start free' : `Start ${plan.name}`;
  const ctaHref = isTeam
    ? '/register?plan=team_waitlist&source=landing_pricing'
    : `/register?plan=${encodeURIComponent(plan.slug)}&source=landing_pricing`;
  const ctaAssistiveHint = isTeam
    ? 'Team tier is not yet purchasable. Continue to join the waitlist.'
    : undefined;

  const bullets = planLimitsToBullets(plan.limits);
  const priceLabel =
    plan.priceCents === 0
      ? '$0'
      : `${formatPrice(plan.priceCents, plan.currency)} / month`;

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm ring-slate-900/5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
        {isTeam && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
            Coming soon
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{priceLabel}</p>
      <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
      <ul className="mt-6 flex flex-1 flex-col gap-2 text-sm text-slate-700">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <SmartNavLink
        href={ctaHref}
        className={ctaClass}
        aria-label={ctaAssistiveHint ? `${ctaLabel}. ${ctaAssistiveHint}` : undefined}
        onClick={onCtaClick}
      >
        {ctaLabel}
      </SmartNavLink>
    </article>
  );
}

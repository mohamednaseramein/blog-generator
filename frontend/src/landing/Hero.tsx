import { landingContent } from './content';
import { SmartNavLink } from './SmartNavLink';
import { recordLandingCtaClick } from './analytics';

export function Hero() {
  const { hero } = landingContent;

  const primaryHref = hero.primaryCta.href;
  const secondaryHref = hero.secondaryCta.href;

  return (
    <section
      id="hero"
      aria-labelledby="landing-hero-heading"
      className="border-b border-slate-200/80 bg-white/60 px-4 py-16 sm:px-6 lg:py-24"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="text-center lg:text-left">
          <h1
            id="landing-hero-heading"
            className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-[2.75rem] lg:leading-tight"
          >
            {hero.h1}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600">{hero.sub}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <SmartNavLink
              href={primaryHref}
              className="inline-flex min-h-11 min-w-[11rem] items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm ring-indigo-600 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              onClick={() =>
                recordLandingCtaClick({
                  cta_id: 'hero_primary',
                  destination_url: primaryHref,
                  current_section_id: 'hero',
                })
              }
            >
              {hero.primaryCta.label}
            </SmartNavLink>
            <SmartNavLink
              href={secondaryHref}
              className="inline-flex min-h-11 min-w-[11rem] items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              onClick={() =>
                recordLandingCtaClick({
                  cta_id: 'hero_secondary',
                  destination_url: secondaryHref,
                  current_section_id: 'hero',
                })
              }
            >
              {hero.secondaryCta.label}
            </SmartNavLink>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:mx-0">
          <div
            className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-100 via-white to-slate-100 shadow-lg ring-1 ring-slate-900/5"
            role="img"
            aria-label={hero.illustrationAlt}
          >
            <div className="flex h-full flex-col p-6 sm:p-8">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                Authenticity
              </div>
              <div className="mt-4 space-y-3 rounded-xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/80">
                <div className="h-2 w-[75%] rounded bg-slate-200" aria-hidden />
                <div className="h-2 w-full rounded bg-slate-100" aria-hidden />
                <div className="h-2 w-[83%] rounded bg-slate-100" aria-hidden />
              </div>
              <div className="mt-auto flex items-end justify-between gap-4 pt-6">
                <div>
                  <p className="text-xs text-slate-500">Overall score</p>
                  <p className="text-3xl font-semibold tabular-nums text-slate-900">87</p>
                </div>
                <div className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">
                  SEO-ready
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

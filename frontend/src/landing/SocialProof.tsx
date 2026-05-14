import { landingContent } from './content';

export function SocialProof() {
  const { socialProof } = landingContent;

  if (socialProof.stats.length === 0) {
    return null;
  }

  return (
    <section
      id="social-proof"
      aria-labelledby="landing-social-heading"
      className="px-4 py-14 sm:px-6 lg:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="landing-social-heading"
          className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          {socialProof.sectionTitle}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {socialProof.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm"
            >
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

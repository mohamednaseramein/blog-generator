import { landingContent } from './content';

export function HowItWorks() {
  const { howItWorks } = landingContent;

  return (
    <section
      id="how-it-works"
      aria-labelledby="landing-how-heading"
      className="border-y border-slate-200/80 bg-white/70 px-4 py-16 sm:px-6 lg:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="landing-how-heading"
            className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            {howItWorks.sectionTitle}
          </h2>
          <p className="mt-4 text-lg text-slate-600">{howItWorks.sectionSubtitle}</p>
        </div>

        <ol className="mt-14 grid list-none gap-8 lg:grid-cols-4 lg:gap-6">
          {howItWorks.steps.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.id} className="relative flex flex-col lg:block">
                <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

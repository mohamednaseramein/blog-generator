import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-indigo-50">
      <AppHeader />
      <main className="flex-1" data-prerender-ready>
        <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Ship blog drafts that don't read like AI.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600">
            Generate SEO-ready, authentic-sounding posts in minutes. The full landing experience
            (features, pricing, walkthrough) is shipping soon.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Get started — it's free
            </Link>
            <Link
              to="/help/ai-detector-rules"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Read the AI Detector rules
            </Link>
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}

import { Link } from 'react-router-dom';
import rubricDoc from '../lib/ai-detector-rubric.generated.json';

interface RuleRow {
  id: string;
  name: string;
  weight_min: number;
  weight_max: number;
  definition: string;
  ai_example: string;
  human_example: string;
  fix_tip: string;
}

interface RubricJson {
  version: string;
  last_updated: string;
  initial_score: number;
  mode_thresholds: Record<string, { min?: number; max?: number }>;
  short_post_words: number;
  long_post_words: number;
  excluded_segments: { type: string; description: string }[];
  rules: { ai_like: RuleRow[]; human_like: RuleRow[] };
}

const doc = rubricDoc as RubricJson;

export default function AiDetectorRulesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="mb-6">
          <Link to="/" className="text-sm font-medium text-indigo-600 hover:underline">
            ← Back to app
          </Link>
        </p>

        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI detector rubric</h1>
          <p className="mt-3 text-slate-600">
            This page lists every signal the in-product authenticity check uses. The live scorer reads the same YAML
            rubric as this page (via a build step) so documentation cannot drift from the model prompt.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Rubric version <strong className="font-medium text-slate-700">{doc.version}</strong> · Last updated{' '}
            {doc.last_updated}. Scores start from a neutral baseline of {doc.initial_score} and move based on the
            weighted indicators below (clamped 0–100).
          </p>
        </header>

        <section className="mb-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Modes</h2>
          <p className="mt-2 text-sm text-slate-600">
            The UI chip summarises AI-likeness using score bands (human-polish and pure-human also consider mixed
            signals from the model).
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>
              <strong>Pure human</strong> — AI-likeness ≤ {doc.mode_thresholds.pure_human?.max ?? 24}%
            </li>
            <li>
              <strong>Human polish</strong> — {doc.mode_thresholds.human_polish?.min ?? 25}–
              {doc.mode_thresholds.human_polish?.max ?? 49}%
            </li>
            <li>
              <strong>AI-assisted</strong> — {doc.mode_thresholds.ai_assisted?.min ?? 50}–
              {doc.mode_thresholds.ai_assisted?.max ?? 79}%
            </li>
            <li>
              <strong>Pure AI</strong> — ≥ {doc.mode_thresholds.pure_ai?.min ?? 80}%
            </li>
          </ul>
        </section>

        <section className="mb-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Excluded from scoring</h2>
          <ul className="mt-3 space-y-2">
            {doc.excluded_segments.map((e) => (
              <li key={e.type} className="text-sm text-slate-700">
                <strong className="text-slate-900">{e.type}</strong> — {e.description}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Very short posts (&lt; {doc.short_post_words} words after exclusions) bump uncertainty. Bodies longer than{' '}
            {doc.long_post_words} words are truncated for scoring.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">AI-like signals (increase the score)</h2>
          <div className="space-y-4">
            {doc.rules.ai_like.map((r) => (
              <article
                key={r.id}
                className="rounded-xl border border-red-100 bg-red-50/40 p-5 shadow-sm"
              >
                <h3 className="font-semibold text-slate-900">
                  {r.name}{' '}
                  <span className="font-mono text-xs font-normal text-slate-500">({r.id})</span>
                </h3>
                <p className="mt-1 text-xs font-medium text-red-800">
                  Weight +{r.weight_min} to +{r.weight_max}
                </p>
                <p className="mt-2 text-sm text-slate-700">{r.definition}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Sounds AI-like</p>
                    <p className="mt-1 text-sm italic text-slate-700">{r.ai_example}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Sounds human</p>
                    <p className="mt-1 text-sm italic text-slate-700">{r.human_example}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-800">Fix: {r.fix_tip}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Human-like signals (decrease the score)</h2>
          <div className="space-y-4">
            {doc.rules.human_like.map((r) => (
              <article
                key={r.id}
                className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm"
              >
                <h3 className="font-semibold text-slate-900">
                  {r.name}{' '}
                  <span className="font-mono text-xs font-normal text-slate-500">({r.id})</span>
                </h3>
                <p className="mt-1 text-xs font-medium text-emerald-900">
                  Weight {r.weight_min} to {r.weight_max}
                </p>
                <p className="mt-2 text-sm text-slate-700">{r.definition}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Sounds AI-like</p>
                    <p className="mt-1 text-sm italic text-slate-700">{r.ai_example}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Sounds human</p>
                    <p className="mt-1 text-sm italic text-slate-700">{r.human_example}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-800">Fix: {r.fix_tip}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="border-t border-slate-200 pt-6 text-xs text-slate-500">
          Rubric {doc.version} · Educational heuristic only — not a forensic or legal claim about authorship.
        </footer>
      </div>
    </div>
  );
}

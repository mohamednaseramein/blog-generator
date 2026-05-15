import { useState, useCallback, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  runAiCheck,
  recordBlogAnalyticsEvent,
  type AiCheckResponse,
} from '../api/blog-api.js';
import { QuotaApiError } from '../api/api-errors.js';
import { recordQuotaBlocked } from '../lib/plan-analytics.js';
import { QuotaBlockPrompt } from './QuotaBlockPrompt.js';
import { Button } from './ui/button.js';

function scoreBadgeClass(score: number | null): string {
  if (score === null) return 'bg-slate-100 text-slate-600 ring-slate-200';
  if (score <= 30) return 'bg-emerald-50 text-emerald-900 ring-emerald-200';
  if (score <= 69) return 'bg-amber-50 text-amber-950 ring-amber-200';
  return 'bg-red-50 text-red-900 ring-red-200';
}

function modeLabel(mode: AiCheckResponse['mode']): string {
  switch (mode) {
    case 'pure_ai':
      return 'Pure AI';
    case 'ai_assisted':
      return 'AI-assisted';
    case 'human_polish':
      return 'Human polish';
    case 'pure_human':
      return 'Pure human';
    case 'language_unsupported':
      return 'Language not supported';
    default:
      return mode;
  }
}

function modeTooltip(mode: AiCheckResponse['mode']): string {
  switch (mode) {
    case 'pure_ai':
      return 'Score ≥80 — reads like templated machine drafting.';
    case 'ai_assisted':
      return 'Score 50–79 — mixed signals; editing usually helps.';
    case 'human_polish':
      return 'Score 25–49 — human voice emerging over generic structure.';
    case 'pure_human':
      return 'Score ≤24 — strong human-like signals for this rubric.';
    case 'language_unsupported':
      return 'Only English is scored in v1.';
    default:
      return '';
  }
}

function scrollToSnippet(
  container: HTMLElement | null,
  fullText: string,
  snippet: string,
): void {
  if (!container || !snippet.trim()) return;
  const needle = snippet.trim().slice(0, 60);
  const idx = fullText.indexOf(needle);
  if (idx < 0) return;
  const ratio = idx / Math.max(fullText.length, 1);
  container.scrollTop = Math.max(
    0,
    ratio * (container.scrollHeight - container.clientHeight) - 24,
  );
  container.classList.add('ring-2', 'ring-indigo-300');
  window.setTimeout(() => {
    container.classList.remove('ring-2', 'ring-indigo-300');
  }, 2000);
}

interface Props {
  blogId: string;
  /** Current markdown body used for scroll-to-snippet */
  markdownForPreview: string;
  disabled?: boolean;
  disabledTooltip?: string;
  previewRef?: RefObject<HTMLElement | null>;
}

export function AuthenticityPanel({
  blogId,
  markdownForPreview,
  disabled,
  disabledTooltip,
  previewRef,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaBlock, setQuotaBlock] = useState<QuotaApiError | null>(null);
  const [result, setResult] = useState<AiCheckResponse | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);

  const run = useCallback(async () => {
    setError(null);
    setQuotaBlock(null);
    setLoading(true);
    try {
      const res = await runAiCheck(blogId);
      setResult(res);
      void recordBlogAnalyticsEvent(blogId, {
        type: res.cached ? 'ai_check_cache_hit' : 'ai_check_run',
      });
    } catch (e) {
      if (e instanceof QuotaApiError) {
        recordQuotaBlocked(e.metric);
        setQuotaBlock(e);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [blogId]);

  const busy = loading;

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-labelledby="authenticity-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="authenticity-heading" className="text-sm font-semibold text-slate-800">
            Authenticity check
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Heuristic AI-writing-style score — transparent rules, not a forensic detector.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={disabled || busy}
            aria-busy={busy}
            title={disabled ? disabledTooltip : undefined}
            onClick={() => void run()}
          >
            {busy ? 'Running…' : 'Run AI check'}
          </Button>
          <Link
            to="/help/ai-detector-rules"
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            How does this score work?
          </Link>
        </div>
      </div>

      {quotaBlock && (
        <div className="mt-3">
          <QuotaBlockPrompt
            metric={quotaBlock.metric}
            limit={quotaBlock.limit}
            usage={quotaBlock.usage}
            message={quotaBlock.message}
          />
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}{' '}
          <button
            type="button"
            className="font-medium text-red-900 underline"
            onClick={() => void run()}
          >
            Retry
          </button>
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          {result.cached && (
            <p className="text-xs font-medium text-slate-500" role="status">
              Cached result — same draft text and rubric version as a previous run.
            </p>
          )}

          {result.mode === 'language_unsupported' ? (
            <p className="text-sm text-slate-700">
              Language not supported in v1 — scoring was skipped. English drafts only for now.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={clsx(
                    'inline-flex min-w-[5rem] items-center justify-center rounded-lg px-4 py-2 text-2xl font-semibold tabular-nums ring-1',
                    scoreBadgeClass(result.ai_likelihood_percent),
                  )}
                  aria-label={`AI likelihood ${result.ai_likelihood_percent ?? 'unknown'} percent`}
                >
                  {result.ai_likelihood_percent ?? '—'}%
                </div>
                <div className="flex flex-col gap-1 text-xs text-slate-600">
                  <span>
                    Human-like estimate:{' '}
                    <strong className="text-slate-800">{result.human_likelihood_percent}%</strong>
                  </span>
                  <span>
                    Uncertainty:{' '}
                    <strong className="text-slate-800">{result.uncertainty_percent}%</strong>
                  </span>
                </div>
                <span
                  className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800"
                  title={modeTooltip(result.mode)}
                >
                  {modeLabel(result.mode)}
                </span>
              </div>

              {result.truncation_note && (
                <p className="text-xs text-slate-500">{result.truncation_note}</p>
              )}

              {result.excluded_segments.length > 0 && (
                <div className="text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Excluded from scoring: </span>
                  {result.excluded_segments.map((e) => `${e.count} ${e.type}`).join(', ')}
                  <span
                    className="ml-1 text-slate-400"
                    title={result.excluded_segments.map((e) => e.example_snippet).join(' · ')}
                  >
                    (hover for examples)
                  </span>
                </div>
              )}

              {result.creator_tips.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    What to change
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {result.creator_tips.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-sm font-medium text-slate-800"
                  onClick={() => setSectionsOpen((o) => !o)}
                  aria-expanded={sectionsOpen}
                >
                  Section scores
                  <span className="text-slate-400">{sectionsOpen ? '▲' : '▼'}</span>
                </button>
                {sectionsOpen && result.section_scores.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {result.section_scores.map((s, i) => (
                      <li
                        key={`${s.section}-${i}`}
                        className="flex flex-wrap justify-between gap-2 border-b border-slate-50 py-1 last:border-0"
                      >
                        <span className="text-slate-700">{s.section}</span>
                        <span
                          className={clsx(
                            'tabular-nums font-medium',
                            s.ai_likelihood_percent <= 30 && 'text-emerald-700',
                            s.ai_likelihood_percent >= 31 &&
                              s.ai_likelihood_percent <= 69 &&
                              'text-amber-700',
                            s.ai_likelihood_percent >= 70 && 'text-red-700',
                          )}
                        >
                          {s.ai_likelihood_percent}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {sectionsOpen && result.section_scores.length === 0 && (
                  <p className="mt-2 text-xs text-slate-500">No section breakdown returned.</p>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-sm font-medium text-slate-800"
                  onClick={() => setRulesOpen((o) => !o)}
                  aria-expanded={rulesOpen}
                >
                  Why this score?
                  <span className="text-slate-400">{rulesOpen ? '▲' : '▼'}</span>
                </button>
                {rulesOpen && (
                  <ul className="mt-2 space-y-2">
                    {result.rule_breakdown.map((r) => (
                      <li
                        key={`${r.rule_id}-${r.evidence_snippet.slice(0, 24)}`}
                        className={clsx(
                          'rounded-lg border px-3 py-2 text-sm',
                          r.direction === 'ai_like'
                            ? 'border-red-100 bg-red-50/60'
                            : 'border-emerald-100 bg-emerald-50/60',
                        )}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium text-slate-900">{r.rule_id}</span>
                          <span className="text-xs text-slate-600">
                            {r.points_applied > 0 ? '+' : ''}
                            {r.points_applied} pts · {r.field}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="mt-1 block w-full text-left text-xs text-indigo-700 underline decoration-indigo-300 hover:text-indigo-900"
                          onClick={() => {
                            scrollToSnippet(previewRef?.current ?? null, markdownForPreview, r.evidence_snippet);
                            void recordBlogAnalyticsEvent(blogId, {
                              type: 'ai_check_rule_expanded',
                              ruleId: r.rule_id,
                            });
                          }}
                        >
                          “{r.evidence_snippet}”
                        </button>
                        <p className="mt-1 text-xs text-slate-600">{r.suggested_fix}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {rulesOpen && result.rule_breakdown.length === 0 && (
                  <p className="mt-2 text-xs text-slate-500">No individual rules quoted — try editing and re-run.</p>
                )}
              </div>
            </>
          )}

          {result.llm && (
            <p className="text-[11px] text-slate-400">
              Model: {result.llm.model} · tokens in {result.tokens?.input ?? 0} / out {result.tokens?.output ?? 0}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

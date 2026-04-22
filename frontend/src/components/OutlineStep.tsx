import { useState, useEffect, useRef } from 'react';
import { getOutline, generateOutline, confirmOutline, type BlogOutline } from '../api/blog-api.js';
import { Button } from './ui/button.js';
import { Textarea } from './ui/textarea.js';
import { Toast } from './ui/toast.js';
import { Field } from './ui/field.js';

interface Props {
  blogId: string;
  onBack: () => void;
  onConfirmed: () => void;
}

export function OutlineStep({ blogId, onBack, onConfirmed }: Props) {
  const [outline, setOutline] = useState<BlogOutline | null>(null);
  const [feedback, setFeedback] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iterations, setIterations] = useState(0);
  const [fromSavedRun, setFromSavedRun] = useState(false);
  const bootstrapped = useRef(false);

  async function generate(feedbackText?: string) {
    setError(null);
    setFromSavedRun(false);
    setGenerating(true);
    try {
      const res = await generateOutline(blogId, feedbackText);
      const { raw: _r, ...rest } = res.outline;
      setOutline(rest);
      setFeedback('');
      setIterations((i) => i + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function confirm() {
    setError(null);
    setConfirming(true);
    try {
      await confirmOutline(blogId);
      onConfirmed();
    } catch (e) {
      setError((e as Error).message);
      setConfirming(false);
    }
  }

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    let cancelled = false;

    void (async () => {
      setError(null);
      setLoadingSaved(true);
      setFromSavedRun(false);
      try {
        const saved = await getOutline(blogId);
        if (saved && saved.outline.sections.length > 0) {
          const { raw: _r, ...rest } = saved.outline;
          if (cancelled) return;
          setOutline(rest);
          setIterations(saved.outlineIterations);
          setFromSavedRun(true);
          setLoadingSaved(false);
          return;
        }
      } catch {
        // no row yet or error — fall through to generate
      }
      if (cancelled) return;
      setLoadingSaved(false);
      if (cancelled) return;
      await generate();
    })();

    return () => {
      cancelled = true;
    };
  }, [blogId]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Step 3 — Blog Outline</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review the AI-generated structure. Provide feedback or confirm to proceed to drafting.
        </p>
      </div>

      {(loadingSaved || generating) && (
        <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          <p className="text-sm">
            {loadingSaved
              ? 'Loading your outline…'
              : iterations === 0
                ? 'Calling the model to create your outline…'
                : 'Calling the model with your feedback…'}
          </p>
        </div>
      )}

      {outline && !generating && !loadingSaved && (
        <div className="flex flex-col gap-4">
          {fromSavedRun && (
            <div
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              role="status"
            >
              Restored your last saved outline.
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              {outline.sections.length} sections · ~{outline.totalEstimatedWords.toLocaleString()} words
            </p>
            {iterations > 0 && (
              <p className="text-xs text-slate-400">Iteration {iterations}</p>
            )}
          </div>

          {outline.sections.map((section, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  H2 · {section.title}
                </p>
                <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">
                  ~{section.estimatedWords.toLocaleString()} words
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{section.description}</p>
              {section.subsections.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {section.subsections.map((sub, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-1.5 text-xs text-slate-600">
                      <span className="mt-0.5 shrink-0 text-indigo-300">›</span>
                      <span>{sub}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <Toast variant="error">{error}</Toast>}

      {outline && !generating && !loadingSaved && (
        <Field
          label="Something off? Tell the AI what to change:"
          hint="Leave blank if the outline looks good."
        >
          <Textarea
            rows={3}
            placeholder="e.g. Add a section on pricing comparisons, and make the intro shorter…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </Field>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={loadingSaved || generating || confirming}>
          ← Back to Alignment
        </Button>

        <div className="flex gap-2">
          {outline && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void generate(feedback.trim() || undefined)}
              disabled={loadingSaved || generating || confirming}
            >
              {feedback.trim()
                ? 'Regenerate outline with your feedback'
                : 'Regenerate outline'}
            </Button>
          )}
          <Button
            onClick={() => void confirm()}
            disabled={!outline || loadingSaved || generating || confirming}
            aria-busy={confirming}
          >
            {confirming ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Confirming…
              </span>
            ) : (
              'Confirm Outline →'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { getDraft, generateDraft, confirmDraft } from '../api/blog-api.js';
import { Button } from './ui/button.js';
import { Textarea } from './ui/textarea.js';
import { Toast } from './ui/toast.js';
import { Field } from './ui/field.js';

interface Props {
  blogId: string;
  onBack: () => void;
  onConfirmed: () => void;
}

export function DraftStep({ blogId, onBack, onConfirmed }: Props) {
  const [markdown, setMarkdown] = useState<string | null>(null);
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
      const res = await generateDraft(blogId, feedbackText);
      setMarkdown(res.draft.markdown);
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
      await confirmDraft(blogId);
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
        const { draft } = await getDraft(blogId);
        if (draft.markdown.trim().length > 0) {
          if (cancelled) return;
          setMarkdown(draft.markdown);
          setIterations(draft.draftIterations);
          setFromSavedRun(true);
          setLoadingSaved(false);
          return;
        }
      } catch {
        // 404 or error — try generation
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
        <h2 className="text-lg font-semibold text-slate-800">Step 4: Blog Draft</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review the AI-generated markdown. Give feedback to revise, or confirm when you are happy.
        </p>
      </div>

      {(loadingSaved || generating) && (
        <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          <p className="text-sm">
            {loadingSaved
              ? 'Loading your draft…'
              : iterations === 0
                ? 'Calling the model to create your draft…'
                : 'Calling the model with your feedback…'}
          </p>
        </div>
      )}

      {markdown && !generating && !loadingSaved && (
        <div className="flex flex-col gap-2">
          {fromSavedRun && (
            <div
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              role="status"
            >
              Restored your last saved draft.
            </div>
          )}
          {iterations > 0 && (
            <p className="text-xs text-slate-400">Iteration {iterations}</p>
          )}
          <div className="max-h-[min(60vh,28rem)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-800">
              {markdown}
            </pre>
          </div>
        </div>
      )}

      {error && <Toast variant="error">{error}</Toast>}

      {markdown && !generating && !loadingSaved && (
        <Field
          label="Want changes? Tell the AI what to adjust:"
          hint="Leave blank if the draft reads well."
        >
          <Textarea
            rows={3}
            placeholder="e.g. Shorten the intro, add a bullet list in section 2, stronger CTA at the end…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </Field>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={loadingSaved || generating || confirming}>
          ← Back to Outline
        </Button>

        <div className="flex gap-2">
          {markdown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void generate(feedback.trim() || undefined)}
              disabled={loadingSaved || generating || confirming}
            >
              {feedback.trim()
                ? 'Regenerate draft with your feedback'
                : 'Regenerate draft'}
            </Button>
          )}
          <Button
            onClick={() => void confirm()}
            disabled={!markdown || loadingSaved || generating || confirming}
            aria-busy={confirming}
          >
            {confirming ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Confirming…
              </span>
            ) : (
              'Confirm Draft →'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

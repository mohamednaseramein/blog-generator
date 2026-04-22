import { useState, useEffect } from 'react';
import { generateDraft, confirmDraft } from '../api/blog-api.js';
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
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iterations, setIterations] = useState(0);

  async function generate(feedbackText?: string) {
    setError(null);
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

  useEffect(() => { void generate(); }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Step 4 — Blog Draft</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review the AI-generated markdown. Give feedback to revise, or confirm when you are happy.
        </p>
      </div>

      {generating && (
        <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          <p className="text-sm">
            {iterations === 0 ? 'Generating draft…' : 'Regenerating with your feedback…'}
          </p>
        </div>
      )}

      {markdown && !generating && (
        <div className="flex flex-col gap-2">
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

      {markdown && !generating && (
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
        <Button variant="ghost" size="sm" onClick={onBack} disabled={generating || confirming}>
          ← Back to Outline
        </Button>

        <div className="flex gap-2">
          {markdown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void generate(feedback || undefined)}
              disabled={generating || confirming}
            >
              {feedback ? 'Regenerate with feedback' : 'Regenerate'}
            </Button>
          )}
          <Button
            onClick={() => void confirm()}
            disabled={!markdown || generating || confirming}
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

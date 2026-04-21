import { useState, useEffect } from 'react';
import { generateAlignment, confirmAlignment, type AlignmentSummary as AlignmentSummaryType } from '../api/blog-api.js';
import { Button } from './ui/button.js';
import { Textarea } from './ui/textarea.js';
import { Toast } from './ui/toast.js';
import { Field } from './ui/field.js';

interface Props {
  blogId: string;
  onEdit: () => void;
  onConfirmed: () => void;
}

const SECTIONS: { key: keyof AlignmentSummaryType; label: string; icon: string }[] = [
  { key: 'blogGoal', label: 'Blog Goal', icon: '🎯' },
  { key: 'targetAudience', label: 'Target Audience', icon: '👥' },
  { key: 'seoIntent', label: 'SEO Intent', icon: '🔍' },
  { key: 'tone', label: 'Tone & Voice', icon: '✍️' },
  { key: 'scope', label: 'Scope', icon: '📋' },
];

export function AlignmentSummary({ blogId, onEdit, onConfirmed }: Props) {
  const [summary, setSummary] = useState<AlignmentSummaryType | null>(null);
  const [feedback, setFeedback] = useState('');
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iterations, setIterations] = useState(0);

  async function generate(feedbackText?: string) {
    setError(null);
    setGenerating(true);
    try {
      const res = await generateAlignment(blogId, feedbackText);
      setSummary(res.summary);
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
      await confirmAlignment(blogId);
      onConfirmed();
    } catch (e) {
      setError((e as Error).message);
      setConfirming(false);
    }
  }

  // Auto-generate on first render — empty dep array prevents double-fire under React StrictMode
  useEffect(() => { void generate(); }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Step 2 — AI Alignment Summary</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review what the AI has understood. Edit or confirm before generation begins.
        </p>
      </div>

      {/* Loading state */}
      {generating && (
        <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          <p className="text-sm">{iterations === 0 ? 'Generating alignment summary…' : 'Regenerating with your feedback…'}</p>
        </div>
      )}

      {/* Summary cards */}
      {summary && !generating && (
        <div className="flex flex-col gap-3">
          {SECTIONS.map(({ key, label, icon }) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {icon} {label}
              </p>
              <p className="text-sm text-slate-700">{summary[key]}</p>
            </div>
          ))}

          {iterations > 0 && (
            <p className="text-right text-xs text-slate-400">
              Iteration {iterations}
            </p>
          )}
        </div>
      )}

      {error && <Toast variant="error">{error}</Toast>}

      {/* Feedback */}
      {summary && !generating && (
        <Field label="Something off? Tell the AI what to fix:" hint="Leave blank if the summary looks good.">
          <Textarea
            rows={3}
            placeholder="e.g. The tone should be more technical, and focus more on enterprise buyers…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </Field>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={onEdit} disabled={generating || confirming}>
          ← Edit Inputs
        </Button>

        <div className="flex gap-2">
          {summary && (
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
            disabled={!summary || generating || confirming}
            aria-busy={confirming}
          >
            {confirming ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Confirming…
              </span>
            ) : (
              'Confirm & Proceed →'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

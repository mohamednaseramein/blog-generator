import { useState, useEffect } from 'react';

interface PromptData {
  step: string;
  model: string;
  systemPrompt: string;
  generatedAt: string;
}

interface Props {
  blogId: string;
  step: 'alignment' | 'outline' | 'draft';
}

async function fetchPrompt(blogId: string, step: string): Promise<PromptData | null> {
  const res = await fetch(`/api/blogs/${blogId}/prompts/${step}`);
  if (!res.ok) return null;
  return (await res.json()) as PromptData;
}

export function ViewPromptPanel({ blogId, step }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState<PromptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || prompt) return;
    setLoading(true);
    setError(null);
    void fetchPrompt(blogId, step)
      .then((data) => {
        setPrompt(data);
        if (!data) setError('No prompt recorded for this step yet.');
      })
      .catch(() => setError('Failed to load prompt.'))
      .finally(() => setLoading(false));
  }, [isOpen, blogId, step, prompt]);

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-slate-400">⚙</span>
          View system prompt sent to Claude
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 px-4 py-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
              Loading prompt…
            </div>
          )}

          {error && <p className="text-sm text-slate-500">{error}</p>}

          {prompt && !loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>Model: <span className="font-mono">{prompt.model}</span></span>
                <span>·</span>
                <span>Step: {prompt.step}</span>
                <span>·</span>
                <span>{new Date(prompt.generatedAt).toLocaleString()}</span>
              </div>
              <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs leading-relaxed text-slate-100 whitespace-pre-wrap">
                {prompt.systemPrompt}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

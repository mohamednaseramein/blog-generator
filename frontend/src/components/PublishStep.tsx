import { useState, useEffect, useCallback } from 'react';
import { getDraft, getBrief } from '../api/blog-api.js';
import { Button } from './ui/button.js';
import { Toast } from './ui/toast.js';

interface Props {
  blogId: string;
  onBack: () => void;
  onFinish: () => void;
}

function downloadFilename(title: string | undefined, blogId: string): string {
  const slug = title?.trim()
    ? title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80)
    : '';
  const base = slug || `blog-${blogId.slice(0, 8)}`;
  return `${base}.md`;
}

function triggerDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(url);
}

export function PublishStep({ blogId, onBack, onFinish }: Props) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copyMessage, setCopyMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCopyStatus('idle');
    setCopyMessage('');
    try {
      const [draftRes, briefRes] = await Promise.all([getDraft(blogId), getBrief(blogId)]);
      if (!draftRes.draft.draftConfirmed) {
        setError('Draft is not confirmed — go back to Step 4 and confirm the draft first.');
        setMarkdown(null);
        return;
      }
      setMarkdown(draftRes.draft.markdown);
      setTitle(briefRes.title);
    } catch (e) {
      setError((e as Error).message);
      setMarkdown(null);
    } finally {
      setLoading(false);
    }
  }, [blogId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyToClipboard() {
    if (markdown == null) return;
    setCopyStatus('idle');
    setCopyMessage('');
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyStatus('success');
      setCopyMessage('Full post copied to clipboard.');
    } catch {
      setCopyStatus('error');
      setCopyMessage('Could not copy — use Download instead, or check browser permissions.');
    }
  }

  function download() {
    if (markdown == null) return;
    const name = downloadFilename(title, blogId);
    try {
      triggerDownload(name, markdown);
    } catch {
      setError('Download failed. Try again or copy the text below.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Step 5 — Publish</h2>
        <p className="mt-1 text-sm text-slate-500">
          Copy the markdown into any CMS, doc, or email. Download a file if the clipboard is blocked.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          <p className="text-sm">Loading your draft…</p>
        </div>
      )}

      {error && <Toast variant="error">{error}</Toast>}

      {copyMessage && copyStatus === 'success' && (
        <p className="text-sm text-green-700" role="status" aria-live="polite">
          {copyMessage}
        </p>
      )}
      {copyMessage && copyStatus === 'error' && (
        <p className="text-sm text-amber-800" role="status" aria-live="polite">
          {copyMessage}
        </p>
      )}

      {markdown && !loading && (
        <div className="flex flex-col gap-2">
          <div className="max-h-[min(50vh,24rem)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-800">
              {markdown}
            </pre>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void copyToClipboard()}>
              Copy full post
            </Button>
            <Button type="button" variant="ghost" onClick={download}>
              Download .md
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={loading}
        >
          ← Back to Draft
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFinish}
        >
          Finish →
        </Button>
      </div>
    </div>
  );
}

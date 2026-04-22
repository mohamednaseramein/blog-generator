import { useState, useEffect, useCallback } from 'react';
import { getDraft, getBrief, recordExportEvent, completeBlog } from '../api/blog-api.js';
import type { ExportSection } from '../api/blog-api.js';
import { Button } from './ui/button.js';
import { Toast } from './ui/toast.js';

interface Props {
  blogId: string;
  onBack: () => void;
  onFinish: () => void;
}

const AI_DISCLOSURE = 'This post was created with AI assistance.';

function useCopyFeedback() {
  const [status, setStatus] = useState<Record<string, 'idle' | 'success' | 'error'>>({});

  async function copy(key: string, text: string, blogId: string, section: ExportSection) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus((s) => ({ ...s, [key]: 'success' }));
      void recordExportEvent(blogId, section);
    } catch {
      setStatus((s) => ({ ...s, [key]: 'error' }));
    }
    setTimeout(() => setStatus((s) => ({ ...s, [key]: 'idle' })), 2500);
  }

  return { status, copy };
}

function CopyButton({
  label,
  onCopy,
  statusKey,
  copyStatus,
}: {
  label: string;
  onCopy: () => void;
  statusKey: string;
  copyStatus: Record<string, 'idle' | 'success' | 'error'>;
}) {
  const state = copyStatus[statusKey] ?? 'idle';
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onCopy}
      aria-label={label}
    >
      {state === 'success' ? '✓ Copied' : state === 'error' ? '✗ Failed' : label}
    </Button>
  );
}

export function PublishStep({ blogId, onBack, onFinish }: Props) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [metaDescription, setMetaDescription] = useState<string | null>(null);
  const [suggestedSlug, setSuggestedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);
  const [disclosureOn, setDisclosureOn] = useState(false);

  const { status: copyStatus, copy } = useCopyFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const draftRes = await getDraft(blogId);
      if (!draftRes.draft.draftConfirmed) {
        setError('Draft is not confirmed — go back to Step 4 and confirm the draft first.');
        return;
      }
      setMarkdown(draftRes.draft.markdown);
      setMetaDescription(draftRes.draft.metaDescription);
      setSuggestedSlug(draftRes.draft.suggestedSlug);
      try {
        const briefRes = await getBrief(blogId);
        setTitle(briefRes.title);
      } catch {
        setTitle('');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [blogId]);

  useEffect(() => { void load(); }, [load]);

  function buildFullBlock() {
    const lines: string[] = [];
    if (title) lines.push(`# ${title}\n`);
    if (suggestedSlug) lines.push(`slug: ${suggestedSlug}`);
    if (metaDescription) lines.push(`meta: ${metaDescription}`);
    if (lines.length > 1) lines.push('');
    if (markdown) lines.push(markdown);
    if (disclosureOn) lines.push(`\n---\n${AI_DISCLOSURE}`);
    return lines.join('\n');
  }

  function withDisclosure(text: string) {
    return disclosureOn ? `${text}\n\n---\n${AI_DISCLOSURE}` : text;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Step 5 — Publish</h2>
        <p className="mt-1 text-sm text-slate-500">
          Copy your post to the clipboard — all at once or section by section.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          <p className="text-sm">Loading your draft…</p>
        </div>
      )}

      {error && <Toast variant="error">{error}</Toast>}

      {markdown && !loading && (
        <div className="flex flex-col gap-5">

          {/* Copy all */}
          <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-indigo-800">Copy all</p>
              <p className="text-xs text-indigo-600">Title · slug · meta · full post{disclosureOn ? ' · disclosure' : ''}</p>
            </div>
            <CopyButton
              label="Copy all"
              statusKey="all"
              copyStatus={copyStatus}
              onCopy={() => void copy('all', buildFullBlock(), blogId, 'all')}
            />
          </div>

          {/* Per-section copies */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Copy by section</p>

            {title && (
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-slate-700 truncate max-w-xs">{title}</span>
                <CopyButton
                  label="Copy title"
                  statusKey="title"
                  copyStatus={copyStatus}
                  onCopy={() => void copy('title', title, blogId, 'title')}
                />
              </div>
            )}

            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-slate-500 italic truncate max-w-xs">Post body</span>
              <CopyButton
                label="Copy body"
                statusKey="body"
                copyStatus={copyStatus}
                onCopy={() => void copy('body', withDisclosure(markdown), blogId, 'body')}
              />
            </div>
          </div>

          {/* SEO panel — collapsed by default */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setSeoOpen((o) => !o)}
              aria-expanded={seoOpen}
            >
              <span>SEO &amp; social</span>
              <span className="text-slate-400">{seoOpen ? '▲' : '▼'}</span>
            </button>

            {seoOpen && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3">
                {suggestedSlug ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Suggested slug</span>
                      <span className="text-sm text-slate-700 font-mono truncate">{suggestedSlug}</span>
                    </div>
                    <CopyButton
                      label="Copy slug"
                      statusKey="slug"
                      copyStatus={copyStatus}
                      onCopy={() => void copy('slug', suggestedSlug, blogId, 'slug')}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Slug not yet generated — confirm the draft to generate.</p>
                )}

                {metaDescription ? (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Meta description</span>
                      <span className="text-sm text-slate-700 leading-snug">{metaDescription}</span>
                    </div>
                    <CopyButton
                      label="Copy meta"
                      statusKey="meta"
                      copyStatus={copyStatus}
                      onCopy={() => void copy('meta', metaDescription, blogId, 'meta')}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Meta description not yet generated — confirm the draft to generate.</p>
                )}
              </div>
            )}
          </div>

          {/* AI disclosure toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={disclosureOn}
              onChange={(e) => setDisclosureOn(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-600">
              Append AI disclosure footer: <em className="text-slate-400">"{AI_DISCLOSURE}"</em>
            </span>
          </label>

          {/* Post preview */}
          <div className="max-h-[min(50vh,24rem)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-800">
              {markdown}
            </pre>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={loading}>
          ← Back to Draft
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void (async () => {
              try {
                await completeBlog(blogId);
              } catch {
                // still leave the wizard; completion is best-effort
              } finally {
                onFinish();
              }
            })();
          }}
        >
          Finish →
        </Button>
      </div>
    </div>
  );
}

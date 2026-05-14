import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { AuthenticityPanel } from './AuthenticityPanel.js';
import { Check, Copy, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { getDraft, getBrief, recordExportEvent, completeBlog } from '../api/blog-api.js';
import type { ExportSection } from '../api/blog-api.js';
import {
  buildFullDocumentHtml,
  buildSeoMetaSnippet,
  markdownToPlainText,
  markdownToSafeHtml,
} from '../lib/publishContent.js';
import { Button } from './ui/button.js';
import { Toast } from './ui/toast.js';

interface Props {
  blogId: string;
  onBack: () => void;
  onFinish: () => void;
}

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
  label: idleLabel,
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
  const text =
    state === 'success' ? 'Copied' : state === 'error' ? 'Copy failed' : idleLabel;
  const icon =
    state === 'success' ? (
      <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" aria-hidden />
    ) : state === 'error' ? (
      <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
    ) : (
      <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
    );

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onCopy}
      aria-label={idleLabel}
      className={clsx(
        'gap-1.5 font-medium',
        state === 'success' &&
          'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-emerald-500/40',
        state === 'error' &&
          'text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-500/40',
      )}
    >
      {icon}
      <span aria-live="polite">{text}</span>
    </Button>
  );
}

const htmlPreviewProse = [
  'min-h-0',
  'max-h-[min(65vh,32rem)]',
  'sm:max-h-[min(70vh,36rem)]',
  'overflow-y-auto',
  'rounded-xl',
  'border border-slate-200',
  'bg-white',
  'px-4',
  'py-4',
  'text-sm',
  'text-slate-800',
  '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mb-3',
  '[&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900',
  '[&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-medium',
  '[&_p]:mb-3 [&_p]:leading-relaxed',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
  '[&_li]:my-0.5',
  '[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em]',
  '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-3',
  '[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:text-slate-600',
  '[&_a]:text-indigo-600 [&_a]:underline',
  '[&_hr]:my-4 [&_hr]:border-slate-200',
].join(' ');

type ViewMode = 'preview' | 'markdown';

function DisclosureHeader({
  id,
  open,
  onToggle,
  children,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      id={`${id}-header`}
      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={`${id}-panel`}
    >
      {children}
      <span className="shrink-0 text-slate-400" aria-hidden>
        {open ? '▲' : '▼'}
      </span>
    </button>
  );
}

function charCountClass(len: number, min: number, max: number): string {
  if (len >= min && len <= max) return 'text-emerald-600';
  if (len >= min - 20 && len <= max + 20) return 'text-amber-500';
  return 'text-red-500';
}

function seoTitleCountClass(len: number): string {
  if (len === 0) return 'text-slate-400';
  if (len <= 60) return 'text-emerald-600';
  return 'text-red-500';
}

export function PublishStep({ blogId, onBack, onFinish }: Props) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [primaryKeyword, setPrimaryKeyword] = useState<string>('');
  const [metaDescription, setMetaDescription] = useState<string | null>(null);
  const [suggestedSlug, setSuggestedSlug] = useState<string | null>(null);
  const [seoTitle, setSeoTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const previewScrollRef = useRef<HTMLElement | null>(null);

  const { status: copyStatus, copy } = useCopyFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const draftRes = await getDraft(blogId);
      if (!draftRes.draft.draftConfirmed) {
        setError('Draft is not confirmed - go back to Step 4 and confirm the draft first.');
        return;
      }
      setMarkdown(draftRes.draft.markdown);
      setMetaDescription(draftRes.draft.metaDescription);
      setSuggestedSlug(draftRes.draft.suggestedSlug);
      setSeoTitle(draftRes.draft.seoTitle);
      try {
        const briefRes = await getBrief(blogId);
        setTitle(briefRes.title);
        setPrimaryKeyword(briefRes.primaryKeyword ?? '');
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

  const bodyForExport = useMemo(() => markdown ?? '', [markdown]);

  const bodyHtml = useMemo(() => markdownToSafeHtml(bodyForExport), [bodyForExport]);

  function buildFullBlockMarkdown() {
    const lines: string[] = [];
    if (title) lines.push(`# ${title}\n`);
    if (suggestedSlug) lines.push(`slug: ${suggestedSlug}`);
    if (metaDescription) lines.push(`meta: ${metaDescription}`);
    if (lines.length > 1) lines.push('');
    if (markdown) lines.push(markdown);
    return lines.join('\n');
  }

  function buildFullBlockText() {
    const lines: string[] = [];
    if (title) lines.push(title);
    if (suggestedSlug) lines.push(`Slug: ${suggestedSlug}`);
    if (metaDescription) lines.push(`Meta: ${metaDescription}`);
    if (lines.length) lines.push('');
    if (markdown) lines.push(markdownToPlainText(markdown));
    return lines.join('\n').trim();
  }

  function buildFullBlockHtml() {
    return buildFullDocumentHtml({
      title,
      suggestedSlug,
      metaDescription,
      seoTitle,
      primaryKeyword,
      bodyMarkdown: markdown ?? '',
    });
  }

  function buildSeoSnippet() {
    return buildSeoMetaSnippet({ seoTitle, metaDescription, suggestedSlug, primaryKeyword, title });
  }

  return (
    <div className="flex min-h-0 flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Step 5: Publish</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review your post, then use Export to copy Markdown or HTML for your CMS. Copied full posts
          include the title, optional slug and meta, and body, matching the preview.
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
        <div className="flex min-h-0 w-full flex-col gap-6">
          <AuthenticityPanel
            blogId={blogId}
            markdownForPreview={markdown}
            previewRef={previewScrollRef}
          />

          {/* Post preview first; Export follows below (single column on all breakpoints) */}
          <div className="min-w-0 flex w-full flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Post preview</h3>
              <div
                className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5"
                role="group"
                aria-label="Preview format"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'preview'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('markdown')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'markdown'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Markdown
                </button>
              </div>
            </div>

            {viewMode === 'preview' && (
              <div
                ref={(el) => {
                  previewScrollRef.current = el;
                }}
                className={htmlPreviewProse}
              >
                {title ? (
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
                ) : null}
                {(suggestedSlug || metaDescription) ? (
                  <div className="mb-4 space-y-0.5 border-b border-slate-100 pb-3 text-xs text-slate-500">
                    {suggestedSlug ? <p><span className="font-medium">Slug:</span> {suggestedSlug}</p> : null}
                    {metaDescription ? <p><span className="font-medium">Meta:</span> {metaDescription}</p> : null}
                  </div>
                ) : null}
                <div
                  className="publish-preview-body"
                  // eslint-disable-next-line react/no-danger -- sanitized via DOMPurify in markdownToSafeHtml
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              </div>
            )}

            {viewMode === 'markdown' && (
              <pre
                ref={(el) => {
                  previewScrollRef.current = el;
                }}
                className="max-h-[min(65vh,32rem)] min-h-0 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-sans text-sm text-slate-800 sm:max-h-[min(70vh,36rem)]"
              >
                {buildFullBlockMarkdown()}
              </pre>
            )}
          </div>

          {/* Export: below preview for a single scroll flow */}
          <div className="min-w-0 w-full">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <div className="px-3 pt-3">
                <h3 className="text-sm font-semibold text-slate-800">Export</h3>
                <p className="mt-0.5 text-xs text-slate-500">Full document or specific fields, as Markdown or HTML.</p>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-3">
                <p className="text-xs font-medium text-slate-600">Full post</p>
                <p className="text-xs text-slate-500">
                  Title, optional slug and meta, and body in one paste.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                  <CopyButton
                    label="Copy all (Markdown)"
                    statusKey="all"
                    copyStatus={copyStatus}
                    onCopy={() => void copy('all', buildFullBlockMarkdown(), blogId, 'all')}
                  />
                  <CopyButton
                    label="Copy all (HTML)"
                    statusKey="all_html"
                    copyStatus={copyStatus}
                    onCopy={() => void copy('all_html', buildFullBlockHtml(), blogId, 'all_html')}
                  />
                  <CopyButton
                    label="Copy all (Text)"
                    statusKey="all_text"
                    copyStatus={copyStatus}
                    onCopy={() => void copy('all_text', buildFullBlockText(), blogId, 'all_text')}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100">
                <DisclosureHeader id="publish-fields" open={fieldsOpen} onToggle={() => setFieldsOpen((o) => !o)}>
                  <span>Individual fields</span>
                </DisclosureHeader>
                {fieldsOpen && (
                  <div
                    id="publish-fields-panel"
                    className="flex flex-col gap-2 border-t border-slate-100 px-3 py-2 pb-3"
                    role="region"
                    aria-labelledby="publish-fields-header"
                  >
                    {title && (
                      <div className="flex items-center justify-between gap-2 py-1">
                        <span className="min-w-0 max-w-[55%] truncate text-sm text-slate-700" title={title}>
                          {title}
                        </span>
                        <CopyButton
                          label="Copy title"
                          statusKey="title"
                          copyStatus={copyStatus}
                          onCopy={() => void copy('title', title, blogId, 'title')}
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2 py-1">
                      <span className="shrink-0 text-sm text-slate-600">Post body</span>
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-1">
                        <CopyButton
                          label="Copy as Markdown"
                          statusKey="body"
                          copyStatus={copyStatus}
                          onCopy={() => void copy('body', bodyForExport, blogId, 'body')}
                        />
                        <CopyButton
                          label="Copy as HTML"
                          statusKey="body_html"
                          copyStatus={copyStatus}
                          onCopy={() => void copy('body_html', bodyHtml, blogId, 'body_html')}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100">
                <DisclosureHeader id="publish-seo" open={seoOpen} onToggle={() => setSeoOpen((o) => !o)}>
                  <div className="min-w-0">
                    <span>SEO and social</span>
                    {!seoOpen && (suggestedSlug || metaDescription || seoTitle) && (
                      <p className="mt-0.5 text-xs font-normal text-slate-500">
                        SEO title, slug, and meta available. Expand to view and copy.
                      </p>
                    )}
                  </div>
                </DisclosureHeader>
                {seoOpen && (
                  <div
                    id="publish-seo-panel"
                    className="flex flex-col gap-3 border-t border-slate-100 px-3 py-2 pb-3"
                    role="region"
                    aria-labelledby="publish-seo-header"
                  >
                    {seoTitle ? (
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wide text-slate-400">SEO title</span>
                            <span className={`text-xs font-medium ${seoTitleCountClass(seoTitle.length)}`}>
                              {seoTitle.length}/60
                            </span>
                          </div>
                          <span className="text-sm leading-snug text-slate-700">{seoTitle}</span>
                        </div>
                        <CopyButton
                          label="Copy SEO title"
                          statusKey="seo_title"
                          copyStatus={copyStatus}
                          onCopy={() => void copy('seo_title', seoTitle, blogId, 'seo_title')}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">SEO title not yet generated. Confirm the draft to generate.</p>
                    )}

                    {suggestedSlug ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex flex-col">
                          <span className="text-xs uppercase tracking-wide text-slate-400">Suggested slug</span>
                          <span className="truncate font-mono text-sm text-slate-700">{suggestedSlug}</span>
                        </div>
                        <CopyButton
                          label="Copy slug"
                          statusKey="slug"
                          copyStatus={copyStatus}
                          onCopy={() => void copy('slug', suggestedSlug, blogId, 'slug')}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Slug not yet generated. Confirm the draft to generate.</p>
                    )}

                    {metaDescription ? (
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wide text-slate-400">Meta description</span>
                            <span className={`text-xs font-medium ${charCountClass(metaDescription.length, 150, 160)}`}>
                              {metaDescription.length} chars
                            </span>
                          </div>
                          <span className="text-sm leading-snug text-slate-700">{metaDescription}</span>
                        </div>
                        <CopyButton
                          label="Copy meta"
                          statusKey="meta"
                          copyStatus={copyStatus}
                          onCopy={() => void copy('meta', metaDescription, blogId, 'meta')}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Meta not yet generated. Confirm the draft to generate.</p>
                    )}

                    {(seoTitle || metaDescription || suggestedSlug || primaryKeyword) && (
                      <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-xs uppercase tracking-wide text-slate-400">SEO meta snippet</span>
                            <span className="text-xs text-slate-500">Paste into your CMS &lt;head&gt; section</span>
                          </div>
                          <CopyButton
                            label="Copy snippet"
                            statusKey="seo_snippet"
                            copyStatus={copyStatus}
                            onCopy={() => void copy('seo_snippet', buildSeoSnippet(), blogId, 'seo_snippet')}
                          />
                        </div>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded text-xs text-slate-500">
                          {buildSeoSnippet()}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
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

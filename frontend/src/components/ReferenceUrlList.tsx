import { useState, useCallback } from 'react';
import { addReference, type BlogReference, type ReferenceScrapeStatus } from '../api/blog-api.js';
import { ReferenceUrlCard } from './ReferenceUrlCard.js';
import { Input } from './ui/input.js';

const MAX_REFERENCES = 5;
const URL_REGEX = /^https?:\/\/.+/;

interface Props {
  blogId: string;
  initialReferences?: BlogReference[];
}

export function ReferenceUrlList({ blogId, initialReferences = [] }: Props) {
  const [references, setReferences] = useState<BlogReference[]>(initialReferences);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const url = inputValue.trim();
    if (!url) return;

    if (!URL_REGEX.test(url)) {
      setInputError('Must be a valid URL starting with http:// or https://');
      return;
    }

    if (references.length >= MAX_REFERENCES) {
      setInputError(`Maximum ${MAX_REFERENCES} reference URLs allowed`);
      return;
    }

    setInputError(null);
    setAdding(true);
    try {
      const { reference } = await addReference(blogId, url);
      setReferences((prev) => [...prev, reference]);
      setInputValue('');
    } catch (e) {
      setInputError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleAdd();
    }
  }

  const handleRemove = useCallback((refId: string) => {
    setReferences((prev) => prev.filter((r) => r.id !== refId));
  }, []);

  const handleStatusChange = useCallback((refId: string, status: ReferenceScrapeStatus) => {
    setReferences((prev) =>
      prev.map((r) => (r.id === refId ? { ...r, scrapeStatus: status } : r)),
    );
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {references.map((ref) => (
        <ReferenceUrlCard
          key={ref.id}
          blogId={blogId}
          refId={ref.id}
          url={ref.url}
          initialStatus={ref.scrapeStatus}
          initialError={ref.scrapeError}
          onRemove={handleRemove}
          onStatusChange={handleStatusChange}
        />
      ))}

      {references.length < MAX_REFERENCES && (
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://example.com/reference-article"
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setInputError(null); }}
              onKeyDown={handleKeyDown}
              onBlur={() => { if (inputValue.trim()) void handleAdd(); }}
              disabled={adding}
              error={!!inputError}
              aria-label="Add reference URL"
            />
          </div>
          {inputError && (
            <p className="text-xs text-red-600">{inputError}</p>
          )}
          {adding && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
              Adding…
            </p>
          )}
          <p className="text-xs text-slate-400">
            Press Enter or leave the field to add · {MAX_REFERENCES - references.length} remaining
          </p>
        </div>
      )}

      {references.length >= MAX_REFERENCES && (
        <p className="text-xs text-slate-400">Maximum of {MAX_REFERENCES} reference URLs reached.</p>
      )}
    </div>
  );
}

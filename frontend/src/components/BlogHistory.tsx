import { useState, useEffect } from 'react';
import { listBlogs } from '../api/blog-api.js';
import type { BlogSummary } from '../api/blog-api.js';
import { Button } from './ui/button.js';
import { Toast } from './ui/toast.js';

const STEP_LABELS: Record<number, string> = {
  1: 'Brief',
  2: 'Alignment',
  3: 'Outline',
  4: 'Draft',
  5: 'Publish',
  6: 'Done',
};

function stepLabel(step: number): string {
  return STEP_LABELS[step] ?? `Step ${step}`;
}

function StepBadge({ step, done }: { step: number; done: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        done
          ? 'bg-green-100 text-green-700'
          : 'bg-indigo-100 text-indigo-700'
      }`}
    >
      {done ? '✓ Done' : stepLabel(step)}
    </span>
  );
}

interface Props {
  onResume: (blogId: string, step: number) => void;
  onNew: () => void;
}

export function BlogHistory({ onResume, onNew }: Props) {
  const [blogs, setBlogs] = useState<BlogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listBlogs()
      .then(({ blogs: b }) => setBlogs(b))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">My blogs</h2>
          <p className="mt-0.5 text-sm text-slate-500">Pick up where you left off, or start fresh.</p>
        </div>
        <Button size="sm" onClick={onNew}>
          + New post
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
        </div>
      )}

      {error && <Toast variant="error">{error}</Toast>}

      {!loading && !error && blogs.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-slate-400">
          <p className="text-sm">No blog posts yet.</p>
          <Button size="sm" onClick={onNew}>Start your first post →</Button>
        </div>
      )}

      {!loading && blogs.length > 0 && (
        <ul className="flex flex-col gap-3">
          {blogs.map((blog) => {
            const done = blog.currentStep >= 6;
            const title = blog.title ?? 'Untitled post';
            const date = new Date(blog.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <li
                key={blog.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-sm font-medium text-slate-800">{title}</span>
                  <div className="flex items-center gap-2">
                    <StepBadge step={blog.currentStep} done={done} />
                    <span className="text-xs text-slate-400">{date}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={done ? 'ghost' : undefined}
                  onClick={() => onResume(blog.id, blog.currentStep)}
                >
                  {done ? 'View' : 'Continue →'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

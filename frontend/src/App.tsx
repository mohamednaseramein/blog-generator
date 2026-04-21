import { useState } from 'react';
import { BlogBriefForm } from './components/BlogBriefForm.js';
import { WizardProgress } from './components/WizardProgress.js';
import { Button } from './components/ui/button.js';
import { Toast } from './components/ui/toast.js';
import { createBlog } from './api/blog-api.js';

type AppState =
  | { step: 'idle' }
  | { step: 'creating' }
  | { step: 'brief'; blogId: string }
  | { step: 'done'; blogId: string };

export function App() {
  const [state, setState] = useState<AppState>({ step: 'idle' });
  const [error, setError] = useState<string | null>(null);

  async function startNewBlog() {
    setError(null);
    setState({ step: 'creating' });
    try {
      const { blogId } = await createBlog();
      setState({ step: 'brief', blogId });
    } catch (e) {
      setError((e as Error).message);
      setState({ step: 'idle' });
    }
  }

  const wizardStep = state.step === 'idle' || state.step === 'creating' ? 1
    : state.step === 'brief' ? 1
    : 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white text-xl shadow-lg">
            ✦
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Blog Generator</h1>
          <p className="mt-2 text-slate-500 text-sm">
            Create a fully-structured, SEO-ready blog post in minutes.
          </p>
        </div>

        {/* Wizard progress */}
        {(state.step === 'brief' || state.step === 'done') && (
          <div className="mb-8">
            <WizardProgress current={wizardStep} />
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6 sm:p-8">

          {state.step === 'idle' && (
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              <div className="max-w-sm">
                <h2 className="text-lg font-semibold text-slate-800">Ready to write?</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Walk through our step-by-step wizard and let AI handle the heavy lifting.
                </p>
              </div>
              {error && <Toast variant="error">{error}</Toast>}
              <Button onClick={() => void startNewBlog()} size="md">
                Start a new blog post →
              </Button>
            </div>
          )}

          {state.step === 'creating' && (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
              <p className="text-sm">Setting up your blog…</p>
            </div>
          )}

          {state.step === 'brief' && (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800">Step 1 — Blog Brief</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tell us about your post. The more detail you give, the better the output.
                </p>
              </div>
              <BlogBriefForm
                blogId={state.blogId}
                onSuccess={() => setState({ step: 'done', blogId: state.blogId })}
              />
            </>
          )}

          {state.step === 'done' && (
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl">
                ✓
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Brief saved!</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Next up: AI Alignment Summary — coming in the next step.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void startNewBlog()}>
                ← Start another post
              </Button>
            </div>
          )}

        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by Claude AI · Naser Company
        </p>
      </div>
    </div>
  );
}

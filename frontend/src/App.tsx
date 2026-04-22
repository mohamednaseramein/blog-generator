import { useState } from 'react';
import { BlogBriefForm } from './components/BlogBriefForm.js';
import { AlignmentSummary } from './components/AlignmentSummary.js';
import { OutlineStep } from './components/OutlineStep.js';
import { DraftStep } from './components/DraftStep.js';
import { PublishStep } from './components/PublishStep.js';
import { WizardProgress } from './components/WizardProgress.js';
import { BlogHistory } from './components/BlogHistory.js';
import { Button } from './components/ui/button.js';
import { Toast } from './components/ui/toast.js';
import { createBlog } from './api/blog-api.js';

type AppState =
  | { step: 'idle' }
  | { step: 'history' }
  | { step: 'creating' }
  | { step: 'brief'; blogId: string }
  | { step: 'alignment'; blogId: string }
  | { step: 'outline'; blogId: string }
  | { step: 'draft'; blogId: string }
  | { step: 'publish'; blogId: string }
  | { step: 'done'; blogId: string };

const STEP_TO_APP: Record<number, AppState['step']> = {
  1: 'brief',
  2: 'alignment',
  3: 'outline',
  4: 'draft',
  5: 'publish',
  6: 'publish', // completed blogs open on Publish so content can be re-copied
};

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

  function resumeBlog(blogId: string, currentStep: number) {
    // DB default is 0; legacy rows may never have had advanceBlogStep. Treat 0 as "brief" (1).
    const s = currentStep < 1 ? 1 : currentStep;
    const step = STEP_TO_APP[s] ?? 'brief';
    if (step === 'idle' || step === 'history' || step === 'creating') return;
    setState({ step, blogId });
  }

  const wizardStep = state.step === 'idle' || state.step === 'history' || state.step === 'creating' ? 1
    : state.step === 'brief' ? 1
    : state.step === 'alignment' ? 2
    : state.step === 'outline' ? 3
    : state.step === 'draft' ? 4
    : state.step === 'publish' ? 5
    : 6;

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
        {(state.step === 'brief' || state.step === 'alignment' || state.step === 'outline' || state.step === 'draft' || state.step === 'publish') && (
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
              <div className="flex gap-3">
                <Button onClick={() => void startNewBlog()} size="md">
                  Start a new blog post →
                </Button>
                <Button variant="ghost" size="md" onClick={() => setState({ step: 'history' })}>
                  My blogs
                </Button>
              </div>
            </div>
          )}

          {state.step === 'history' && (
            <BlogHistory
              onResume={resumeBlog}
              onNew={() => void startNewBlog()}
            />
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
                onSuccess={() => setState({ step: 'alignment', blogId: state.blogId })}
              />
            </>
          )}

          {state.step === 'alignment' && (
            <AlignmentSummary
              blogId={state.blogId}
              onEdit={() => setState({ step: 'brief', blogId: state.blogId })}
              onConfirmed={() => setState({ step: 'outline', blogId: state.blogId })}
            />
          )}

          {state.step === 'outline' && (
            <OutlineStep
              blogId={state.blogId}
              onBack={() => setState({ step: 'alignment', blogId: state.blogId })}
              onConfirmed={() => setState({ step: 'draft', blogId: state.blogId })}
            />
          )}

          {state.step === 'draft' && (
            <DraftStep
              blogId={state.blogId}
              onBack={() => setState({ step: 'outline', blogId: state.blogId })}
              onConfirmed={() => setState({ step: 'publish', blogId: state.blogId })}
            />
          )}

          {state.step === 'publish' && (
            <PublishStep
              blogId={state.blogId}
              onBack={() => setState({ step: 'draft', blogId: state.blogId })}
              onFinish={() => setState({ step: 'done', blogId: state.blogId })}
            />
          )}

          {state.step === 'done' && (
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl">
                ✓
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">All set</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Thanks for using the wizard. Start another post whenever you are ready.
                </p>
              </div>
              <div className="flex gap-3">
                <Button size="sm" onClick={() => void startNewBlog()}>
                  + New post
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setState({ step: 'history' })}>
                  My blogs
                </Button>
              </div>
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

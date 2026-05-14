import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, PenLine, Settings, UserCircle, Users } from 'lucide-react';
import { BlogBriefForm } from '../components/BlogBriefForm.js';
import { AlignmentSummary } from '../components/AlignmentSummary.js';
import { OutlineStep } from '../components/OutlineStep.js';
import { DraftStep } from '../components/DraftStep.js';
import { PublishStep } from '../components/PublishStep.js';
import { WizardProgress } from '../components/WizardProgress.js';
import { BlogHistory } from '../components/BlogHistory.js';
import { ProfileWizard } from '../components/ProfileWizard.js';
import { ProfileSwitcher } from '../components/ProfileSwitcher.js';
import { ProfileSettings } from '../components/ProfileSettings.js';
import { ViewPromptPanel } from '../components/ViewPromptPanel.js';
import { Button } from '../components/ui/button.js';
import { Toast } from '../components/ui/toast.js';
import { AppHeader } from '../components/AppHeader';
import { createBlog } from '../api/blog-api.js';
import { listProfiles } from '../api/profile-api.js';
import { useAuth } from '../context/AuthContext';

type AppState =
  | { step: 'profile-wizard' }
  | { step: 'profile-settings' }
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

const ACTIVE_PROFILE_KEY = 'blog-generator:active-profile-id';

function setActiveProfile(id: string, setter: (id: string) => void) {
  setter(id);
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

function dashboardNavClass(active: boolean) {
  return [
    'flex w-full shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
    active ? 'bg-indigo-100 text-indigo-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');
}

function isWizardStep(step: AppState['step']): boolean {
  return step === 'brief' || step === 'alignment' || step === 'outline' || step === 'draft' || step === 'publish';
}

export default function Dashboard() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<AppState>({ step: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_PROFILE_KEY);
  });

  useEffect(() => {
    if ((location.state as any)?.open === 'history') {
      setState({ step: 'history' });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    async function loadProfiles() {
      try {
        const { profiles: loaded } = await listProfiles();

        if (!activeProfileId || !loaded.find((p) => p.id === activeProfileId)) {
          if (loaded.length === 0) {
            setState({ step: 'profile-wizard' });
          } else {
            setActiveProfile(loaded[0].id, setActiveProfileId);
          }
        }
      } catch (e) {
        setError((e as Error).message);
      }
    }
    void loadProfiles();
  }, [activeProfileId]);

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
    const s = currentStep < 1 ? 1 : currentStep;
    const step = STEP_TO_APP[s] ?? 'brief';
    if (step === 'idle' || step === 'history' || step === 'creating') return;
    setState({ step, blogId });
  }

  const wizardStep =
    state.step === 'brief' ? 1
    : state.step === 'alignment' ? 2
    : state.step === 'outline' ? 3
    : state.step === 'draft' ? 4
    : state.step === 'publish' ? 5
    : 1;

  function confirmLeaveWizard(): boolean {
    if (!isWizardStep(state.step)) return true;
    return window.confirm('Leave the wizard? You can resume this post from My blogs.');
  }

  function goWriteHome() {
    setError(null);
    if (state.step === 'profile-wizard') return;
    if (!confirmLeaveWizard()) return;
    setState({ step: 'idle' });
  }

  function goMyBlogs() {
    if (!confirmLeaveWizard()) return;
    setState({ step: 'history' });
  }

  function goAuthorProfiles() {
    if (!confirmLeaveWizard()) return;
    setState({ step: 'profile-settings' });
  }

  const writeNavActive =
    state.step !== 'history' &&
    state.step !== 'profile-settings' &&
    state.step !== 'profile-wizard';
  const historyNavActive = state.step === 'history';
  const profilesNavActive = state.step === 'profile-settings';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <AppHeader />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start lg:gap-8 lg:px-8 lg:py-10">
        <aside
          className="shrink-0 border-b border-slate-200 bg-white/70 pb-4 backdrop-blur-sm lg:w-52 lg:border-b-0 lg:border-r lg:border-slate-200 lg:bg-transparent lg:pb-0 lg:pr-2"
          aria-label="Dashboard navigation"
        >
          <p className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-slate-400 lg:block">
            Workspace
          </p>
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
            <button type="button" className={dashboardNavClass(writeNavActive)} onClick={goWriteHome}>
              <PenLine className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Write
            </button>
            <button type="button" className={dashboardNavClass(historyNavActive)} onClick={goMyBlogs}>
              <BookOpen className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              My blogs
            </button>
            <button type="button" className={dashboardNavClass(profilesNavActive)} onClick={goAuthorProfiles}>
              <Users className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Author profiles
            </button>
            <Link to="/profile" className={`${dashboardNavClass(false)} no-underline`}>
              <UserCircle className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Account
            </Link>
            {role === 'admin' && (
              <Link to="/admin" className={`${dashboardNavClass(false)} no-underline`}>
                <Settings className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                Admin
              </Link>
            )}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 lg:max-w-2xl">
        {/* Intro */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Blog Generator</h1>
          <p className="mt-2 text-sm text-slate-500">
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

          {state.step === 'profile-wizard' && (
            <ProfileWizard
              onProfileSelected={(profile) => {
                setActiveProfile(profile.id, setActiveProfileId);
                setState({ step: 'idle' });
              }}
            />
          )}

          {state.step === 'profile-settings' && (
            <ProfileSettings
              activeProfileId={activeProfileId}
              onActiveProfileChange={(id) => setActiveProfile(id, setActiveProfileId)}
              onBack={() => setState({ step: 'idle' })}
            />
          )}

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
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Step 1: Blog Brief</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tell us about your post. The more detail you give, the better the output.
                  </p>
                </div>
                <ProfileSwitcher
                  activeProfileId={activeProfileId}
                  onProfileChange={(profile) => setActiveProfile(profile.id, setActiveProfileId)}
                  onManageProfiles={() => setState({ step: 'profile-settings' })}
                />
              </div>
              <BlogBriefForm
                blogId={state.blogId}
                activeProfileId={activeProfileId}
                onSuccess={() => setState({ step: 'alignment', blogId: state.blogId })}
              />
            </>
          )}

          {state.step === 'alignment' && (
            <>
              <AlignmentSummary
                blogId={state.blogId}
                onEdit={() => setState({ step: 'brief', blogId: state.blogId })}
                onConfirmed={() => setState({ step: 'outline', blogId: state.blogId })}
              />
              <ViewPromptPanel blogId={state.blogId} step="alignment" />
            </>
          )}

          {state.step === 'outline' && (
            <>
              <OutlineStep
                blogId={state.blogId}
                onBack={() => setState({ step: 'alignment', blogId: state.blogId })}
                onConfirmed={() => setState({ step: 'draft', blogId: state.blogId })}
              />
              <ViewPromptPanel blogId={state.blogId} step="outline" />
            </>
          )}

          {state.step === 'draft' && (
            <>
              <DraftStep
                blogId={state.blogId}
                onBack={() => setState({ step: 'outline', blogId: state.blogId })}
                onConfirmed={() => setState({ step: 'publish', blogId: state.blogId })}
              />
              <ViewPromptPanel blogId={state.blogId} step="draft" />
            </>
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
          {import.meta.env.VITE_APP_VERSION && (
            <span className="ml-1 text-slate-300">v{import.meta.env.VITE_APP_VERSION}</span>
          )}
        </p>
        </div>
      </div>
    </div>
  );
}

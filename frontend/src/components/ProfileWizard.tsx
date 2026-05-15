import { useState, useEffect } from 'react';
import type { AuthorProfile, CreateProfilePayload } from '../api/profile-api.js';
import { getPredefinedProfiles, cloneProfile, createProfile, updateProfile } from '../api/profile-api.js';
import { QuotaApiError } from '../api/api-errors.js';
import { recordQuotaBlocked } from '../lib/plan-analytics.js';
import { ProfileForm } from './ProfileForm.js';
import { QuotaBlockPrompt } from './QuotaBlockPrompt.js';
import { Button } from './ui/button.js';
import { Toast } from './ui/toast.js';

type WizardStep = 'pick' | 'customize';

interface Props {
  onProfileSelected: (profile: AuthorProfile) => void;
}

export function ProfileWizard({ onProfileSelected }: Props) {
  const [step, setStep] = useState<WizardStep>('pick');
  const [predefinedProfiles, setPredefinedProfiles] = useState<AuthorProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<AuthorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaBlock, setQuotaBlock] = useState<QuotaApiError | null>(null);

  useEffect(() => {
    async function loadProfiles() {
      try {
        const { profiles } = await getPredefinedProfiles();
        setPredefinedProfiles(profiles);
      } catch (e) {
        setError((e as Error).message);
      }
    }
    void loadProfiles();
  }, []);

  async function handlePickPredefined(profile: AuthorProfile) {
    setIsLoading(true);
    setError(null);
    setQuotaBlock(null);
    try {
      const { profile: cloned } = await cloneProfile({ cloneFromPredefinedId: profile.id });
      setSelectedProfile(cloned);
      setStep('customize');
    } catch (e) {
      if (e instanceof QuotaApiError) {
        recordQuotaBlocked(e.metric);
        setQuotaBlock(e);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateFromScratch(values: CreateProfilePayload) {
    setIsLoading(true);
    setError(null);
    setQuotaBlock(null);
    try {
      const { profile: created } = await createProfile(values);
      onProfileSelected(created);
    } catch (e) {
      if (e instanceof QuotaApiError) {
        recordQuotaBlocked(e.metric);
        setQuotaBlock(e);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCustomizeAndSave(values: CreateProfilePayload) {
    if (!selectedProfile) return;
    setIsLoading(true);
    setError(null);
    try {
      const { profile: updated } = await updateProfile(selectedProfile.id, values);
      onProfileSelected(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  if (step === 'pick') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Set Up Your Author Profile</h2>
          <p className="mt-2 text-slate-600">
            Choose a predefined profile template or create your own. This helps us understand your voice and generate better content.
          </p>
        </div>

        {quotaBlock && (
          <QuotaBlockPrompt
            metric={quotaBlock.metric}
            limit={quotaBlock.limit}
            usage={quotaBlock.usage}
            message={quotaBlock.message}
          />
        )}
        {error && <Toast variant="error">{error}</Toast>}

        <div className="grid gap-4 sm:grid-cols-2">
          {predefinedProfiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => void handlePickPredefined(profile)}
              disabled={isLoading}
              className="rounded-lg border-2 border-slate-200 p-4 text-left transition hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-50"
            >
              <h3 className="font-semibold text-slate-900">{profile.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{profile.authorRole}</p>
              <p className="mt-2 text-xs text-slate-500">{profile.intent}</p>
            </button>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-6">
          <button
            onClick={() => setStep('customize')}
            className="w-full rounded-lg border-2 border-dashed border-slate-300 py-8 text-center transition hover:border-slate-400 hover:bg-slate-50"
          >
            <div className="text-lg font-semibold text-slate-700">+ Create Your Own</div>
            <p className="mt-1 text-sm text-slate-500">Define your unique voice from scratch</p>
          </button>
        </div>
      </div>
    );
  }

  if (step === 'customize') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            {selectedProfile ? 'Customize Your Profile' : 'Create Your Profile'}
          </h2>
          <p className="mt-2 text-slate-600">
            {selectedProfile ? 'Edit the template to match your voice' : 'Define your author voice and audience'}
          </p>
        </div>

        {quotaBlock && (
          <QuotaBlockPrompt
            metric={quotaBlock.metric}
            limit={quotaBlock.limit}
            usage={quotaBlock.usage}
            message={quotaBlock.message}
          />
        )}
        {error && <Toast variant="error">{error}</Toast>}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <ProfileForm
            initialValues={selectedProfile || undefined}
            onSubmit={selectedProfile ? handleCustomizeAndSave : handleCreateFromScratch}
            submitLabel={selectedProfile ? 'Continue to Blog' : 'Create Profile'}
            isLoading={isLoading}
          />
        </div>

        {selectedProfile && (
          <Button variant="ghost" onClick={() => setStep('pick')} className="w-full">
            ← Back to Templates
          </Button>
        )}
      </div>
    );
  }

  return null;
}

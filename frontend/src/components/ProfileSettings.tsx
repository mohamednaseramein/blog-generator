import { useState, useEffect } from 'react';
import type { AuthorProfile, CreateProfilePayload } from '../api/profile-api.js';
import { listProfiles, createProfile, updateProfile, deleteProfile } from '../api/profile-api.js';
import { ProfileForm } from './ProfileForm.js';
import { Button } from './ui/button.js';
import { Toast } from './ui/toast.js';

type View = 'list' | 'create' | { editing: AuthorProfile };

interface Props {
  activeProfileId: string | null;
  onActiveProfileChange: (id: string) => void;
  onBack: () => void;
}

export function ProfileSettings({ activeProfileId, onActiveProfileChange, onBack }: Props) {
  const [profiles, setProfiles] = useState<AuthorProfile[]>([]);
  const [view, setView] = useState<View>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    void loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      const { profiles: loaded } = await listProfiles();
      setProfiles(loaded);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCreate(values: CreateProfilePayload) {
    setIsLoading(true);
    setError(null);
    try {
      const { profile } = await createProfile(values);
      setProfiles((prev) => [...prev, profile]);
      setView('list');
      setSuccessMsg(`Profile "${profile.name}" created.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdate(profile: AuthorProfile, values: CreateProfilePayload) {
    setIsLoading(true);
    setError(null);
    try {
      const { profile: updated } = await updateProfile(profile.id, values);
      setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setView('list');
      setSuccessMsg(`Profile "${updated.name}" updated. Changes apply to your next generation. Existing drafts are unaffected.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(profile: AuthorProfile) {
    if (!confirm(`Delete "${profile.name}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteProfile(profile.id);
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
      if (activeProfileId === profile.id) {
        const remaining = profiles.filter((p) => p.id !== profile.id);
        if (remaining.length > 0) onActiveProfileChange(remaining[0].id);
      }
      setSuccessMsg(`Profile "${profile.name}" deleted.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="text-sm text-slate-500 hover:text-slate-700">
            ← Back
          </button>
          <h2 className="text-lg font-semibold text-slate-800">Create New Profile</h2>
        </div>
        {error && <Toast variant="error">{error}</Toast>}
        <ProfileForm
          onSubmit={handleCreate}
          submitLabel="Create Profile"
          isLoading={isLoading}
        />
      </div>
    );
  }

  if (typeof view === 'object' && 'editing' in view) {
    const profile = view.editing;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="text-sm text-slate-500 hover:text-slate-700">
            ← Back
          </button>
          <h2 className="text-lg font-semibold text-slate-800">Edit Profile</h2>
        </div>
        {error && <Toast variant="error">{error}</Toast>}
        <ProfileForm
          initialValues={profile}
          onSubmit={(values) => handleUpdate(profile, values)}
          submitLabel="Save Changes"
          isLoading={isLoading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700">
            ← Back
          </button>
          <h2 className="text-lg font-semibold text-slate-800">Author Profiles</h2>
        </div>
        <Button size="sm" onClick={() => setView('create')}>
          + New Profile
        </Button>
      </div>

      {error && <Toast variant="error">{error}</Toast>}
      {successMsg && (
        <Toast variant="success">{successMsg}</Toast>
      )}

      <div className="space-y-3">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`rounded-lg border p-4 transition-colors ${
              profile.id === activeProfileId
                ? 'border-indigo-300 bg-indigo-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{profile.name}</span>
                  {profile.isPredefined && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      Template
                    </span>
                  )}
                  {profile.id === activeProfileId && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-600">{profile.authorRole}</p>
                <p className="mt-1 text-xs text-slate-400">{profile.toneOfVoice}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {profile.id !== activeProfileId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onActiveProfileChange(profile.id)}
                  >
                    Use
                  </Button>
                )}
                {!profile.isPredefined && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setView({ editing: profile })}
                    >
                      Edit
                    </Button>
                    <button
                      onClick={() => void handleDelete(profile)}
                      className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

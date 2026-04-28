import { useEffect, useState } from 'react';
import type { AuthorProfile } from '../api/profile-api.js';
import { listProfiles } from '../api/profile-api.js';
import { Button } from './ui/button.js';

interface Props {
  activeProfileId: string | null;
  onProfileChange: (profile: AuthorProfile) => void;
}

export function ProfileSwitcher({ activeProfileId, onProfileChange }: Props) {
  const [profiles, setProfiles] = useState<AuthorProfile[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  useEffect(() => {
    async function loadProfiles() {
      try {
        setIsLoading(true);
        const { profiles: loaded } = await listProfiles();
        setProfiles(loaded);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    void loadProfiles();
  }, []);

  if (!activeProfile || profiles.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        disabled={isLoading}
      >
        <span className="text-slate-600">Profile:</span>
        <span className="font-semibold text-slate-900">{activeProfile.name}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg">
          {error && (
            <div className="border-b border-slate-200 px-4 py-2 text-sm text-red-600">
              Error loading profiles
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => {
                  onProfileChange(profile);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                  profile.id === activeProfileId
                    ? 'bg-indigo-50 text-indigo-900'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-semibold">{profile.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{profile.authorRole}</div>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-200 px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                // TODO: navigate to profile settings
              }}
              className="w-full text-xs"
            >
              ⚙️ Manage Profiles
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

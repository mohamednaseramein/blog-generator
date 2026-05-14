import { useCallback, useEffect, useState } from 'react';
import type { AuthorProfile, BlogIntent } from '../api/profile-api.js';
import {
  getAdminUserUsage,
  listAdminUserProfiles,
  adminUpdateUserProfile,
  type AdminUserUsage,
} from '../api/admin-api.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import { Field } from './ui/field.js';

const INTENT_OPTIONS: { value: BlogIntent; label: string }[] = [
  { value: 'thought_leadership', label: 'Thought leadership' },
  { value: 'seo', label: 'SEO' },
  { value: 'product_announcement', label: 'Product announcement' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'deep_dive', label: 'Deep dive' },
];

interface Props {
  userId: string;
  userLabel: string;
  onClose: () => void;
  onSaved?: () => void;
}

function profileToForm(p: AuthorProfile) {
  return {
    name: p.name,
    authorRole: p.authorRole,
    audiencePersona: p.audiencePersona,
    intent: p.intent,
    toneOfVoice: p.toneOfVoice,
    voiceNote: p.voiceNote ?? '',
  };
}

export function AdminUserPanel({ userId, userLabel, onClose, onSaved }: Props) {
  const [usage, setUsage] = useState<AdminUserUsage | null>(null);
  const [profiles, setProfiles] = useState<AuthorProfile[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [form, setForm] = useState({
    name: '',
    authorRole: '',
    audiencePersona: '',
    intent: 'thought_leadership' as BlogIntent,
    toneOfVoice: '',
    voiceNote: '',
  });
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const [u, { profiles: plist }] = await Promise.all([
        getAdminUserUsage(userId),
        listAdminUserProfiles(userId),
      ]);
      setUsage(u);
      setProfiles(plist);
      const first = plist[0];
      if (first) {
        setSelectedProfileId(first.id);
        setForm(profileToForm(first));
      } else {
        setSelectedProfileId('');
        setForm({
          name: '',
          authorRole: '',
          audiencePersona: '',
          intent: 'thought_leadership',
          toneOfVoice: '',
          voiceNote: '',
        });
      }
    } catch (e) {
      setDetailError((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    const p = profiles.find((x) => x.id === selectedProfileId);
    if (p) setForm(profileToForm(p));
  }, [selectedProfileId, profiles]);

  async function handleSave() {
    if (!selectedProfileId) return;
    setSaving(true);
    setDetailError(null);
    try {
      await adminUpdateUserProfile(userId, selectedProfileId, form);
      await loadDetail();
      onSaved?.();
    } catch (e) {
      setDetailError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="mb-10 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-sm sm:p-6"
      aria-labelledby="admin-user-panel-title"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="admin-user-panel-title" className="text-lg font-semibold text-slate-900">
            User: {userLabel}
          </h2>
          <p className="text-xs text-slate-500">ID {userId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={() => void loadDetail()} disabled={detailLoading}>
            Refresh
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {detailError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{detailError}</div>
      )}

      {detailLoading ? (
        <p className="text-sm text-slate-600">Loading usage and profiles…</p>
      ) : (
        <>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Usage</h3>
          {usage && (
            <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <dt className="text-xs text-slate-500">Blog posts</dt>
                <dd className="text-lg font-semibold text-slate-900">{usage.blog_count}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <dt className="text-xs text-slate-500">Author profiles</dt>
                <dd className="text-lg font-semibold text-slate-900">{usage.author_profile_count}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <dt className="text-xs text-slate-500">AI check runs</dt>
                <dd className="text-lg font-semibold text-slate-900">{usage.ai_check_count}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <dt className="text-xs text-slate-500">Reference URLs</dt>
                <dd className="text-lg font-semibold text-slate-900">{usage.reference_count}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 sm:col-span-2 lg:col-span-1">
                <dt className="text-xs text-slate-500">Last blog activity</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {usage.last_blog_activity_at
                    ? new Date(usage.last_blog_activity_at).toLocaleString()
                    : '—'}
                </dd>
              </div>
            </dl>
          )}

          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Author profile (editable)</h3>
          {profiles.length === 0 ? (
            <p className="text-sm text-slate-600">
              This user has no custom author profiles yet. They can create one from the in-app profile flow.
            </p>
          ) : (
            <div className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Profile</span>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <Field label="Profile name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Display name"
                />
              </Field>
              <Field label="Author role">
                <Input
                  value={form.authorRole}
                  onChange={(e) => setForm((f) => ({ ...f, authorRole: e.target.value }))}
                  placeholder="Role / title"
                />
              </Field>
              <Field label="Audience persona">
                <Textarea
                  value={form.audiencePersona}
                  onChange={(e) => setForm((f) => ({ ...f, audiencePersona: e.target.value }))}
                  rows={4}
                  placeholder="Who they write for"
                />
              </Field>
              <Field label="Intent">
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={form.intent}
                  onChange={(e) => setForm((f) => ({ ...f, intent: e.target.value as BlogIntent }))}
                >
                  {INTENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tone of voice">
                <Input
                  value={form.toneOfVoice}
                  onChange={(e) => setForm((f) => ({ ...f, toneOfVoice: e.target.value }))}
                  placeholder="e.g. Direct, warm"
                />
              </Field>
              <Field label="Style guidance (optional)">
                <Textarea
                  value={form.voiceNote}
                  onChange={(e) => setForm((f) => ({ ...f, voiceNote: e.target.value }))}
                  rows={2}
                  placeholder="Optional notes"
                />
              </Field>

              <Button type="button" disabled={saving || !selectedProfileId} onClick={() => void handleSave()}>
                {saving ? 'Saving…' : 'Save profile'}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

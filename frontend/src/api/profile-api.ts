import { authedFetch } from '../lib/authed-fetch.js';

const BASE = '/api/profiles';

export type BlogIntent = 'thought_leadership' | 'seo' | 'product_announcement' | 'newsletter' | 'deep_dive';

export interface AuthorProfile {
  id: string;
  name: string;
  authorRole: string;
  audiencePersona: string;
  intent: BlogIntent;
  toneOfVoice: string;
  voiceNote: string;
  isPredefined: boolean;
  voiceSampleText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfilePayload {
  name: string;
  authorRole: string;
  audiencePersona: string;
  intent: BlogIntent;
  toneOfVoice: string;
  voiceNote?: string;
}

export interface CloneProfilePayload {
  cloneFromPredefinedId: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await authedFetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = (await res.json()) as unknown;
  if (!res.ok) {
    const err = body as { error?: { message?: string } };
    throw new Error(err.error?.message ?? 'Request failed');
  }
  return body as T;
}

export async function listProfiles(): Promise<{ profiles: AuthorProfile[] }> {
  return request<{ profiles: AuthorProfile[] }>(BASE);
}

export async function getPredefinedProfiles(): Promise<{ profiles: AuthorProfile[] }> {
  return request<{ profiles: AuthorProfile[] }>(`${BASE}/predefined`);
}

export async function getProfile(id: string): Promise<{ profile: AuthorProfile }> {
  return request<{ profile: AuthorProfile }>(`${BASE}/${id}`);
}

export async function createProfile(payload: CreateProfilePayload): Promise<{ profile: AuthorProfile }> {
  return request<{ profile: AuthorProfile }>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function cloneProfile(payload: CloneProfilePayload): Promise<{ profile: AuthorProfile }> {
  return request<{ profile: AuthorProfile }>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProfile(id: string, updates: Partial<CreateProfilePayload>): Promise<{ profile: AuthorProfile }> {
  return request<{ profile: AuthorProfile }>(`${BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteProfile(id: string): Promise<void> {
  await request<void>(`${BASE}/${id}`, { method: 'DELETE' });
}

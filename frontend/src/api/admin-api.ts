import { authedFetch } from '../lib/authed-fetch.js';
import type { AuthorProfile, BlogIntent } from './profile-api.js';

const BASE = '/api/admin';

export interface AdminUserRow {
  id: string;
  email: string | undefined;
  role: string;
  email_verified_at: string | null;
  deactivated_at: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export interface AdminBlogRow {
  id: string;
  user_id: string;
  current_step: number;
  status: string;
  created_at: string;
  updated_at: string;
  title: string | null;
  owner_email: string;
}

export interface AdminUserUsage {
  user_id: string;
  blog_count: number;
  author_profile_count: number;
  ai_check_count: number;
  reference_count: number;
  last_blog_activity_at: string | null;
}

export type AdminProfileUpdatePayload = {
  name?: string;
  authorRole?: string;
  audiencePersona?: string;
  intent?: BlogIntent;
  toneOfVoice?: string;
  voiceNote?: string;
};

function extractApiError(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Request failed';
  const o = body as Record<string, unknown>;
  if (typeof o.message === 'string') return o.message;
  if (typeof o.error === 'string') return o.error;
  if (o.error && typeof o.error === 'object' && o.error !== null && 'message' in o.error) {
    const m = (o.error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return 'Request failed';
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(res.ok ? 'Invalid JSON from server' : text || res.statusText);
  }
  if (!res.ok) {
    throw new Error(extractApiError(body));
  }
  return body as T;
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const res = await authedFetch(`${BASE}/users`);
  return parseJson<AdminUserRow[]>(res);
}

export async function listAdminBlogs(): Promise<AdminBlogRow[]> {
  const res = await authedFetch(`${BASE}/blogs`);
  return parseJson<AdminBlogRow[]>(res);
}

export async function getAdminUserUsage(userId: string): Promise<AdminUserUsage> {
  const res = await authedFetch(`${BASE}/users/${encodeURIComponent(userId)}/usage`);
  return parseJson<AdminUserUsage>(res);
}

export async function listAdminUserProfiles(userId: string): Promise<{ profiles: AuthorProfile[] }> {
  const res = await authedFetch(`${BASE}/users/${encodeURIComponent(userId)}/profiles`);
  return parseJson<{ profiles: AuthorProfile[] }>(res);
}

export async function adminUpdateUserProfile(
  userId: string,
  profileId: string,
  payload: AdminProfileUpdatePayload,
): Promise<{ profile: AuthorProfile }> {
  const res = await authedFetch(
    `${BASE}/users/${encodeURIComponent(userId)}/profiles/${encodeURIComponent(profileId)}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
  return parseJson<{ profile: AuthorProfile }>(res);
}

export async function postAdminUserAction(path: string): Promise<{ success: boolean }> {
  const res = await authedFetch(`${BASE}${path}`, { method: 'POST', body: '{}' });
  return parseJson<{ success: boolean }>(res);
}

export async function deleteAdminBlog(blogId: string): Promise<{ success: boolean }> {
  const res = await authedFetch(`${BASE}/blogs/${encodeURIComponent(blogId)}`, { method: 'DELETE' });
  return parseJson<{ success: boolean }>(res);
}

export interface AdminPlanLimits {
  blogQuota: number | null;
  aiCheckQuota: number | null;
  authorProfileLimit: number | null;
  referenceExtractionQuota: number | null;
}

export interface AdminPlanRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  billingPeriod: string;
  limits: AdminPlanLimits;
  isPublic: boolean;
  isDefault: boolean;
  archivedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  activeSubscriberCount: number;
}

export async function listAdminPlans(): Promise<{ plans: AdminPlanRow[] }> {
  const res = await authedFetch(`${BASE}/plans`);
  return parseJson<{ plans: AdminPlanRow[] }>(res);
}

export type AdminPlanCreatePayload = {
  name: string;
  description?: string;
  priceCents: number;
  currency?: string;
  slug?: string;
  blogQuota?: number | null;
  aiCheckQuota?: number | null;
  authorProfileLimit?: number | null;
  referenceExtractionQuota?: number | null;
  isPublic?: boolean;
  sortOrder?: number;
};

export async function createAdminPlan(payload: AdminPlanCreatePayload): Promise<{ plan: AdminPlanRow }> {
  const res = await authedFetch(`${BASE}/plans`, { method: 'POST', body: JSON.stringify(payload) });
  return parseJson<{ plan: AdminPlanRow }>(res);
}

export type AdminPlanPatchPayload = Partial<AdminPlanCreatePayload>;

export async function patchAdminPlan(
  planId: string,
  payload: AdminPlanPatchPayload,
): Promise<{ plan: AdminPlanRow }> {
  const res = await authedFetch(`${BASE}/plans/${encodeURIComponent(planId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return parseJson<{ plan: AdminPlanRow }>(res);
}

export async function archiveAdminPlan(planId: string): Promise<{ plan: AdminPlanRow }> {
  const res = await authedFetch(`${BASE}/plans/${encodeURIComponent(planId)}/archive`, {
    method: 'POST',
    body: '{}',
  });
  return parseJson<{ plan: AdminPlanRow }>(res);
}

export async function setDefaultAdminPlan(planId: string): Promise<{ plan: AdminPlanRow }> {
  const res = await authedFetch(`${BASE}/plans/${encodeURIComponent(planId)}/set-default`, {
    method: 'POST',
    body: '{}',
  });
  return parseJson<{ plan: AdminPlanRow }>(res);
}

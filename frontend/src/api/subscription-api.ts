import { authedFetch } from '../lib/authed-fetch.js';

const BASE = '/api/subscription';

export type QuotaMetric = 'blogs' | 'ai_checks' | 'author_profiles' | 'reference_extractions';

export interface PlanLimits {
  blogQuota: number | null;
  aiCheckQuota: number | null;
  authorProfileLimit: number | null;
  referenceExtractionQuota: number | null;
}

export interface PlanSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  billingPeriod: string;
  limits: PlanLimits;
  isPublic?: boolean;
  sortOrder?: number;
}

export interface UsageRow {
  metric: QuotaMetric;
  used: number;
  limit: number | null;
  exceeded: boolean;
}

export interface SubscriptionView {
  subscription: {
    id: string;
    planId: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    changedBy: string | null;
  };
  plan: PlanSummary;
  usage: UsageRow[];
  periodResetsAt: string;
}

export interface DowngradeConflict {
  metric: QuotaMetric;
  used: number;
  limit: number;
}

export class SubscriptionApiError extends Error {
  readonly code: string;
  readonly conflicts: DowngradeConflict[];

  constructor(message: string, code: string, conflicts: DowngradeConflict[] = []) {
    super(message);
    this.name = 'SubscriptionApiError';
    this.code = code;
    this.conflicts = conflicts;
  }
}

function extractApiError(body: unknown): { message: string; code?: string; conflicts?: DowngradeConflict[] } {
  if (!body || typeof body !== 'object') return { message: 'Request failed' };
  const o = body as Record<string, unknown>;
  const err = o.error;
  if (err && typeof err === 'object' && err !== null) {
    const e = err as { message?: unknown; code?: unknown; conflicts?: unknown };
    const message = typeof e.message === 'string' ? e.message : 'Request failed';
    const code = typeof e.code === 'string' ? e.code : undefined;
    const conflicts = Array.isArray(e.conflicts) ? (e.conflicts as DowngradeConflict[]) : undefined;
    return { message, code, conflicts };
  }
  return { message: 'Request failed' };
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
    const { message, code, conflicts } = extractApiError(body);
    if (code === 'DOWNGRADE_BLOCKED') {
      throw new SubscriptionApiError(message, code, conflicts ?? []);
    }
    throw new Error(message);
  }
  return body as T;
}

export async function getMySubscription(): Promise<SubscriptionView> {
  const res = await authedFetch(BASE);
  return parseJson<SubscriptionView>(res);
}

export async function changeMyPlan(planId: string): Promise<SubscriptionView> {
  const res = await authedFetch(BASE, {
    method: 'PUT',
    body: JSON.stringify({ planId }),
  });
  return parseJson<SubscriptionView>(res);
}

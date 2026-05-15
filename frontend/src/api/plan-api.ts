import type { PlanSummary } from './subscription-api.js';

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(res.ok ? 'Invalid JSON from server' : text || res.statusText);
  }
  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error?: { message?: string } }).error?.message ?? 'Request failed')
        : 'Request failed';
    throw new Error(msg);
  }
  return body as T;
}

export async function getPublicPlans(): Promise<{ plans: PlanSummary[] }> {
  const res = await fetch('/api/plans');
  return parseJson<{ plans: PlanSummary[] }>(res);
}

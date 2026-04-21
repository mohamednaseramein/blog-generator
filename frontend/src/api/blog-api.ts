const BASE = '/api/blogs';

export interface SubmitBriefPayload {
  title: string;
  primaryKeyword: string;
  audiencePersona: string;
  toneOfVoice: string;
  wordCountMin: number;
  wordCountMax: number;
  blogBrief: string;
  referenceUrl?: string;
}

export interface ScrapeStatusResponse {
  scrapeStatus: 'pending' | 'success' | 'failed' | 'skipped';
  scrapedContentLength: number;
}

export interface BlogBriefResponse {
  title: string;
  primaryKeyword: string;
  audiencePersona: string;
  toneOfVoice: string;
  wordCountMin: number;
  wordCountMax: number;
  blogBrief: string;
  referenceUrl: string | null;
}

export async function getBrief(blogId: string): Promise<BlogBriefResponse> {
  return request<BlogBriefResponse>(`${BASE}/${blogId}/brief`);
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json() as unknown;
  if (!res.ok) {
    const err = body as { error?: { message?: string } };
    throw new Error(err.error?.message ?? 'Request failed');
  }
  return body as T;
}

export async function createBlog(): Promise<{ blogId: string }> {
  return request<{ blogId: string }>(BASE, { method: 'POST' });
}

export async function submitBrief(
  blogId: string,
  payload: SubmitBriefPayload,
): Promise<{ blogId: string; scrapeStatus: string }> {
  return request(`${BASE}/${blogId}/brief`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getScrapeStatus(blogId: string): Promise<ScrapeStatusResponse> {
  return request<ScrapeStatusResponse>(`${BASE}/${blogId}/brief/scrape-status`);
}

export interface AlignmentSummary {
  blogGoal: string;
  targetAudience: string;
  seoIntent: string;
  tone: string;
  scope: string;
  /** Present only when the brief had a scraped reference URL. */
  referenceUnderstanding?: string;
}

export interface AlignmentResponse {
  summary: AlignmentSummary & { raw: string };
}

export async function generateAlignment(
  blogId: string,
  feedback?: string,
): Promise<AlignmentResponse> {
  return request<AlignmentResponse>(`${BASE}/${blogId}/alignment`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  });
}

export async function confirmAlignment(blogId: string): Promise<{ confirmed: boolean }> {
  return request<{ confirmed: boolean }>(`${BASE}/${blogId}/alignment/confirm`, {
    method: 'POST',
  });
}

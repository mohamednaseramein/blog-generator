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
  /** Raw-scrape / pending-extraction path. */
  referenceUnderstanding?: string;
  /** Structured reference extractions available. */
  differentiationAngle?: string;
}

export interface AlignmentResponse {
  summary: AlignmentSummary & { raw: string };
  referencesAnalysis?: 'none_usable';
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

export interface OutlineSection {
  title: string;
  description: string;
  subsections: string[];
  estimatedWords: number;
}

export interface BlogOutline {
  sections: OutlineSection[];
  totalEstimatedWords: number;
}

export interface OutlineResponse {
  outline: BlogOutline & { raw: string };
}

export async function generateOutline(
  blogId: string,
  feedback?: string,
): Promise<OutlineResponse> {
  return request<OutlineResponse>(`${BASE}/${blogId}/outline`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  });
}

export async function confirmOutline(blogId: string): Promise<{ confirmed: boolean }> {
  return request<{ confirmed: boolean }>(`${BASE}/${blogId}/outline/confirm`, {
    method: 'POST',
  });
}

export interface DraftResponse {
  draft: { markdown: string; raw: string };
}

export async function generateDraft(
  blogId: string,
  feedback?: string,
): Promise<DraftResponse> {
  return request<DraftResponse>(`${BASE}/${blogId}/draft`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  });
}

export async function confirmDraft(blogId: string): Promise<{ confirmed: boolean }> {
  return request<{ confirmed: boolean }>(`${BASE}/${blogId}/draft/confirm`, {
    method: 'POST',
  });
}

export async function getDraft(
  blogId: string,
): Promise<{ draft: { markdown: string; draftConfirmed: boolean; draftIterations: number } }> {
  return request(`${BASE}/${blogId}/draft`);
}

export type ReferenceScrapeStatus = 'pending' | 'success' | 'failed' | 'timeout' | 'skipped';

export type ReferenceExtractionStatus = 'pending' | 'success' | 'failed' | 'irrelevant';

export interface BlogReference {
  id: string;
  blogId: string;
  url: string;
  position: number;
  scrapeStatus: ReferenceScrapeStatus;
  scrapeError: string | null;
  scrapedContent: string | null;
  extractionStatus: ReferenceExtractionStatus;
  extractionJson: string | null;
}

export async function addReference(
  blogId: string,
  url: string,
): Promise<{ reference: BlogReference }> {
  return request<{ reference: BlogReference }>(`${BASE}/${blogId}/references`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export async function listReferences(blogId: string): Promise<{ references: BlogReference[] }> {
  return request<{ references: BlogReference[] }>(`${BASE}/${blogId}/references`);
}

export async function getReferenceStatus(
  blogId: string,
  refId: string,
): Promise<{
  scrapeStatus: ReferenceScrapeStatus;
  scrapeError: string | null;
  extractionStatus: ReferenceExtractionStatus;
  extractionJson: string | null;
}> {
  return request<{
    scrapeStatus: ReferenceScrapeStatus;
    scrapeError: string | null;
    extractionStatus: ReferenceExtractionStatus;
    extractionJson: string | null;
  }>(`${BASE}/${blogId}/references/${refId}/status`);
}

export async function removeReference(
  blogId: string,
  refId: string,
): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`${BASE}/${blogId}/references/${refId}`, {
    method: 'DELETE',
  });
}

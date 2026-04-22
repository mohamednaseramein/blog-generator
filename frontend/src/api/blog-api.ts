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
  /** Set after at least one alignment generation; used to restore Step 2 without re-calling the model. */
  alignmentSummary?: string | null;
  alignment_summary?: string | null;
  alignmentConfirmed?: boolean;
  alignmentIterations?: number;
  alignment_iterations?: number;
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

export interface BlogSummary {
  id: string;
  currentStep: number;
  status: 'draft' | 'in_progress' | 'completed';
  title: string | null;
  updatedAt: string;
}

export async function listBlogs(): Promise<{ blogs: BlogSummary[] }> {
  return request<{ blogs: BlogSummary[] }>(BASE);
}

export async function createBlog(): Promise<{ blogId: string }> {
  return request<{ blogId: string }>(BASE, { method: 'POST' });
}

export async function completeBlog(blogId: string): Promise<{ blogId: string; currentStep: number }> {
  return request<{ blogId: string; currentStep: number }>(`${BASE}/${blogId}/complete`, {
    method: 'POST',
  });
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

export interface ParsedAlignmentFromStorage {
  summary: AlignmentSummary;
  /** Present when the model had no usable reference insights (same as live generate). */
  referencesAnalysis: 'none_usable' | null;
}

/** Parse persisted `blog_briefs.alignment_summary` (JSON text) for display without re-generating. */
export function parseAlignmentSummaryFromStorage(alignmentSummary: string): ParsedAlignmentFromStorage {
  const text = alignmentSummary.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const p = JSON.parse(text) as Record<string, unknown>;
  for (const k of ['blogGoal', 'targetAudience', 'seoIntent', 'tone', 'scope'] as const) {
    if (typeof p[k] !== 'string' || !(p[k] as string).trim()) {
      throw new Error('Invalid stored alignment');
    }
  }
  const ref = p['referencesAnalysis'];
  return {
    summary: {
      blogGoal: p['blogGoal'] as string,
      targetAudience: p['targetAudience'] as string,
      seoIntent: p['seoIntent'] as string,
      tone: p['tone'] as string,
      scope: p['scope'] as string,
      referenceUnderstanding:
        typeof p['referenceUnderstanding'] === 'string' ? p['referenceUnderstanding'] : undefined,
      differentiationAngle: typeof p['differentiationAngle'] === 'string' ? p['differentiationAngle'] : undefined,
    },
    referencesAnalysis: ref === 'none_usable' ? 'none_usable' : null,
  };
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

/** GET /outline — same section shape as generate; null if no outline row yet (404). */
export async function getOutline(
  blogId: string,
): Promise<{
  outline: BlogOutline & { raw: string };
  outlineConfirmed: boolean;
  outlineIterations: number;
} | null> {
  const res = await fetch(`${BASE}/${blogId}/outline`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status === 404) return null;
  const body = (await res.json()) as unknown;
  if (!res.ok) {
    const err = body as { error?: { message?: string } };
    throw new Error(err.error?.message ?? 'Request failed');
  }
  return body as {
    outline: BlogOutline & { raw: string };
    outlineConfirmed: boolean;
    outlineIterations: number;
  };
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

export async function getDraft(blogId: string): Promise<{
  draft: {
    markdown: string;
    draftConfirmed: boolean;
    draftIterations: number;
    metaDescription: string | null;
    suggestedSlug: string | null;
  };
}> {
  return request(`${BASE}/${blogId}/draft`);
}

export type ExportSection =
  | 'all'
  | 'all_html'
  | 'title'
  | 'meta'
  | 'slug'
  | 'body'
  | 'body_html';

export async function recordExportEvent(
  blogId: string,
  section: ExportSection,
): Promise<void> {
  try {
    await request(`${BASE}/${blogId}/events`, {
      method: 'POST',
      body: JSON.stringify({ type: 'exported', section }),
    });
  } catch {
    // fire-and-forget — never surface to the user
  }
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
  /** Human-readable reason when extraction failed; optional in older clients. */
  extractionError: string | null;
}> {
  return request<{
    scrapeStatus: ReferenceScrapeStatus;
    scrapeError: string | null;
    extractionStatus: ReferenceExtractionStatus;
    extractionJson: string | null;
    extractionError: string | null;
  }>(`${BASE}/${blogId}/references/${refId}/status`);
}

export async function retryReferenceExtraction(
  blogId: string,
  refId: string,
): Promise<{ retried: boolean }> {
  return request<{ retried: boolean }>(`${BASE}/${blogId}/references/${refId}/retry-extraction`, {
    method: 'POST',
  });
}

export async function removeReference(
  blogId: string,
  refId: string,
): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`${BASE}/${blogId}/references/${refId}`, {
    method: 'DELETE',
  });
}

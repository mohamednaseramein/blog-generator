export type BlogStatus = 'draft' | 'in_progress' | 'completed';
export type ScrapeStatus = 'pending' | 'success' | 'failed' | 'skipped';
export type ReferenceScrapeStatus = 'pending' | 'success' | 'failed' | 'timeout' | 'skipped';
export type ReferenceExtractionStatus = 'pending' | 'success' | 'failed' | 'irrelevant';
export type BlogIntent = 'thought_leadership' | 'seo' | 'product_announcement' | 'newsletter' | 'deep_dive';

export interface Blog {
  id: string;
  userId: string;
  status: BlogStatus;
  currentStep: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthorProfile {
  id: string;
  /** Null for predefined/global templates. */
  userId: string | null;
  name: string;
  authorRole: string;
  audiencePersona: string;
  intent: BlogIntent;
  toneOfVoice: string;
  voiceNote: string;
  isPredefined: boolean;
  voiceSampleText: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogBrief {
  id: string;
  blogId: string;
  title: string;
  primaryKeyword: string;
  audiencePersona: string;
  toneOfVoice: string;
  wordCountMin: number;
  wordCountMax: number;
  blogBrief: string;
  referenceUrl: string | null;
  scrapedContent: string | null;
  scrapeStatus: ScrapeStatus;
  authorRole: string;
  intent: BlogIntent;
  voiceNote: string;
  profileId: string | null;
  alignmentSummary: string | null;
  alignmentConfirmed: boolean;
  alignmentIterations: number;
  alignmentSystemPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogOutlineSection {
  title: string;
  description: string;
  subsections: string[];
  estimatedWords: number;
}

export interface BlogOutline {
  id: string;
  blogId: string;
  outlineJson: string;
  outlineConfirmed: boolean;
  outlineIterations: number;
  systemPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Persisted AI-generated markdown draft (Step 4). */
export interface BlogDraft {
  id: string;
  blogId: string;
  draftMarkdown: string;
  draftConfirmed: boolean;
  draftIterations: number;
  metaDescription: string | null;
  suggestedSlug: string | null;
  seoTitle: string | null;
  systemPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitBriefInput {
  title: string;
  primaryKeyword: string;
  audiencePersona: string;
  toneOfVoice: string;
  wordCountMin: number;
  wordCountMax: number;
  blogBrief: string;
  /** Omitted until author-profile UI lands; repository backfills from existing row or migration defaults. */
  authorRole?: string;
  intent?: BlogIntent;
  voiceNote?: string;
  profileId?: string | null;
  /** @deprecated Use blog_references table instead. Kept for backwards compat during transition. */
  referenceUrl?: string;
}

export interface AddReferenceInput {
  url: string;
}

export type BlogStatus = 'draft' | 'in_progress' | 'completed';
export type ScrapeStatus = 'pending' | 'success' | 'failed' | 'skipped';

export interface Blog {
  id: string;
  userId: string;
  status: BlogStatus;
  currentStep: number;
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
  alignmentSummary: string | null;
  alignmentConfirmed: boolean;
  alignmentIterations: number;
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
  referenceUrl?: string;
}

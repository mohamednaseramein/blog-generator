export type AiDetectorMode =
  | 'pure_ai'
  | 'ai_assisted'
  | 'human_polish'
  | 'pure_human'
  | 'language_unsupported';

export interface AiCheckSignal {
  signal: string;
  weight: number;
  evidence_snippets: string[];
}

export interface AiCheckRuleBreakdownItem {
  rule_id: string;
  direction: 'ai_like' | 'human_like';
  points_applied: number;
  evidence_snippet: string;
  section: string;
  field: 'body' | 'seo_title' | 'meta_description';
  suggested_fix: string;
}

export interface AiCheckSectionScore {
  section: string;
  ai_likelihood_percent: number;
  notes?: string;
}

export interface AiCheckExcludedSegment {
  type: string;
  count: number;
  example_snippet: string;
}

/** Strict-schema subset stored in JSONB + returned to clients */
export interface AiCheckLlmResult {
  ai_likelihood_percent: number;
  human_likelihood_percent: number;
  uncertainty_percent: number;
  top_signals: {
    ai_like: AiCheckSignal[];
    human_like: AiCheckSignal[];
  };
  rule_breakdown: AiCheckRuleBreakdownItem[];
  section_scores: AiCheckSectionScore[];
  creator_tips: string[];
  truncation_note?: string | null;
  /** Server may merge / replace with computed exclusions */
  excluded_segments?: AiCheckExcludedSegment[];
}

export interface AiCheckApiResponse {
  rubric_version: string;
  mode: AiDetectorMode;
  cached: boolean;
  scored_at: string;
  ai_likelihood_percent: number | null;
  human_likelihood_percent: number | null;
  uncertainty_percent: number | null;
  top_signals: AiCheckLlmResult['top_signals'];
  rule_breakdown: AiCheckRuleBreakdownItem[];
  section_scores: AiCheckSectionScore[];
  excluded_segments: AiCheckExcludedSegment[];
  creator_tips: string[];
  truncation_note?: string | null;
  llm: { provider: string; model: string } | null;
  tokens: { input: number; output: number } | null;
}

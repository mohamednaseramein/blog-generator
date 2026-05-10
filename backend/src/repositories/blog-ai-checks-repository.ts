import { getSupabase } from '../db/supabase.js';
import type { AiCheckApiResponse, AiDetectorMode } from '../domain/ai-check-types.js';

/** JSONB payload — numeric scores also mirrored in table columns for observability */
export interface BlogAiCheckStoredPayload {
  top_signals: AiCheckApiResponse['top_signals'];
  rule_breakdown: AiCheckApiResponse['rule_breakdown'];
  section_scores: AiCheckApiResponse['section_scores'];
  excluded_segments: AiCheckApiResponse['excluded_segments'];
  creator_tips: AiCheckApiResponse['creator_tips'];
  truncation_note?: string | null;
}

interface BlogAiCheckRow {
  id: string;
  blog_id: string;
  input_hash: string;
  rubric_version: string;
  ai_likelihood_percent: number | null;
  human_likelihood_percent: number | null;
  uncertainty_percent: number | null;
  mode: string;
  result: BlogAiCheckStoredPayload;
  llm_provider: string;
  llm_model: string;
  tokens_input: number;
  tokens_output: number;
  created_at: string;
}

export async function findFreshBlogAiCheck(
  blogId: string,
  inputHash: string,
  rubricVersion: string,
): Promise<BlogAiCheckRow | null> {
  const { data, error } = await getSupabase()
    .from('blog_ai_checks')
    .select('*')
    .eq('blog_id', blogId)
    .eq('input_hash', inputHash)
    .eq('rubric_version', rubricVersion)
    .maybeSingle<BlogAiCheckRow>();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(error.message);
  return data ?? null;
}

export interface InsertBlogAiCheckInput {
  blogId: string;
  inputHash: string;
  rubricVersion: string;
  aiLikelihoodPercent: number | null;
  humanLikelihoodPercent: number | null;
  uncertaintyPercent: number | null;
  mode: AiDetectorMode;
  result: BlogAiCheckStoredPayload;
  llmProvider: string;
  llmModel: string;
  tokensInput: number;
  tokensOutput: number;
}

/** Returns true if inserted, false if unique constraint hit (parallel race). */
export async function insertBlogAiCheck(row: InsertBlogAiCheckInput): Promise<boolean> {
  const { error } = await getSupabase().from('blog_ai_checks').insert({
    blog_id: row.blogId,
    input_hash: row.inputHash,
    rubric_version: row.rubricVersion,
    ai_likelihood_percent: row.aiLikelihoodPercent,
    human_likelihood_percent: row.humanLikelihoodPercent,
    uncertainty_percent: row.uncertaintyPercent,
    mode: row.mode,
    result: row.result as unknown as Record<string, unknown>,
    llm_provider: row.llmProvider,
    llm_model: row.llmModel,
    tokens_input: row.tokensInput,
    tokens_output: row.tokensOutput,
  });

  if (error?.code === '23505') return false;
  if (error) throw new Error(error.message);
  return true;
}

export function blogAiCheckRowToApiResponse(row: BlogAiCheckRow, cached: boolean): AiCheckApiResponse {
  const p = row.result;
  return {
    rubric_version: row.rubric_version,
    mode: row.mode as AiDetectorMode,
    cached,
    scored_at: row.created_at,
    ai_likelihood_percent: row.ai_likelihood_percent,
    human_likelihood_percent: row.human_likelihood_percent,
    uncertainty_percent: row.uncertainty_percent,
    top_signals: p.top_signals,
    rule_breakdown: p.rule_breakdown,
    section_scores: p.section_scores,
    excluded_segments: p.excluded_segments,
    creator_tips: p.creator_tips,
    truncation_note: p.truncation_note ?? null,
    llm: { provider: row.llm_provider, model: row.llm_model },
    tokens: { input: row.tokens_input, output: row.tokens_output },
  };
}

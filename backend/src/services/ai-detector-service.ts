import Anthropic from '@anthropic-ai/sdk';
import type {
  AiCheckLlmResult,
  AiCheckRuleBreakdownItem,
  AiCheckSignal,
} from '../domain/ai-check-types.js';
import {
  deriveModeFromScore,
  getSystemPrompt,
  loadRubricDoc,
} from '../lib/ai-detector-rubric.js';

export const DEFAULT_AI_DETECTOR_MODEL = 'claude-haiku-4-5-20251001';

export function resolveAiDetectorModel(): string {
  const fromEnv = process.env['ANTHROPIC_MODEL']?.trim();
  return fromEnv || DEFAULT_AI_DETECTOR_MODEL;
}

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

function stripJsonFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function normalizeForMatch(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function evidenceAppearsInHaystack(evidence: string, haystack: string): boolean {
  const e = normalizeForMatch(evidence);
  const h = normalizeForMatch(haystack);
  return e.length > 0 && h.includes(e);
}

function clampPercent(n: unknown): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function filterSignals(
  signals: AiCheckSignal[] | undefined,
  haystack: string,
  direction: 'ai_like' | 'human_like',
): AiCheckSignal[] {
  if (!Array.isArray(signals)) return [];
  const out: AiCheckSignal[] = [];
  for (const s of signals) {
    if (typeof s?.signal !== 'string') continue;
    const snippets = Array.isArray(s.evidence_snippets)
      ? s.evidence_snippets.filter((x) => typeof x === 'string' && evidenceAppearsInHaystack(x, haystack))
      : [];
    if (snippets.length === 0) continue;
    const w = typeof s.weight === 'number' ? s.weight : 0;
    out.push({ signal: s.signal, weight: w, evidence_snippets: snippets });
  }
  return out;
}

function filterRuleBreakdown(
  rows: unknown,
  haystack: string,
): AiCheckRuleBreakdownItem[] {
  if (!Array.isArray(rows)) return [];
  const out: AiCheckRuleBreakdownItem[] = [];
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const snippet = typeof o['evidence_snippet'] === 'string' ? o['evidence_snippet'] : '';
    if (!snippet || !evidenceAppearsInHaystack(snippet, haystack)) continue;
    const field = o['field'];
    if (field !== 'body' && field !== 'seo_title' && field !== 'meta_description') continue;
    const direction = o['direction'];
    if (direction !== 'ai_like' && direction !== 'human_like') continue;
    const ruleId = typeof o['rule_id'] === 'string' ? o['rule_id'] : '';
    if (!ruleId) continue;
    out.push({
      rule_id: ruleId,
      direction,
      points_applied: typeof o['points_applied'] === 'number' ? Math.round(o['points_applied']) : 0,
      evidence_snippet: snippet.length > 200 ? `${snippet.slice(0, 197)}…` : snippet,
      section: typeof o['section'] === 'string' ? o['section'] : '—',
      field,
      suggested_fix: typeof o['suggested_fix'] === 'string' ? o['suggested_fix'] : '',
    });
  }
  return out;
}

function parseLlmPayload(raw: unknown, haystack: string): AiCheckLlmResult {
  if (!raw || typeof raw !== 'object') throw new Error('invalid root');
  const o = raw as Record<string, unknown>;

  const ai = clampPercent(o['ai_likelihood_percent']);
  const human = clampPercent(o['human_likelihood_percent']);
  let uncertain = clampPercent(o['uncertainty_percent']);

  const topRaw = o['top_signals'] as Record<string, unknown> | undefined;
  const aiSignals = filterSignals(topRaw?.['ai_like'] as AiCheckSignal[] | undefined, haystack, 'ai_like');
  const huSignals = filterSignals(topRaw?.['human_like'] as AiCheckSignal[] | undefined, haystack, 'human_like');

  const rule_breakdown = filterRuleBreakdown(o['rule_breakdown'], haystack);

  const section_scores: AiCheckLlmResult['section_scores'] = [];
  const ss = o['section_scores'];
  if (Array.isArray(ss)) {
    for (const row of ss) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      if (typeof r['section'] !== 'string') continue;
      section_scores.push({
        section: r['section'],
        ai_likelihood_percent: clampPercent(r['ai_likelihood_percent']),
        notes: typeof r['notes'] === 'string' ? r['notes'] : undefined,
      });
    }
  }

  let tips: string[] = [];
  if (Array.isArray(o['creator_tips'])) {
    tips = o['creator_tips'].filter((x) => typeof x === 'string').slice(0, 8);
  }

  const truncation_note = typeof o['truncation_note'] === 'string' ? o['truncation_note'] : null;

  return {
    ai_likelihood_percent: ai,
    human_likelihood_percent: human,
    uncertainty_percent: uncertain,
    top_signals: { ai_like: aiSignals, human_like: huSignals },
    rule_breakdown,
    section_scores,
    creator_tips: tips,
    truncation_note,
  };
}

export function truncateToWordBudget(text: string, maxWords: number): { text: string; truncated: boolean; totalWords: number } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  if (totalWords <= maxWords) return { text, truncated: false, totalWords };
  return { text: words.slice(0, maxWords).join(' '), truncated: true, totalWords };
}

/** Fraction of non-empty lines that look like markdown list lines */
export function listLineDensity(markdown: string): number {
  const lines = markdown.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return 0;
  let listLines = 0;
  for (const l of lines) {
    if (/^([-*+]|\d+\.)\s/.test(l)) listLines++;
  }
  return listLines / lines.length;
}

export interface RunAiDetectorParams {
  /** Full text used for substring checks (truncated cleaned body + SEO fields). */
  haystackForEvidence: string;
  /** User message sent to the model (includes truncation notes). */
  userMessage: string;
  /** Extra uncertainty already applied server-side (short post, list density). */
  extraUncertainty: number;
}

export async function runAiDetectorLlm(
  params: RunAiDetectorParams,
): Promise<{ result: AiCheckLlmResult; inputTokens: number; outputTokens: number; model: string }> {
  const model = resolveAiDetectorModel();
  const strictRepeat =
    'Return ONLY compact JSON. No markdown fences. Every evidence_snippet must be copied verbatim from the scored content in your user message.';

  async function call(systemExtra?: string): Promise<Anthropic.Messages.Message> {
    return client.messages.create({
      model,
      max_tokens: 4096,
      temperature: 0,
      system: `${getSystemPrompt()}\n\n${systemExtra ?? ''}`,
      messages: [
        { role: 'user', content: `${params.userMessage}\n\n${strictRepeat}` },
      ],
    });
  }

  let message = await call();
  let rawText = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
  let text = stripJsonFences(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    message = await call('CRITICAL: Your previous reply was not valid JSON. Reply with ONE JSON object only.');
    rawText = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
    text = stripJsonFences(rawText);
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      throw new Error('AI_BAD_JSON');
    }
  }

  const usage = message.usage;
  const inputTokens = usage?.input_tokens ?? 0;
  const outputTokens = usage?.output_tokens ?? 0;

  let result = parseLlmPayload(parsed, params.haystackForEvidence);

  const bump = Math.min(100 - result.uncertainty_percent, Math.round(params.extraUncertainty));
  result = {
    ...result,
    uncertainty_percent: clampPercent(result.uncertainty_percent + bump),
  };

  return { result, inputTokens, outputTokens, model };
}

export function buildLanguageUnsupportedResult(): AiCheckLlmResult {
  return {
    ai_likelihood_percent: 0,
    human_likelihood_percent: 0,
    uncertainty_percent: 100,
    top_signals: { ai_like: [], human_like: [] },
    rule_breakdown: [],
    section_scores: [],
    creator_tips: ['Detector currently supports English only in v1.'],
    truncation_note: null,
  };
}

export function finalizeMode(aiLikelihood: number): ReturnType<typeof deriveModeFromScore> {
  return deriveModeFromScore(aiLikelihood);
}

export function getLongPostWordLimit(): number {
  return loadRubricDoc().long_post_words;
}

export function getShortPostWordThreshold(): number {
  return loadRubricDoc().short_post_words;
}

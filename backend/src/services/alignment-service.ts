import Anthropic from '@anthropic-ai/sdk';
import type { BlogBrief, BlogReference } from '../domain/types.js';
import { PROMPT_EMDASH_BAN, stripEmDashesDeep } from '../lib/copy-style.js';

/** Default matches previous hardcoded model; unset env keeps prod behaviour. Override in dev, e.g. Haiku, via ANTHROPIC_MODEL. */
export const DEFAULT_ALIGNMENT_ANTHROPIC_MODEL = 'claude-sonnet-4-6';

export function resolveAlignmentAnthropicModel(): string {
  const fromEnv = process.env['ANTHROPIC_MODEL']?.trim();
  return fromEnv || DEFAULT_ALIGNMENT_ANTHROPIC_MODEL;
}

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

export interface AlignmentSummary {
  blogGoal: string;
  targetAudience: string;
  seoIntent: string;
  tone: string;
  scope: string;
  /** Raw-scrape path: what the model took from reference page text. */
  referenceUnderstanding?: string;
  /** Structured-extraction path: how this post differs / builds on reference angles. */
  differentiationAngle?: string;
  raw: string;
}

export interface AlignmentGenerationResult extends AlignmentSummary {
  referencesAnalysis?: 'none_usable';
}

interface ExtractionSnippet {
  url: string;
  relevance: 'high' | 'medium' | 'low';
  summary: string;
  keyAngle: string;
}

function parseExtractionJson(json: string): Omit<ExtractionSnippet, 'url'> | null {
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    const rel = o['relevance'];
    if (rel !== 'high' && rel !== 'medium' && rel !== 'low') return null;
    if (typeof o['summary'] !== 'string' || typeof o['keyAngle'] !== 'string') return null;
    return { relevance: rel, summary: o['summary'], keyAngle: o['keyAngle'] };
  } catch {
    return null;
  }
}

function collectExtractionSnippets(refs: BlogReference[]): ExtractionSnippet[] {
  const out: ExtractionSnippet[] = [];
  for (const r of refs) {
    if (r.scrapeStatus !== 'success' || r.extractionStatus !== 'success' || !r.extractionJson) continue;
    const parsed = parseExtractionJson(r.extractionJson);
    if (!parsed) continue;
    out.push({ url: r.url, ...parsed });
  }
  return out;
}

const REQUIRED_FIELDS = ['blogGoal', 'targetAudience', 'seoIntent', 'tone', 'scope'] as const;

function validateCoreFields(parsed: Record<string, unknown>): void {
  for (const field of REQUIRED_FIELDS) {
    if (!parsed[field] || typeof parsed[field] !== 'string') {
      console.error('[alignment-service] Missing or invalid field in response:', field, parsed);
      throw new Error('AI returned an unexpected response format. Please try again.');
    }
  }
}

async function fetchAlignmentJson(prompt: string): Promise<{ raw: string; parsed: Record<string, unknown> }> {
  const message = await client.messages.create({
    model: resolveAlignmentAnthropicModel(),
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.error('[alignment-service] Claude returned non-JSON:', raw);
    throw new Error('AI returned an unexpected response format. Please try again.');
  }

  const cleaned = stripEmDashesDeep(parsed);
  return { raw: JSON.stringify(cleaned), parsed: cleaned };
}

function briefBlock(brief: BlogBrief): string {
  return `## Blog Brief
- Title: ${brief.title}
- Primary keyword: ${brief.primaryKeyword}
- Audience persona: ${brief.audiencePersona}
- Tone of voice: ${brief.toneOfVoice}
- Word count: ${brief.wordCountMin}–${brief.wordCountMax} words
- Brief: ${brief.blogBrief}`;
}

export async function generateAlignmentSummary(
  brief: BlogBrief,
  feedback?: string,
  references?: BlogReference[],
): Promise<AlignmentGenerationResult> {
  const refs = references ?? [];
  const hasTableRefs = refs.length > 0;
  const anyScrapePending = refs.some((r) => r.scrapeStatus === 'pending');
  const successfulScrapeRefs = refs.filter((r) => r.scrapeStatus === 'success' && r.scrapedContent);
  const anyExtractionPendingOnSuccess = refs.some(
    (r) => r.scrapeStatus === 'success' && r.extractionStatus === 'pending',
  );
  const extractionSnippets = collectExtractionSnippets(refs);

  const feedbackNote = feedback
    ? `\n\nThe user has provided the following feedback on the previous summary. Incorporate it fully:\n"${feedback}"`
    : '';

  if (extractionSnippets.length >= 1) {
    const snippets = extractionSnippets
      .map(
        (s, i) =>
          `\nReference ${i + 1} (${s.url})\n- Relevance: ${s.relevance}\n- Summary: ${s.summary}\n- Key angle: ${s.keyAngle}`,
      )
      .join('');

    const prompt = `You are an expert content strategist. A user has filled in a blog brief. Analyse it and produce a structured alignment summary so the user can confirm you have understood their intent before content generation begins.

${briefBlock(brief)}

## Reference insights (from automated extraction - structured, not raw page dumps)
${snippets}
${feedbackNote}

${PROMPT_EMDASH_BAN}
Respond with ONLY valid JSON. No markdown fences, no extra keys.
The response MUST include a sixth field "differentiationAngle" because structured reference insights were provided. Do NOT include "referenceUnderstanding".

Required JSON shape:
{
  "blogGoal": "one sentence describing the core goal of this post",
  "targetAudience": "one sentence describing who will read this and why",
  "seoIntent": "one sentence on the SEO angle and keyword strategy",
  "tone": "one sentence describing the writing style and voice",
  "scope": "two to three sentences covering what will and will not be covered",
  "differentiationAngle": "two to three sentences synthesising how this post will stand apart from or build on the angles suggested by the references, in line with the user's brief"
}`;

    const { raw, parsed } = await fetchAlignmentJson(prompt);
    validateCoreFields(parsed);

    const differentiationAngle = parsed['differentiationAngle'];
    if (!differentiationAngle || typeof differentiationAngle !== 'string') {
      console.error('[alignment-service] Missing differentiationAngle:', raw);
      throw new Error('AI returned an unexpected response format. Please try again.');
    }

    return {
      blogGoal: parsed['blogGoal'] as string,
      targetAudience: parsed['targetAudience'] as string,
      seoIntent: parsed['seoIntent'] as string,
      tone: parsed['tone'] as string,
      scope: parsed['scope'] as string,
      differentiationAngle,
      raw,
    };
  }

  if (hasTableRefs && !anyScrapePending && !anyExtractionPendingOnSuccess && extractionSnippets.length === 0) {
    const prompt = `You are an expert content strategist. A user has filled in a blog brief. They also added reference URLs, but automated analysis did not produce usable structured insights from those pages (scrapes failed, timed out, or extraction marked them as not useful). Do not invent content from pages you have not seen. Base your analysis only on the blog brief.

${briefBlock(brief)}
${feedbackNote}

${PROMPT_EMDASH_BAN}
Respond with ONLY valid JSON. No markdown fences, no extra keys. Use exactly five string fields (no reference-specific fields).

Required JSON shape:
{
  "blogGoal": "one sentence describing the core goal of this post",
  "targetAudience": "one sentence describing who will read this and why",
  "seoIntent": "one sentence on the SEO angle and keyword strategy",
  "tone": "one sentence describing the writing style and voice",
  "scope": "two to three sentences covering what will and will not be covered"
}`;

    const { raw, parsed } = await fetchAlignmentJson(prompt);
    validateCoreFields(parsed);

    const withMeta = stripEmDashesDeep({
      blogGoal: parsed['blogGoal'] as string,
      targetAudience: parsed['targetAudience'] as string,
      seoIntent: parsed['seoIntent'] as string,
      tone: parsed['tone'] as string,
      scope: parsed['scope'] as string,
      referencesAnalysis: 'none_usable' as const,
    });

    return { ...withMeta, raw: JSON.stringify(withMeta) };
  }

  const hasReference = successfulScrapeRefs.length > 0 || !!brief.scrapedContent;

  if (hasReference) {
    const scrapedNote =
      successfulScrapeRefs.length > 0
        ? successfulScrapeRefs
            .map(
              (r, i) =>
                `\nReference ${i + 1} (${r.url}, ${r.scrapedContent!.length} chars): ${r.scrapedContent!.slice(0, 600)}…`,
            )
            .join('')
        : `\nReference content scraped (${brief.scrapedContent!.length} chars): ${brief.scrapedContent!.slice(0, 800)}…`;

    const prompt = `You are an expert content strategist. A user has filled in a blog brief. Analyse it and produce a structured alignment summary so the user can confirm you have understood their intent before content generation begins.

${briefBlock(brief)}
${scrapedNote}${feedbackNote}

${PROMPT_EMDASH_BAN}
Respond with ONLY valid JSON. No markdown fences, no extra keys.
The response MUST include a sixth field "referenceUnderstanding" because reference page text (or a scrape in progress pipeline) was included.

Required JSON shape:
{
  "blogGoal": "one sentence describing the core goal of this post",
  "targetAudience": "one sentence describing who will read this and why",
  "seoIntent": "one sentence on the SEO angle and keyword strategy",
  "tone": "one sentence describing the writing style and voice",
  "scope": "two to three sentences covering what will and will not be covered",
  "referenceUnderstanding": "two to three sentences describing what key ideas, structure, and angle were taken from the reference content, and how they will inform this post"
}`;

    const { raw, parsed } = await fetchAlignmentJson(prompt);
    validateCoreFields(parsed);

    const referenceUnderstanding = parsed['referenceUnderstanding'];
    if (!referenceUnderstanding || typeof referenceUnderstanding !== 'string') {
      console.error('[alignment-service] Missing referenceUnderstanding despite scraped content:', raw);
      throw new Error('AI returned an unexpected response format. Please try again.');
    }

    return {
      blogGoal: parsed['blogGoal'] as string,
      targetAudience: parsed['targetAudience'] as string,
      seoIntent: parsed['seoIntent'] as string,
      tone: parsed['tone'] as string,
      scope: parsed['scope'] as string,
      referenceUnderstanding,
      raw,
    };
  }

  const prompt = `You are an expert content strategist. A user has filled in a blog brief. Analyse it and produce a structured alignment summary so the user can confirm you have understood their intent before content generation begins.

${briefBlock(brief)}${feedbackNote}

${PROMPT_EMDASH_BAN}
Respond with ONLY valid JSON. No markdown fences, no extra keys.

Required JSON shape:
{
  "blogGoal": "one sentence describing the core goal of this post",
  "targetAudience": "one sentence describing who will read this and why",
  "seoIntent": "one sentence on the SEO angle and keyword strategy",
  "tone": "one sentence describing the writing style and voice",
  "scope": "two to three sentences covering what will and will not be covered"
}`;

  const { raw, parsed } = await fetchAlignmentJson(prompt);
  validateCoreFields(parsed);

  return {
    blogGoal: parsed['blogGoal'] as string,
    targetAudience: parsed['targetAudience'] as string,
    seoIntent: parsed['seoIntent'] as string,
    tone: parsed['tone'] as string,
    scope: parsed['scope'] as string,
    raw,
  };
}

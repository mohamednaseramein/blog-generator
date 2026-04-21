import Anthropic from '@anthropic-ai/sdk';
import type { BlogBrief } from '../domain/types.js';

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
  /** Present only when the brief had a scraped reference URL. Describes what the AI understood from the reference content. */
  referenceUnderstanding?: string;
  raw: string;
}

export async function generateAlignmentSummary(
  brief: BlogBrief,
  feedback?: string,
): Promise<AlignmentSummary> {
  const hasReference = !!brief.scrapedContent;
  const scrapedNote = hasReference
    ? `\nReference content scraped (${brief.scrapedContent!.length} chars): ${brief.scrapedContent!.slice(0, 800)}…`
    : '';

  const feedbackNote = feedback
    ? `\n\nThe user has provided the following feedback on the previous summary. Incorporate it fully:\n"${feedback}"`
    : '';

  const prompt = `You are an expert content strategist. A user has filled in a blog brief. Analyse it and produce a structured alignment summary so the user can confirm you have understood their intent before content generation begins.

## Blog Brief
- Title: ${brief.title}
- Primary keyword: ${brief.primaryKeyword}
- Audience persona: ${brief.audiencePersona}
- Tone of voice: ${brief.toneOfVoice}
- Word count: ${brief.wordCountMin}–${brief.wordCountMax} words
- Brief: ${brief.blogBrief}${scrapedNote}${feedbackNote}

Respond with ONLY valid JSON — no markdown fences, no extra keys.${hasReference ? `
The response MUST include a sixth field "referenceUnderstanding" because a reference URL was provided.` : ''}

Required JSON shape:
{
  "blogGoal": "one sentence describing the core goal of this post",
  "targetAudience": "one sentence describing who will read this and why",
  "seoIntent": "one sentence on the SEO angle and keyword strategy",
  "tone": "one sentence describing the writing style and voice",
  "scope": "two to three sentences covering what will and will not be covered"${hasReference ? `,
  "referenceUnderstanding": "two to three sentences describing what key ideas, structure, and angle were taken from the reference content, and how they will inform this post"` : ''}
}`;

  const message = await client.messages.create({
    model: resolveAlignmentAnthropicModel(),
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';

  let parsed: Omit<AlignmentSummary, 'raw'>;
  try {
    parsed = JSON.parse(text) as Omit<AlignmentSummary, 'raw'>;
  } catch {
    console.error('[alignment-service] Claude returned non-JSON:', text);
    throw new Error('AI returned an unexpected response format. Please try again.');
  }

  const requiredFields = ['blogGoal', 'targetAudience', 'seoIntent', 'tone', 'scope'] as const;
  for (const field of requiredFields) {
    if (!parsed[field] || typeof parsed[field] !== 'string') {
      console.error('[alignment-service] Missing or invalid field in response:', field, text);
      throw new Error('AI returned an unexpected response format. Please try again.');
    }
  }

  if (hasReference && (!parsed['referenceUnderstanding'] || typeof parsed['referenceUnderstanding'] !== 'string')) {
    console.error('[alignment-service] Missing referenceUnderstanding field despite scraped content:', text);
    throw new Error('AI returned an unexpected response format. Please try again.');
  }

  return { ...parsed, raw: text };
}

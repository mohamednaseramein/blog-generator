import Anthropic from '@anthropic-ai/sdk';
import type { BlogBrief } from '../domain/types.js';
import { resolveAlignmentAnthropicModel } from './alignment-service.js';

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

export interface ReferenceExtraction {
  relevance: 'high' | 'medium' | 'low';
  summary: string;
  keyAngle: string;
  irrelevantToBrief: boolean;
  raw: string;
}

const MAX_TEXT_FOR_PROMPT = 4_000;

export async function generateReferenceExtraction(
  brief: BlogBrief,
  url: string,
  scrapedText: string,
): Promise<ReferenceExtraction> {
  const slice = scrapedText.slice(0, MAX_TEXT_FOR_PROMPT);

  const prompt = `You are an editorial assistant. The user is writing a blog post and added a reference URL whose text was scraped.

## User's blog brief (for relevance)
- Title: ${brief.title}
- Primary keyword: ${brief.primaryKeyword}
- Audience: ${brief.audiencePersona}
- Tone: ${brief.toneOfVoice}
- Brief: ${brief.blogBrief}

## Reference URL
${url}

## Scraped page text (truncated)
${slice}

Respond with ONLY valid JSON — no markdown fences, no extra keys.

Required JSON shape:
{
  "relevance": "high" | "medium" | "low" — how useful this page is for the user's specific brief,
  "summary": "one sentence describing what this page covers in relation to the brief",
  "keyAngle": "one sentence: what angle, evidence, or gap vs typical coverage this source suggests for the user's post",
  "irrelevantToBrief": true if the page is unrelated to the brief or offers no usable angle; false otherwise
}`;

  const message = await client.messages.create({
    model: resolveAlignmentAnthropicModel(),
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed: Omit<ReferenceExtraction, 'raw'>;
  try {
    parsed = JSON.parse(text) as Omit<ReferenceExtraction, 'raw'>;
  } catch {
    console.error('[reference-extraction-service] Claude returned non-JSON:', raw);
    throw new Error('AI returned an unexpected response format. Please try again.');
  }

  const rel = parsed.relevance;
  if (rel !== 'high' && rel !== 'medium' && rel !== 'low') {
    console.error('[reference-extraction-service] Invalid relevance:', text);
    throw new Error('AI returned an unexpected response format. Please try again.');
  }

  if (
    typeof parsed.summary !== 'string' ||
    typeof parsed.keyAngle !== 'string' ||
    typeof parsed.irrelevantToBrief !== 'boolean'
  ) {
    console.error('[reference-extraction-service] Missing fields:', text);
    throw new Error('AI returned an unexpected response format. Please try again.');
  }

  return { ...parsed, raw: text };
}

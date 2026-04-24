import Anthropic from '@anthropic-ai/sdk';
import type { BlogBrief } from '../domain/types.js';
import { PROMPT_EMDASH_BAN, stripEmDashes } from '../lib/copy-style.js';
import { resolveAlignmentAnthropicModel } from './alignment-service.js';

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

export interface ReferenceExtraction {
  relevance: 'high' | 'medium' | 'low';
  summary: string;
  keyAngle: string;
  irrelevantToBrief: boolean;
  raw: string;
}

const MAX_TEXT_FOR_PROMPT = 8_000;

const JSON_SYSTEM = `You are a JSON-only API. Reply with a single valid JSON object and nothing else.
No markdown, no code fences, no explanation before or after the object. The object must use double-quoted keys and strings.`;

/** Persisted on extraction failure for UI; must not include secrets. */
export function buildExtractionFailurePayload(userMessage: string): string {
  const msg = userMessage.replace(/\s+/g, ' ').trim().slice(0, 500);
  return JSON.stringify({ _extractionError: true, message: msg || 'Reference analysis could not be completed.' });
}

export function userSafeExtractionError(err: unknown): string {
  const m = (err as Error).message || String(err);
  if (m.includes('unexpected response format') || m.includes('JSON')) {
    return 'The model did not return valid structured data. Try “Retry analysis” or another page.';
  }
  if (m.includes('rate') || m.includes('429') || m.includes('overloaded')) {
    return 'The AI service is busy. Please try “Retry analysis” in a few seconds.';
  }
  if (m.includes('api') || m.includes('API key') || m.includes('401') || m.includes('403')) {
    return 'Reference analysis is temporarily unavailable. Raw page text is still used for alignment.';
  }
  if (m.length > 200) {
    return `${m.slice(0, 197)}…`;
  }
  return m;
}

/**
 * Strips code fences and pulls the first balanced {...} from model output when the model
 * adds a short preamble.
 */
function extractJsonCandidate(text: string): string {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  if (t.startsWith('{') && t.endsWith('}')) {
    return t;
  }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end > start) {
    return t.slice(start, end + 1);
  }
  return t;
}

export async function generateReferenceExtraction(
  brief: BlogBrief,
  url: string,
  scrapedText: string,
): Promise<ReferenceExtraction> {
  const slice = scrapedText.slice(0, MAX_TEXT_FOR_PROMPT);

  const userContent = `You are an editorial assistant. The user is writing a blog post and added a reference URL whose text was scraped.

${PROMPT_EMDASH_BAN}
## User's blog brief (for relevance)
- Title: ${brief.title}
- Primary keyword: ${brief.primaryKeyword}
- Audience: ${brief.audiencePersona}
- Tone: ${brief.toneOfVoice}
- Brief: ${brief.blogBrief}

## Reference URL
${url}

## Scraped page text (truncated to ${MAX_TEXT_FOR_PROMPT} characters)
${slice}

Return one JSON object with exactly these keys and types (no other keys):
- "relevance": one of the strings "high", "medium", or "low" - how useful this page is for the user's specific brief
- "summary": string - one sentence: what this page covers in relation to the brief
- "keyAngle": string - one sentence: what angle, evidence, or gap vs typical coverage this source suggests
- "irrelevantToBrief": boolean - true if the page is unrelated to the brief or offers no usable angle; false otherwise`;

  const message = await client.messages.create({
    model: resolveAlignmentAnthropicModel(),
    max_tokens: 1024,
    system: JSON_SYSTEM,
    messages: [{ role: 'user', content: userContent }],
  });

  const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';
  const text = String(raw).trim();
  const jsonText = extractJsonCandidate(text);

  let parsed: Omit<ReferenceExtraction, 'raw'>;
  try {
    parsed = JSON.parse(jsonText) as Omit<ReferenceExtraction, 'raw'>;
  } catch (e) {
    console.error('[reference-extraction-service] JSON parse error:', (e as Error).message, 'sample:', text.slice(0, 300));
    throw new Error('AI returned an unexpected response format. Please try again.');
  }

  const rel = parsed.relevance;
  if (rel !== 'high' && rel !== 'medium' && rel !== 'low') {
    console.error('[reference-extraction-service] Invalid relevance:', jsonText.slice(0, 400));
    throw new Error('AI returned an unexpected response format. Please try again.');
  }

  if (
    typeof parsed.summary !== 'string' ||
    typeof parsed.keyAngle !== 'string' ||
    typeof parsed.irrelevantToBrief !== 'boolean'
  ) {
    console.error('[reference-extraction-service] Missing fields:', jsonText.slice(0, 400));
    throw new Error('AI returned an unexpected response format. Please try again.');
  }

  return {
    ...parsed,
    summary: stripEmDashes(parsed.summary),
    keyAngle: stripEmDashes(parsed.keyAngle),
    raw: stripEmDashes(jsonText),
  };
}

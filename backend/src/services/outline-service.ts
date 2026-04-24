import Anthropic from '@anthropic-ai/sdk';
import type { BlogBrief } from '../domain/types.js';
import { PROMPT_EMDASH_BAN, stripEmDashesDeep } from '../lib/copy-style.js';
import type { AlignmentSummary } from './alignment-service.js';

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

/** Reuse the same model resolver so a single env-var controls all AI calls. */
function resolveModel(): string {
  return process.env['ANTHROPIC_MODEL']?.trim() || 'claude-sonnet-4-6';
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
  raw: string;
}

export async function generateBlogOutline(
  brief: BlogBrief,
  alignment: AlignmentSummary,
  feedback?: string,
): Promise<BlogOutline> {
  const wordTarget = Math.round((brief.wordCountMin + brief.wordCountMax) / 2);

  const feedbackNote = feedback
    ? `\n\nThe user has provided the following feedback on the previous outline. Incorporate it fully:\n"${feedback}"`
    : '';

  const referenceNote = alignment.referenceUnderstanding
    ? `\n- Reference understanding: ${alignment.referenceUnderstanding}`
    : '';

  const prompt = `You are an expert content strategist. Using the confirmed alignment summary and blog brief below, generate a detailed, hierarchical blog outline.

## Confirmed Alignment
- Blog goal: ${alignment.blogGoal}
- Target audience: ${alignment.targetAudience}
- SEO intent: ${alignment.seoIntent}
- Tone: ${alignment.tone}
- Scope: ${alignment.scope}${referenceNote}

## Blog Brief
- Title: ${brief.title}
- Primary keyword: ${brief.primaryKeyword}
- Tone: ${brief.toneOfVoice}
- Word count target: ~${wordTarget} words (range: ${brief.wordCountMin}–${brief.wordCountMax})${feedbackNote}

Generate a structured outline. Respond with ONLY valid JSON. No markdown fences, no extra keys.

Rules:
- ${PROMPT_EMDASH_BAN}
- Include 4–7 H2 sections (never fewer than 4, never more than 7)
- Each section must have a clear, keyword-relevant title and 2–4 H3 subsections
- Distribute estimatedWords across sections so they sum to approximately ${wordTarget}
- The description for each section is 1–2 sentences explaining what it will cover

Required JSON shape:
{
  "sections": [
    {
      "title": "H2 section title",
      "description": "1–2 sentences covering what this section addresses",
      "subsections": ["H3 subsection 1", "H3 subsection 2", "H3 subsection 3"],
      "estimatedWords": 250
    }
  ],
  "totalEstimatedWords": ${wordTarget}
}`;

  const message = await client.messages.create({
    model: resolveModel(),
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';

  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed: { sections: OutlineSection[]; totalEstimatedWords: number };
  try {
    parsed = JSON.parse(text) as { sections: OutlineSection[]; totalEstimatedWords: number };
  } catch {
    console.error('[outline-service] Claude returned non-JSON:', raw);
    throw new Error('AI returned an unexpected response format. Please try again.');
  }

  if (!Array.isArray(parsed.sections) || parsed.sections.length < 4) {
    console.error('[outline-service] Invalid outline structure:', text);
    throw new Error('AI returned an unexpected response format. Please try again.');
  }

  const cleaned = stripEmDashesDeep(parsed);

  for (const section of cleaned.sections) {
    if (
      typeof section.title !== 'string' ||
      typeof section.description !== 'string' ||
      !Array.isArray(section.subsections) ||
      typeof section.estimatedWords !== 'number'
    ) {
      console.error('[outline-service] Invalid section shape:', section);
      throw new Error('AI returned an unexpected response format. Please try again.');
    }
  }

  return {
    sections: cleaned.sections,
    totalEstimatedWords: cleaned.totalEstimatedWords,
    raw: JSON.stringify(cleaned),
  };
}

/** Parse persisted `blog_outlines.outline_json` (same shape as AI outline JSON). */
export function parseStoredOutlineJson(text: string): {
  sections: OutlineSection[];
  totalEstimatedWords: number;
} {
  const parsed = JSON.parse(text) as { sections: OutlineSection[]; totalEstimatedWords: number };
  if (!Array.isArray(parsed.sections) || parsed.sections.length < 1) {
    throw new Error('Invalid outline JSON');
  }
  for (const section of parsed.sections) {
    if (
      typeof section.title !== 'string' ||
      typeof section.description !== 'string' ||
      !Array.isArray(section.subsections) ||
      typeof section.estimatedWords !== 'number'
    ) {
      throw new Error('Invalid outline section shape');
    }
  }
  const base = {
    sections: parsed.sections,
    totalEstimatedWords:
      typeof parsed.totalEstimatedWords === 'number' ? parsed.totalEstimatedWords : 0,
  };
  return stripEmDashesDeep(base);
}

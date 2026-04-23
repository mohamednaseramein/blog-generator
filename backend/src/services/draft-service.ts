import Anthropic from '@anthropic-ai/sdk';
import type { BlogBrief } from '../domain/types.js';
import type { AlignmentSummary } from './alignment-service.js';
import type { OutlineSection } from './outline-service.js';
import { resolveAlignmentAnthropicModel } from './alignment-service.js';

const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

export interface BlogDraftResult {
  markdown: string;
  raw: string;
}

export interface MetaAndSlug {
  metaDescription: string;
  suggestedSlug: string;
  seoTitle: string | null;
}

function outlineToPrompt(sections: OutlineSection[]): string {
  return sections
    .map((s, i) => {
      const subs = s.subsections.map((x) => `    - ${x}`).join('\n');
      return `${i + 1}. **${s.title}** (~${s.estimatedWords} words)\n   ${s.description}\n   H3 subsections:\n${subs}`;
    })
    .join('\n\n');
}

export async function generateBlogDraft(
  brief: BlogBrief,
  alignment: AlignmentSummary,
  sections: OutlineSection[],
  totalEstimatedWords: number,
  feedback?: string,
): Promise<BlogDraftResult> {
  const wordTarget = Math.round((brief.wordCountMin + brief.wordCountMax) / 2);
  const feedbackNote = feedback
    ? `\n\nThe user has provided the following feedback on the previous draft. Revise the full post accordingly:\n"${feedback}"`
    : '';

  const refNote = alignment.referenceUnderstanding
    ? `\n- Reference understanding: ${alignment.referenceUnderstanding}`
    : '';

  const prompt = `You are an expert blog writer. Write a complete, publication-ready blog post in **Markdown** (no JSON).

## Confirmed alignment
- Blog goal: ${alignment.blogGoal}
- Target audience: ${alignment.targetAudience}
- SEO intent: ${alignment.seoIntent}
- Tone: ${alignment.tone}
- Scope: ${alignment.scope}${refNote}

## Blog brief
- Working title: ${brief.title}
- Primary keyword: ${brief.primaryKeyword}
- Audience persona: ${brief.audiencePersona}
- Tone of voice: ${brief.toneOfVoice}
- Target length: about ${wordTarget} words (brief range ${brief.wordCountMin}–${brief.wordCountMax}; outline total ~${totalEstimatedWords})

## Approved outline (follow this structure with H2 ## for each main section, in order)
${outlineToPrompt(sections)}${feedbackNote}

## Output rules
- Start with a compelling introduction (no H1; use the title only as plain context — first heading should be ##).
- Use ## for each main section matching the outline order and titles (you may slightly refine titles for flow).
- Use ### for sub-points where the outline had H3 items.
- Work the primary keyword naturally into the intro and several headings.
- End with a concise conclusion with a clear takeaway.
- Do not wrap the post in \`\`\` fences.
- Do not include YAML front matter.`;

  const message = await client.messages.create({
    model: resolveAlignmentAnthropicModel(),
    max_tokens: 16_384,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
  if (!raw) {
    throw new Error('AI returned an empty draft. Please try again.');
  }

  const markdown = raw.replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```\s*$/m, '').trim();
  return { markdown, raw };
}

export async function generateMetaAndSlug(
  title: string,
  markdown: string,
  primaryKeyword: string,
): Promise<MetaAndSlug> {
  const excerpt = markdown.slice(0, 1500);
  const prompt = `Given the following blog post title, primary keyword, and opening content, generate:
1. An SEO title: ≤60 characters, starts with or contains the primary keyword near the front, compelling for search results.
2. A meta description: at most 155 characters, includes the primary keyword, entices clicks.
3. A URL slug: lowercase, kebab-case, at most 60 characters, keyword-rich.

Title: ${title}
Primary keyword: ${primaryKeyword}
Content excerpt:
${excerpt}

Respond with valid JSON only, no markdown fences:
{"seoTitle": "...", "metaDescription": "...", "suggestedSlug": "..."}`;

  const message = await client.messages.create({
    model: resolveAlignmentAnthropicModel(),
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/m, '').trim();

  let parsed: { seoTitle: string; metaDescription: string; suggestedSlug: string };
  try {
    parsed = JSON.parse(cleaned) as { seoTitle: string; metaDescription: string; suggestedSlug: string };
  } catch {
    return { seoTitle: null, metaDescription: '', suggestedSlug: '' };
  }

  return {
    seoTitle: parsed.seoTitle?.trim() ? parsed.seoTitle.trim().slice(0, 60) : null,
    metaDescription: (parsed.metaDescription ?? '').slice(0, 155),
    suggestedSlug: (parsed.suggestedSlug ?? '').slice(0, 60),
  };
}

import type { BlogBrief, BlogIntent } from '../domain/types.js';

const INTENT_DESCRIPTIONS: Record<BlogIntent, string> = {
  thought_leadership: 'establish expertise and provoke discussion',
  seo: 'rank for the primary keyword and convert search-driven readers',
  product_announcement: 'introduce a feature, milestone, or company news',
  newsletter: 'inform a recurring audience in a personal voice',
  deep_dive: 'thoroughly explore a topic for informed practitioners',
};

/**
 * Builds the author profile context prefix for system prompts.
 * Deterministic: same input → same output.
 * Sanitizes voiceNote to prevent prompt injection.
 */
export function buildProfileContext(brief: BlogBrief): string {
  const sanitizedVoiceNote = sanitizeVoiceNote(brief.voiceNote);

  const lines = [
    `You are a ${brief.authorRole} writing a blog post.`,
    '',
    `Audience: ${brief.audiencePersona}.`,
    `Goal: ${INTENT_DESCRIPTIONS[brief.intent] ?? brief.intent}.`,
    `Tone: ${brief.toneOfVoice}.`,
  ];

  if (sanitizedVoiceNote) {
    lines.push(`Style guidance: ${sanitizedVoiceNote}`);
  }

  return lines.join('\n');
}

/**
 * Sanitize voiceNote to prevent prompt injection:
 * - Collapse newlines (primary injection vector)
 * - Strip backticks, triple-quotes, and angle brackets
 * - Limit to 500 chars
 */
function sanitizeVoiceNote(voiceNote: string): string {
  if (!voiceNote) return '';

  let sanitized = voiceNote
    .replace(/[\r\n]+/g, ' ')   // collapse newlines — primary injection vector
    .replace(/[<>]/g, '')        // strip angle brackets
    .replace(/`/g, '')
    .replace(/"""/g, '')
    .replace(/'''/g, '');

  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 497) + '...';
  }

  return sanitized.trim();
}

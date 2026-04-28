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
    `Goal: ${INTENT_DESCRIPTIONS[brief.intent]}.`,
    `Tone: ${brief.toneOfVoice}.`,
  ];

  if (sanitizedVoiceNote) {
    lines.push(`Style guidance: ${sanitizedVoiceNote}`);
  }

  return lines.join('\n');
}

/**
 * Sanitize voiceNote to prevent prompt injection:
 * - Strip backticks and triple-quotes
 * - Limit to 500 chars
 */
function sanitizeVoiceNote(voiceNote: string): string {
  if (!voiceNote) return '';

  // Remove backticks and triple-quotes
  let sanitized = voiceNote
    .replace(/`/g, '')
    .replace(/"""/g, '')
    .replace(/'''/g, '');

  // Limit to 500 chars
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 497) + '...';
  }

  return sanitized.trim();
}

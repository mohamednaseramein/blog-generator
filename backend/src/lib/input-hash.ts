import { createHash } from 'node:crypto';

const SEP = '\u0001';

/**
 * Normalises draft input so whitespace-only edits don't churn the cache key.
 * Rules: trim ends, CRLF → LF, collapse runs of spaces/tabs (not newlines).
 */
export function normaliseDraftBody(markdown: string): string {
  let s = markdown.replace(/\r\n/g, '\n').trimEnd();
  const lines = s.split('\n');
  const collapsed = lines.map((line) => line.replace(/[ \t]+/g, ' ').trimEnd());
  return collapsed.join('\n').trim();
}

export function computeAiCheckInputHash(body: string, seoTitle: string, metaDescription: string): string {
  const b = normaliseDraftBody(body);
  const t = seoTitle.trim();
  const m = metaDescription.trim();
  const payload = `${b}${SEP}${t}${SEP}${m}`;
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

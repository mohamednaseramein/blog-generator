/**
 * Heuristic English detection (AgDR-0029): high ASCII ratio + presence of common English stopwords.
 * No external deps; v1 supports English only.
 */

const STOPWORDS = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'] as const;

export function looksLikeEnglish(text: string): boolean {
  const sample = text.slice(0, 8000);
  if (sample.trim().length < 40) return true;

  let ascii = 0;
  let total = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c <= 0x7f) ascii++;
    total++;
  }
  const asciiRatio = total > 0 ? ascii / total : 0;
  if (asciiRatio < 0.85) return false;

  const lower = sample.toLowerCase();
  let hits = 0;
  for (const w of STOPWORDS) {
    const re = new RegExp(`\\b${w}\\b`, 'i');
    if (re.test(lower)) hits++;
  }
  return hits >= 5;
}

export type ExcludedSegmentType = 'code' | 'log' | 'blockquote' | 'url';

export interface ExcludedSegmentSummary {
  type: ExcludedSegmentType;
  count: number;
  example_snippet: string;
}

const LOG_LINE_RE = /^\s*\d{4}-\d{2}-\d{2}|^\s*\[\d{4}-\d{2}-\d{2}/;

function takeSnippet(s: string, max = 80): string {
  const oneLine = s.replace(/\s+/g, ' ').trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}

/**
 * Removes segments that should not influence AI-style scoring while counting them for transparency.
 */
export function stripExcludedSegments(markdown: string): {
  cleanedForScoring: string;
  excluded: ExcludedSegmentSummary[];
} {
  let text = markdown.replace(/\r\n/g, '\n');

  const counts: Record<ExcludedSegmentType, { count: number; example: string }> = {
    code: { count: 0, example: '' },
    log: { count: 0, example: '' },
    blockquote: { count: 0, example: '' },
    url: { count: 0, example: '' },
  };

  // Fenced code blocks ``` ... ```
  text = text.replace(/```(?:[\w-]*)?\n([\s\S]*?)```/g, (_full, inner: string) => {
    const body = String(inner);
    counts.code.count++;
    if (!counts.code.example) counts.code.example = takeSnippet(body);
    const isLog =
      LOG_LINE_RE.test(body.split('\n')[0] ?? '') ||
      /\berror:\s/i.test(body) ||
      /\bWARN\b/.test(body);
    if (isLog) {
      counts.log.count++;
      if (!counts.log.example) counts.log.example = takeSnippet(body);
    }
    return '\n\n';
  });

  // Inline code `...`
  text = text.replace(/`([^`]+)`/g, (_full, inner: string) => {
    counts.code.count++;
    if (!counts.code.example) counts.code.example = takeSnippet(String(inner));
    return ' ';
  });

  // Blockquote runs (consecutive > lines)
  text = text.replace(/(?:^|\n)((?:>\s?.*(?:\n|$))+)/gm, (fullBlock) => {
    const lines = fullBlock.trim().split('\n').filter((l) => /^\s*>/.test(l));
    counts.blockquote.count += lines.length || 1;
    const sample = lines[0]?.replace(/^\s*>+\s?/, '').trim() ?? '';
    if (!counts.blockquote.example && sample) counts.blockquote.example = takeSnippet(sample);
    return '\n';
  });

  // Markdown links — keep label, drop URL from scoring surface
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_full, label: string, url: string) => {
    counts.url.count++;
    if (!counts.url.example) counts.url.example = takeSnippet(String(url));
    return String(label);
  });

  // Bare URLs
  text = text.replace(/https?:\/\/[^\s)]+/g, (url) => {
    counts.url.count++;
    if (!counts.url.example) counts.url.example = takeSnippet(url);
    return '';
  });

  const excluded: ExcludedSegmentSummary[] = [];
  for (const type of ['code', 'log', 'blockquote', 'url'] as const) {
    const c = counts[type];
    if (c.count > 0) {
      excluded.push({ type, count: c.count, example_snippet: c.example || type });
    }
  }

  const cleanedForScoring = text.replace(/\n{3,}/g, '\n\n').trim();

  return { cleanedForScoring, excluded };
}

/** Approximate word count (split on whitespace). */
export function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

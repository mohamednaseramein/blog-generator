import { describe, it, expect } from 'vitest';
import { stripExcludedSegments, wordCount } from '../src/lib/exclusion-stripper.js';

describe('stripExcludedSegments', () => {
  it('removes fenced code and counts it', () => {
    const md = 'Intro\n\n```js\nconst x = 1\n```\n\nMore text.';
    const { cleanedForScoring, excluded } = stripExcludedSegments(md);
    expect(cleanedForScoring).not.toContain('const x');
    expect(excluded.some((e) => e.type === 'code')).toBe(true);
  });

  it('keeps link label without URL', () => {
    const { cleanedForScoring } = stripExcludedSegments('See [docs](https://example.com/a) for more.');
    expect(cleanedForScoring).toContain('docs');
    expect(cleanedForScoring).not.toContain('example.com');
  });
});

describe('wordCount', () => {
  it('counts tokens', () => {
    expect(wordCount('one two three')).toBe(3);
  });
});

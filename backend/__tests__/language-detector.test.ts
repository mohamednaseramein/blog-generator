import { describe, it, expect } from 'vitest';
import { looksLikeEnglish } from '../src/lib/language-detector.js';

describe('looksLikeEnglish', () => {
  it('returns true for plain English prose', () => {
    const text =
      'The quick brown fox jumps over the lazy dog. It was a sunny day and we shipped the fix without drama with no regressions.';
    expect(looksLikeEnglish(text)).toBe(true);
  });

  it('returns false for mostly non-ASCII content', () => {
    const text = '你好世界你好世界你好世界你好世界你好世界你好世界你好世界你好世界你好世界你好世界';
    expect(looksLikeEnglish(text)).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { computeAiCheckInputHash, normaliseDraftBody } from '../src/lib/input-hash.js';

describe('computeAiCheckInputHash', () => {
  it('is stable for identical logical content', () => {
    const a = computeAiCheckInputHash('# Hello\n\nWorld\n', 'SEO', 'meta');
    const b = computeAiCheckInputHash('# Hello\r\n\r\nWorld\n', 'SEO', 'meta');
    expect(a).toBe(b);
  });

  it('changes when SEO fields change', () => {
    const a = computeAiCheckInputHash('body', 't1', 'm');
    const b = computeAiCheckInputHash('body', 't2', 'm');
    expect(a).not.toBe(b);
  });
});

describe('normaliseDraftBody', () => {
  it('normalises line endings and collapses horizontal whitespace', () => {
    const out = normaliseDraftBody('  hi  \n  there  ');
    expect(out).toContain('hi');
    expect(out).toContain('there');
    expect(out.includes('\r')).toBe(false);
  });
});

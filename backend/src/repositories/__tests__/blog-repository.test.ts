import { describe, it, expect } from 'vitest';
import { displayTitleFromBriefEmbed } from '../blog-repository.js';

describe('displayTitleFromBriefEmbed', () => {
  it('reads title from one-to-one PostgREST shape (object, not array)', () => {
    expect(
      displayTitleFromBriefEmbed({ title: '  My post  ', primary_keyword: 'kw' }),
    ).toBe('My post');
  });

  it('reads title from array embed (older / many shape)', () => {
    expect(displayTitleFromBriefEmbed([{ title: 'Array case', primary_keyword: 'x' }])).toBe('Array case');
  });

  it('falls back to primary_keyword when title is empty', () => {
    expect(
      displayTitleFromBriefEmbed({ title: '   ', primary_keyword: 'fallback keyword' }),
    ).toBe('fallback keyword');
  });

  it('returns null for empty embed', () => {
    expect(displayTitleFromBriefEmbed(null)).toBe(null);
    expect(displayTitleFromBriefEmbed([])).toBe(null);
  });
});

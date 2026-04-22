import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

vi.mock('../alignment-service.js', () => ({
  resolveAlignmentAnthropicModel: () => 'claude-sonnet-4-6',
}));

import { generateMetaAndSlug } from '../draft-service.js';

beforeEach(() => {
  vi.clearAllMocks();
  process.env['ANTHROPIC_API_KEY'] = 'test-key';
});

describe('generateMetaAndSlug', () => {
  it('returns meta description and slug from valid AI response', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            metaDescription: 'Tips to improve your sleep quality tonight.',
            suggestedSlug: 'sleep-tips-for-professionals',
          }),
        },
      ],
    });

    const result = await generateMetaAndSlug('Sleep Tips', '## Introduction\nSleep is...', 'sleep tips');

    expect(result.metaDescription).toBe('Tips to improve your sleep quality tonight.');
    expect(result.suggestedSlug).toBe('sleep-tips-for-professionals');
  });

  it('truncates meta description to 155 chars and slug to 60 chars', async () => {
    const longMeta = 'A'.repeat(200);
    const longSlug = 'a-'.repeat(40);
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ metaDescription: longMeta, suggestedSlug: longSlug }) }],
    });

    const result = await generateMetaAndSlug('Title', 'Content', 'keyword');

    expect(result.metaDescription.length).toBeLessThanOrEqual(155);
    expect(result.suggestedSlug.length).toBeLessThanOrEqual(60);
  });

  it('returns empty strings when AI response is not valid JSON', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot help with that.' }],
    });

    const result = await generateMetaAndSlug('Title', 'Content', 'keyword');

    expect(result.metaDescription).toBe('');
    expect(result.suggestedSlug).toBe('');
  });

  it('handles AI response wrapped in markdown fences', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '```json\n{"metaDescription":"Clean meta.","suggestedSlug":"clean-slug"}\n```',
        },
      ],
    });

    const result = await generateMetaAndSlug('Title', 'Content', 'keyword');

    expect(result.metaDescription).toBe('Clean meta.');
    expect(result.suggestedSlug).toBe('clean-slug');
  });
});

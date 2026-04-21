import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

import { generateAlignmentSummary } from '../alignment-service.js';
import type { BlogBrief } from '../../domain/types.js';

const brief: BlogBrief = {
  id: 'brief-1',
  blogId: 'blog-1',
  title: '10 Tips for Better Sleep',
  primaryKeyword: 'sleep hygiene',
  audiencePersona: 'Busy professionals aged 30–45',
  toneOfVoice: 'Friendly, expert',
  wordCountMin: 800,
  wordCountMax: 1500,
  blogBrief: 'Practical science-backed tips for improving sleep quality.',
  referenceUrl: null,
  scrapedContent: null,
  scrapeStatus: 'skipped',
  alignmentSummary: null,
  alignmentConfirmed: false,
  alignmentIterations: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validSummaryJson = JSON.stringify({
  blogGoal: 'Help professionals sleep better.',
  targetAudience: 'Busy professionals 30–45 seeking wellness tips.',
  seoIntent: 'Rank for "sleep hygiene" with practical advice.',
  tone: 'Friendly and expert.',
  scope: 'Covers 10 actionable tips. Excludes medical advice.',
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generateAlignmentSummary', () => {
  it('returns structured summary on valid Claude response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validSummaryJson }],
    });

    const result = await generateAlignmentSummary(brief);

    expect(result.blogGoal).toBe('Help professionals sleep better.');
    expect(result.targetAudience).toContain('Busy professionals');
    expect(result.seoIntent).toContain('sleep hygiene');
    expect(result.tone).toBeTruthy();
    expect(result.scope).toBeTruthy();
    expect(result.raw).toBe(validSummaryJson);
  });

  it('passes feedback to the prompt when provided', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validSummaryJson }],
    });

    await generateAlignmentSummary(brief, 'Make tone more technical');

    const promptArg = mockCreate.mock.calls[0]?.[0] as { messages: { content: string }[] };
    expect(promptArg.messages[0]?.content).toContain('Make tone more technical');
  });

  it('throws a user-friendly error when Claude returns non-JSON', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot help with that.' }],
    });

    await expect(generateAlignmentSummary(brief)).rejects.toThrow(
      'AI returned an unexpected response format. Please try again.',
    );
  });

  it('propagates API errors from the Anthropic SDK', async () => {
    mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

    await expect(generateAlignmentSummary(brief)).rejects.toThrow('API rate limit exceeded');
  });

  it('includes scraped content in the prompt when available', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validSummaryJson }],
    });

    const briefWithContent: BlogBrief = {
      ...brief,
      scrapedContent: 'Reference article about sleep hygiene…',
    };

    await generateAlignmentSummary(briefWithContent);

    const promptArg = mockCreate.mock.calls[0]?.[0] as { messages: { content: string }[] };
    expect(promptArg.messages[0]?.content).toContain('Reference content scraped');
  });
});

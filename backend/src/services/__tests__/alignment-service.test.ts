import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

import {
  DEFAULT_ALIGNMENT_ANTHROPIC_MODEL,
  generateAlignmentSummary,
  resolveAlignmentAnthropicModel,
} from '../alignment-service.js';
import type { BlogBrief, BlogReference } from '../../domain/types.js';

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

const validSummaryWithReferenceJson = JSON.stringify({
  blogGoal: 'Help professionals sleep better.',
  targetAudience: 'Busy professionals 30–45 seeking wellness tips.',
  seoIntent: 'Rank for "sleep hygiene" with practical advice.',
  tone: 'Friendly and expert.',
  scope: 'Covers 10 actionable tips. Excludes medical advice.',
  referenceUnderstanding: 'The reference article covered evidence-based sleep routines and will inform the structure of the tips.',
});

const validDifferentiationJson = JSON.stringify({
  blogGoal: 'Help professionals sleep better.',
  targetAudience: 'Busy professionals 30–45 seeking wellness tips.',
  seoIntent: 'Rank for "sleep hygiene" with practical advice.',
  tone: 'Friendly and expert.',
  scope: 'Covers 10 actionable tips. Excludes medical advice.',
  differentiationAngle: 'We will emphasise quick wins for shift workers, unlike the reference’s generic evening routine focus.',
});

function makeRef(overrides: Partial<BlogReference>): BlogReference {
  return {
    id: 'ref-1',
    blogId: 'blog-1',
    url: 'https://example.com/article',
    position: 1,
    scrapeStatus: 'pending',
    scrapeError: null,
    scrapedContent: null,
    extractionStatus: 'pending',
    extractionJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveAlignmentAnthropicModel', () => {
  const key = 'ANTHROPIC_MODEL';
  const previous = process.env[key];

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  });

  it('returns Sonnet when env is unset', () => {
    delete process.env[key];
    expect(resolveAlignmentAnthropicModel()).toBe(DEFAULT_ALIGNMENT_ANTHROPIC_MODEL);
  });

  it('returns Sonnet when env is empty or whitespace', () => {
    process.env[key] = '   ';
    expect(resolveAlignmentAnthropicModel()).toBe(DEFAULT_ALIGNMENT_ANTHROPIC_MODEL);
  });

  it('returns trimmed model id when set', () => {
    process.env[key] = '  claude-haiku-4-5-20251001  ';
    expect(resolveAlignmentAnthropicModel()).toBe('claude-haiku-4-5-20251001');
  });
});

describe('generateAlignmentSummary', () => {
  it('returns structured summary on valid Claude response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validSummaryJson }],
    });

    const result = await generateAlignmentSummary(brief);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: DEFAULT_ALIGNMENT_ANTHROPIC_MODEL }),
    );
    expect(result.blogGoal).toBe('Help professionals sleep better.');
    expect(result.targetAudience).toContain('Busy professionals');
    expect(result.seoIntent).toContain('sleep hygiene');
    expect(result.tone).toBeTruthy();
    expect(result.scope).toBeTruthy();
    expect(result.raw).toBe(validSummaryJson);
  });

  it('strips ```json fences when model wraps response in markdown', async () => {
    const fenced = `\`\`\`json\n${validSummaryJson}\n\`\`\``;
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: fenced }],
    });

    const result = await generateAlignmentSummary(brief);

    expect(result.blogGoal).toBe('Help professionals sleep better.');
    expect(result.raw).toBe(validSummaryJson);
  });

  it('strips plain ``` fences when model wraps response without language tag', async () => {
    const fenced = `\`\`\`\n${validSummaryJson}\n\`\`\``;
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: fenced }],
    });

    const result = await generateAlignmentSummary(brief);

    expect(result.blogGoal).toBe('Help professionals sleep better.');
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
      content: [{ type: 'text', text: validSummaryWithReferenceJson }],
    });

    const briefWithContent: BlogBrief = {
      ...brief,
      scrapedContent: 'Reference article about sleep hygiene…',
    };

    await generateAlignmentSummary(briefWithContent);

    const promptArg = mockCreate.mock.calls[0]?.[0] as { messages: { content: string }[] };
    expect(promptArg.messages[0]?.content).toContain('Reference content scraped');
    expect(promptArg.messages[0]?.content).toContain('referenceUnderstanding');
  });

  it('returns referenceUnderstanding when scraped content is present', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validSummaryWithReferenceJson }],
    });

    const briefWithContent: BlogBrief = {
      ...brief,
      scrapedContent: 'Reference article about sleep hygiene…',
    };

    const result = await generateAlignmentSummary(briefWithContent);

    expect(result.referenceUnderstanding).toBe(
      'The reference article covered evidence-based sleep routines and will inform the structure of the tips.',
    );
  });

  it('does not include referenceUnderstanding when no scraped content', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validSummaryJson }],
    });

    const result = await generateAlignmentSummary(brief);

    expect(result.referenceUnderstanding).toBeUndefined();
    const promptArg = mockCreate.mock.calls[0]?.[0] as { messages: { content: string }[] };
    expect(promptArg.messages[0]?.content).not.toContain('referenceUnderstanding');
  });

  it('throws when referenceUnderstanding is missing despite scraped content', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validSummaryJson }],
    });

    const briefWithContent: BlogBrief = {
      ...brief,
      scrapedContent: 'Reference article about sleep hygiene…',
    };

    await expect(generateAlignmentSummary(briefWithContent)).rejects.toThrow(
      'AI returned an unexpected response format. Please try again.',
    );
  });

  it('uses differentiationAngle when at least one reference has successful extraction JSON', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validDifferentiationJson }],
    });

    const extractionJson = JSON.stringify({
      relevance: 'high',
      summary: 'Covers sleep hygiene basics.',
      keyAngle: 'Focus on circadian rhythm.',
      irrelevantToBrief: false,
    });

    const references: BlogReference[] = [
      makeRef({
        scrapeStatus: 'success',
        extractionStatus: 'success',
        extractionJson,
        scrapedContent: 'body text',
      }),
    ];

    const result = await generateAlignmentSummary(brief, undefined, references);

    expect(result.differentiationAngle).toContain('shift workers');
    expect(result.referenceUnderstanding).toBeUndefined();
    expect(result.referencesAnalysis).toBeUndefined();

    const promptArg = mockCreate.mock.calls[0]?.[0] as { messages: { content: string }[] };
    expect(promptArg.messages[0]?.content).toContain('differentiationAngle');
    expect(promptArg.messages[0]?.content).toContain('Reference insights');
    expect(promptArg.messages[0]?.content).not.toMatch(/"referenceUnderstanding"\s*:/);
  });

  it('returns referencesAnalysis none_usable when references exist, scrapes settled, and no successful extraction', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validSummaryJson }],
    });

    const references: BlogReference[] = [
      makeRef({
        scrapeStatus: 'success',
        scrapedContent: 'some text',
        extractionStatus: 'failed',
        extractionJson: null,
      }),
    ];

    const result = await generateAlignmentSummary(brief, undefined, references);

    expect(result.referencesAnalysis).toBe('none_usable');
    expect(result.referenceUnderstanding).toBeUndefined();
    expect(result.differentiationAngle).toBeUndefined();
    const stored = JSON.parse(result.raw) as { referencesAnalysis?: string };
    expect(stored.referencesAnalysis).toBe('none_usable');

    const promptArg = mockCreate.mock.calls[0]?.[0] as { messages: { content: string }[] };
    expect(promptArg.messages[0]?.content).toContain('did not produce usable structured insights');
  });

  it('falls back to referenceUnderstanding when scrape succeeded but extraction is still pending', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validSummaryWithReferenceJson }],
    });

    const references: BlogReference[] = [
      makeRef({
        scrapeStatus: 'success',
        scrapedContent: 'scraped body here',
        extractionStatus: 'pending',
        extractionJson: null,
      }),
    ];

    const result = await generateAlignmentSummary(brief, undefined, references);

    expect(result.referenceUnderstanding).toBeTruthy();
    expect(result.differentiationAngle).toBeUndefined();
    expect(result.referencesAnalysis).toBeUndefined();

    const promptArg = mockCreate.mock.calls[0]?.[0] as { messages: { content: string }[] };
    expect(promptArg.messages[0]?.content).toContain('referenceUnderstanding');
    expect(promptArg.messages[0]?.content).toContain('scraped body here');
  });
});

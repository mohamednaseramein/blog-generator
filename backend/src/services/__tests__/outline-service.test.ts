import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

import { generateBlogOutline } from '../outline-service.js';
import type { BlogBrief } from '../../domain/types.js';
import type { AlignmentSummary } from '../alignment-service.js';

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
  authorRole: 'Subject matter expert',
  intent: 'thought_leadership',
  voiceNote: '',
  profileId: null,
  alignmentSummary: null,
  alignmentConfirmed: true,
  alignmentIterations: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const alignment: AlignmentSummary = {
  blogGoal: 'Help professionals sleep better.',
  targetAudience: 'Busy professionals 30–45 seeking wellness tips.',
  seoIntent: 'Rank for "sleep hygiene" with practical advice.',
  tone: 'Friendly and expert.',
  scope: 'Covers 10 actionable tips. Excludes medical advice.',
  raw: '{}',
};

function validOutlineJson(sections = 5): string {
  return JSON.stringify({
    sections: Array.from({ length: sections }, (_, i) => ({
      title: `Section ${i + 1}`,
      description: `Description for section ${i + 1}.`,
      subsections: ['Sub A', 'Sub B'],
      estimatedWords: 200,
    })),
    totalEstimatedWords: sections * 200,
  });
}

function mockResponse(text: string) {
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text }],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env['ANTHROPIC_MODEL'];
});

describe('generateBlogOutline', () => {
  it('returns parsed outline when Claude responds with valid JSON', async () => {
    mockResponse(validOutlineJson(5));

    const result = await generateBlogOutline(brief, alignment);

    expect(result.sections).toHaveLength(5);
    expect(result.totalEstimatedWords).toBe(1000);
    expect(typeof result.raw).toBe('string');
  });

  it('strips markdown fences before parsing', async () => {
    mockResponse('```json\n' + validOutlineJson(4) + '\n```');

    const result = await generateBlogOutline(brief, alignment);

    expect(result.sections).toHaveLength(4);
  });

  it('throws when Claude returns non-JSON', async () => {
    mockResponse('Sorry, I cannot help with that.');

    await expect(generateBlogOutline(brief, alignment)).rejects.toThrow(
      'AI returned an unexpected response format',
    );
  });

  it('throws when outline has fewer than 4 sections', async () => {
    mockResponse(validOutlineJson(3));

    await expect(generateBlogOutline(brief, alignment)).rejects.toThrow(
      'AI returned an unexpected response format',
    );
  });

  it('throws when a section is missing a required field', async () => {
    const outline = {
      sections: [
        { title: 'S1', description: 'D1', subsections: ['A'], estimatedWords: 200 },
        { title: 'S2', description: 'D2', subsections: ['A'], estimatedWords: 200 },
        { title: 'S3', description: 'D3', subsections: ['A'], estimatedWords: 200 },
        { title: 'S4', subsections: ['A'], estimatedWords: 200 }, // missing description
      ],
      totalEstimatedWords: 800,
    };
    mockResponse(JSON.stringify(outline));

    await expect(generateBlogOutline(brief, alignment)).rejects.toThrow(
      'AI returned an unexpected response format',
    );
  });

  it('includes feedback in the prompt when provided', async () => {
    mockResponse(validOutlineJson(4));

    await generateBlogOutline(brief, alignment, 'Add a pricing section');

    const promptSent = (mockCreate.mock.calls[0] as [{ messages: Array<{ content: string }> }])[0]
      .messages[0].content;
    expect(promptSent).toContain('Add a pricing section');
  });

  it('includes referenceUnderstanding when present in alignment', async () => {
    mockResponse(validOutlineJson(4));
    const alignmentWithRef: AlignmentSummary = {
      ...alignment,
      referenceUnderstanding: 'The reference covers modern sleep research.',
    };

    await generateBlogOutline(brief, alignmentWithRef);

    const promptSent = (mockCreate.mock.calls[0] as [{ messages: Array<{ content: string }> }])[0]
      .messages[0].content;
    expect(promptSent).toContain('modern sleep research');
  });
});

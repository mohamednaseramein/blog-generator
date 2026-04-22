import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetBlogByIdAndUser,
  mockAdvanceBlogStep,
  mockGetBriefByBlogId,
  mockGetOutlineByBlogId,
  mockGetDraftByBlogId,
  mockUpsertDraft,
  mockConfirmDraft,
  mockGenerateBlogDraft,
  mockGenerateMetaAndSlug,
  mockGetUserId,
} = vi.hoisted(() => ({
  mockGetBlogByIdAndUser: vi.fn(),
  mockAdvanceBlogStep: vi.fn(),
  mockGetBriefByBlogId: vi.fn(),
  mockGetOutlineByBlogId: vi.fn(),
  mockGetDraftByBlogId: vi.fn(),
  mockUpsertDraft: vi.fn(),
  mockConfirmDraft: vi.fn(),
  mockGenerateBlogDraft: vi.fn(),
  mockGenerateMetaAndSlug: vi.fn(),
  mockGetUserId: vi.fn(() => 'user-1'),
}));

vi.mock('../../repositories/blog-repository.js', () => ({
  getBlogByIdAndUser: mockGetBlogByIdAndUser,
  advanceBlogStep: mockAdvanceBlogStep,
}));

vi.mock('../../repositories/blog-brief-repository.js', () => ({
  getBriefByBlogId: mockGetBriefByBlogId,
}));

vi.mock('../../repositories/blog-outline-repository.js', () => ({
  getOutlineByBlogId: mockGetOutlineByBlogId,
}));

vi.mock('../../repositories/blog-draft-repository.js', () => ({
  getDraftByBlogId: mockGetDraftByBlogId,
  upsertDraft: mockUpsertDraft,
  confirmDraft: mockConfirmDraft,
}));

vi.mock('../../services/draft-service.js', () => ({
  generateBlogDraft: mockGenerateBlogDraft,
  generateMetaAndSlug: mockGenerateMetaAndSlug,
}));

vi.mock('../../middleware/auth.js', () => ({
  getUserId: mockGetUserId,
}));

import {
  handleGenerateDraft,
  handleConfirmDraft,
  handleGetDraft,
} from '../blog-draft-handler.js';
import type { Request, Response, NextFunction } from 'express';

const blog = { id: 'blog-1', userId: 'user-1' };

const brief = {
  id: 'brief-1',
  blogId: 'blog-1',
  title: 'Sleep tips',
  primaryKeyword: 'sleep',
  audiencePersona: 'Professionals',
  toneOfVoice: 'Friendly',
  wordCountMin: 800,
  wordCountMax: 1500,
  blogBrief: 'Tips.',
  referenceUrl: null,
  scrapedContent: null,
  scrapeStatus: 'skipped',
  alignmentConfirmed: true,
  alignmentSummary: JSON.stringify({
    blogGoal: 'Help sleep.',
    targetAudience: 'Everyone',
    seoIntent: 'SEO.',
    tone: 'Friendly.',
    scope: 'Tips only.',
  }),
  alignmentIterations: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const outlineRow = {
  id: 'o-1',
  blogId: 'blog-1',
  outlineJson: JSON.stringify({
    sections: [
      { title: 'A', description: 'Da', subsections: ['x'], estimatedWords: 200 },
      { title: 'B', description: 'Db', subsections: ['y'], estimatedWords: 200 },
      { title: 'C', description: 'Dc', subsections: ['z'], estimatedWords: 200 },
      { title: 'D', description: 'Dd', subsections: ['w'], estimatedWords: 200 },
    ],
    totalEstimatedWords: 800,
  }),
  outlineConfirmed: true,
  outlineIterations: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeReqRes(blogId: string, body: Record<string, unknown> = {}) {
  const req = { params: { id: blogId }, body } as unknown as Request;
  const json = vi.fn();
  const res = { json, status: vi.fn().mockReturnThis() } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, json, next };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserId.mockReturnValue('user-1');
});

describe('handleGenerateDraft', () => {
  it('returns draft markdown when outline is confirmed', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetBriefByBlogId.mockResolvedValue(brief);
    mockGetOutlineByBlogId.mockResolvedValue(outlineRow);
    mockGetDraftByBlogId.mockResolvedValue(null);
    mockGenerateBlogDraft.mockResolvedValue({ markdown: '# Hello', raw: '# Hello' });
    mockUpsertDraft.mockResolvedValue({});

    const { req, res, json, next } = makeReqRes('blog-1');
    await handleGenerateDraft(req, res, next);

    expect(json).toHaveBeenCalledWith({ draft: { markdown: '# Hello', raw: '# Hello' } });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when outline not confirmed', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetBriefByBlogId.mockResolvedValue(brief);
    mockGetOutlineByBlogId.mockResolvedValue({ ...outlineRow, outlineConfirmed: false });

    const { req, res, next } = makeReqRes('blog-1');
    await handleGenerateDraft(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });
});

describe('handleConfirmDraft', () => {
  const draftRow = {
    id: 'd-1',
    blogId: 'blog-1',
    draftMarkdown: '# Post',
    draftConfirmed: false,
    draftIterations: 1,
    metaDescription: null,
    suggestedSlug: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('confirms draft and returns meta + slug', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetDraftByBlogId.mockResolvedValue(draftRow);
    mockGetBriefByBlogId.mockResolvedValue(brief);
    mockGenerateMetaAndSlug.mockResolvedValue({
      metaDescription: 'A meta description.',
      suggestedSlug: 'sleep-tips',
    });
    mockConfirmDraft.mockResolvedValue(undefined);

    const { req, res, json, next } = makeReqRes('blog-1');
    await handleConfirmDraft(req, res, next);

    expect(mockConfirmDraft).toHaveBeenCalledWith(
      'blog-1',
      'A meta description.',
      'sleep-tips',
    );
    expect(json).toHaveBeenCalledWith({
      confirmed: true,
      blogId: 'blog-1',
      metaDescription: 'A meta description.',
      suggestedSlug: 'sleep-tips',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when draft is missing', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetDraftByBlogId.mockResolvedValue(null);

    const { req, res, next } = makeReqRes('blog-1');
    await handleConfirmDraft(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });
});

describe('handleGetDraft', () => {
  it('returns draft payload including meta and slug', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetDraftByBlogId.mockResolvedValue({
      id: 'd-1',
      blogId: 'blog-1',
      draftMarkdown: 'Body',
      draftConfirmed: true,
      draftIterations: 1,
      metaDescription: 'A meta description.',
      suggestedSlug: 'sleep-tips',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { req, res, json, next } = makeReqRes('blog-1');
    await handleGetDraft(req, res, next);

    expect(json).toHaveBeenCalledWith({
      draft: {
        markdown: 'Body',
        draftConfirmed: true,
        draftIterations: 1,
        metaDescription: 'A meta description.',
        suggestedSlug: 'sleep-tips',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});

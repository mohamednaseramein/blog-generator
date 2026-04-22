import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetBlogByIdAndUser,
  mockGetBriefByBlogId,
  mockGetOutlineByBlogId,
  mockUpsertOutline,
  mockConfirmOutline,
  mockGenerateBlogOutline,
  mockGetUserId,
  mockAdvanceBlogStep,
} = vi.hoisted(() => ({
  mockGetBlogByIdAndUser: vi.fn(),
  mockGetBriefByBlogId: vi.fn(),
  mockGetOutlineByBlogId: vi.fn(),
  mockUpsertOutline: vi.fn(),
  mockConfirmOutline: vi.fn(),
  mockGenerateBlogOutline: vi.fn(),
  mockGetUserId: vi.fn(() => 'user-1'),
  mockAdvanceBlogStep: vi.fn(),
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
  upsertOutline: mockUpsertOutline,
  confirmOutline: mockConfirmOutline,
}));

vi.mock('../../services/outline-service.js', () => ({
  generateBlogOutline: mockGenerateBlogOutline,
}));

vi.mock('../../middleware/auth.js', () => ({
  getUserId: mockGetUserId,
}));

import { handleGenerateOutline, handleConfirmOutline } from '../blog-outline-handler.js';
import type { Request, Response, NextFunction } from 'express';

const blog = { id: 'blog-1', userId: 'user-1' };

const brief = {
  id: 'brief-1',
  blogId: 'blog-1',
  title: '10 Tips for Better Sleep',
  primaryKeyword: 'sleep hygiene',
  audiencePersona: 'Busy professionals',
  toneOfVoice: 'Friendly',
  wordCountMin: 800,
  wordCountMax: 1500,
  blogBrief: 'Practical tips.',
  referenceUrl: null,
  scrapedContent: null,
  scrapeStatus: 'skipped',
  alignmentConfirmed: true,
  alignmentSummary: JSON.stringify({
    blogGoal: 'Help people sleep.',
    targetAudience: 'Professionals',
    seoIntent: 'Rank for sleep hygiene.',
    tone: 'Friendly.',
    scope: 'Actionable tips only.',
  }),
  alignmentIterations: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeOutline = {
  sections: [
    { title: 'S1', description: 'D1', subsections: ['A', 'B'], estimatedWords: 200 },
    { title: 'S2', description: 'D2', subsections: ['A', 'B'], estimatedWords: 200 },
    { title: 'S3', description: 'D3', subsections: ['A', 'B'], estimatedWords: 200 },
    { title: 'S4', description: 'D4', subsections: ['A', 'B'], estimatedWords: 200 },
  ],
  totalEstimatedWords: 800,
  raw: '{}',
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

describe('handleGenerateOutline', () => {
  it('returns outline when all preconditions are met', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetBriefByBlogId.mockResolvedValue(brief);
    mockGetOutlineByBlogId.mockResolvedValue(null);
    mockGenerateBlogOutline.mockResolvedValue(fakeOutline);
    mockUpsertOutline.mockResolvedValue({});

    const { req, res, json, next } = makeReqRes('blog-1');
    await handleGenerateOutline(req, res, next);

    expect(json).toHaveBeenCalledWith({ outline: fakeOutline });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with 404 when blog not found', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(null);

    const { req, res, next } = makeReqRes('blog-1');
    await handleGenerateOutline(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });

  it('calls next with 404 when brief not found', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetBriefByBlogId.mockResolvedValue(null);

    const { req, res, next } = makeReqRes('blog-1');
    await handleGenerateOutline(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });

  it('calls next with 400 when alignment not confirmed', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetBriefByBlogId.mockResolvedValue({ ...brief, alignmentConfirmed: false });

    const { req, res, next } = makeReqRes('blog-1');
    await handleGenerateOutline(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('passes feedback to generateBlogOutline when provided', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetBriefByBlogId.mockResolvedValue(brief);
    mockGetOutlineByBlogId.mockResolvedValue(null);
    mockGenerateBlogOutline.mockResolvedValue(fakeOutline);
    mockUpsertOutline.mockResolvedValue({});

    const { req, res, next } = makeReqRes('blog-1', { feedback: 'Add pricing section' });
    await handleGenerateOutline(req, res, next);

    expect(mockGenerateBlogOutline).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'Add pricing section',
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe('handleConfirmOutline', () => {
  it('confirms outline and returns confirmed=true', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetOutlineByBlogId.mockResolvedValue({ id: 'outline-1', blogId: 'blog-1' });
    mockConfirmOutline.mockResolvedValue(undefined);

    const { req, res, json, next } = makeReqRes('blog-1');
    await handleConfirmOutline(req, res, next);

    expect(json).toHaveBeenCalledWith({ confirmed: true, blogId: 'blog-1' });
    expect(mockAdvanceBlogStep).toHaveBeenCalledWith('blog-1', 4);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with 400 when no outline exists yet', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetOutlineByBlogId.mockResolvedValue(null);

    const { req, res, next } = makeReqRes('blog-1');
    await handleConfirmOutline(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('calls next with 404 when blog not found', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(null);

    const { req, res, next } = makeReqRes('blog-1');
    await handleConfirmOutline(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });
});

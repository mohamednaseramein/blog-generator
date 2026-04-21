import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetBlogByIdAndUser, mockGetBriefByBlogId, mockGetUserId } = vi.hoisted(() => ({
  mockGetBlogByIdAndUser: vi.fn(),
  mockGetBriefByBlogId: vi.fn(),
  mockGetUserId: vi.fn(() => 'user-1'),
}));

vi.mock('../../repositories/blog-repository.js', () => ({
  getBlogByIdAndUser: mockGetBlogByIdAndUser,
}));

vi.mock('../../repositories/blog-brief-repository.js', () => ({
  upsertBrief: vi.fn(),
  getBriefByBlogId: mockGetBriefByBlogId,
  getScrapeStatus: vi.fn(),
}));

vi.mock('../../middleware/auth.js', () => ({
  getUserId: mockGetUserId,
}));

vi.mock('../../services/url-scraper-service.js', () => ({
  scrapeUrlInBackground: vi.fn(),
}));

import { handleGetBrief } from '../blog-brief-handler.js';
import type { Request, Response, NextFunction } from 'express';

const blog = { id: 'blog-1', userId: 'user-1' };

const brief = {
  id: 'brief-1',
  blogId: 'blog-1',
  title: '10 Tips for Better Sleep',
  primaryKeyword: 'sleep hygiene',
  audiencePersona: 'Busy professionals aged 30–45',
  toneOfVoice: 'Friendly, expert',
  wordCountMin: 800,
  wordCountMax: 1500,
  blogBrief: 'Practical science-backed tips.',
  referenceUrl: null,
  scrapedContent: null,
  scrapeStatus: 'skipped',
  alignmentSummary: null,
  alignmentConfirmed: false,
  alignmentIterations: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeReqRes(blogId: string) {
  const req = { params: { id: blogId } } as unknown as Request;
  const json = vi.fn();
  const res = { json, status: vi.fn().mockReturnThis() } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, json, next };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserId.mockReturnValue('user-1');
});

describe('handleGetBrief', () => {
  it('returns the brief when blog and brief both exist', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetBriefByBlogId.mockResolvedValue(brief);

    const { req, res, json, next } = makeReqRes('blog-1');
    await handleGetBrief(req, res, next);

    expect(json).toHaveBeenCalledWith(brief);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with 404 when blog does not belong to user', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(null);
    mockGetBriefByBlogId.mockResolvedValue(brief);

    const { req, res, next } = makeReqRes('blog-1');
    await handleGetBrief(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });

  it('calls next with 404 when brief does not exist yet', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetBriefByBlogId.mockResolvedValue(null);

    const { req, res, next } = makeReqRes('blog-1');
    await handleGetBrief(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });

  it('calls next when the repository throws', async () => {
    mockGetBlogByIdAndUser.mockRejectedValue(new Error('DB down'));

    const { req, res, next } = makeReqRes('blog-1');
    await handleGetBrief(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

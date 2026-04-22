import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetBlogByIdAndUser,
  mockCountRefs,
  mockInsertRef,
  mockGetRefs,
  mockGetRefById,
  mockDeleteRef,
  mockScrapeInBackground,
  mockGetUserId,
} = vi.hoisted(() => ({
  mockGetBlogByIdAndUser: vi.fn(),
  mockCountRefs: vi.fn(),
  mockInsertRef: vi.fn(),
  mockGetRefs: vi.fn(),
  mockGetRefById: vi.fn(),
  mockDeleteRef: vi.fn(),
  mockScrapeInBackground: vi.fn(),
  mockGetUserId: vi.fn(() => 'user-1'),
}));

vi.mock('../../repositories/blog-repository.js', () => ({
  getBlogByIdAndUser: mockGetBlogByIdAndUser,
}));

vi.mock('../../repositories/blog-references-repository.js', () => ({
  countReferencesByBlogId: mockCountRefs,
  insertReference: mockInsertRef,
  getReferencesByBlogId: mockGetRefs,
  getReferenceById: mockGetRefById,
  deleteReference: mockDeleteRef,
}));

vi.mock('../../services/url-scraper-service.js', () => ({
  scrapeReferenceInBackground: mockScrapeInBackground,
  scrapeUrlInBackground: vi.fn(),
}));

vi.mock('../../middleware/auth.js', () => ({
  getUserId: mockGetUserId,
}));

import {
  handleAddReference,
  handleListReferences,
  handleDeleteReference,
  handleGetReferenceStatus,
} from '../blog-references-handler.js';
import type { Request, Response, NextFunction } from 'express';

const blog = { id: 'blog-1', userId: 'user-1' };

const fakeRef = {
  id: 'ref-1',
  blogId: 'blog-1',
  url: 'https://example.com/article',
  position: 1,
  scrapeStatus: 'pending' as const,
  scrapeError: null,
  scrapedContent: null,
  extractionStatus: 'pending' as const,
  extractionJson: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeReqRes(blogId: string, body: Record<string, unknown> = {}, params: Record<string, string> = {}) {
  const req = { params: { id: blogId, ...params }, body } as unknown as Request;
  const json = vi.fn();
  const res = { json, status: vi.fn().mockReturnThis() } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, json, next };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserId.mockReturnValue('user-1');
});

describe('handleAddReference', () => {
  it('inserts reference and fires background scrape', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockCountRefs.mockResolvedValue(0);
    mockInsertRef.mockResolvedValue(fakeRef);

    const { req, res, json, next } = makeReqRes('blog-1', { url: 'https://example.com/article' });
    await handleAddReference(req, res, next);

    expect(mockInsertRef).toHaveBeenCalledWith('blog-1', 'https://example.com/article', 1);
    expect(mockScrapeInBackground).toHaveBeenCalledWith('ref-1', 'https://example.com/article');
    expect(json).toHaveBeenCalledWith({ reference: fakeRef });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when url is missing', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    const { req, res, next } = makeReqRes('blog-1', {});
    await handleAddReference(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('returns 400 when url is invalid', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    const { req, res, next } = makeReqRes('blog-1', { url: 'not-a-url' });
    await handleAddReference(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('returns 400 when max references reached', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockCountRefs.mockResolvedValue(5);
    const { req, res, next } = makeReqRes('blog-1', { url: 'https://example.com' });
    await handleAddReference(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('returns 404 when blog not found', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(null);
    const { req, res, next } = makeReqRes('blog-1', { url: 'https://example.com' });
    await handleAddReference(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });
});

describe('handleListReferences', () => {
  it('returns all references for the blog', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetRefs.mockResolvedValue([fakeRef]);

    const { req, res, json, next } = makeReqRes('blog-1');
    await handleListReferences(req, res, next);

    expect(json).toHaveBeenCalledWith({ references: [fakeRef] });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 when blog not found', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(null);
    const { req, res, next } = makeReqRes('blog-1');
    await handleListReferences(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });
});

describe('handleDeleteReference', () => {
  it('deletes and returns deleted=true', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetRefById.mockResolvedValue(fakeRef);
    mockDeleteRef.mockResolvedValue(undefined);

    const { req, res, json, next } = makeReqRes('blog-1', {}, { refId: 'ref-1' });
    await handleDeleteReference(req, res, next);

    expect(mockDeleteRef).toHaveBeenCalledWith('ref-1');
    expect(json).toHaveBeenCalledWith({ deleted: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 when reference not found', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetRefById.mockResolvedValue(null);

    const { req, res, next } = makeReqRes('blog-1', {}, { refId: 'bad-id' });
    await handleDeleteReference(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });
});

describe('handleGetReferenceStatus', () => {
  it('returns scrape and extraction status', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(blog);
    mockGetRefById.mockResolvedValue({ ...fakeRef, scrapeStatus: 'success' });

    const { req, res, json, next } = makeReqRes('blog-1', {}, { refId: 'ref-1' });
    await handleGetReferenceStatus(req, res, next);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ scrapeStatus: 'success' }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});

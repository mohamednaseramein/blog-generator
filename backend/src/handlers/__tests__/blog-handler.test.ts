import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockListBlogsByUser, mockCreateBlog, mockGetUserId, mockAssertWithinQuota } = vi.hoisted(() => ({
  mockListBlogsByUser: vi.fn(),
  mockCreateBlog: vi.fn(),
  mockGetUserId: vi.fn(() => 'user-1'),
  mockAssertWithinQuota: vi.fn(),
}));

vi.mock('../../repositories/blog-repository.js', () => ({
  listBlogsByUser: mockListBlogsByUser,
  createBlog: mockCreateBlog,
  getBlogByIdAndUser: vi.fn(),
  advanceBlogStep: vi.fn(),
}));

vi.mock('../../middleware/auth.js', () => ({
  getUserId: mockGetUserId,
}));

vi.mock('../../services/quota-enforcement.js', () => ({
  assertWithinQuota: mockAssertWithinQuota,
}));

import { handleCreateBlog, handleListBlogs } from '../blog-handler.js';
import { AppError } from '../../middleware/error-handler.js';
import type { Request, Response, NextFunction } from 'express';

function makeReqRes() {
  const req = { params: {}, body: {} } as unknown as Request;
  const json = vi.fn();
  const res = { json, status: vi.fn().mockReturnThis() } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, json, next };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserId.mockReturnValue('user-1');
});

describe('handleListBlogs', () => {
  it('returns blogs scoped to the authenticated user', async () => {
    const blogs = [
      { id: 'b-1', currentStep: 3, status: 'in_progress', title: 'My post', updatedAt: new Date() },
      { id: 'b-2', currentStep: 6, status: 'completed', title: null, updatedAt: new Date() },
    ];
    mockListBlogsByUser.mockResolvedValue(blogs);

    const { req, res, json, next } = makeReqRes();
    await handleListBlogs(req, res, next);

    expect(mockListBlogsByUser).toHaveBeenCalledWith('user-1');
    expect(json).toHaveBeenCalledWith({ blogs });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards repository errors to next', async () => {
    mockListBlogsByUser.mockRejectedValue(new Error('DB error'));

    const { req, res, next } = makeReqRes();
    await handleListBlogs(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('handleCreateBlog', () => {
  it('checks blog quota before creating', async () => {
    mockAssertWithinQuota.mockResolvedValue(undefined);
    mockCreateBlog.mockResolvedValue({ id: 'b-new', currentStep: 1 });

    const { req, res, json, next } = makeReqRes();
    await handleCreateBlog(req, res, next);

    expect(mockAssertWithinQuota).toHaveBeenCalledWith('user-1', 'blogs');
    expect(mockCreateBlog).toHaveBeenCalledWith('user-1');
    expect(json).toHaveBeenCalledWith({ blogId: 'b-new', currentStep: 1 });
    expect(next).not.toHaveBeenCalled();
  });

  it('does not create a blog when quota is exceeded', async () => {
    mockAssertWithinQuota.mockRejectedValue(
      new AppError(402, 'QUOTA_EXCEEDED', 'limit', { metric: 'blogs', limit: 3, usage: 3 }),
    );

    const { req, res, next } = makeReqRes();
    await handleCreateBlog(req, res, next);

    expect(mockCreateBlog).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 402, code: 'QUOTA_EXCEEDED' }));
  });
});

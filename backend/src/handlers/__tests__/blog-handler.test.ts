import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockListBlogsByUser, mockCreateBlog, mockGetUserId } = vi.hoisted(() => ({
  mockListBlogsByUser: vi.fn(),
  mockCreateBlog: vi.fn(),
  mockGetUserId: vi.fn(() => 'user-1'),
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

import { handleListBlogs } from '../blog-handler.js';
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

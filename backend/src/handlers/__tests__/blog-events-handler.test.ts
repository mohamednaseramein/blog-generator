import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetBlogByIdAndUser, mockGetUserId } = vi.hoisted(() => ({
  mockGetBlogByIdAndUser: vi.fn(),
  mockGetUserId: vi.fn(() => 'user-1'),
}));

vi.mock('../../repositories/blog-repository.js', () => ({
  getBlogByIdAndUser: mockGetBlogByIdAndUser,
}));

vi.mock('../../middleware/auth.js', () => ({
  getUserId: mockGetUserId,
}));

import { handleRecordEvent } from '../blog-events-handler.js';
import type { Request, Response, NextFunction } from 'express';

function makeReqRes(blogId: string, body: Record<string, unknown> = {}) {
  const req = { params: { id: blogId }, body } as unknown as Request;
  const end = vi.fn();
  const res = { status: vi.fn().mockReturnThis(), end } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, end, next };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserId.mockReturnValue('user-1');
  mockGetBlogByIdAndUser.mockResolvedValue({ id: 'blog-1', userId: 'user-1' });
});

describe('handleRecordEvent', () => {
  it('returns 204 for a valid exported event', async () => {
    const { req, res, end, next } = makeReqRes('blog-1', { type: 'exported', section: 'all' });
    await handleRecordEvent(req, res, next);

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(204);
    expect(end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 204 for an unknown section (silently ignored)', async () => {
    const { req, res, end, next } = makeReqRes('blog-1', { type: 'exported', section: 'unknown' });
    await handleRecordEvent(req, res, next);

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(204);
    expect(end).toHaveBeenCalled();
  });

  it('returns 404 when blog does not belong to user', async () => {
    mockGetBlogByIdAndUser.mockResolvedValue(null);

    const { req, res, next } = makeReqRes('blog-1', { type: 'exported', section: 'all' });
    await handleRecordEvent(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAdmin, getUserId } from '../auth.js';
import { requireVerifiedEmail } from '../verified.js';

function makeRes() {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn().mockReturnThis();
  const res = { status, json } as unknown as Response;
  return { res, status, json };
}

const next: NextFunction = vi.fn();

beforeEach(() => vi.clearAllMocks());

describe('getUserId', () => {
  it('throws when userId is missing', () => {
    const req = {} as Request;
    expect(() => getUserId(req)).toThrow(/requireAuth/);
  });

  it('returns userId when set', () => {
    const req = { userId: 'u-1' } as Request;
    expect(getUserId(req)).toBe('u-1');
  });
});

describe('requireAdmin', () => {
  it('returns 401 when unauthenticated', () => {
    const req = {} as Request;
    const { res, status } = makeRes();
    requireAdmin(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when role is not admin', () => {
    const req = { user: { role: 'user' } } as unknown as Request;
    const { res, status } = makeRes();
    requireAdmin(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next for admin', () => {
    const req = { user: { role: 'admin' } } as unknown as Request;
    const { res } = makeRes();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('requireVerifiedEmail', () => {
  it('returns 401 when unauthenticated', () => {
    const req = {} as Request;
    const { res, status } = makeRes();
    requireVerifiedEmail(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when email is unverified', () => {
    const req = { user: { email_verified_at: null } } as unknown as Request;
    const { res, status, json } = makeRes();
    requireVerifiedEmail(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'EMAIL_NOT_VERIFIED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when verified', () => {
    const req = { user: { email_verified_at: '2026-01-01T00:00:00Z' } } as unknown as Request;
    const { res } = makeRes();
    requireVerifiedEmail(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});


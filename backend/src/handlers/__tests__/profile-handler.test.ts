import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  handleCreateProfile,
  handleUpdateProfile,
  handleDeleteProfile,
  handleListProfiles,
  handleGetProfile,
} from '../profile-handler.js';
import * as repo from '../../repositories/profile-repository.js';
import { AppError } from '../../middleware/error-handler.js';

vi.mock('../../repositories/profile-repository.js');

const mockAssertWithinQuota = vi.fn();
vi.mock('../../services/quota-enforcement.js', () => ({
  assertWithinQuota: (...args: unknown[]) => mockAssertWithinQuota(...args),
}));

const SAMPLE_PROFILE = {
  id: 'p-1',
  userId: '00000000-0000-0000-0000-000000000001',
  name: 'Test Profile',
  authorRole: 'CTO',
  audiencePersona: 'Engineers',
  intent: 'thought_leadership' as const,
  toneOfVoice: 'Direct',
  voiceNote: '',
  isPredefined: false,
  voiceSampleText: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeReq(body: unknown = {}, params: Record<string, string> = {}): Request {
  return {
    body,
    params,
    // Handlers call getUserId(), which assumes requireAuth already ran.
    userId: '00000000-0000-0000-0000-000000000001',
  } as unknown as Request;
}

function makeRes(): { res: Response; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  const res = { json, status, send: vi.fn() } as unknown as Response;
  return { res, json, status };
}

const next: NextFunction = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockAssertWithinQuota.mockResolvedValue(undefined);
});

describe('handleListProfiles', () => {
  it('returns profiles from repository', async () => {
    vi.mocked(repo.getAllProfiles).mockResolvedValue([SAMPLE_PROFILE]);
    const { res, json } = makeRes();
    await handleListProfiles(makeReq(), res, next);
    expect(repo.getAllProfiles).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001');
    expect(json).toHaveBeenCalledWith({ profiles: [SAMPLE_PROFILE] });
  });
});

describe('handleGetProfile', () => {
  it('returns 404 when profile not found', async () => {
    vi.mocked(repo.getProfileById).mockResolvedValue(null);
    await handleGetProfile(makeReq({}, { id: 'missing' }), makeRes().res, next);
    expect(repo.getProfileById).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'missing');
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });
});

describe('handleCreateProfile — validation', () => {
  it('rejects missing required fields', async () => {
    const { res } = makeRes();
    await handleCreateProfile(makeReq({}), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('rejects invalid intent', async () => {
    const { res } = makeRes();
    await handleCreateProfile(makeReq({
      name: 'X', authorRole: 'Y', audiencePersona: 'Z',
      intent: 'bad_intent', toneOfVoice: 'T',
    }), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('rejects voiceNote exceeding 500 chars', async () => {
    const { res } = makeRes();
    await handleCreateProfile(makeReq({
      name: 'X', authorRole: 'Y', audiencePersona: 'Z',
      intent: 'seo', toneOfVoice: 'T', voiceNote: 'x'.repeat(501),
    }), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('checks author profile quota before create', async () => {
    vi.mocked(repo.createProfile).mockResolvedValue(SAMPLE_PROFILE);
    const { res } = makeRes();
    await handleCreateProfile(makeReq({
      name: 'Test Profile', authorRole: 'CTO', audiencePersona: 'Engineers',
      intent: 'thought_leadership', toneOfVoice: 'Direct',
    }), res, next);
    expect(mockAssertWithinQuota).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'author_profiles');
  });

  it('creates profile from valid payload', async () => {
    vi.mocked(repo.createProfile).mockResolvedValue(SAMPLE_PROFILE);
    const { res, status } = makeRes();
    await handleCreateProfile(makeReq({
      name: 'Test Profile', authorRole: 'CTO', audiencePersona: 'Engineers',
      intent: 'thought_leadership', toneOfVoice: 'Direct',
    }), res, next);
    expect(repo.createProfile).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
      'Test Profile',
      'CTO',
      'Engineers',
      'thought_leadership',
      'Direct',
      '',
    );
    expect(status).toHaveBeenCalledWith(201);
  });

  it('clones from predefined when cloneFromPredefinedId is provided', async () => {
    vi.mocked(repo.cloneProfileFromPredefined).mockResolvedValue(SAMPLE_PROFILE);
    const { res, status } = makeRes();
    await handleCreateProfile(makeReq({ cloneFromPredefinedId: 'pred-1' }), res, next);
    expect(mockAssertWithinQuota).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'author_profiles');
    expect(repo.cloneProfileFromPredefined).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'pred-1');
    expect(status).toHaveBeenCalledWith(201);
  });
});

describe('handleUpdateProfile — predefined guard', () => {
  it('returns 403 when repository throws AppError FORBIDDEN', async () => {
    vi.mocked(repo.updateProfile).mockRejectedValue(
      new AppError(403, 'FORBIDDEN', 'Cannot edit a predefined profile'),
    );
    await handleUpdateProfile(makeReq({ name: 'New' }, { id: 'pred-1' }), makeRes().res, next);
    expect(repo.updateProfile).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
      'pred-1',
      expect.any(Object),
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it('rejects non-string name in update', async () => {
    const { res } = makeRes();
    await handleUpdateProfile(makeReq({ name: 123 }, { id: 'p-1' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });
});

describe('handleDeleteProfile — predefined guard', () => {
  it('returns 403 when repository throws AppError FORBIDDEN', async () => {
    vi.mocked(repo.deleteProfile).mockRejectedValue(
      new AppError(403, 'FORBIDDEN', 'Cannot delete a predefined profile'),
    );
    await handleDeleteProfile(makeReq({}, { id: 'pred-1' }), makeRes().res, next);
    expect(repo.deleteProfile).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', 'pred-1');
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });
});

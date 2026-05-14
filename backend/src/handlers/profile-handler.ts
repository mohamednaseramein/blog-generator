import type { Request, Response, NextFunction } from 'express';
import {
  getAllProfiles,
  getPredefinedProfiles,
  getProfileById,
  createProfile,
  cloneProfileFromPredefined,
  updateProfile,
  deleteProfile,
} from '../repositories/profile-repository.js';
import { AppError } from '../middleware/error-handler.js';
import type { BlogIntent } from '../domain/types.js';
import { getUserId } from '../middleware/auth.js';

const VALID_INTENTS = new Set<BlogIntent>([
  'thought_leadership',
  'seo',
  'product_announcement',
  'newsletter',
  'deep_dive',
]);

const FIELD_LIMITS = {
  name: { min: 1, max: 120 },
  authorRole: { min: 1, max: 200 },
  audiencePersona: { min: 1, max: 5000 },
  toneOfVoice: { min: 1, max: 200 },
  voiceNote: { min: 0, max: 500 },
};

export type ProfilePartialUpdate = {
  name?: string;
  authorRole?: string;
  audiencePersona?: string;
  intent?: string;
  toneOfVoice?: string;
  voiceNote?: string;
};

/** Shared validation for PUT /api/profiles/:id and admin profile updates. */
export function parseProfileUpdateBody(
  body: unknown,
): { ok: true; updates: ProfilePartialUpdate } | { ok: false; errors: string[] } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, errors: ['Body must be an object'] };
  }

  const b = body as Record<string, unknown>;
  const errors: string[] = [];

  if ('name' in b) {
    if (typeof b.name !== 'string' || b.name.length < FIELD_LIMITS.name.min || b.name.length > FIELD_LIMITS.name.max) {
      errors.push(`name must be a string between ${FIELD_LIMITS.name.min} and ${FIELD_LIMITS.name.max} chars`);
    }
  }

  if ('authorRole' in b) {
    if (
      typeof b.authorRole !== 'string' ||
      b.authorRole.length < 1 ||
      b.authorRole.length > FIELD_LIMITS.authorRole.max
    ) {
      errors.push(`authorRole must be a string between 1 and ${FIELD_LIMITS.authorRole.max} chars`);
    }
  }

  if ('audiencePersona' in b) {
    if (
      typeof b.audiencePersona !== 'string' ||
      b.audiencePersona.length < 1 ||
      b.audiencePersona.length > FIELD_LIMITS.audiencePersona.max
    ) {
      errors.push(`audiencePersona must be a string between 1 and ${FIELD_LIMITS.audiencePersona.max} chars`);
    }
  }

  if ('toneOfVoice' in b) {
    if (
      typeof b.toneOfVoice !== 'string' ||
      b.toneOfVoice.length < 1 ||
      b.toneOfVoice.length > FIELD_LIMITS.toneOfVoice.max
    ) {
      errors.push(`toneOfVoice must be a string between 1 and ${FIELD_LIMITS.toneOfVoice.max} chars`);
    }
  }

  if ('intent' in b) {
    if (typeof b.intent !== 'string' || !VALID_INTENTS.has(b.intent as BlogIntent)) {
      errors.push(`intent must be one of: ${Array.from(VALID_INTENTS).join(', ')}`);
    }
  }

  if ('voiceNote' in b) {
    if (typeof b.voiceNote !== 'string' || b.voiceNote.length > FIELD_LIMITS.voiceNote.max) {
      errors.push(`voiceNote must be a string up to ${FIELD_LIMITS.voiceNote.max} chars`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const updates: ProfilePartialUpdate = {
    ...(b.name !== undefined && { name: b.name as string }),
    ...(b.authorRole !== undefined && { authorRole: b.authorRole as string }),
    ...(b.audiencePersona !== undefined && { audiencePersona: b.audiencePersona as string }),
    ...(b.intent !== undefined && { intent: b.intent as string }),
    ...(b.toneOfVoice !== undefined && { toneOfVoice: b.toneOfVoice as string }),
    ...(b.voiceNote !== undefined && { voiceNote: b.voiceNote as string }),
  };

  return { ok: true, updates };
}

function validateCreateProfileInput(body: unknown): string[] {
  if (typeof body !== 'object' || body === null) {
    return ['Body must be an object'];
  }

  const errors: string[] = [];
  const b = body as Record<string, unknown>;

  if (typeof b.name !== 'string' || b.name.length < FIELD_LIMITS.name.min || b.name.length > FIELD_LIMITS.name.max) {
    errors.push(`name must be a string between ${FIELD_LIMITS.name.min} and ${FIELD_LIMITS.name.max} chars`);
  }

  if (typeof b.authorRole !== 'string' || b.authorRole.length < 1 || b.authorRole.length > FIELD_LIMITS.authorRole.max) {
    errors.push(`authorRole must be a string between 1 and ${FIELD_LIMITS.authorRole.max} chars`);
  }

  if (typeof b.audiencePersona !== 'string' || b.audiencePersona.length < 1 || b.audiencePersona.length > FIELD_LIMITS.audiencePersona.max) {
    errors.push(`audiencePersona must be a string between 1 and ${FIELD_LIMITS.audiencePersona.max} chars`);
  }

  if (typeof b.intent !== 'string' || !VALID_INTENTS.has(b.intent as BlogIntent)) {
    errors.push(`intent must be one of: ${Array.from(VALID_INTENTS).join(', ')}`);
  }

  if (typeof b.toneOfVoice !== 'string' || b.toneOfVoice.length < 1 || b.toneOfVoice.length > FIELD_LIMITS.toneOfVoice.max) {
    errors.push(`toneOfVoice must be a string between 1 and ${FIELD_LIMITS.toneOfVoice.max} chars`);
  }

  const voiceNote = b.voiceNote ?? '';
  if (typeof voiceNote !== 'string' || voiceNote.length > FIELD_LIMITS.voiceNote.max) {
    errors.push(`voiceNote must be a string up to ${FIELD_LIMITS.voiceNote.max} chars`);
  }

  return errors;
}

function validateCloneInput(body: unknown): string[] {
  if (typeof body !== 'object' || body === null) {
    return ['Body must be an object'];
  }

  const b = body as Record<string, unknown>;
  if (typeof b.cloneFromPredefinedId !== 'string' || b.cloneFromPredefinedId.length === 0) {
    return ['cloneFromPredefinedId must be a non-empty string'];
  }

  return [];
}

export async function handleListProfiles(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const profiles = await getAllProfiles(userId);
    res.json({ profiles });
  } catch (err) {
    next(err);
  }
}

export async function handleListPredefinedProfiles(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profiles = await getPredefinedProfiles();
    res.json({ profiles });
  } catch (err) {
    next(err);
  }
}

export async function handleGetProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const id = req.params['id'] as string;
    const profile = await getProfileById(userId, id);
    if (!profile) {
      throw new AppError(404, 'NOT_FOUND', 'Profile not found');
    }

    res.json({ profile });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const body = req.body as unknown;

    // Check if cloning from predefined
    const cloneErrors = validateCloneInput(body);
    if (cloneErrors.length === 0) {
      const b = body as Record<string, unknown>;
      const cloneFromId = b.cloneFromPredefinedId as string;
      const profile = await cloneProfileFromPredefined(userId, cloneFromId);
      res.status(201).json({ profile });
      return;
    }

    // Otherwise, create from scratch
    const createErrors = validateCreateProfileInput(body);
    if (createErrors.length > 0) {
      throw new AppError(400, 'VALIDATION_ERROR', createErrors.join('; '));
    }

    const b = body as Record<string, unknown>;
    const profile = await createProfile(
      userId,
      b.name as string,
      b.authorRole as string,
      b.audiencePersona as string,
      b.intent as string,
      b.toneOfVoice as string,
      (b.voiceNote as string) ?? '',
    );

    res.status(201).json({ profile });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const id = req.params['id'] as string;
    const parsed = parseProfileUpdateBody(req.body);
    if (!parsed.ok) {
      throw new AppError(400, 'VALIDATION_ERROR', parsed.errors.join('; '));
    }

    const profile = await updateProfile(userId, id, parsed.updates);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const id = req.params['id'] as string;
    await deleteProfile(userId, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

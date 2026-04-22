import type { Request, Response, NextFunction } from 'express';
import { getBlogByIdAndUser, advanceBlogStep } from '../repositories/blog-repository.js';
import {
  upsertBrief,
  getBriefByBlogId,
  getScrapeStatus,
} from '../repositories/blog-brief-repository.js';
import { scrapeUrlInBackground } from '../services/url-scraper-service.js';
import { WordCountRange, ReferenceUrl, trimInput } from '../domain/value-objects.js';
import { AppError } from '../middleware/error-handler.js';
import { getUserId } from '../middleware/auth.js';
import type { SubmitBriefInput } from '../domain/types.js';

export async function handleSubmitBrief(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string as string;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const body = req.body as Record<string, unknown>;
    const validationErrors = validateBriefBody(body);
    if (validationErrors.length > 0) {
      throw new AppError(400, 'VALIDATION_ERROR', validationErrors.join('; '));
    }

    const input = buildInput(body);

    let scrapeStatus: 'pending' | 'skipped' = 'skipped';
    if (input.referenceUrl) {
      scrapeStatus = 'pending';
    }

    const brief = await upsertBrief(blogId, input, scrapeStatus);

    if (input.referenceUrl) {
      scrapeUrlInBackground(blogId, input.referenceUrl);
    }

    // After a saved brief, the user proceeds to alignment (step 2 in the wizard).
    await advanceBlogStep(blogId, 2);

    res.status(201).json({ blogId: brief.blogId, scrapeStatus: brief.scrapeStatus });
  } catch (err) {
    next(err);
  }
}

export async function handleGetBrief(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const brief = await getBriefByBlogId(blogId);
    if (!brief) throw new AppError(404, 'NOT_FOUND', 'Brief not found');

    res.json(brief);
  } catch (err) {
    next(err);
  }
}

export async function handleGetScrapeStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const status = await getScrapeStatus(blogId);
    if (!status) throw new AppError(404, 'NOT_FOUND', 'Brief not found');

    res.json(status);
  } catch (err) {
    next(err);
  }
}

function validateBriefBody(body: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const required = [
    'title',
    'primaryKeyword',
    'audiencePersona',
    'toneOfVoice',
    'wordCountMin',
    'wordCountMax',
    'blogBrief',
  ] as const;

  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      errors.push(`${field} is required`);
    }
  }

  if (errors.length > 0) return errors;

  try {
    new WordCountRange(Number(body['wordCountMin']), Number(body['wordCountMax']));
  } catch (e) {
    errors.push((e as Error).message);
  }

  if (body['referenceUrl'] !== undefined && body['referenceUrl'] !== '') {
    try {
      new ReferenceUrl(String(body['referenceUrl']));
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  return errors;
}

function buildInput(body: Record<string, unknown>): SubmitBriefInput {
  return {
    title: trimInput(String(body['title'])),
    primaryKeyword: trimInput(String(body['primaryKeyword'])),
    audiencePersona: trimInput(String(body['audiencePersona'])),
    toneOfVoice: trimInput(String(body['toneOfVoice'])),
    wordCountMin: Number(body['wordCountMin']),
    wordCountMax: Number(body['wordCountMax']),
    blogBrief: trimInput(String(body['blogBrief'])),
    referenceUrl:
      body['referenceUrl'] !== undefined && body['referenceUrl'] !== ''
        ? trimInput(String(body['referenceUrl']))
        : undefined,
  };
}

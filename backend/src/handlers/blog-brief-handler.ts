import type { Request, Response, NextFunction } from 'express';
import { getBlogByIdAndUser, advanceBlogStep } from '../repositories/blog-repository.js';
import {
  upsertBrief,
  getBriefByBlogId,
  getScrapeStatus,
} from '../repositories/blog-brief-repository.js';
import { scrapeUrlInBackground } from '../services/url-scraper-service.js';
import { requeueReferenceExtractionsForBlog } from '../services/reference-extraction-runner.js';
import { BRIEF_FIELD_LIMITS, WordCountRange, ReferenceUrl, trimInput } from '../domain/value-objects.js';
import { AppError } from '../middleware/error-handler.js';
import { getUserId } from '../middleware/auth.js';
import type { BlogIntent, SubmitBriefInput } from '../domain/types.js';

const VALID_BLOG_INTENTS = new Set<BlogIntent>([
  'thought_leadership',
  'seo',
  'product_announcement',
  'newsletter',
  'deep_dive',
]);

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

    // Scrape can finish before the first `blog_briefs` save; re-run reference AI analysis now that the brief exists.
    requeueReferenceExtractionsForBlog(blogId);

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

  const title = trimInput(String(body['title']));
  const primaryKeyword = trimInput(String(body['primaryKeyword']));
  const tone = trimInput(String(body['toneOfVoice']));
  if (title.length > BRIEF_FIELD_LIMITS.title) {
    errors.push(`title must be at most ${BRIEF_FIELD_LIMITS.title} characters`);
  }
  if (primaryKeyword.length > BRIEF_FIELD_LIMITS.primaryKeyword) {
    errors.push(
      `primaryKeyword must be at most ${BRIEF_FIELD_LIMITS.primaryKeyword} characters`,
    );
  }
  if (tone.length > BRIEF_FIELD_LIMITS.toneOfVoice) {
    errors.push(
      `toneOfVoice must be at most ${BRIEF_FIELD_LIMITS.toneOfVoice} characters`,
    );
  }

  if (body['intent'] !== undefined && body['intent'] !== null && body['intent'] !== '') {
    const intent = String(body['intent']) as BlogIntent;
    if (!VALID_BLOG_INTENTS.has(intent)) {
      errors.push(`intent must be one of: ${[...VALID_BLOG_INTENTS].join(', ')}`);
    }
  }

  return errors;
}

function buildInput(body: Record<string, unknown>): SubmitBriefInput {
  const input: SubmitBriefInput = {
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

  if (body['authorRole'] !== undefined && body['authorRole'] !== null && body['authorRole'] !== '') {
    input.authorRole = trimInput(String(body['authorRole']));
  }
  if (body['intent'] !== undefined && body['intent'] !== null && body['intent'] !== '') {
    input.intent = String(body['intent']) as BlogIntent;
  }
  if (body['voiceNote'] !== undefined && body['voiceNote'] !== null) {
    input.voiceNote = trimInput(String(body['voiceNote']));
  }
  if (body['profileId'] !== undefined) {
    input.profileId =
      body['profileId'] === null || body['profileId'] === ''
        ? null
        : String(body['profileId']);
  }

  return input;
}

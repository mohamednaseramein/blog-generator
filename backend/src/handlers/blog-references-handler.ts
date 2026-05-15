import type { Request, Response, NextFunction } from 'express';
import { getBlogByIdAndUser } from '../repositories/blog-repository.js';
import {
  countReferencesByBlogId,
  insertReference,
  getReferencesByBlogId,
  getReferenceById,
  deleteReference,
  updateReferenceExtraction,
} from '../repositories/blog-references-repository.js';
import { scrapeReferenceInBackground } from '../services/url-scraper-service.js';
import { extractReferenceInBackground } from '../services/reference-extraction-runner.js';
import { ReferenceUrl } from '../domain/value-objects.js';
import { AppError } from '../middleware/error-handler.js';
import { getUserId } from '../middleware/auth.js';
import { assertWithinQuota } from '../services/quota-enforcement.js';

const MAX_REFERENCES = 5;

function extractionErrorFromRow(extractionJson: string | null, extractionStatus: string): string | null {
  if (extractionStatus !== 'failed' || !extractionJson) {
    return null;
  }
  try {
    const o = JSON.parse(extractionJson) as { _extractionError?: boolean; message?: string };
    if (o._extractionError && typeof o.message === 'string' && o.message.trim()) {
      return o.message;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function handleAddReference(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;
    const body = req.body as Record<string, unknown>;
    const rawUrl = body['url'];

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'url is required');
    }

    let validUrl: string;
    try {
      validUrl = new ReferenceUrl(rawUrl.trim()).value;
    } catch (e) {
      throw new AppError(400, 'VALIDATION_ERROR', (e as Error).message);
    }

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const count = await countReferencesByBlogId(blogId);
    if (count >= MAX_REFERENCES) {
      throw new AppError(400, 'VALIDATION_ERROR', `Maximum of ${MAX_REFERENCES} reference URLs allowed`);
    }

    await assertWithinQuota(userId, 'reference_extractions');

    const reference = await insertReference(blogId, validUrl, count + 1);
    scrapeReferenceInBackground(reference.id, validUrl);

    res.status(201).json({ reference });
  } catch (err) {
    next(err);
  }
}

export async function handleListReferences(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const references = await getReferencesByBlogId(blogId);
    res.json({ references });
  } catch (err) {
    next(err);
  }
}

export async function handleGetReferenceStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;
    const refId = req.params['refId'] as string;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const reference = await getReferenceById(refId);
    if (!reference || reference.blogId !== blogId) {
      throw new AppError(404, 'NOT_FOUND', 'Reference not found');
    }

    res.json({
      scrapeStatus: reference.scrapeStatus,
      scrapeError: reference.scrapeError,
      extractionStatus: reference.extractionStatus,
      extractionJson: reference.extractionJson,
      extractionError: extractionErrorFromRow(reference.extractionJson, reference.extractionStatus),
    });
  } catch (err) {
    next(err);
  }
}

export async function handleRetryReferenceExtraction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;
    const refId = req.params['refId'] as string;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const reference = await getReferenceById(refId);
    if (!reference || reference.blogId !== blogId) {
      throw new AppError(404, 'NOT_FOUND', 'Reference not found');
    }
    if (reference.scrapeStatus !== 'success' || !reference.scrapedContent?.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Page must be fetched successfully before re-analysis');
    }

    await updateReferenceExtraction(refId, 'pending', null);
    extractReferenceInBackground(refId);
    res.json({ retried: true });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteReference(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;
    const refId = req.params['refId'] as string;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const reference = await getReferenceById(refId);
    if (!reference || reference.blogId !== blogId) {
      throw new AppError(404, 'NOT_FOUND', 'Reference not found');
    }

    await deleteReference(refId);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
}

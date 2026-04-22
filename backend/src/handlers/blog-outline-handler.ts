import type { Request, Response, NextFunction } from 'express';
import { getBlogByIdAndUser, advanceBlogStep } from '../repositories/blog-repository.js';
import { getBriefByBlogId } from '../repositories/blog-brief-repository.js';
import {
  getOutlineByBlogId,
  upsertOutline,
  confirmOutline,
} from '../repositories/blog-outline-repository.js';
import { generateBlogOutline, parseStoredOutlineJson } from '../services/outline-service.js';
import type { AlignmentSummary } from '../services/alignment-service.js';
import { AppError } from '../middleware/error-handler.js';
import { getUserId } from '../middleware/auth.js';

export async function handleGenerateOutline(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;
    const feedback = (req.body as Record<string, unknown>)['feedback'];
    const feedbackText = typeof feedback === 'string' && feedback.trim() ? feedback.trim() : undefined;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const brief = await getBriefByBlogId(blogId);
    if (!brief) throw new AppError(404, 'NOT_FOUND', 'Brief not found — submit the brief first');
    if (!brief.alignmentConfirmed || !brief.alignmentSummary) {
      throw new AppError(400, 'BAD_REQUEST', 'Confirm alignment before generating an outline');
    }

    let alignment: AlignmentSummary;
    try {
      alignment = JSON.parse(brief.alignmentSummary) as AlignmentSummary;
    } catch {
      throw new AppError(500, 'INTERNAL', 'Stored alignment summary is malformed');
    }

    const existingOutline = await getOutlineByBlogId(blogId);
    const currentIterations = existingOutline?.outlineIterations ?? 0;

    const outline = await generateBlogOutline(brief, alignment, feedbackText);
    await upsertOutline(blogId, outline.raw, currentIterations);

    res.json({ outline });
  } catch (err) {
    next(err);
  }
}

export async function handleConfirmOutline(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const outline = await getOutlineByBlogId(blogId);
    if (!outline) throw new AppError(400, 'BAD_REQUEST', 'Generate an outline first');

    await confirmOutline(blogId);
    await advanceBlogStep(blogId, 4);

    res.json({ confirmed: true, blogId });
  } catch (err) {
    next(err);
  }
}

export async function handleGetOutline(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const row = await getOutlineByBlogId(blogId);
    if (!row) throw new AppError(404, 'NOT_FOUND', 'Outline not found');

    let parsed: ReturnType<typeof parseStoredOutlineJson>;
    try {
      parsed = parseStoredOutlineJson(row.outlineJson);
    } catch {
      throw new AppError(500, 'INTERNAL', 'Stored outline is invalid');
    }

    res.json({
      outline: { ...parsed, raw: row.outlineJson },
      outlineConfirmed: row.outlineConfirmed,
      outlineIterations: row.outlineIterations,
    });
  } catch (err) {
    next(err);
  }
}

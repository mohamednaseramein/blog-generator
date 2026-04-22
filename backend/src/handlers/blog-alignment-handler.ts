import type { Request, Response, NextFunction } from 'express';
import { getBlogByIdAndUser, advanceBlogStep } from '../repositories/blog-repository.js';
import {
  getBriefByBlogId,
  updateAlignmentSummary,
  confirmAlignment,
} from '../repositories/blog-brief-repository.js';
import { getReferencesByBlogId } from '../repositories/blog-references-repository.js';
import { generateAlignmentSummary } from '../services/alignment-service.js';
import { AppError } from '../middleware/error-handler.js';
import { getUserId } from '../middleware/auth.js';

export async function handleGenerateAlignment(
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

    const references = await getReferencesByBlogId(blogId);
    const result = await generateAlignmentSummary(brief, feedbackText, references);
    await updateAlignmentSummary(blogId, result.raw);

    const { referencesAnalysis, ...summary } = result;
    res.json({
      summary,
      ...(referencesAnalysis ? { referencesAnalysis } : {}),
    });
  } catch (err) {
    next(err);
  }
}

export async function handleConfirmAlignment(
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
    if (!brief.alignmentSummary) throw new AppError(400, 'BAD_REQUEST', 'Generate an alignment summary first');

    await confirmAlignment(blogId, brief.alignmentSummary);
    await advanceBlogStep(blogId, 3);

    res.json({ confirmed: true, blogId });
  } catch (err) {
    next(err);
  }
}

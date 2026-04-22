import type { Request, Response, NextFunction } from 'express';
import { getBlogByIdAndUser, advanceBlogStep } from '../repositories/blog-repository.js';
import { AppError } from '../middleware/error-handler.js';
import { getUserId } from '../middleware/auth.js';

const VALID_SECTIONS = ['all', 'title', 'meta', 'slug', 'body'] as const;
type ExportSection = (typeof VALID_SECTIONS)[number];

export async function handleRecordEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const body = req.body as Record<string, unknown>;
    const type = body['type'];
    const section = body['section'] as ExportSection | undefined;

    if (type === 'exported' && section && VALID_SECTIONS.includes(section)) {
      console.log(`[events] blogId=${blogId} type=exported section=${section}`);
      if (blog.currentStep < 5) await advanceBlogStep(blogId, 5);
    }

    if (type === 'finished') {
      await advanceBlogStep(blogId, 6);
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

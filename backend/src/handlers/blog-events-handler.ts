import type { Request, Response, NextFunction } from 'express';
import { getBlogByIdAndUser } from '../repositories/blog-repository.js';
import { AppError } from '../middleware/error-handler.js';
import { getUserId } from '../middleware/auth.js';

const VALID_SECTIONS = ['all', 'all_html', 'title', 'meta', 'slug', 'body', 'body_html'] as const;
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
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

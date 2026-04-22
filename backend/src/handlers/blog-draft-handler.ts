import type { Request, Response, NextFunction } from 'express';
import { getBlogByIdAndUser } from '../repositories/blog-repository.js';
import { getBriefByBlogId } from '../repositories/blog-brief-repository.js';
import { getOutlineByBlogId } from '../repositories/blog-outline-repository.js';
import {
  getDraftByBlogId,
  upsertDraft,
  confirmDraft,
} from '../repositories/blog-draft-repository.js';
import { generateBlogDraft, generateMetaAndSlug } from '../services/draft-service.js';
import type { AlignmentSummary } from '../services/alignment-service.js';
import { parseStoredOutlineJson } from '../services/outline-service.js';
import { AppError } from '../middleware/error-handler.js';
import { getUserId } from '../middleware/auth.js';

export async function handleGenerateDraft(
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
      throw new AppError(400, 'BAD_REQUEST', 'Confirm alignment before generating a draft');
    }

    let alignment: AlignmentSummary;
    try {
      alignment = JSON.parse(brief.alignmentSummary) as AlignmentSummary;
    } catch {
      throw new AppError(500, 'INTERNAL', 'Stored alignment summary is malformed');
    }

    const outlineRow = await getOutlineByBlogId(blogId);
    if (!outlineRow) throw new AppError(404, 'NOT_FOUND', 'Outline not found — generate an outline first');
    if (!outlineRow.outlineConfirmed) {
      throw new AppError(400, 'BAD_REQUEST', 'Confirm the outline before generating a draft');
    }

    let parsedOutline: ReturnType<typeof parseStoredOutlineJson>;
    try {
      parsedOutline = parseStoredOutlineJson(outlineRow.outlineJson);
    } catch {
      throw new AppError(500, 'INTERNAL', 'Stored outline JSON is malformed');
    }

    const existingDraft = await getDraftByBlogId(blogId);
    const currentIterations = existingDraft?.draftIterations ?? 0;

    const result = await generateBlogDraft(
      brief,
      alignment,
      parsedOutline.sections,
      parsedOutline.totalEstimatedWords,
      feedbackText,
    );
    await upsertDraft(blogId, result.markdown, currentIterations);

    res.json({ draft: { markdown: result.markdown, raw: result.raw } });
  } catch (err) {
    next(err);
  }
}

export async function handleConfirmDraft(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const draft = await getDraftByBlogId(blogId);
    if (!draft || !draft.draftMarkdown.trim()) {
      throw new AppError(400, 'BAD_REQUEST', 'Generate a draft first');
    }

    const brief = await getBriefByBlogId(blogId);
    const title = brief?.title ?? '';
    const keyword = brief?.primaryKeyword ?? '';

    const { metaDescription, suggestedSlug } = await generateMetaAndSlug(
      title,
      draft.draftMarkdown,
      keyword,
    );

    await confirmDraft(blogId, metaDescription, suggestedSlug);

    res.json({ confirmed: true, blogId, metaDescription, suggestedSlug });
  } catch (err) {
    next(err);
  }
}

export async function handleGetDraft(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const draft = await getDraftByBlogId(blogId);
    if (!draft) throw new AppError(404, 'NOT_FOUND', 'Draft not found');

    res.json({
      draft: {
        markdown: draft.draftMarkdown,
        draftConfirmed: draft.draftConfirmed,
        draftIterations: draft.draftIterations,
        metaDescription: draft.metaDescription,
        suggestedSlug: draft.suggestedSlug,
      },
    });
  } catch (err) {
    next(err);
  }
}

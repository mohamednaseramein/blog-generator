import type { Request, Response, NextFunction } from 'express';
import { getBlogByIdAndUser } from '../repositories/blog-repository.js';
import { getBriefByBlogId } from '../repositories/blog-brief-repository.js';
import { getOutlineByBlogId } from '../repositories/blog-outline-repository.js';
import { getDraftByBlogId } from '../repositories/blog-draft-repository.js';
import { AppError } from '../middleware/error-handler.js';
import { getUserId } from '../middleware/auth.js';
import { resolveAlignmentAnthropicModel } from '../services/alignment-service.js';

type PromptStep = 'alignment' | 'outline' | 'draft';

const VALID_STEPS = new Set<PromptStep>(['alignment', 'outline', 'draft']);

function resolvePromptStepModel(step: PromptStep): string {
  // Today we use a single env var for all steps, but alignment has an explicit helper.
  // Keep this switch so the API response stays honest if we split models later.
  switch (step) {
    case 'alignment':
      return resolveAlignmentAnthropicModel();
    case 'outline':
    case 'draft':
      return process.env['ANTHROPIC_MODEL']?.trim() || 'claude-sonnet-4-6';
  }
}

export async function handleGetPrompt(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;
    const step = req.params['step'] as string;

    // Validate step parameter
    if (!VALID_STEPS.has(step as PromptStep)) {
      throw new AppError(
        400,
        'INVALID_INPUT',
        `step must be one of: ${Array.from(VALID_STEPS).join(', ')}`
      );
    }

    // Verify blog ownership
    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) {
      throw new AppError(404, 'NOT_FOUND', 'Blog not found');
    }

    let systemPrompt: string | null = null;
    let generatedAt: Date | null = null;

    switch (step as PromptStep) {
      case 'alignment': {
        const brief = await getBriefByBlogId(blogId);
        if (!brief) {
          throw new AppError(404, 'NOT_FOUND', 'Brief not found');
        }
        systemPrompt = brief.alignmentSystemPrompt;
        generatedAt = brief.updatedAt;
        break;
      }

      case 'outline': {
        const outline = await getOutlineByBlogId(blogId);
        if (!outline) {
          throw new AppError(404, 'NOT_FOUND', 'Outline not found');
        }
        systemPrompt = outline.systemPrompt;
        generatedAt = outline.updatedAt;
        break;
      }

      case 'draft': {
        const draft = await getDraftByBlogId(blogId);
        if (!draft) {
          throw new AppError(404, 'NOT_FOUND', 'Draft not found');
        }
        systemPrompt = draft.systemPrompt;
        generatedAt = draft.updatedAt;
        break;
      }
    }

    // If no prompt was persisted (e.g., generated before this feature), return null
    if (!systemPrompt) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `System prompt not available for ${step} step (may have been generated before this feature)`
      );
    }

    res.json({
      step,
      model: resolvePromptStepModel(step as PromptStep),
      systemPrompt,
      generatedAt: generatedAt?.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

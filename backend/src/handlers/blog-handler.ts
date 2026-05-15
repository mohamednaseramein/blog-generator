import type { Request, Response, NextFunction } from 'express';
import { createBlog, getBlogByIdAndUser, listBlogsByUser, advanceBlogStep } from '../repositories/blog-repository.js';
import { AppError } from '../middleware/error-handler.js';
import { getUserId } from '../middleware/auth.js';
import { assertWithinQuota } from '../services/quota-enforcement.js';

export async function handleListBlogs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req as Request & { userId?: string });
    const blogs = await listBlogsByUser(userId);
    res.json({ blogs });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateBlog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req as Request & { userId?: string });
    await assertWithinQuota(userId, 'blogs');
    const blog = await createBlog(userId);
    res.status(201).json({ blogId: blog.id, currentStep: blog.currentStep });
  } catch (err) {
    next(err);
  }
}

export async function handleCompleteBlog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;
    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');
    await advanceBlogStep(blogId, 6);
    res.json({ blogId, currentStep: 6 });
  } catch (err) {
    next(err);
  }
}

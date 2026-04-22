import type { Request, Response, NextFunction } from 'express';
import { createBlog, listBlogsByUser } from '../repositories/blog-repository.js';
import { getUserId } from '../middleware/auth.js';

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
    const blog = await createBlog(userId);
    res.status(201).json({ blogId: blog.id, currentStep: blog.currentStep });
  } catch (err) {
    next(err);
  }
}

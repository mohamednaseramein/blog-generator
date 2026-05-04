import type { Request, Response, NextFunction } from 'express';

export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.user.email_verified_at) {
    res.status(403).json({ error: 'EMAIL_NOT_VERIFIED', message: 'You must verify your email to perform this action' });
    return;
  }

  next();
}

import type { Request, Response, NextFunction } from 'express';

// Placeholder auth middleware — replaced when EP-04 (Authentication) is implemented.
// For now injects a fixed userId so EP-01 endpoints can be tested end-to-end.
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  // TODO(EP-04): verify JWT, populate req.userId from token claims
  (req as Request & { userId: string }).userId = DEV_USER_ID;
  next();
}

export function getUserId(req: Request): string {
  return (req as Request & { userId?: string }).userId ?? DEV_USER_ID;
}

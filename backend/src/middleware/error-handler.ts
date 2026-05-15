import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: { code: string; message: string; details?: unknown; conflicts?: unknown } = {
      code: err.code,
      message: err.message,
    };
    if (err.details !== undefined) {
      if (
        err.code === 'DOWNGRADE_BLOCKED' &&
        typeof err.details === 'object' &&
        err.details !== null &&
        'conflicts' in err.details
      ) {
        body.conflicts = (err.details as { conflicts: unknown }).conflicts;
      } else {
        body.details = err.details;
      }
    }
    res.status(err.status).json({ error: body });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}

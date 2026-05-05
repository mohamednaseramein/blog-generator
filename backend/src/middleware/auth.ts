import type { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../db/supabase.js';

export interface AuthUser {
  id: string;
  role: 'admin' | 'user';
  email_verified_at: string | null;
  deactivated_at: string | null;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token missing' });
    return;
  }

  try {
    const supabase = getSupabase();
    // getUser validates the JWT and checks if it's revoked
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id, role, email_verified_at, deactivated_at')
      .eq('id', user.id)
      .single();

    if (dbError || !dbUser) {
      res.status(401).json({ error: 'User record not found' });
      return;
    }

    if (dbUser.deactivated_at) {
      res.status(401).json({ error: 'This account has been deactivated. Please contact support.' });
      return;
    }

    req.userId = user.id;
    req.user = dbUser;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal authentication error' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }

  next();
}

export function getUserId(req: Request): string {
  if (!req.userId) {
    throw new Error('getUserId called before requireAuth');
  }
  return req.userId;
}

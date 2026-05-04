import type { Request, Response } from 'express';
import { getSupabase } from '../db/supabase.js';
import { getUserId } from '../middleware/auth.js';

/** Express may type params as `string | string[]`; routes here use a single segment. */
function routeParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export async function listUsers(req: Request, res: Response) {
  try {
    const supabase = getSupabase();
    
    // We get auth users via Admin API for email, and join with public.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const { data: publicUsers, error: dbError } = await supabase
      .from('users')
      .select('*');
    if (dbError) throw dbError;

    const userMap = new Map(publicUsers.map((u: any) => [u.id, u]));

    const users = authUsers.users.map(u => {
      const p = userMap.get(u.id) || {};
      return {
        id: u.id,
        email: u.email,
        role: p.role || 'user',
        email_verified_at: p.email_verified_at || u.email_confirmed_at,
        deactivated_at: p.deactivated_at || null,
        created_at: p.created_at || u.created_at,
        last_sign_in_at: u.last_sign_in_at
      };
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function deactivateUser(req: Request, res: Response) {
  const id = routeParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Missing user id' });
    return;
  }
  try {
    const supabase = getSupabase();
    
    // Last-admin protection
    const { data: userToDeactivate } = await supabase.from('users').select('role').eq('id', id).single();
    if (userToDeactivate?.role === 'admin') {
      const { count } = await supabase.from('users').select('*', { count: 'exact' }).eq('role', 'admin').is('deactivated_at', null);
      if (count && count <= 1) {
        res.status(409).json({ error: 'LAST_ADMIN', message: 'Cannot deactivate the last admin' });
        return;
      }
    }

    const { error } = await supabase.from('users').update({ deactivated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function promoteUser(req: Request, res: Response) {
  const id = routeParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Missing user id' });
    return;
  }
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('users').update({ role: 'admin' }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function demoteUser(req: Request, res: Response) {
  const id = routeParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Missing user id' });
    return;
  }
  const currentAdminId = getUserId(req);

  if (id === currentAdminId) {
    res.status(403).json({ error: 'Cannot demote yourself directly' });
    return;
  }

  try {
    const supabase = getSupabase();
    
    // Last-admin protection
    const { count } = await supabase.from('users').select('*', { count: 'exact' }).eq('role', 'admin').is('deactivated_at', null);
    if (count && count <= 1) {
      res.status(409).json({ error: 'LAST_ADMIN', message: 'Cannot demote the last admin' });
      return;
    }

    const { error } = await supabase.from('users').update({ role: 'user' }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function forceResetUser(req: Request, res: Response) {
  const id = routeParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Missing user id' });
    return;
  }
  try {
    const supabase = getSupabase();
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(id);
    if (userError) throw userError;

    if (!user.user.email) {
      res.status(400).json({ error: 'User has no email' });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(user.user.email);
    if (error) throw error;
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function listAllBlogs(req: Request, res: Response) {
  try {
    const supabase = getSupabase();
    const { data: blogs, error } = await supabase
      .from('blogs')
      .select('*, users(id)'); // In a real scenario we'd join auth.users or mapped email.
    
    if (error) throw error;

    // Fetch emails for these users
    const userIds = [...new Set(blogs.map((b: any) => b.user_id))];
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const emailMap = new Map((authUsers?.users || []).map(u => [u.id, u.email]));

    const enrichedBlogs = blogs.map((b: any) => ({
      ...b,
      owner_email: emailMap.get(b.user_id) || 'Unknown'
    }));

    res.json(enrichedBlogs);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function getAnyBlog(req: Request, res: Response) {
  const id = routeParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Missing blog id' });
    return;
  }
  try {
    const supabase = getSupabase();
    const { data: blog, error } = await supabase.from('blogs').select('*').eq('id', id).single();
    if (error) throw error;
    if (!blog) {
      res.status(404).json({ error: 'Blog not found' });
      return;
    }
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

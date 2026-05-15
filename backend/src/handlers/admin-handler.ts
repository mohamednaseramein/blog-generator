import type { Request, Response } from 'express';
import type { User as AuthUserRow } from '@supabase/supabase-js';
import { getSupabase } from '../db/supabase.js';
import { getUserId } from '../middleware/auth.js';
import { displayTitleFromBriefEmbed } from '../repositories/blog-repository.js';
import { AppError } from '../middleware/error-handler.js';
import { parseProfileUpdateBody } from './profile-handler.js';
import { updateProfile, getProfilesOwnedByUser } from '../repositories/profile-repository.js';

/** Express may type params as `string | string[]`; routes here use a single segment. */
function routeParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

async function listAllAuthUsers(supabase: ReturnType<typeof getSupabase>): Promise<AuthUserRow[]> {
  const perPage = 200;
  const all: AuthUserRow[] = [];
  for (let page = 1; page < 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data.users ?? [];
    all.push(...batch);
    if (batch.length < perPage) break;
  }
  return all;
}

export async function listUsers(req: Request, res: Response) {
  try {
    const supabase = getSupabase();

    const authUsers = await listAllAuthUsers(supabase);

    const { data: publicUsers, error: dbError } = await supabase.from('users').select('*');
    if (dbError) throw dbError;

    const userMap = new Map((publicUsers as { id: string }[]).map((u) => [u.id, u]));

    const { data: activeSubs, error: subsError } = await supabase
      .from('subscriptions')
      .select('user_id, plan_id')
      .eq('status', 'active');
    if (subsError) throw subsError;

    const planIds = [...new Set((activeSubs ?? []).map((s) => (s as { plan_id: string }).plan_id))];
    const planNameById = new Map<string, string>();
    if (planIds.length > 0) {
      const { data: planRows, error: plansError } = await supabase.from('plans').select('id, name').in('id', planIds);
      if (plansError) throw plansError;
      for (const row of planRows ?? []) {
        const pr = row as { id: string; name: string };
        planNameById.set(pr.id, pr.name);
      }
    }

    const planNameByUserId = new Map<string, string>();
    for (const row of activeSubs ?? []) {
      const s = row as { user_id: string; plan_id: string };
      const name = planNameById.get(s.plan_id);
      if (name) planNameByUserId.set(s.user_id, name);
    }

    const users = authUsers.map((u) => {
      const p = (userMap.get(u.id) ?? {}) as Record<string, unknown>;
      return {
        id: u.id,
        email: u.email,
        role: (typeof p['role'] === 'string' ? p['role'] : null) || 'user',
        email_verified_at: (p['email_verified_at'] as string | null) ?? u.email_confirmed_at ?? null,
        deactivated_at: (p['deactivated_at'] as string | null) ?? null,
        created_at: (p['created_at'] as string | null) ?? u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        plan_name: planNameByUserId.get(u.id) ?? null,
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

export async function reactivateUser(req: Request, res: Response) {
  const id = routeParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Missing user id' });
    return;
  }
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('users').update({ deactivated_at: null }).eq('id', id);
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

    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single();
    if (targetError) throw targetError;

    if (targetUser?.role !== 'admin') {
      res.json({ success: true });
      return;
    }

    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'admin')
      .is('deactivated_at', null);
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
      .select('id, user_id, current_step, status, created_at, updated_at, blog_briefs(title, primary_keyword)')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const authUsers = await listAllAuthUsers(supabase);
    const emailMap = new Map(authUsers.map((u) => [u.id, u.email]));

    const enrichedBlogs = (blogs ?? []).map((b: Record<string, unknown>) => ({
      id: b['id'],
      user_id: b['user_id'],
      current_step: b['current_step'],
      status: b['status'],
      created_at: b['created_at'],
      updated_at: b['updated_at'],
      title: displayTitleFromBriefEmbed(b['blog_briefs']),
      owner_email: emailMap.get(b['user_id'] as string) || 'Unknown',
    }));

    res.json(enrichedBlogs);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function getUserUsage(req: Request, res: Response) {
  const userId = routeParam(req.params.id);
  if (!userId) {
    res.status(400).json({ error: 'Missing user id' });
    return;
  }
  try {
    const supabase = getSupabase();

    const { count: blogCount } = await supabase
      .from('blogs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: authorProfileCount } = await supabase
      .from('author_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_predefined', false);

    const { data: blogRows, error: blogErr } = await supabase.from('blogs').select('id').eq('user_id', userId);
    if (blogErr) throw blogErr;
    const blogIds = (blogRows ?? []).map((r: { id: string }) => r.id);

    let aiCheckCount = 0;
    let referenceCount = 0;
    if (blogIds.length > 0) {
      const { count: ac } = await supabase
        .from('blog_ai_checks')
        .select('*', { count: 'exact', head: true })
        .in('blog_id', blogIds);
      aiCheckCount = ac ?? 0;

      const { count: rc } = await supabase
        .from('blog_references')
        .select('*', { count: 'exact', head: true })
        .in('blog_id', blogIds);
      referenceCount = rc ?? 0;
    }

    const { data: lastBlog } = await supabase
      .from('blogs')
      .select('updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({
      user_id: userId,
      blog_count: blogCount ?? 0,
      author_profile_count: authorProfileCount ?? 0,
      ai_check_count: aiCheckCount,
      reference_count: referenceCount,
      last_blog_activity_at: (lastBlog as { updated_at?: string } | null)?.updated_at ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function listUserProfiles(req: Request, res: Response) {
  const userId = routeParam(req.params.id);
  if (!userId) {
    res.status(400).json({ error: 'Missing user id' });
    return;
  }
  try {
    const profiles = await getProfilesOwnedByUser(userId);
    res.json({ profiles });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function adminUpdateUserProfile(req: Request, res: Response) {
  const userId = routeParam(req.params.userId);
  const profileId = routeParam(req.params.profileId);
  if (!userId || !profileId) {
    res.status(400).json({ error: 'Missing user id or profile id' });
    return;
  }

  const parsed = parseProfileUpdateBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.errors.join('; ') });
    return;
  }

  try {
    const profile = await updateProfile(userId, profileId, parsed.updates);
    res.json({ profile });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
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

export async function deleteAnyBlog(req: Request, res: Response) {
  const id = routeParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Missing blog id' });
    return;
  }
  try {
    const supabase = getSupabase();
    const { data: existing, error: fetchErr } = await supabase.from('blogs').select('id').eq('id', id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) {
      res.status(404).json({ error: 'Blog not found' });
      return;
    }

    const { error } = await supabase.from('blogs').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

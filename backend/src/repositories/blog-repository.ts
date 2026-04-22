import { getSupabase } from '../db/supabase.js';
import type { Blog } from '../domain/types.js';

interface BlogRow {
  id: string;
  user_id: string;
  status: string;
  current_step: number;
  created_at: string;
  updated_at: string;
}

function toModel(row: BlogRow): Blog {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status as Blog['status'],
    currentStep: row.current_step,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function createBlog(userId: string): Promise<Blog> {
  const { data, error } = await getSupabase()
    .from('blogs')
    .insert({ user_id: userId })
    .select()
    .single<BlogRow>();

  if (error) throw new Error(error.message);
  return toModel(data);
}

export async function getBlogByIdAndUser(
  id: string,
  userId: string,
): Promise<Blog | null> {
  const { data, error } = await getSupabase()
    .from('blogs')
    .select()
    .eq('id', id)
    .eq('user_id', userId)
    .single<BlogRow>();

  if (error?.code === 'PGRST116') return null; // row not found
  if (error) throw new Error(error.message);
  return toModel(data);
}

export interface BlogSummary {
  id: string;
  currentStep: number;
  status: Blog['status'];
  title: string | null;
  updatedAt: Date;
}

export async function listBlogsByUser(userId: string): Promise<BlogSummary[]> {
  const { data, error } = await getSupabase()
    .from('blogs')
    .select('id, current_step, status, updated_at, blog_briefs(title)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];

  type RawRow = {
    id: string;
    current_step: number;
    status: string;
    updated_at: string;
    blog_briefs: { title: string }[] | null;
  };

  return (data as unknown as RawRow[]).map((row) => ({
    id: row.id,
    currentStep: row.current_step,
    status: row.status as Blog['status'],
    title: Array.isArray(row.blog_briefs) && row.blog_briefs.length > 0
      ? row.blog_briefs[0]!.title
      : null,
    updatedAt: new Date(row.updated_at),
  }));
}

export async function advanceBlogStep(id: string, step: number): Promise<void> {
  const { error } = await getSupabase()
    .from('blogs')
    .update({ current_step: step, status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

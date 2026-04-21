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

export async function advanceBlogStep(id: string, step: number): Promise<void> {
  const { error } = await getSupabase()
    .from('blogs')
    .update({ current_step: step, status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

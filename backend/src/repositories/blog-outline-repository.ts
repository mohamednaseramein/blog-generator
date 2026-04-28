import { getSupabase } from '../db/supabase.js';
import type { BlogOutline } from '../domain/types.js';

interface BlogOutlineRow {
  id: string;
  blog_id: string;
  outline_json: string;
  outline_confirmed: boolean;
  outline_iterations: number;
  system_prompt: string | null;
  created_at: string;
  updated_at: string;
}

function toModel(row: BlogOutlineRow): BlogOutline {
  return {
    id: row.id,
    blogId: row.blog_id,
    outlineJson: row.outline_json,
    outlineConfirmed: row.outline_confirmed,
    outlineIterations: row.outline_iterations,
    systemPrompt: row.system_prompt ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function getOutlineByBlogId(blogId: string): Promise<BlogOutline | null> {
  const { data, error } = await getSupabase()
    .from('blog_outlines')
    .select()
    .eq('blog_id', blogId)
    .single<BlogOutlineRow>();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(error.message);
  return toModel(data);
}

export async function upsertOutline(
  blogId: string,
  outlineJson: string,
  currentIterations: number,
): Promise<BlogOutline> {
  const { data, error } = await getSupabase()
    .from('blog_outlines')
    .upsert(
      {
        blog_id: blogId,
        outline_json: outlineJson,
        outline_iterations: currentIterations + 1,
        outline_confirmed: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'blog_id' },
    )
    .select()
    .single<BlogOutlineRow>();

  if (error) throw new Error(error.message);
  console.log(`[outline-repository] saved outline for blogId=${blogId}`);
  return toModel(data);
}

export async function confirmOutline(blogId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('blog_outlines')
    .update({ outline_confirmed: true, updated_at: new Date().toISOString() })
    .eq('blog_id', blogId);

  if (error) throw new Error(error.message);
}

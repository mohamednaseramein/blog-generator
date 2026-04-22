import { getSupabase } from '../db/supabase.js';
import type { BlogDraft } from '../domain/types.js';

interface BlogDraftRow {
  id: string;
  blog_id: string;
  draft_markdown: string;
  draft_confirmed: boolean;
  draft_iterations: number;
  created_at: string;
  updated_at: string;
}

function toModel(row: BlogDraftRow): BlogDraft {
  return {
    id: row.id,
    blogId: row.blog_id,
    draftMarkdown: row.draft_markdown,
    draftConfirmed: row.draft_confirmed,
    draftIterations: row.draft_iterations,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function getDraftByBlogId(blogId: string): Promise<BlogDraft | null> {
  const { data, error } = await getSupabase()
    .from('blog_drafts')
    .select()
    .eq('blog_id', blogId)
    .single<BlogDraftRow>();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(error.message);
  return toModel(data);
}

export async function upsertDraft(
  blogId: string,
  draftMarkdown: string,
  currentIterations: number,
): Promise<BlogDraft> {
  const { data, error } = await getSupabase()
    .from('blog_drafts')
    .upsert(
      {
        blog_id: blogId,
        draft_markdown: draftMarkdown,
        draft_iterations: currentIterations + 1,
        draft_confirmed: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'blog_id' },
    )
    .select()
    .single<BlogDraftRow>();

  if (error) throw new Error(error.message);
  console.log(`[draft-repository] saved draft for blogId=${blogId}`);
  return toModel(data);
}

export async function confirmDraft(blogId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('blog_drafts')
    .update({ draft_confirmed: true, updated_at: new Date().toISOString() })
    .eq('blog_id', blogId);

  if (error) throw new Error(error.message);
}

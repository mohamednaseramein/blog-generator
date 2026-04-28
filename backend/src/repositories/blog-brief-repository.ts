import { getSupabase } from '../db/supabase.js';
import type { BlogBrief, BlogIntent, ScrapeStatus, SubmitBriefInput } from '../domain/types.js';

const DEFAULT_AUTHOR_ROLE = 'Subject matter expert';
const DEFAULT_INTENT: BlogIntent = 'thought_leadership';
const DEFAULT_VOICE_NOTE = '';

interface BlogBriefRow {
  id: string;
  blog_id: string;
  title: string;
  primary_keyword: string;
  audience_persona: string;
  tone_of_voice: string;
  word_count_min: number;
  word_count_max: number;
  blog_brief: string;
  reference_url: string | null;
  scraped_content: string | null;
  scrape_status: string;
  author_role: string;
  intent: string;
  voice_note: string;
  profile_id: string | null;
  alignment_summary: string | null;
  alignment_confirmed: boolean;
  alignment_iterations: number;
  created_at: string;
  updated_at: string;
}

function toModel(row: BlogBriefRow): BlogBrief {
  return {
    id: row.id,
    blogId: row.blog_id,
    title: row.title,
    primaryKeyword: row.primary_keyword,
    audiencePersona: row.audience_persona,
    toneOfVoice: row.tone_of_voice,
    wordCountMin: row.word_count_min,
    wordCountMax: row.word_count_max,
    blogBrief: row.blog_brief,
    referenceUrl: row.reference_url,
    scrapedContent: row.scraped_content,
    scrapeStatus: row.scrape_status as ScrapeStatus,
    authorRole: row.author_role,
    intent: row.intent as BlogIntent,
    voiceNote: row.voice_note,
    profileId: row.profile_id,
    alignmentSummary: row.alignment_summary,
    alignmentConfirmed: row.alignment_confirmed,
    alignmentIterations: row.alignment_iterations,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function upsertBrief(
  blogId: string,
  input: SubmitBriefInput,
  scrapeStatus: ScrapeStatus,
): Promise<BlogBrief> {
  // Re-saving the brief must not clear AI alignment (some upsert paths only write listed columns; merge explicitly to be safe).
  const existing = await getBriefByBlogId(blogId);

  const authorRole =
    input.authorRole !== undefined && input.authorRole !== ''
      ? input.authorRole
      : (existing?.authorRole ?? DEFAULT_AUTHOR_ROLE);
  const intent: BlogIntent =
    input.intent !== undefined ? input.intent : (existing?.intent ?? DEFAULT_INTENT);
  const voiceNote =
    input.voiceNote !== undefined ? input.voiceNote : (existing?.voiceNote ?? DEFAULT_VOICE_NOTE);
  const profileId =
    input.profileId !== undefined ? input.profileId : (existing?.profileId ?? null);

  const row: Record<string, unknown> = {
    blog_id: blogId,
    title: input.title,
    primary_keyword: input.primaryKeyword,
    audience_persona: input.audiencePersona,
    tone_of_voice: input.toneOfVoice,
    word_count_min: input.wordCountMin,
    word_count_max: input.wordCountMax,
    blog_brief: input.blogBrief,
    reference_url: input.referenceUrl ?? null,
    scrape_status: scrapeStatus,
    author_role: authorRole,
    intent,
    voice_note: voiceNote,
    profile_id: profileId,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    row['alignment_summary'] = existing.alignmentSummary;
    row['alignment_confirmed'] = existing.alignmentConfirmed;
    row['alignment_iterations'] = existing.alignmentIterations;
  }

  const { data, error } = await getSupabase()
    .from('blog_briefs')
    .upsert(row, { onConflict: 'blog_id' })
    .select()
    .single<BlogBriefRow>();

  if (error) {
    if (error.message.includes('varying(255)')) {
      throw new Error(
        `${error.message} — The database is missing migration migrate-007 (primary_keyword should be TEXT). ` +
          `Run: npm run db:migrate --workspace=backend (requires SUPABASE_DB_URL). ` +
          'Docker: backend CMD runs migrate.js on start; rebuild image if migrations/ are old.',
      );
    }
    throw new Error(error.message);
  }
  return toModel(data);
}

export async function getBriefByBlogId(blogId: string): Promise<BlogBrief | null> {
  const { data, error } = await getSupabase()
    .from('blog_briefs')
    .select()
    .eq('blog_id', blogId)
    .single<BlogBriefRow>();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(error.message);
  return toModel(data);
}

export async function updateScrapeResult(
  blogId: string,
  status: ScrapeStatus,
  content: string | null,
): Promise<void> {
  const { error } = await getSupabase()
    .from('blog_briefs')
    .update({ scrape_status: status, scraped_content: content, updated_at: new Date().toISOString() })
    .eq('blog_id', blogId);

  if (error) throw new Error(error.message);
}

export async function updateAlignmentSummary(
  blogId: string,
  summary: string,
): Promise<void> {
  const { data, error: fetchError } = await getSupabase()
    .from('blog_briefs')
    .select('alignment_iterations')
    .eq('blog_id', blogId)
    .single<Pick<BlogBriefRow, 'alignment_iterations'>>();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await getSupabase()
    .from('blog_briefs')
    .update({
      alignment_summary: summary,
      alignment_iterations: (data?.alignment_iterations ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('blog_id', blogId);

  if (error) throw new Error(error.message);
}

export async function confirmAlignment(
  blogId: string,
  summary: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from('blog_briefs')
    .update({
      alignment_summary: summary,
      alignment_confirmed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('blog_id', blogId);

  if (error) throw new Error(error.message);
}

export async function getScrapeStatus(
  blogId: string,
): Promise<{ scrapeStatus: ScrapeStatus; scrapedContentLength: number } | null> {
  const { data, error } = await getSupabase()
    .from('blog_briefs')
    .select('scrape_status, scraped_content')
    .eq('blog_id', blogId)
    .single<Pick<BlogBriefRow, 'scrape_status' | 'scraped_content'>>();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(error.message);
  return {
    scrapeStatus: data.scrape_status as ScrapeStatus,
    scrapedContentLength: data.scraped_content?.length ?? 0,
  };
}

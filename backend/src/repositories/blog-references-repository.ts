import { getSupabase } from '../db/supabase.js';
import type { BlogReference, ReferenceScrapeStatus, ReferenceExtractionStatus } from '../domain/types.js';

interface BlogReferenceRow {
  id: string;
  blog_id: string;
  url: string;
  position: number;
  scrape_status: string;
  scrape_error: string | null;
  scraped_content: string | null;
  extraction_status: string;
  extraction_json: string | null;
  created_at: string;
  updated_at: string;
}

function toModel(row: BlogReferenceRow): BlogReference {
  return {
    id: row.id,
    blogId: row.blog_id,
    url: row.url,
    position: row.position,
    scrapeStatus: row.scrape_status as ReferenceScrapeStatus,
    scrapeError: row.scrape_error,
    scrapedContent: row.scraped_content,
    extractionStatus: row.extraction_status as ReferenceExtractionStatus,
    extractionJson: row.extraction_json,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function countReferencesByBlogId(blogId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('blog_references')
    .select('id', { count: 'exact', head: true })
    .eq('blog_id', blogId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function insertReference(
  blogId: string,
  url: string,
  position: number,
): Promise<BlogReference> {
  const { data, error } = await getSupabase()
    .from('blog_references')
    .insert({ blog_id: blogId, url, position, scrape_status: 'pending', extraction_status: 'pending' })
    .select()
    .single<BlogReferenceRow>();

  if (error) throw new Error(error.message);
  console.log(`[references-repository] saved reference for blogId=${blogId}`);
  return toModel(data);
}

export async function getReferencesByBlogId(blogId: string): Promise<BlogReference[]> {
  const { data, error } = await getSupabase()
    .from('blog_references')
    .select()
    .eq('blog_id', blogId)
    .order('position', { ascending: true })
    .returns<BlogReferenceRow[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map(toModel);
}

export async function getReferenceById(id: string): Promise<BlogReference | null> {
  const { data, error } = await getSupabase()
    .from('blog_references')
    .select()
    .eq('id', id)
    .single<BlogReferenceRow>();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(error.message);
  return toModel(data);
}

export async function deleteReference(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('blog_references')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function updateReferenceScrapeResult(
  id: string,
  status: ReferenceScrapeStatus,
  content: string | null,
  scrapeError: string | null,
): Promise<void> {
  const { error } = await getSupabase()
    .from('blog_references')
    .update({
      scrape_status: status,
      scraped_content: content,
      scrape_error: scrapeError,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function updateReferenceExtraction(
  id: string,
  status: ReferenceExtractionStatus,
  extractionJson: string | null,
): Promise<void> {
  const { error } = await getSupabase()
    .from('blog_references')
    .update({
      extraction_status: status,
      extraction_json: extractionJson,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function getSuccessfullyScrapeReferences(blogId: string): Promise<BlogReference[]> {
  const { data, error } = await getSupabase()
    .from('blog_references')
    .select()
    .eq('blog_id', blogId)
    .eq('scrape_status', 'success')
    .order('position', { ascending: true })
    .returns<BlogReferenceRow[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map(toModel);
}

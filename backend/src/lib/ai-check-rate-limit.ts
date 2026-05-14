const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 30;

const hits = new Map<string, number[]>();

export function allowAiCheckForBlog(blogId: string): boolean {
  const now = Date.now();
  const arr = hits.get(blogId) ?? [];
  const fresh = arr.filter((t) => now - t < WINDOW_MS);
  if (fresh.length >= MAX_PER_WINDOW) {
    hits.set(blogId, fresh);
    return false;
  }
  fresh.push(now);
  hits.set(blogId, fresh);
  return true;
}

import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

/**
 * npm workspace runs scripts with cwd = backend/, but .env usually lives at
 * blog-generator/.env (repo root). Default `dotenv/config` only reads cwd/.env
 * and misses SUPABASE_DB_URL etc.
 */
export function loadBlogGeneratorEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const backendRoot = resolve(here, '../..');
  const repoRoot = resolve(backendRoot, '..');
  config({ path: resolve(repoRoot, '.env') });
  config({ path: resolve(backendRoot, '.env') });
}

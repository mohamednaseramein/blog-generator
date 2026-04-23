import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

export function loadBlogGeneratorEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const backendRoot = resolve(here, '../..');
  config({ path: resolve(backendRoot, '.env') });
}

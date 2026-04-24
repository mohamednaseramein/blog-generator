import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
) as { version: string };

/**
 * `APP_VERSION` env overrides package.json (e.g. ad-hoc containers).
 */
export function getAppVersion(): string {
  return process.env['APP_VERSION'] ?? pkg.version;
}

/**
 * Injected at image build; optional in local dev.
 */
export function getGitSha(): string | null {
  const s = (process.env['GIT_SHA'] ?? process.env['APP_GIT_SHA'] ?? '').trim();
  return s.length > 0 ? s : null;
}

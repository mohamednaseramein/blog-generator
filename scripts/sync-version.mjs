/**
 * Copy `version` from the repo root `package.json` into `backend` and
 * `frontend` workspace packages. Run after changing the root version
 * (`npm version patch` / manual edit) so all artifacts stay aligned.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const v = rootPkg.version;
if (typeof v !== 'string' || !/^\d+\.\d+\.\d+/.test(v)) {
  throw new Error(`Root package.json needs a semver "version" (got ${String(v)})`);
}

for (const ws of ['backend', 'frontend']) {
  const p = join(root, ws, 'package.json');
  const j = JSON.parse(readFileSync(p, 'utf-8'));
  j.version = v;
  writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
}

process.stdout.write(`Synced version ${v} to backend/ and frontend/ package.json\n`);

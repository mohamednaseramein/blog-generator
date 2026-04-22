/**
 * Runs all pending SQL migration files in backend/src/db/migrations/ in order.
 * Connects via SUPABASE_DB_URL (direct PostgreSQL connection — not the REST API).
 *
 * Usage: npm run db:migrate --workspace=backend
 *
 * Get SUPABASE_DB_URL from:
 *   Supabase Dashboard → Settings → Database → Connection string → URI
 *   Format: postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
 */
import { readFileSync, readdirSync } from 'fs';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadBlogGeneratorEnv } from './load-env.js';

loadBlogGeneratorEnv();

const { Client } = pg;

const dbUrl = process.env['SUPABASE_DB_URL'];

if (!dbUrl) {
  console.error('❌  SUPABASE_DB_URL is not set in .env');
  console.error('    Get it from: Supabase Dashboard → Settings → Database → Connection string → URI');
  console.error('    Format: postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres');
  process.exit(1);
}

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('🔌  Connected to Supabase (direct PostgreSQL)');
} catch (err) {
  console.error('❌  Connection failed:', (err as Error).message);
  console.error('    Check SUPABASE_DB_URL in .env');
  process.exit(1);
}

// Ensure migrations tracking table exists
await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id         SERIAL PRIMARY KEY,
    filename   TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);

// Get already-applied migrations
const { rows: applied } = await client.query<{ filename: string }>(
  'SELECT filename FROM schema_migrations ORDER BY filename',
);
const appliedSet = new Set(applied.map((r) => r.filename));

// Read migration files sorted by name
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, 'migrations');

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('No migration files found.');
  await client.end();
  process.exit(0);
}

let ran = 0;

for (const file of files) {
  if (appliedSet.has(file)) {
    console.log(`  ⏭️   ${file} — already applied`);
    continue;
  }

  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  console.log(`  ▶️   Applying ${file}…`);

  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    console.log(`  ✅  ${file} — applied`);
    ran++;
  } catch (err) {
    console.error(`  ❌  ${file} failed:`, (err as Error).message);
    await client.end();
    process.exit(1);
  }
}

await client.end();

if (ran === 0) {
  console.log('\n✅  All migrations already applied. Database is up to date.');
} else {
  console.log(`\n✅  ${ran} migration(s) applied. Run db:setup to verify.`);
}

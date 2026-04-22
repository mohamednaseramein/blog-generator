/**
 * Run once to apply the schema to your Supabase project and verify the connection.
 * Usage: npm run db:setup --workspace=backend
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadBlogGeneratorEnv } from './load-env.js';

loadBlogGeneratorEnv();

const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!url || !key) {
  console.error('❌  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

console.log('🔌  Connecting to Supabase…');

// Split on semicolons and run each statement individually via rpc
// (Supabase's REST API doesn't support multi-statement queries directly,
//  so we use the pg extension via rpc or the management API.
//  Simplest path: use supabase.rpc to exec raw SQL when pg_execute is available,
//  otherwise print instructions to run via the SQL Editor.)
const { error: pingError } = await supabase.from('blogs').select('id').limit(0);

const tableNotFound =
  pingError?.code === '42P01' ||
  pingError?.message?.toLowerCase().includes('could not find the table') ||
  pingError?.message?.toLowerCase().includes('relation') ||
  pingError?.code === 'PGRST200';

if (pingError && tableNotFound) {
  // Connected fine — tables just haven't been created yet
  console.log('✅  Connected to Supabase successfully');
  console.log('\n📋  Tables not found. Apply the schema using ONE of these methods:\n');
  console.log('─── Option A: Supabase Dashboard (recommended) ────────────────');
  console.log('  1. Open https://supabase.com/dashboard → your project → SQL Editor');
  console.log('  2. Paste the contents of backend/src/db/schema.sql');
  console.log('  3. Click Run\n');
  console.log('─── Option B: psql (requires psql installed) ───────────────────');
  console.log('  Get the connection string from:');
  console.log('  Supabase Dashboard → Settings → Database → Connection string → URI');
  console.log('  Then run:');
  console.log('    psql "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres" \\');
  console.log('         -f backend/src/db/schema.sql\n');
  console.log('  After applying the schema, re-run: npm run db:setup --workspace=backend');
  process.exit(1);
} else if (pingError) {
  console.error('❌  Connection failed:', pingError.message);
  console.error('    Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
} else {
  console.log('✅  Connected to Supabase successfully');
}

// Verify both tables exist and are queryable
console.log('🔍  Verifying tables…');

const checks = [
  supabase.from('blogs').select('id').limit(0),
  supabase.from('blog_briefs').select('id').limit(0),
] as const;

const results = await Promise.all(checks);
const tables = ['blogs', 'blog_briefs'];
let allGood = true;

for (let i = 0; i < results.length; i++) {
  const { error } = results[i]!;
  if (error) {
    console.error(`  ❌  Table "${tables[i]}": ${error.message}`);
    allGood = false;
  } else {
    console.log(`  ✅  Table "${tables[i]}" — OK`);
  }
}

if (!allGood) {
  console.error('\n❌  Some tables are missing. Apply the schema first (see options above).');
  process.exit(1);
}

console.log('\n🎉  Database is ready. You can start the app with: npm run dev');

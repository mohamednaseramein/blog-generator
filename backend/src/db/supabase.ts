import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

let _client: SupabaseClient | null = null;

// Service role client — bypasses RLS. Auth checks happen at the handler level.
// Lazy-initialized so tests that mock repositories don't require real env vars.
export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

import { createClient } from '@supabase/supabase-js';
const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
/** True when real project URL + anon key were baked in at build time (not placeholders). */
export const isSupabaseConfigured = Boolean(rawUrl && rawKey);
// createClient('', '') throws ("supabaseUrl is required") and prevents the app from mounting at all.
const fallbackUrl = 'http://127.0.0.1:54321';
const fallbackAnonKey = '00000000000000000000000000000000';
const supabaseUrl = rawUrl || fallbackUrl;
const supabaseAnonKey = rawKey || fallbackAnonKey;
if (!isSupabaseConfigured) {
    console.warn('[blog-generator] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — using local placeholders so the UI can load. Rebuild the frontend image with real Supabase build args for auth to work.');
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

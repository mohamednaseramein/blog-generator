import { supabase } from './supabase.js';
/** fetch() with Supabase access token when a session exists (Express API uses requireAuth). */
export async function authedFetch(url, options = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    const token = session?.access_token;
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...options, headers });
}

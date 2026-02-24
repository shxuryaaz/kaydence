import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

/** Returns the Supabase client (singleton). Use in API routes and server code. */
export function createClient() {
  return supabase;
}

/**
 * Server-only client that bypasses RLS. Use in API routes when you need to
 * update data regardless of RLS (e.g. saving Slack OAuth tokens).
 * Requires SUPABASE_SERVICE_ROLE_KEY in env (never expose to client).
 */
export function createServerClient(): SupabaseClient | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey || !supabaseUrl) return null;
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

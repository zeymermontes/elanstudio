/**
 * Supabase environment helpers. The app is designed to run BEFORE Supabase is
 * configured: when these env vars are missing, the data layer transparently
 * falls back to the seed dataset so every page still renders.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

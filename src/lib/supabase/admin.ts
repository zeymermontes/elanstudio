import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Service-role Supabase client — bypasses RLS. SERVER ONLY.
 * Used by the Mercado Pago webhook and checkout to write purchases and credit
 * ledger entries. Never import this into client code. Returns null if the
 * service key is not configured.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

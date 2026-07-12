"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Fallback for password-recovery links.
 *
 * The on-brand Reset Password email links to /auth/confirm, which verifies the
 * token server-side and lands the user on /restablecer. But if Supabase is
 * still using its DEFAULT template ({{ .ConfirmationURL }}), the recovery link
 * instead redirects to the Site URL (the home screen) with the tokens in the
 * URL hash — leaving the user on the home page with no way to set a password.
 *
 * This handler runs on every page but does nothing unless it detects a recovery
 * hash. When it does, instantiating the browser client consumes the tokens (via
 * detectSessionInUrl), and once the recovery session is established we send the
 * user to /restablecer to choose a new password.
 */
export function RecoveryHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only act on a recovery link that landed here with tokens in the hash.
    if (!window.location.hash.includes("type=recovery")) return;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange((event) => {
      // PASSWORD_RECOVERY (or SIGNED_IN) fires once the hash session is set.
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        router.replace("/restablecer");
      }
    });

    return () => data.subscription.unsubscribe();
  }, [router]);

  return null;
}

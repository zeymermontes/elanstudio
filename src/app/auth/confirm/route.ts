import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Email confirmation endpoint (signup / magic link / recovery / email change).
 * The auth email links point here with a token_hash; we verify it server-side,
 * which sets the session cookie, then redirect into the app. This is the
 * @supabase/ssr-recommended flow (the default {{ .ConfirmationURL }} does NOT
 * establish a server session).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/cuenta";

  // Behind a proxy (e.g. Render) request.url is the internal host
  // (localhost:10000). Redirect against the public site URL instead.
  const base = process.env.NEXT_PUBLIC_SITE_URL || origin;

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash });
      if (!error) {
        return NextResponse.redirect(new URL(next, base));
      }
    }
  }

  // Invalid/expired link → send to login with a friendly error flag.
  return NextResponse.redirect(new URL("/ingresar?error=confirm", base));
}

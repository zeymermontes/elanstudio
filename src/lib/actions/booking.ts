"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BookingResult = { ok: boolean; code: string };

export async function reserveAction(
  sessionId: string,
): Promise<BookingResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, code: "not_configured" };

  const { data, error } = await supabase.rpc("book_session", {
    p_session: sessionId,
  });
  if (error) return { ok: false, code: "error" };

  revalidatePath("/cuenta");
  revalidatePath("/horarios");
  return { ok: data === "ok", code: String(data) };
}

export async function cancelAction(
  sessionId: string,
): Promise<BookingResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, code: "not_configured" };

  const { data, error } = await supabase.rpc("cancel_booking", {
    p_session: sessionId,
  });
  if (error) return { ok: false, code: "error" };

  revalidatePath("/cuenta");
  revalidatePath("/horarios");
  return { ok: data === "ok", code: String(data) };
}

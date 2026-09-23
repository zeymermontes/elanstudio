"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decodeRef } from "@/lib/schedule-ref";

export type BookingResult = { ok: boolean; code: string };

export async function reserveAction(
  refStr: string,
): Promise<BookingResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, code: "not_configured" };

  const ref = decodeRef(refStr);
  if (!ref) return { ok: false, code: "error" };

  const { data, error } =
    ref.kind === "session"
      ? await supabase.rpc("book_session", { p_session: ref.sessionId })
      : await supabase.rpc("book_class", {
          p_weekly: ref.weeklyId,
          p_date: ref.date,
        });
  if (error) {
    console.error("[reserveAction]", refStr, error.code, error.message);
    return { ok: false, code: "error" };
  }

  revalidatePath("/cuenta");
  revalidatePath("/horarios");
  return { ok: data === "ok", code: String(data) };
}

/**
 * Clase muestra (0030): una clase normal sin costo para quien nunca ha
 * tenido clases. La elegibilidad la decide book_trial, no el botón.
 */
export async function reserveTrialAction(
  refStr: string,
): Promise<BookingResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, code: "not_configured" };

  const ref = decodeRef(refStr);
  if (!ref) return { ok: false, code: "error" };

  const { data, error } =
    ref.kind === "session"
      ? await supabase.rpc("book_trial", { p_session: ref.sessionId })
      : await supabase.rpc("book_trial_class", {
          p_weekly: ref.weeklyId,
          p_date: ref.date,
        });
  if (error) {
    console.error("[reserveTrialAction]", refStr, error.code, error.message);
    return { ok: false, code: "error" };
  }

  revalidatePath("/cuenta");
  revalidatePath("/horarios");
  return { ok: data === "ok", code: String(data) };
}

/**
 * Clase muestra con precio (0032): el checkout trabaja con una sesión
 * concreta, así que un hueco de la plantilla se materializa antes de ir a
 * pagar. Devuelve el id de sesión al que mandar a la alumna.
 */
export async function prepareTrialCheckoutAction(
  refStr: string,
): Promise<{ ok: true; sessionId: string } | { ok: false; code: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, code: "not_configured" };

  const ref = decodeRef(refStr);
  if (!ref) return { ok: false, code: "error" };
  if (ref.kind === "session") return { ok: true, sessionId: ref.sessionId };

  const { data, error } = await supabase.rpc("materialize_session", {
    p_weekly: ref.weeklyId,
    p_date: ref.date,
  });
  if (error || !data) {
    console.error("[prepareTrialCheckoutAction]", refStr, error?.message);
    return { ok: false, code: "closed" };
  }
  return { ok: true, sessionId: String(data) };
}

export async function cancelAction(
  sessionId: string,
): Promise<BookingResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, code: "not_configured" };

  const { data, error } = await supabase.rpc("cancel_booking", {
    p_session: sessionId,
  });
  if (error) {
    console.error("[cancelAction]", sessionId, error.code, error.message);
    return { ok: false, code: "error" };
  }

  revalidatePath("/cuenta");
  revalidatePath("/horarios");
  return { ok: data === "ok", code: String(data) };
}

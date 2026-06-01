"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { FormState } from "@/lib/actions/admin";

const NOT_CONFIGURED =
  "Backend no configurado. Agrega las credenciales de Supabase.";

/** Only an authenticated admin may run these (they use the service role). */
async function ensureAdmin() {
  const profile = await getProfile();
  return profile?.role === "admin";
}

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function num(fd: FormData, k: string) {
  return Number(fd.get(k) ?? 0);
}

const MONTH_MS = 31 * 24 * 60 * 60 * 1000;

/**
 * Adjust a member's credit balance by a signed amount (positive adds, negative
 * removes). Recorded in the ledger with reason 'manual'.
 */
export async function adjustCreditsAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  if (!(await ensureAdmin())) return { error: "No autorizado." };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: NOT_CONFIGURED };

  const userId = str(fd, "user_id");
  // "sign" is +1 or -1; "amount" is a positive number from the form.
  const amount = Math.abs(num(fd, "amount"));
  const sign = str(fd, "sign") === "remove" ? -1 : 1;
  const delta = sign * amount;
  if (!userId || !amount) return { error: "Indica una cantidad válida." };

  // Optional expiry (yyyy-mm-dd from a date input) — only when adding credits.
  const expiresStr = str(fd, "expires_at");
  const expires_at =
    sign > 0 && expiresStr
      ? new Date(`${expiresStr}T23:59:59`).toISOString()
      : null;

  const { error } = await admin.from("credit_ledger").insert({
    user_id: userId,
    delta,
    reason: "manual",
    expires_at,
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/**
 * Grant or extend a manual subscription (no Mercado Pago). Extends the active
 * period if one exists, otherwise creates an authorized subscription.
 */
export async function grantSubscriptionAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  if (!(await ensureAdmin())) return { error: "No autorizado." };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: NOT_CONFIGURED };

  const userId = str(fd, "user_id");
  const months = Math.max(1, num(fd, "months") || 1);
  if (!userId) return { error: "Usuario inválido." };

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, current_period_end")
    .eq("user_id", userId)
    .eq("status", "authorized")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  const base =
    existing?.current_period_end &&
    new Date(existing.current_period_end).getTime() > Date.now()
      ? new Date(existing.current_period_end).getTime()
      : Date.now();
  const newEnd = new Date(base + months * MONTH_MS).toISOString();

  const { error } = existing
    ? await admin
        .from("subscriptions")
        .update({ current_period_end: newEnd, status: "authorized" })
        .eq("id", existing.id)
    : await admin.from("subscriptions").insert({
        user_id: userId,
        status: "authorized",
        current_period_end: newEnd,
      });

  if (error) return { error: error.message };
  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/** Cancel a member's active manual/MP subscription. */
export async function cancelUserSubscriptionAction(
  userId: string,
): Promise<FormState> {
  if (!(await ensureAdmin())) return { error: "No autorizado." };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: NOT_CONFIGURED };

  const { error } = await admin
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .in("status", ["authorized", "paused"]);
  if (error) return { error: error.message };

  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

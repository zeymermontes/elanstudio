"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStudioUtcOffset } from "@/lib/data";
import { endOfDayUtc } from "@/lib/format";
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
      ? endOfDayUtc(expiresStr, await getStudioUtcOffset()).toISOString()
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
 * Mover el vencimiento de las clases sin usar de una alumna (vencidas o por
 * vencer). "from" es el vencimiento actual del lote, tal cual lo devuelve
 * credit_lots.
 *
 * Se mueven TODOS los asientos de la alumna con ese vencimiento, no solo el
 * abono: el -1 de cada reserva anota el vencimiento del lote que gastó, y si
 * se quedara con la fecha vieja, cancelar esa reserva devolvería un crédito
 * ya vencido. Como el saldo se calcula reproduciendo el ledger, una reserva
 * hecha después del vencimiento viejo puede pasar a cargarse a este lote en
 * vez de a otro: el total de clases no cambia.
 *
 * Deja un asiento de 0 ('extension') para que el movimiento quede a la vista.
 */
export async function extendExpiryAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  if (!(await ensureAdmin())) return { error: "No autorizado." };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: NOT_CONFIGURED };

  const userId = str(fd, "user_id");
  const from = str(fd, "from");
  const expiresStr = str(fd, "expires_at");
  if (!userId || !from) return { error: "Elige qué clases extender." };
  if (!expiresStr) return { error: "Elige la nueva fecha de vencimiento." };

  const newExpiry = endOfDayUtc(expiresStr, await getStudioUtcOffset());
  if (newExpiry.getTime() <= Date.now())
    return { error: "La nueva fecha ya pasó. Elige una de hoy en adelante." };

  // Se vuelve a leer el lote: la ficha pudo quedar abierta y la alumna haber
  // reservado mientras tanto. De paso se usa la fecha exacta de la base.
  const { data: lots, error: lotsError } = await admin.rpc("credit_lots", {
    p_user: userId,
  });
  if (lotsError) return { error: lotsError.message };
  const fromMs = new Date(from).getTime();
  const lot = ((lots ?? []) as { expires_at: string | null }[]).find(
    (l) => l.expires_at && new Date(l.expires_at).getTime() === fromMs,
  );
  if (!lot?.expires_at)
    return { error: "Esas clases ya no están disponibles para extender." };
  if (newExpiry.getTime() <= fromMs)
    return { error: "La nueva fecha debe ser posterior al vencimiento actual." };

  const { error } = await admin
    .from("credit_ledger")
    .update({ expires_at: newExpiry.toISOString() })
    .eq("user_id", userId)
    .eq("expires_at", lot.expires_at);
  if (error) return { error: error.message };

  const { error: logError } = await admin.from("credit_ledger").insert({
    user_id: userId,
    delta: 0,
    reason: "extension",
    expires_at: newExpiry.toISOString(),
  });
  if (logError) console.error("extension ledger", logError.message);

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

/**
 * Manual sale: add classes to a member by email. Allowed for staff (admin or
 * coach). Optional expiry, same as a manual credit adjustment.
 */
export async function sellAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const me = await getProfile();
  if (!me || (me.role !== "admin" && me.role !== "coach"))
    return { error: "No autorizado." };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: NOT_CONFIGURED };

  const email = str(fd, "email").toLowerCase();
  const classes = Math.abs(num(fd, "amount"));
  if (!email || !classes)
    return { error: "Indica el correo y la cantidad de clases." };

  const { data: list } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const user = (list?.users ?? []).find(
    (u) => (u.email ?? "").toLowerCase() === email,
  );
  if (!user)
    return {
      error: `No existe una cuenta con el correo ${email}. Pídele que se registre primero.`,
    };

  const expiresStr = str(fd, "expires_at");
  const expires_at = expiresStr
    ? endOfDayUtc(expiresStr, await getStudioUtcOffset()).toISOString()
    : null;

  const { error } = await admin.from("credit_ledger").insert({
    user_id: user.id,
    delta: classes,
    reason: "manual",
    expires_at,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/vender");
  return { ok: true };
}

/** Grant or revoke admin role for a member. */
export async function setRoleAction(
  userId: string,
  makeAdmin: boolean,
): Promise<FormState> {
  const me = await getProfile();
  if (!me || me.role !== "admin") return { error: "No autorizado." };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: NOT_CONFIGURED };

  // Protections when revoking admin access.
  if (!makeAdmin) {
    if (userId === me.id) {
      return {
        error: "No puedes quitarte el acceso de administrador a ti misma.",
      };
    }
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return { error: "Debe haber al menos un administrador." };
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ role: makeAdmin ? "admin" : "member" })
    .eq("id", userId);
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

/**
 * Cancelar la reserva de una alumna desde el panel, sin la ventana de 12 h
 * que aplica cuando cancela ella. Devuelve lo que gastó (admin_cancel_booking,
 * 0029): las clases con su vencimiento, o nada si pagó el lugar aparte.
 */
export async function adminCancelBookingAction(
  sessionId: string,
  userId: string,
): Promise<FormState> {
  if (!(await ensureAdmin())) return { error: "No autorizado." };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: NOT_CONFIGURED };

  const { data, error } = await admin.rpc("admin_cancel_booking", {
    p_user: userId,
    p_session: sessionId,
  });
  if (error) return { error: error.message };
  if (data !== "ok") return { error: "Esa reserva ya no está activa." };

  revalidatePath(`/admin/horario/${sessionId}`);
  revalidatePath("/admin/horario");
  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/horarios");
  revalidatePath("/cuenta");
  revalidatePath("/");
  return { ok: true };
}

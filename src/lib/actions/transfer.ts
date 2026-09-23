"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolvePromotion } from "@/lib/promotions";
import { resolveStock } from "@/lib/stock";
import { RECEIPTS_BUCKET } from "@/lib/receipts";
import {
  loadPayableEvent,
  bookPaidSeat,
  PAYABLE_EVENT_MESSAGES,
} from "@/lib/event-checkout";
import type { Package } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TransferResult = {
  ok: boolean;
  error?: string;
  /** Para el evento Purchase del pixel. */
  purchaseId?: string;
  amountMxn?: number;
};

/**
 * Asiento negativo con el que se retiran las clases de una transferencia
 * rechazada. Va con ref_id = compra, así volver a aprobarla es borrar este
 * asiento y el de 'purchase' original queda intacto (índice único de 0002).
 */
const REVERSAL_REASON = "transfer_rejected";

const NOT_CONFIGURED = "Backend no configurado.";

/**
 * La alumna ya transfirió y subió su comprobante: registrar la compra y
 * acreditar las clases al momento. Confiamos en ella; el admin revisa después
 * en Pagos y puede rechazarla (reviewTransferAction), que es lo que retira las
 * clases si la transferencia nunca llegó.
 *
 * Como /api/mp/process, el precio se recalcula aquí — el navegador solo manda
 * el paquete, la ruta del comprobante y, si acaso, un código.
 */
export async function submitTransferAction(input: {
  packageId: string;
  receiptPath: string;
  promoCode?: string | null;
}): Promise<TransferResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Inicia sesión para continuar." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: NOT_CONFIGURED };

  const { data: settings } = await admin
    .from("site_settings")
    .select("transfer_enabled")
    .eq("id", 1)
    .maybeSingle();
  if (!settings?.transfer_enabled) {
    return { ok: false, error: "El pago por transferencia no está disponible." };
  }

  const receipt = await checkReceipt(admin, user.id, input.receiptPath);
  if (!receipt.ok) return receipt;
  const receiptPath = receipt.path;

  const { data: pkg } = await admin
    .from("packages")
    .select(
      "id, name, price_mxn, credits, recurring, validity_days, stock_limit, show_stock_left",
    )
    .eq("id", input.packageId)
    .eq("active", true)
    .single();
  if (!pkg || pkg.recurring) {
    return { ok: false, error: "Ese paquete ya no está disponible." };
  }

  const listPrice = Number(pkg.price_mxn);
  const domainPkg: Package = {
    id: pkg.id,
    name: pkg.name,
    description: "",
    credits: pkg.credits,
    priceMxn: listPrice,
    validityDays: pkg.validity_days ?? 30,
    featured: false,
    active: true,
    recurring: false,
    stockLimit: pkg.stock_limit ?? null,
    showStockLeft: Boolean(pkg.show_stock_left),
  };

  const stock = await resolveStock(admin, domainPkg);
  if (stock?.soldOut) {
    return {
      ok: false,
      error:
        "Este paquete tenía lugares limitados y acaba de agotarse. Escríbenos y lo resolvemos.",
    };
  }

  const applied = await resolvePromotion(admin, {
    pkg: domainPkg,
    userId: user.id,
    code: input.promoCode ?? null,
  });
  const chargeMxn = applied?.finalMxn ?? listPrice;

  const expiresAt = pkg.validity_days
    ? new Date(Date.now() + pkg.validity_days * 86400000).toISOString()
    : null;

  const { data: purchase, error: insertError } = await admin
    .from("purchases")
    .insert({
      user_id: user.id,
      package_id: pkg.id,
      amount_mxn: chargeMxn,
      credits: pkg.credits,
      status: "approved",
      method: "transfer",
      receipt_path: receiptPath,
      promotion_id: applied?.promotion.id ?? null,
      discount_mxn: applied?.discountMxn ?? 0,
    })
    .select("id")
    .single();
  if (!purchase) {
    console.error("[transfer] purchase insert failed", insertError?.message);
    return { ok: false, error: "No se pudo registrar tu pago. Intenta de nuevo." };
  }

  const { error: creditError } = await admin.from("credit_ledger").insert({
    user_id: user.id,
    delta: pkg.credits,
    reason: "purchase",
    ref_id: purchase.id,
    expires_at: expiresAt,
  });
  if (creditError) {
    // Sin clases no hay compra: mejor que vuelva a intentarlo a que quede una
    // fila aprobada sin acreditar.
    console.error("[transfer] credit failed", purchase.id, creditError.message);
    await admin.from("purchases").delete().eq("id", purchase.id);
    return { ok: false, error: "No se pudo registrar tu pago. Intenta de nuevo." };
  }

  revalidatePath("/cuenta");
  revalidatePath("/admin", "layout"); // el contador del menú
  return { ok: true, purchaseId: purchase.id, amountMxn: chargeMxn };
}

/**
 * El comprobante debe ser de esta alumna y existir de verdad: la política
 * del bucket solo la deja subir a su carpeta, y la URL firmada falla si el
 * archivo no está.
 */
async function checkReceipt(
  admin: SupabaseClient,
  userId: string,
  rawPath: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const path = rawPath.trim();
  if (!path.startsWith(`${userId}/`)) {
    return { ok: false, error: "Vuelve a subir tu comprobante." };
  }
  const { error } = await admin.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(path, 60);
  if (error) {
    return { ok: false, error: "No encontramos tu comprobante. Súbelo de nuevo." };
  }
  return { ok: true, path };
}

/**
 * Transferencia por el lugar de una clase especial (0027). Como con un
 * paquete, confiamos en la alumna: el lugar se reserva al momento y el admin
 * revisa después. Rechazarla cancela la reserva (reviewTransferAction).
 */
export async function submitEventTransferAction(input: {
  sessionId: string;
  receiptPath: string;
}): Promise<TransferResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Inicia sesión para continuar." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: NOT_CONFIGURED };

  const { data: settings } = await admin
    .from("site_settings")
    .select("transfer_enabled")
    .eq("id", 1)
    .maybeSingle();
  if (!settings?.transfer_enabled) {
    return { ok: false, error: "El pago por transferencia no está disponible." };
  }

  const receipt = await checkReceipt(admin, user.id, input.receiptPath);
  if (!receipt.ok) return receipt;

  const loaded = await loadPayableEvent(admin, input.sessionId, user.id);
  if (!loaded.ok) return { ok: false, error: PAYABLE_EVENT_MESSAGES[loaded.code] };
  const event = loaded.event;

  const { data: purchase, error: insertError } = await admin
    .from("purchases")
    .insert({
      user_id: user.id,
      package_id: null,
      session_id: event.id,
      amount_mxn: event.pricing.priceMxn,
      credits: 0,
      status: "approved",
      method: "transfer",
      receipt_path: receipt.path,
    })
    .select("id")
    .single();
  if (!purchase) {
    console.error("[transfer] event purchase insert failed", insertError?.message);
    return { ok: false, error: "No se pudo registrar tu pago. Intenta de nuevo." };
  }

  if (!(await bookPaidSeat(admin, user.id, event.id))) {
    await admin.from("purchases").delete().eq("id", purchase.id);
    return { ok: false, error: "No se pudo reservar tu lugar. Intenta de nuevo." };
  }

  revalidatePath("/cuenta");
  revalidatePath("/horarios");
  revalidatePath("/admin", "layout"); // el contador del menú
  return { ok: true, purchaseId: purchase.id, amountMxn: event.pricing.priceMxn };
}

export type TransferDecision = "approve" | "reject";

/**
 * El admin revisa una transferencia. Sirve tanto para la primera revisión
 * como para corregirla después: aprobar una rechazada devuelve las clases,
 * rechazar una aprobada las retira. Ambas son idempotentes.
 */
export async function reviewTransferAction(
  purchaseId: string,
  decision: TransferDecision,
): Promise<TransferResult> {
  const me = await getProfile();
  if (!me || me.role !== "admin") return { ok: false, error: "No autorizado." };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: NOT_CONFIGURED };

  const { data: purchase } = await admin
    .from("purchases")
    .select("id, user_id, credits, status, method, session_id, packages(validity_days)")
    .eq("id", purchaseId)
    .eq("method", "transfer")
    .maybeSingle();
  if (!purchase) return { ok: false, error: "No encontramos esa transferencia." };

  if (purchase.session_id) {
    // Lugar en una clase especial (0027): no hay clases que retirar o
    // devolver, es la reserva la que se cancela o se recupera. Sin
    // devolución de créditos al cancelar — nunca se gastaron.
    if (decision === "reject") {
      const { error } = await admin
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("user_id", purchase.user_id)
        .eq("session_id", purchase.session_id)
        .eq("status", "confirmed");
      if (error) return { ok: false, error: error.message };
    } else if (!(await bookPaidSeat(admin, purchase.user_id, purchase.session_id))) {
      return {
        ok: false,
        error: "La clase ya no está programada; no se pudo recuperar el lugar.",
      };
    }
    revalidatePath("/horarios");
  } else if (decision === "reject") {
    // Un solo asiento de retiro por compra, aunque se pulse dos veces.
    const { count } = await admin
      .from("credit_ledger")
      .select("id", { count: "exact", head: true })
      .eq("ref_id", purchase.id)
      .eq("reason", REVERSAL_REASON);
    if ((count ?? 0) === 0) {
      const { error } = await admin.from("credit_ledger").insert({
        user_id: purchase.user_id,
        delta: -purchase.credits,
        reason: REVERSAL_REASON,
        ref_id: purchase.id,
      });
      if (error) return { ok: false, error: error.message };
    }
  } else {
    const { error: delError } = await admin
      .from("credit_ledger")
      .delete()
      .eq("ref_id", purchase.id)
      .eq("reason", REVERSAL_REASON);
    if (delError) return { ok: false, error: delError.message };

    // Por si la compra nunca llegó a acreditarse (no debería, pero es barato
    // cubrirlo). 23505 = ya existía, que es lo normal.
    const pkgRel = purchase.packages as
      | { validity_days: number | null }
      | { validity_days: number | null }[]
      | null;
    const validity = Array.isArray(pkgRel)
      ? pkgRel[0]?.validity_days
      : pkgRel?.validity_days;
    const { error: creditError } = await admin.from("credit_ledger").insert({
      user_id: purchase.user_id,
      delta: purchase.credits,
      reason: "purchase",
      ref_id: purchase.id,
      expires_at: validity
        ? new Date(Date.now() + validity * 86400000).toISOString()
        : null,
    });
    if (creditError && creditError.code !== "23505") {
      return { ok: false, error: creditError.message };
    }
  }

  const { error } = await admin
    .from("purchases")
    .update({
      status: decision === "approve" ? "approved" : "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: me.id,
    })
    .eq("id", purchase.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/pagos");
  revalidatePath(`/admin/usuarios/${purchase.user_id}`);
  revalidatePath("/cuenta");
  return { ok: true };
}

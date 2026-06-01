"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isMercadoPagoConfigured,
  MP_ACCESS_TOKEN,
  siteUrl,
} from "@/lib/mercadopago";

export type SubResult = { url?: string; error?: string };
export type CancelResult = { ok: boolean; error?: string };

/**
 * Starts a monthly subscription via Mercado Pago "preapproval". Creates a
 * pending subscription row and a preapproval, then returns the hosted
 * authorization URL (init_point). After the user authorizes once, MP charges
 * monthly and notifies our webhook, which activates the subscription.
 */
export async function startSubscriptionAction(
  packageId: string,
): Promise<SubResult> {
  const user = await getCurrentUser();
  if (!user?.email) return { error: "auth" };

  const admin = createSupabaseAdminClient();
  if (!admin || !isMercadoPagoConfigured()) {
    return { error: "not_configured" };
  }

  const { data: pkg } = await admin
    .from("packages")
    .select("id, name, price_mxn, recurring")
    .eq("id", packageId)
    .eq("active", true)
    .single();
  if (!pkg || !pkg.recurring) return { error: "not_found" };

  const { data: sub } = await admin
    .from("subscriptions")
    .insert({ user_id: user.id, package_id: pkg.id, status: "pending" })
    .select("id")
    .single();
  if (!sub) return { error: "error" };

  const base = siteUrl();
  try {
    const res = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: `${pkg.name} · ÉLANSTUDIO`,
        external_reference: sub.id,
        payer_email: user.email,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: Number(pkg.price_mxn),
          currency_id: "MXN",
        },
        back_url: `${base}/cuenta?suscripcion=ok`,
        status: "pending",
      }),
    });

    if (!res.ok) {
      await admin
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("id", sub.id);
      return { error: "error" };
    }

    const data = (await res.json()) as { id?: string; init_point?: string };
    if (data.id) {
      await admin
        .from("subscriptions")
        .update({ mp_preapproval_id: data.id })
        .eq("id", sub.id);
    }
    if (!data.init_point) return { error: "error" };
    return { url: data.init_point };
  } catch {
    await admin
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", sub.id);
    return { error: "error" };
  }
}

/**
 * Cancels the user's active subscription: tells Mercado Pago to cancel the
 * preapproval (stops future charges) and marks it cancelled locally. The user
 * keeps unlimited access until the current period ends.
 */
export async function cancelSubscriptionAction(): Promise<CancelResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };

  const admin = createSupabaseAdminClient();
  if (!admin || !isMercadoPagoConfigured()) {
    return { ok: false, error: "not_configured" };
  }

  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, mp_preapproval_id")
    .eq("user_id", user.id)
    .in("status", ["authorized", "paused"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return { ok: false, error: "not_found" };

  if (sub.mp_preapproval_id) {
    const res = await fetch(
      `https://api.mercadopago.com/preapproval/${sub.mp_preapproval_id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      },
    );
    if (!res.ok) return { ok: false, error: "error" };
  }

  await admin
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", sub.id);

  revalidatePath("/cuenta");
  return { ok: true };
}

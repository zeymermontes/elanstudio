"use server";

import { Preference } from "mercadopago";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mpClient, siteUrl, isMercadoPagoConfigured } from "@/lib/mercadopago";

export type CheckoutResult = { url?: string; error?: string };

export async function startCheckoutAction(
  packageId: string,
): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "auth" };

  const admin = createSupabaseAdminClient();
  const client = mpClient();
  if (!admin || !client || !isMercadoPagoConfigured()) {
    return { error: "not_configured" };
  }

  // Load the package server-side (never trust client-sent price).
  const { data: pkg } = await admin
    .from("packages")
    .select("id, name, price_mxn, credits")
    .eq("id", packageId)
    .eq("active", true)
    .single();
  if (!pkg) return { error: "not_found" };

  // Create a pending purchase to reference from the payment.
  const { data: purchase, error: insErr } = await admin
    .from("purchases")
    .insert({
      user_id: user.id,
      package_id: pkg.id,
      amount_mxn: pkg.price_mxn,
      credits: pkg.credits,
      status: "pending",
    })
    .select("id")
    .single();
  if (insErr || !purchase) return { error: "error" };

  const base = siteUrl();
  try {
    const pref = await new Preference(client).create({
      body: {
        items: [
          {
            id: pkg.id,
            title: `${pkg.name} · ÉLANSTUDIO`,
            quantity: 1,
            unit_price: Number(pkg.price_mxn),
            currency_id: "MXN",
          },
        ],
        external_reference: purchase.id,
        back_urls: {
          success: `${base}/cuenta?pago=ok`,
          failure: `${base}/cuenta?pago=error`,
          pending: `${base}/cuenta?pago=pendiente`,
        },
        auto_return: "approved",
        notification_url: `${base}/api/mp/webhook`,
        metadata: { purchase_id: purchase.id, user_id: user.id },
      },
    });

    const url = pref.init_point ?? pref.sandbox_init_point;
    if (!url) return { error: "error" };
    // Persist the preference id for traceability.
    await admin
      .from("purchases")
      .update({ mp_preference_id: pref.id })
      .eq("id", purchase.id);

    return { url };
  } catch {
    await admin
      .from("purchases")
      .update({ status: "rejected" })
      .eq("id", purchase.id);
    return { error: "error" };
  }
}

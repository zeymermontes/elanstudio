import { NextResponse, type NextRequest } from "next/server";
import { Payment } from "mercadopago";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mpClient } from "@/lib/mercadopago";

/**
 * Mercado Pago payment webhook.
 * Confirms the payment, and on approval marks the purchase approved and credits
 * the user's ledger — idempotently (won't double-credit on repeat notifications).
 */
export async function POST(req: NextRequest) {
  const client = mpClient();
  const admin = createSupabaseAdminClient();
  if (!client || !admin) {
    // Nothing to do if not configured; ack so MP stops retrying.
    return NextResponse.json({ ok: true });
  }

  // Payment id can arrive in the body (type=payment) or as query params.
  let paymentId: string | null = null;
  try {
    const body = await req.json().catch(() => null);
    if (body?.type === "payment" && body?.data?.id) {
      paymentId = String(body.data.id);
    }
  } catch {
    /* ignore */
  }
  if (!paymentId) {
    const url = new URL(req.url);
    if (url.searchParams.get("topic") === "payment") {
      paymentId = url.searchParams.get("id");
    }
    paymentId ??= url.searchParams.get("data.id");
  }
  if (!paymentId) return NextResponse.json({ ok: true });

  // Fetch the authoritative payment from Mercado Pago.
  let payment;
  try {
    payment = await new Payment(client).get({ id: paymentId });
  } catch {
    return NextResponse.json({ ok: true });
  }

  const purchaseId = payment.external_reference;
  const status = payment.status; // approved | rejected | pending | ...
  if (!purchaseId) return NextResponse.json({ ok: true });

  const { data: purchase } = await admin
    .from("purchases")
    .select("id, user_id, credits, status")
    .eq("id", purchaseId)
    .single();
  if (!purchase) return NextResponse.json({ ok: true });

  // Already finalized → idempotent no-op.
  if (purchase.status === "approved") return NextResponse.json({ ok: true });

  if (status === "approved") {
    await admin
      .from("purchases")
      .update({ status: "approved", mp_payment_id: String(paymentId) })
      .eq("id", purchase.id);

    await admin.from("credit_ledger").insert({
      user_id: purchase.user_id,
      delta: purchase.credits,
      reason: "purchase",
      ref_id: purchase.id,
    });
  } else if (status === "rejected" || status === "cancelled") {
    await admin
      .from("purchases")
      .update({ status: "rejected", mp_payment_id: String(paymentId) })
      .eq("id", purchase.id);
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse, type NextRequest } from "next/server";
import { Payment } from "mercadopago";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mpClient, MP_ACCESS_TOKEN } from "@/lib/mercadopago";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mercado Pago webhook. Handles one-time payments AND subscription events:
 *  - payment                        → credit a one-time purchase (idempotent)
 *  - subscription_preapproval       → activate/pause/cancel a subscription
 *  - subscription_authorized_payment→ a monthly charge renewed the period
 */
export async function POST(req: NextRequest) {
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => null);
  const url = new URL(req.url);
  const type =
    body?.type ??
    body?.topic ??
    url.searchParams.get("type") ??
    url.searchParams.get("topic");
  const dataId =
    body?.data?.id ??
    url.searchParams.get("data.id") ??
    url.searchParams.get("id");

  try {
    if (type === "payment") {
      const client = mpClient();
      if (client && dataId) await handlePayment(admin, client, String(dataId));
    } else if (type === "subscription_preapproval") {
      if (dataId) await handlePreapproval(admin, String(dataId));
    } else if (type === "subscription_authorized_payment") {
      if (dataId) await handleAuthorizedPayment(admin, String(dataId));
    }
  } catch {
    // Swallow and ack — MP retries on non-200, and our handlers are idempotent.
  }

  return NextResponse.json({ ok: true });
}

const PERIOD_MS = 31 * 24 * 60 * 60 * 1000;
function nextPeriodEnd() {
  return new Date(Date.now() + PERIOD_MS).toISOString();
}

// --- one-time payment ------------------------------------------------------
async function handlePayment(
  admin: SupabaseClient,
  client: NonNullable<ReturnType<typeof mpClient>>,
  paymentId: string,
) {
  const payment = await new Payment(client).get({ id: paymentId });
  const purchaseId = payment.external_reference;
  if (!purchaseId) return;

  const { data: purchase } = await admin
    .from("purchases")
    .select("id, user_id, credits, status")
    .eq("id", purchaseId)
    .single();
  if (!purchase || purchase.status === "approved") return;

  if (payment.status === "approved") {
    await admin
      .from("purchases")
      .update({ status: "approved", mp_payment_id: String(paymentId) })
      .eq("id", purchase.id);
    // Unique index on (ref_id) where reason='purchase' makes this idempotent.
    await admin
      .from("credit_ledger")
      .insert({
        user_id: purchase.user_id,
        delta: purchase.credits,
        reason: "purchase",
        ref_id: purchase.id,
      })
      .select()
      .maybeSingle();
  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    await admin
      .from("purchases")
      .update({ status: "rejected", mp_payment_id: String(paymentId) })
      .eq("id", purchase.id);
  }
}

// --- subscription authorization (status changes) ---------------------------
async function handlePreapproval(admin: SupabaseClient, preapprovalId: string) {
  const res = await fetch(
    `https://api.mercadopago.com/preapproval/${preapprovalId}`,
    { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } },
  );
  if (!res.ok) return;
  const pre = (await res.json()) as {
    status?: string;
    external_reference?: string;
  };

  const map: Record<string, string> = {
    authorized: "authorized",
    paused: "paused",
    cancelled: "cancelled",
    pending: "pending",
  };
  const status = map[pre.status ?? "pending"] ?? "pending";
  const update: Record<string, unknown> = {
    status,
    mp_preapproval_id: preapprovalId,
  };
  if (status === "authorized") update.current_period_end = nextPeriodEnd();

  if (pre.external_reference) {
    await admin
      .from("subscriptions")
      .update(update)
      .eq("id", pre.external_reference);
  } else {
    await admin
      .from("subscriptions")
      .update(update)
      .eq("mp_preapproval_id", preapprovalId);
  }
}

// --- subscription recurring charge (renew the period) ----------------------
async function handleAuthorizedPayment(
  admin: SupabaseClient,
  authorizedPaymentId: string,
) {
  const res = await fetch(
    `https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`,
    { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } },
  );
  if (!res.ok) return;
  const ap = (await res.json()) as {
    preapproval_id?: string;
    status?: string;
  };

  if (
    ap.preapproval_id &&
    (ap.status === "approved" || ap.status === "processed")
  ) {
    await admin
      .from("subscriptions")
      .update({ status: "authorized", current_period_end: nextPeriodEnd() })
      .eq("mp_preapproval_id", ap.preapproval_id);
  }
}

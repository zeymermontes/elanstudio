import { NextResponse, type NextRequest } from "next/server";
import { Payment } from "mercadopago";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mpClient } from "@/lib/mercadopago";

/**
 * Processes an embedded (Bricks) one-time card payment. Receives the tokenized
 * card data from the Card Payment Brick, creates the payment via the MP Payment
 * API, records the purchase and (on approval) credits the user. Crediting is
 * idempotent — the unique index on credit_ledger(ref_id) where reason='purchase'
 * means the webhook can't double-credit the same purchase.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const client = mpClient();
  if (!admin || !client) {
    return NextResponse.json({ error: "not_configured" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const packageId: string | undefined = body?.packageId;
  const formData = body?.formData;
  if (!packageId || !formData?.token) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Load the package server-side (never trust a client-sent price); reject
  // recurring packages here — those go through the subscription flow.
  const { data: pkg } = await admin
    .from("packages")
    .select("id, name, price_mxn, credits, recurring, validity_days")
    .eq("id", packageId)
    .eq("active", true)
    .single();
  if (!pkg || pkg.recurring) {
    return NextResponse.json({ error: "not_found" }, { status: 400 });
  }

  // Credits expire after the package's validity window (null = never).
  const expiresAt = pkg.validity_days
    ? new Date(Date.now() + pkg.validity_days * 86400000).toISOString()
    : null;

  const { data: purchase } = await admin
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
  if (!purchase) return NextResponse.json({ error: "error" }, { status: 500 });

  try {
    const payment = await new Payment(client).create({
      body: {
        transaction_amount: Number(pkg.price_mxn),
        token: formData.token,
        payment_method_id: formData.payment_method_id,
        issuer_id: formData.issuer_id,
        installments: Number(formData.installments) || 1,
        description: `${pkg.name} · ÉLANSTUDIO`,
        payer: { email: formData.payer?.email ?? user.email },
        external_reference: purchase.id,
        metadata: { purchase_id: purchase.id, user_id: user.id },
      },
    });

    const status = payment.status ?? "rejected";
    const dbStatus =
      status === "approved"
        ? "approved"
        : status === "in_process" || status === "pending"
          ? "pending"
          : "rejected";

    await admin
      .from("purchases")
      .update({ status: dbStatus, mp_payment_id: String(payment.id) })
      .eq("id", purchase.id);

    if (status === "approved") {
      // Idempotent insert (unique index swallows a duplicate from the webhook).
      await admin
        .from("credit_ledger")
        .insert({
          user_id: user.id,
          delta: pkg.credits,
          reason: "purchase",
          ref_id: purchase.id,
          expires_at: expiresAt,
        })
        .select()
        .maybeSingle();
    }

    return NextResponse.json({ status, purchaseId: purchase.id });
  } catch {
    await admin
      .from("purchases")
      .update({ status: "rejected" })
      .eq("id", purchase.id);
    return NextResponse.json({ error: "payment_failed" }, { status: 400 });
  }
}

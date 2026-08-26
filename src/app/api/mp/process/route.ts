import { NextResponse, type NextRequest } from "next/server";
import { Payment } from "mercadopago";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mpClient } from "@/lib/mercadopago";
import { resolvePromotion } from "@/lib/promotions";
import { resolveStock } from "@/lib/stock";
import { paymentRejectionMessage } from "@/lib/mp-errors";
import type { Package } from "@/lib/types";

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
  const promoCode: string | null = body?.promoCode ?? null;
  const formData = body?.formData;
  if (!packageId || !formData?.token) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Load the package server-side (never trust a client-sent price); reject
  // recurring packages here — those go through the subscription flow.
  const { data: pkg } = await admin
    .from("packages")
    .select(
      "id, name, price_mxn, credits, recurring, validity_days, stock_limit, show_stock_left",
    )
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
    recurring: Boolean(pkg.recurring),
    stockLimit: pkg.stock_limit ?? null,
    showStockLeft: Boolean(pkg.show_stock_left),
  };

  // Last stop for a limited run. /paquetes hides a sold-out package and the
  // checkout page refuses to render one, but a member already sitting on the
  // form when the last spot went arrives here with a valid token — charging
  // them would mean a refund, not a sale.
  const stock = await resolveStock(admin, domainPkg);
  if (stock?.soldOut) {
    return NextResponse.json(
      {
        error: "sold_out",
        message:
          "Este paquete tenía lugares limitados y acaba de agotarse. No te hicimos ningún cargo.",
      },
      { status: 400 },
    );
  }

  // Resolve the discount here rather than trusting anything the browser sent —
  // the client only supplies the code, never the price.
  const applied = await resolvePromotion(admin, {
    pkg: domainPkg,
    userId: user.id,
    code: promoCode,
  });
  const chargeMxn = applied?.finalMxn ?? listPrice;

  // Name and phone for the risk engine (see buildAdditionalInfo). Best effort —
  // a missing profile just means a thinner payload, never a failed charge.
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const { data: purchase } = await admin
    .from("purchases")
    .insert({
      user_id: user.id,
      package_id: pkg.id,
      amount_mxn: chargeMxn,
      credits: pkg.credits,
      status: "pending",
      promotion_id: applied?.promotion.id ?? null,
      discount_mxn: applied?.discountMxn ?? 0,
    })
    .select("id")
    .single();
  if (!purchase) return NextResponse.json({ error: "error" }, { status: 500 });

  try {
    const payment = await new Payment(client).create({
      body: {
        transaction_amount: chargeMxn,
        token: formData.token,
        payment_method_id: formData.payment_method_id,
        issuer_id: formData.issuer_id,
        installments: Number(formData.installments) || 1,
        description: `${pkg.name} · ÉLANSTUDIO`,
        payer: { email: formData.payer?.email ?? user.email },
        external_reference: purchase.id,
        metadata: { purchase_id: purchase.id, user_id: user.id },
        additional_info: buildAdditionalInfo({
          pkg: { id: pkg.id, name: pkg.name },
          chargeMxn,
          fullName: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
        }),
      },
      requestOptions: { idempotencyKey: idempotencyKey(user.id, formData.token) },
    });

    const status = payment.status ?? "rejected";
    const statusDetail = payment.status_detail ?? null;
    let dbStatus =
      status === "approved"
        ? "approved"
        : status === "in_process" || status === "pending"
          ? "pending"
          : "rejected";

    // Credit BEFORE marking the purchase approved. The webhook's rescue path
    // bails on an already-approved row, so approving first and failing to credit
    // would leave a member who paid with no credits and nothing left to retry.
    if (status === "approved") {
      const { error: creditError } = await admin.from("credit_ledger").insert({
        user_id: user.id,
        delta: pkg.credits,
        reason: "purchase",
        ref_id: purchase.id,
        expires_at: expiresAt,
      });

      // 23505 is the unique index rejecting a second credit for this purchase —
      // this route and the webhook racing, which is exactly what it's there for.
      // The credits already landed, so that counts as success.
      if (creditError && creditError.code !== "23505") {
        console.error(
          "[mp/process] credit failed",
          purchase.id,
          creditError.code,
          creditError.message,
        );
        // Stay pending so the webhook still owns the rescue.
        dbStatus = "pending";
      }
    }

    const { error: updateError } = await admin
      .from("purchases")
      .update({
        status: dbStatus,
        mp_payment_id: String(payment.id),
        mp_status_detail: statusDetail,
      })
      .eq("id", purchase.id);
    if (updateError) {
      console.error(
        "[mp/process] purchase update failed",
        purchase.id,
        updateError.code,
        updateError.message,
      );
    }

    return NextResponse.json({
      status: dbStatus,
      statusDetail,
      message:
        dbStatus === "rejected" ? paymentRejectionMessage(statusDetail) : null,
      purchaseId: purchase.id,
    });
  } catch (err) {
    // Log the API's own words. A malformed payload and a declined card both land
    // here, and without the message they look identical — the first is our bug
    // and would otherwise read as "every card is being declined".
    console.error("[mp/process] payment failed", purchase.id, err);
    await admin
      .from("purchases")
      .update({ status: "rejected" })
      .eq("id", purchase.id);
    return NextResponse.json(
      { error: "payment_failed", message: paymentRejectionMessage(null) },
      { status: 400 },
    );
  }
}

/**
 * Idempotency key for the charge.
 *
 * Keyed on the card token, not the purchase: the token is single-use and the
 * Brick issues a fresh one on every submit, so a double-click sends the same
 * token twice (one charge) while a member who fixes their CVV and retries
 * arrives with a new one (a real second attempt). Keying on the purchase id
 * would do nothing here — we insert a new purchase row per submit — and keying
 * on anything longer-lived would replay the stored rejection back at every
 * retry, making a corrected CVV look permanently declined.
 */
function idempotencyKey(userId: string, token: string): string {
  return `elan-${userId}-${token}`;
}

/**
 * Extra context for Mercado Pago's risk engine.
 *
 * The Brick only sends token, amount and email; everything else that gets scored
 * on borderline decisions (the ones that come back `cc_rejected_high_risk`) is
 * ours to supply. Best effort throughout — a field we don't have is omitted
 * rather than sent empty. A thin payload still charges, it just scores worse.
 *
 * `items` here must NOT carry `currency_id`. Preference items take it, payment
 * items don't, and sending it fails the whole charge with an HTTP 400 before the
 * card is ever touched. The SDK's `Items` type is shared with preferences, so
 * TypeScript will happily let you add it — the compiler won't catch this one.
 */
function buildAdditionalInfo({
  pkg,
  chargeMxn,
  fullName,
  phone,
}: {
  pkg: { id: string; name: string };
  chargeMxn: number;
  fullName: string;
  phone: string;
}) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  const trimmedPhone = phone.trim();

  return {
    items: [
      {
        id: pkg.id,
        title: pkg.name,
        description: `Paquete de clases · ÉLANSTUDIO`,
        category_id: "services",
        quantity: 1,
        unit_price: chargeMxn,
      },
    ],
    payer: {
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      ...(trimmedPhone ? { phone: { number: trimmedPhone } } : {}),
    },
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { bookingWindow } from "./booking-rules";
import { rowPricing } from "./data";
import { DEFAULT_UTC_OFFSET_MIN } from "./format";
import type { SlotPricing } from "./types";

/**
 * A special class a member can pay for separately (0027), checked the same
 * way before showing the checkout, before charging a card and before taking
 * a transfer receipt. Runs with the service role: it counts everyone's
 * bookings, which RLS hides from a member.
 */
export type PayableEvent = {
  id: string;
  name: string;
  startsAt: string;
  utcOffsetMin: number;
  coach: string | null;
  location: string | null;
  spotsLeft: number;
  pricing: SlotPricing & { priceMxn: number };
};

export type PayableEventResult =
  | { ok: true; event: PayableEvent }
  /**
   * not_found — no such class, cancelled, or not sold separately.
   * already   — this member already has her spot.
   * full      — no spots left.
   * closed    — the booking window closed (started / nobody signed up in time).
   */
  | {
      ok: false;
      code:
        | "not_found"
        | "already"
        | "full"
        | "closed"
        // Clase muestra con precio: no es elegible / no es clase normal.
        | "trial_used"
        | "no_trial";
    };

export async function loadPayableEvent(
  admin: SupabaseClient,
  sessionId: string,
  userId: string,
): Promise<PayableEventResult> {
  return loadPayable(admin, sessionId, userId, "event");
}

/**
 * La clase muestra con precio (0032): una clase normal que una alumna
 * elegible paga antes de reservar. Mismas comprobaciones que un lugar en
 * una clase especial, más la elegibilidad y el precio de Ajustes.
 */
export async function loadPayableTrial(
  admin: SupabaseClient,
  sessionId: string,
  userId: string,
): Promise<PayableEventResult> {
  return loadPayable(admin, sessionId, userId, "trial");
}

async function loadPayable(
  admin: SupabaseClient,
  sessionId: string,
  userId: string,
  kind: "event" | "trial",
): Promise<PayableEventResult> {
  let trialFee: number | null = null;
  if (kind === "trial") {
    const { data: settings } = await admin
      .from("site_settings")
      .select("trial_class_enabled, trial_class_price_mxn")
      .eq("id", 1)
      .maybeSingle();
    const fee = Number(settings?.trial_class_price_mxn ?? 0);
    if (!settings?.trial_class_enabled || !(fee > 0))
      return { ok: false, code: "not_found" };
    const { data: eligible } = await admin.rpc("trial_eligible_raw", {
      p_user: userId,
    });
    if (!eligible) return { ok: false, code: "trial_used" };
    trialFee = fee;
  }

  const { data: row } = await admin
    .from("class_sessions")
    .select(
      "id, starts_at, status, capacity, credit_cost, price_mxn, plan_included, title, class_types(name), coaches(name), locations(name, utc_offset_minutes)",
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (!row || row.status !== "scheduled")
    return { ok: false, code: "not_found" };

  const pricing = rowPricing(row as Record<string, unknown>);
  if (kind === "event" && pricing.priceMxn === null)
    return { ok: false, code: "not_found" };
  // La muestra es para una clase normal, no para una especial.
  if (
    kind === "trial" &&
    (pricing.creditCost !== 1 ||
      pricing.priceMxn !== null ||
      !pricing.planIncluded)
  )
    return { ok: false, code: "no_trial" };

  const { data: mine } = await admin
    .from("bookings")
    .select("id")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .eq("status", "confirmed")
    .maybeSingle();
  if (mine) return { ok: false, code: "already" };

  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "confirmed");
  const booked = count ?? 0;

  if (bookingWindow(row.starts_at, booked) !== "open")
    return { ok: false, code: "closed" };
  if (booked >= row.capacity) return { ok: false, code: "full" };

  const one = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;
  const ct = one(
    row.class_types as { name: string } | { name: string }[] | null,
  );
  const coach = one(
    row.coaches as { name: string } | { name: string }[] | null,
  );
  const loc = one(
    row.locations as
      | { name: string; utc_offset_minutes: number }
      | { name: string; utc_offset_minutes: number }[]
      | null,
  );

  return {
    ok: true,
    event: {
      id: row.id,
      name: (row.title as string | null) || ct?.name || "Clase especial",
      startsAt: row.starts_at,
      utcOffsetMin: loc?.utc_offset_minutes ?? DEFAULT_UTC_OFFSET_MIN,
      coach: coach?.name ?? null,
      location: loc?.name ?? null,
      spotsLeft: Math.max(0, row.capacity - booked),
      pricing: { ...pricing, priceMxn: trialFee ?? pricing.priceMxn ?? 0 },
    },
  };
}

/** Why the checkout can't go ahead, in the member's words. */
export const PAYABLE_EVENT_MESSAGES: Record<
  Exclude<PayableEventResult, { ok: true }>["code"],
  string
> = {
  not_found: "Esta clase ya no está disponible para pagarla aparte.",
  already: "Ya tienes tu lugar en esta clase.",
  full: "Esta clase ya está llena. No te hicimos ningún cargo.",
  closed: "Las reservas de esta clase ya cerraron. No te hicimos ningún cargo.",
  trial_used:
    "La clase muestra es para tu primera visita y ya no aplica. Compra un paquete para reservar.",
  no_trial:
    "La clase muestra aplica en clases normales, no en esta clase especial.",
};

/**
 * Reserve the spot a member just paid for. Idempotent — the card route and
 * the webhook may both get here for the same purchase.
 */
export async function bookPaidSeat(
  admin: SupabaseClient,
  userId: string,
  sessionId: string,
  reason: "event_payment" | "trial" = "event_payment",
): Promise<boolean> {
  const { data, error } = await admin.rpc("book_paid_session", {
    p_user: userId,
    p_session: sessionId,
    p_reason: reason,
  });
  if (error) {
    console.error("[book_paid_session]", sessionId, error.code, error.message);
    return false;
  }
  return data === "ok";
}

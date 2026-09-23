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
  | { ok: false; code: "not_found" | "already" | "full" | "closed" };

export async function loadPayableEvent(
  admin: SupabaseClient,
  sessionId: string,
  userId: string,
): Promise<PayableEventResult> {
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
  if (pricing.priceMxn === null) return { ok: false, code: "not_found" };

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
      pricing: { ...pricing, priceMxn: pricing.priceMxn },
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
};

/**
 * Reserve the spot a member just paid for. Idempotent — the card route and
 * the webhook may both get here for the same purchase.
 */
export async function bookPaidSeat(
  admin: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const { data, error } = await admin.rpc("book_paid_session", {
    p_user: userId,
    p_session: sessionId,
  });
  if (error) {
    console.error("[book_paid_session]", sessionId, error.code, error.message);
    return false;
  }
  return data === "ok";
}

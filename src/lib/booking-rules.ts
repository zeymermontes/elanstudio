/**
 * Booking rules shared by the UI and the copy that explains them.
 *
 * The authoritative checks live in the RPCs — cancel_booking
 * (supabase/migrations/0014_cancel_window.sql) and booking_window
 * (supabase/migrations/0019_booking_window.sql). What's here mirrors them so
 * the button can be disabled ahead of time. Keep the two in sync: this only
 * decides what the member sees, never what they're allowed to do.
 */
export const CANCEL_WINDOW_HOURS = 12;

/** True while the class is still far enough away to cancel and get the credit back. */
export function canCancelBooking(startsAt: string, now = Date.now()): boolean {
  return (
    new Date(startsAt).getTime() - now > CANCEL_WINDOW_HOURS * 60 * 60 * 1000
  );
}

/** One-line explanation of the window, for tooltips and empty states. */
export const CANCEL_WINDOW_NOTE = `Puedes cancelar hasta ${CANCEL_WINDOW_HOURS} horas antes de la clase y recuperar tu crédito.`;

// ---------------------------------------------------------------------------
// Booking window
// ---------------------------------------------------------------------------

/** A class nobody has booked closes this many hours before it starts. */
export const EMPTY_CLASS_CUTOFF_HOURS = 2;

/** A class that already has someone stays open until this many minutes before. */
export const LAST_MINUTE_CUTOFF_MIN = 1;

/**
 * Why a slot can or can't be booked right now.
 *
 * `empty_closed` is the whole point of the window: with nobody signed up, the
 * class closes early so the coach knows hours ahead that she doesn't need to
 * come in. One booking is enough to flip it back open until the last minute —
 * she's going anyway.
 */
export type BookingWindow = "open" | "empty_closed" | "started";

export function bookingWindow(
  startsAt: string,
  booked: number,
  now = Date.now(),
): BookingWindow {
  const msLeft = new Date(startsAt).getTime() - now;
  // Also covers a class that already started: msLeft goes negative.
  if (msLeft < LAST_MINUTE_CUTOFF_MIN * 60000) return "started";
  if (booked === 0 && msLeft < EMPTY_CLASS_CUTOFF_HOURS * 3600000)
    return "empty_closed";
  return "open";
}

/** Short label for a closed slot, for the schedule card and the detail modal. */
export const WINDOW_LABEL: Record<Exclude<BookingWindow, "open">, string> = {
  empty_closed: "Reservas cerradas",
  started: "Ya comenzó",
};

/** One-line explanation of the booking window, for tooltips and empty states. */
export const BOOKING_WINDOW_NOTE = `Puedes reservar hasta ${LAST_MINUTE_CUTOFF_MIN} minuto antes de la clase. Si nadie ha reservado, cerramos ${EMPTY_CLASS_CUTOFF_HOURS} horas antes para avisarle a tu coach.`;

/**
 * Label for a slot's reserve CTA when it can't be booked, or null when it can.
 * Computed on the server so it doesn't depend on the device's clock (and
 * doesn't mismatch during hydration) — same reason as `canCancelBooking`.
 */
export function slotBlockedLabel(
  slot: { startsAt: string; booked: number; spotsLeft: number },
  now = Date.now(),
): string | null {
  const w = bookingWindow(slot.startsAt, slot.booked, now);
  if (w !== "open") return WINDOW_LABEL[w];
  return slot.spotsLeft === 0 ? "Lleno" : null;
}

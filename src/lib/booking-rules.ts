/**
 * Booking rules shared by the UI and the copy that explains them.
 *
 * The authoritative check lives in the cancel_booking RPC
 * (supabase/migrations/0014_cancel_window.sql) — this mirrors it so the button
 * can be disabled ahead of time. Keep the two in sync: what's here only decides
 * what the member sees, never what they're allowed to do.
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

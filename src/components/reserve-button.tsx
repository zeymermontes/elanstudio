import Link from "next/link";

/**
 * Reserve CTA shown on each schedule session. Links into the booking flow
 * (`/cuenta?reservar=<id>`), which requires auth — the account page redirects
 * to /ingresar when the user is not signed in, then completes the reservation.
 * Renders a disabled pill when the session is full.
 */
export function ReserveButton({
  sessionId,
  disabled,
}: {
  sessionId: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-full border border-line px-5 py-2 text-[0.75rem] uppercase tracking-[0.15em] text-ink-soft/60">
        Lleno
      </span>
    );
  }

  return (
    <Link
      href={`/cuenta?reservar=${sessionId}`}
      className="rounded-full bg-pink px-5 py-2 text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink-strong"
    >
      Reservar
    </Link>
  );
}

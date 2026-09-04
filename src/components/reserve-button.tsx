import Link from "next/link";

/**
 * Reserve CTA shown on each schedule slot. Carries an encoded booking ref
 * (session or virtual template+date) into the booking flow at `/cuenta`, which
 * requires auth.
 *
 * `blocked` is the reason the slot can't be booked ("Lleno", "Reservas
 * cerradas", "Ya comenzó") or null when it can — computed on the server by
 * `slotBlockedLabel`, since the booking window depends on the current time.
 */
export function ReserveButton({
  refStr,
  blocked,
  title,
}: {
  refStr: string;
  blocked?: string | null;
  title?: string;
}) {
  if (blocked) {
    return (
      <span
        title={title}
        className="cursor-not-allowed rounded-full border border-line px-5 py-2 text-center text-[0.75rem] uppercase tracking-[0.15em] text-ink-soft/60"
      >
        {blocked}
      </span>
    );
  }

  return (
    <Link
      href={`/cuenta?reservar=${encodeURIComponent(refStr)}`}
      className="rounded-full bg-pink px-5 py-2 text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink-strong"
    >
      Reservar
    </Link>
  );
}

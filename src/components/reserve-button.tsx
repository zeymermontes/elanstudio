import Link from "next/link";

/**
 * Reserve CTA shown on each schedule slot. Carries an encoded booking ref
 * (session or virtual template+date) into the booking flow at `/cuenta`, which
 * requires auth. Renders a disabled pill when the slot is full.
 */
export function ReserveButton({
  refStr,
  disabled,
}: {
  refStr: string;
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
      href={`/cuenta?reservar=${encodeURIComponent(refStr)}`}
      className="rounded-full bg-pink px-5 py-2 text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink-strong"
    >
      Reservar
    </Link>
  );
}

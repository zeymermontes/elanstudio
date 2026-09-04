import Link from "next/link";
import { ArrowRight, Clock, User } from "lucide-react";
import { cap, dateBadge, formatDayLabel, formatTime } from "@/lib/format";
import { encodeRef } from "@/lib/schedule-ref";
import { LocationChip } from "@/components/location-chip";
import { slotBlockedLabel } from "@/lib/booking-rules";
import type { ScheduleSlot } from "@/lib/types";

/**
 * "Próximos eventos especiales" on the landing page: the one-off events the
 * admin chose to announce there. Renders nothing when there are none, so the
 * section simply doesn't exist on a week with no special event planned.
 */
export function SpecialEvents({ events }: { events: ScheduleSlot[] }) {
  if (events.length === 0) return null;

  // Server component (the landing page is dynamic): reading the clock is
  // intentional, and every card has to read the same one.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();

  return (
    <section className="mx-auto max-w-6xl px-5 pb-4">
      <div className="mb-10 text-center">
        <p className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          No te lo pierdas
        </p>
        <h2 className="font-serif text-4xl font-light text-ink sm:text-5xl">
          Próximos eventos especiales
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {events.map((e) => (
          <EventCard
            key={encodeRef(e.ref)}
            event={e}
            blocked={slotBlockedLabel(e, nowMs)}
          />
        ))}
      </div>
    </section>
  );
}

function EventCard({
  event: e,
  blocked,
}: {
  event: ScheduleSlot;
  blocked: string | null;
}) {
  const { day, month } = dateBadge(e.startsAt, e.utcOffsetMin);
  const full = e.spotsLeft === 0;

  return (
    <article className="surface-card flex flex-col gap-5 rounded-2xl px-6 py-6 shadow-soft sm:flex-row sm:items-center">
      <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-pink-soft to-cream px-5 py-4 text-center">
        <span className="font-serif text-3xl leading-none text-pink-strong">
          {day}
        </span>
        <span className="mt-1 text-[0.65rem] uppercase tracking-[0.15em] text-ink-soft">
          {month}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-2xl text-ink">{e.classType.name}</h3>
        <p className="mt-1 text-xs text-ink-soft">
          {cap(formatDayLabel(e.startsAt, e.utcOffsetMin))} ·{" "}
          {formatTime(e.startsAt, e.utcOffsetMin)}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
          {e.coach ? (
            <span className="inline-flex items-center gap-1">
              <User size={12} strokeWidth={1.5} /> {e.coach.name}
            </span>
          ) : null}
          {e.location ? <LocationChip location={e.location} /> : null}
          <span
            className={`inline-flex items-center gap-1 ${
              full ? "text-ink-soft" : "text-gold"
            }`}
          >
            <Clock size={12} strokeWidth={1.5} />
            {full ? "Sin lugares" : `${e.spotsLeft} lugares`}
          </span>
        </div>
      </div>

      <div className="shrink-0">
        {blocked ? (
          <span className="inline-block cursor-not-allowed rounded-full border border-line px-5 py-2 text-[0.75rem] uppercase tracking-[0.15em] text-ink-soft/60">
            {blocked}
          </span>
        ) : (
          <Link
            href={`/cuenta?reservar=${encodeURIComponent(encodeRef(e.ref))}`}
            className="inline-flex items-center gap-2 rounded-full bg-pink px-5 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink-strong"
          >
            Reservar <ArrowRight size={14} strokeWidth={1.5} />
          </Link>
        )}
      </div>
    </article>
  );
}

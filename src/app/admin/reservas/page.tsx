import Link from "next/link";
import { ClipboardCheck, Users } from "lucide-react";
import { getReservationsBySession, type ReservationSession } from "@/lib/admin-data";
import { formatDayLabel, formatTime, cap } from "@/lib/format";

export const dynamic = "force-dynamic";

function SessionCard({ s, past }: { s: ReservationSession; past: boolean }) {
  return (
    <article className="surface-card overflow-hidden rounded-2xl shadow-soft">
      <div className="flex items-start justify-between gap-4 border-b border-line/70 px-6 py-4">
        <div>
          <h3 className="font-serif text-xl text-ink">{s.className}</h3>
          <p className="mt-0.5 text-xs text-ink-soft">
            {cap(formatDayLabel(s.startsAt))} · {formatTime(s.startsAt)}
            {s.coach ? ` · ${s.coach}` : ""}
            {s.location ? ` · ${s.location}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs text-gold">
            <Users size={13} strokeWidth={1.5} /> {s.members.length}
          </span>
          <Link
            href={`/admin/horario/${s.sessionId}`}
            className="inline-flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.12em] text-pink-strong transition-colors hover:text-ink"
          >
            <ClipboardCheck size={13} strokeWidth={1.5} /> Lista
          </Link>
        </div>
      </div>

      <ul className="divide-y divide-line/60">
        {s.members.map((m, i) => (
          <li
            key={i}
            className="flex items-center justify-between px-6 py-2.5 text-sm"
          >
            <span className="text-ink">{m.name}</span>
            {past ? (
              m.attended === true ? (
                <span className="rounded-full bg-gold-soft/50 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.1em] text-ink">
                  Presente
                </span>
              ) : m.attended === false ? (
                <span className="rounded-full bg-pink-soft/60 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.1em] text-pink-strong">
                  Ausente
                </span>
              ) : (
                <span className="text-[0.65rem] uppercase tracking-[0.1em] text-ink-soft/60">
                  Sin marcar
                </span>
              )
            ) : null}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default async function AdminReservasPage() {
  const sessions = await getReservationsBySession(-45, 60);

  // Server component (force-dynamic): current time is intentional.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();

  // A class stays "upcoming" until it has finished (ends_at < now).
  const upcoming = sessions
    .filter((s) => new Date(s.endsAt).getTime() >= nowMs)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = sessions
    .filter((s) => new Date(s.endsAt).getTime() < nowMs)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Reservas</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Reservas confirmadas por clase. Pasa lista desde el botón Lista.
      </p>

      <section className="mb-12">
        <h2 className="mb-4 text-[0.7rem] uppercase tracking-luxe text-gold">
          Próximas clases ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-ink-soft">No hay reservas próximas.</p>
        ) : (
          <div className="space-y-4">
            {upcoming.map((s) => (
              <SessionCard key={s.sessionId} s={s} past={false} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-[0.7rem] uppercase tracking-luxe text-gold">
          Clases pasadas ({past.length})
        </h2>
        {past.length === 0 ? (
          <p className="text-sm text-ink-soft">Aún no hay clases pasadas.</p>
        ) : (
          <div className="space-y-4">
            {past.map((s) => (
              <SessionCard key={s.sessionId} s={s} past={true} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import {
  getCoachIdsForUser,
  getReservationsBySession,
  type ReservationSession,
} from "@/lib/admin-data";
import { CheckInRow } from "@/components/admin/check-in";
import { formatDayLabel, formatTime, cap } from "@/lib/format";

export const dynamic = "force-dynamic";

function ClassCard({ s, allowCheckIn }: { s: ReservationSession; allowCheckIn: boolean }) {
  return (
    <article className="surface-card overflow-hidden rounded-2xl shadow-soft">
      <div className="flex items-start justify-between gap-4 border-b border-line/70 px-6 py-4">
        <div>
          <h3 className="font-serif text-xl text-ink">{s.className}</h3>
          <p className="mt-0.5 text-xs text-ink-soft">
            {cap(formatDayLabel(s.startsAt))} · {formatTime(s.startsAt)}
            {s.location ? ` · ${s.location}` : ""}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-gold">
          <Users size={13} strokeWidth={1.5} /> {s.members.length}
        </span>
      </div>

      {s.members.length === 0 ? (
        <p className="px-6 py-4 text-sm text-ink-soft">Sin reservas aún.</p>
      ) : allowCheckIn ? (
        <div className="space-y-2 p-3">
          {s.members.map((m) => (
            <CheckInRow
              key={m.userId}
              sessionId={s.sessionId}
              userId={m.userId}
              name={m.name}
              email=""
              attended={m.attended}
            />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-line/60">
          {s.members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between px-6 py-2.5 text-sm"
            >
              <span className="text-ink">{m.name}</span>
              {m.attended === true ? (
                <span className="rounded-full bg-gold-soft/50 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.1em] text-ink">
                  Presente
                </span>
              ) : m.attended === false ? (
                <span className="rounded-full bg-pink-soft/60 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.1em] text-pink-strong">
                  Ausente
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default async function MisClasesPage() {
  const profile = await requireStaff();
  const coachIds = await getCoachIdsForUser(profile.id);

  if (coachIds.length === 0) {
    return (
      <div>
        <h1 className="font-serif text-4xl text-ink">Mis clases</h1>
        <p className="mt-3 text-sm text-ink-soft">
          Tu cuenta aún no está vinculada a un coach. Pídele al administrador que
          te vincule desde la sección de Coaches.
        </p>
      </div>
    );
  }

  const sessions = await getReservationsBySession(-45, 60, {
    coachIds,
    includeEmpty: true,
  });

  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const upcoming = sessions
    .filter((s) => new Date(s.endsAt).getTime() >= nowMs)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = sessions
    .filter((s) => new Date(s.endsAt).getTime() < nowMs)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Mis clases</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Tus clases y quién asiste. Marca la asistencia tocando Presente o Ausente.
      </p>

      <section className="mb-12">
        <h2 className="mb-4 text-[0.7rem] uppercase tracking-luxe text-gold">
          Próximas clases ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-ink-soft">No tienes clases próximas.</p>
        ) : (
          <div className="space-y-4">
            {upcoming.map((s) => (
              <ClassCard key={s.sessionId} s={s} allowCheckIn={true} />
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
              <ClassCard key={s.sessionId} s={s} allowCheckIn={true} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

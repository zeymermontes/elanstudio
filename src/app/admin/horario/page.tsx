import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import {
  getClassTypes,
  getCoaches,
  getLocations,
  getSessionsWindow,
} from "@/lib/data";
import { SessionForm } from "@/components/admin/session-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteSessionAction } from "@/lib/actions/admin";
import { formatDayLabel, formatTime, cap } from "@/lib/format";
import type { SessionView } from "@/lib/types";

export const dynamic = "force-dynamic";

function groupByClass(list: SessionView[]) {
  const map = new Map<string, SessionView[]>();
  for (const s of list) {
    const arr = map.get(s.classType.name) ?? [];
    arr.push(s);
    map.set(s.classType.name, arr);
  }
  return [...map.entries()]
    .map(([name, sessions]) => ({ name, sessions }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function SessionRow({ s }: { s: SessionView }) {
  return (
    <article className="surface-card flex items-center justify-between gap-4 rounded-xl px-5 py-4 shadow-soft">
      <div>
        <p className="text-sm text-ink">
          {cap(formatDayLabel(s.startsAt))} · {formatTime(s.startsAt)}
        </p>
        <p className="text-xs text-ink-soft">
          {s.coach?.name}
          {s.location?.name ? ` · ${s.location.name}` : ""} · {s.booked}/
          {s.capacity} reservas
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <Link
          href={`/admin/horario/${s.id}`}
          className="inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-pink-strong transition-colors hover:text-ink"
        >
          <ClipboardCheck size={14} strokeWidth={1.5} /> Lista
        </Link>
        <DeleteButton
          id={s.id}
          onDelete={deleteSessionAction}
          confirmText="¿Eliminar esta sesión?"
        />
      </div>
    </article>
  );
}

function GroupedSessions({ groups }: { groups: ReturnType<typeof groupByClass> }) {
  return (
    <div className="space-y-7">
      {groups.map((g) => (
        <div key={g.name}>
          <h3 className="mb-2 font-serif text-xl text-ink">
            {g.name}{" "}
            <span className="text-sm text-ink-soft">({g.sessions.length})</span>
          </h3>
          <div className="space-y-2">
            {g.sessions.map((s) => (
              <SessionRow key={s.id} s={s} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function AdminHorarioPage() {
  const [classTypes, coaches, locations, sessions] = await Promise.all([
    getClassTypes(),
    getCoaches(),
    getLocations(),
    getSessionsWindow(-45, 60),
  ]);

  // Server component (force-dynamic): current time is intentional.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();

  // A class is "past" only once it has finished (ends_at < now).
  const upcoming = sessions
    .filter((s) => new Date(s.endsAt).getTime() >= nowMs)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = sessions
    .filter((s) => new Date(s.endsAt).getTime() < nowMs)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Horario</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Agenda nuevas clases y administra las sesiones por clase.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          Agendar clase
        </h2>
        <SessionForm classTypes={classTypes} coaches={coaches} locations={locations} />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-[0.7rem] uppercase tracking-luxe text-gold">
          Próximas clases ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-ink-soft">No hay clases próximas.</p>
        ) : (
          <GroupedSessions groups={groupByClass(upcoming)} />
        )}
      </section>

      <section>
        <h2 className="mb-4 text-[0.7rem] uppercase tracking-luxe text-gold">
          Clases pasadas ({past.length})
        </h2>
        {past.length === 0 ? (
          <p className="text-sm text-ink-soft">Aún no hay clases pasadas.</p>
        ) : (
          <GroupedSessions groups={groupByClass(past)} />
        )}
      </section>
    </div>
  );
}

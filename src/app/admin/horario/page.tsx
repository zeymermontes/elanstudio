import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { getClassTypes, getCoaches, getLocations, getUpcomingSessions } from "@/lib/data";
import { SessionForm } from "@/components/admin/session-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteSessionAction } from "@/lib/actions/admin";
import { formatDayLabel, formatTime, cap } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminHorarioPage() {
  const [classTypes, coaches, locations, sessions] = await Promise.all([
    getClassTypes(),
    getCoaches(),
    getLocations(),
    getUpcomingSessions(14),
  ]);

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Horario</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Agenda nuevas clases y administra las próximas sesiones.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          Agendar clase
        </h2>
        <SessionForm classTypes={classTypes} coaches={coaches} locations={locations} />
      </section>

      <section>
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          Próximas sesiones ({sessions.length})
        </h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-ink-soft">No hay sesiones agendadas.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <article
                key={s.id}
                className="surface-card flex items-center justify-between rounded-xl px-5 py-4 shadow-soft"
              >
                <div>
                  <p className="font-serif text-lg text-ink">{s.classType.name}</p>
                  <p className="text-xs text-ink-soft">
                    {cap(formatDayLabel(s.startsAt))} · {formatTime(s.startsAt)} ·{" "}
                    {s.coach?.name} · {s.location?.name} ·{" "}
                    {s.booked}/{s.capacity} reservas
                  </p>
                </div>
                <div className="flex items-center gap-4">
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

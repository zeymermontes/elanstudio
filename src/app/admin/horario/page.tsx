import { requireAdmin } from "@/lib/auth";
import {
  getClassTypes,
  getCoaches,
  getLocations,
  getWeeklyClasses,
  getSchedule,
} from "@/lib/data";
import { SessionForm } from "@/components/admin/session-form";
import { WeeklyClassForm } from "@/components/admin/weekly-class-form";
import { WEEKDAYS } from "@/lib/weekdays";
import { ScheduleSlotActions } from "@/components/admin/schedule-slot-actions";
import { Tabs } from "@/components/admin/tabs";
import { encodeRef } from "@/lib/schedule-ref";
import { formatDayLabel, formatTime, cap } from "@/lib/format";
import type { ScheduleSlot } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminHorarioPage() {
  await requireAdmin();
  const [classTypes, coaches, locations, weekly, schedule] = await Promise.all([
    getClassTypes(),
    getCoaches(),
    getLocations(),
    getWeeklyClasses(),
    getSchedule(21),
  ]);

  // Group the computed schedule by day.
  const byDay = new Map<string, ScheduleSlot[]>();
  for (const s of schedule) {
    const key = s.startsAt.slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(s);
    byDay.set(key, list);
  }

  // --- Tab: weekly template (with a sub-tab per weekday) ---
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun
  const dayTabs = dayOrder.map((wd) => {
    const slots = weekly.filter((w) => w.weekday === wd);
    return {
      key: String(wd),
      label: `${WEEKDAYS[wd].slice(0, 3)}${slots.length ? ` (${slots.length})` : ""}`,
      content: (
        <div className="space-y-4">
          {slots.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Sin clases el {WEEKDAYS[wd].toLowerCase()}. Agrégalas con el
              formulario de arriba.
            </p>
          ) : (
            slots.map((w) => (
              <WeeklyClassForm
                key={w.id}
                weekly={w}
                classTypes={classTypes}
                coaches={coaches}
                locations={locations}
              />
            ))
          )}
        </div>
      ),
    };
  });

  const plantillaTab = (
    <section>
      <p className="mb-6 text-sm text-ink-soft">
        Define tu horario semanal fijo. Se repite automáticamente cada semana.
        Cambiar el coach aquí lo reemplaza de ahora en adelante.
      </p>
      <h3 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
        Agregar clase semanal
      </h3>
      <WeeklyClassForm classTypes={classTypes} coaches={coaches} locations={locations} />

      <div className="mt-8">
        <h3 className="mb-4 text-[0.7rem] uppercase tracking-luxe text-gold">
          Clases por día
        </h3>
        <Tabs tabs={dayTabs} />
      </div>
    </section>
  );

  // --- Tab: upcoming computed schedule (with exceptions) ---
  const proximasTab = (
    <section>
      <p className="mb-6 text-sm text-ink-soft">
        Próximas clases (de tu plantilla + eventos). Aquí cubres a un coach por
        un día o cancelas una clase puntual.
      </p>
      {byDay.size === 0 ? (
        <p className="text-sm text-ink-soft">No hay clases próximas.</p>
      ) : (
        <div className="space-y-8">
          {[...byDay.entries()].map(([day, daySlots]) => (
            <div key={day}>
              <h3 className="mb-3 font-serif text-xl text-ink">
                {cap(formatDayLabel(daySlots[0].startsAt))}
              </h3>
              <div className="space-y-3">
                {daySlots.map((s) => (
                  <article
                    key={encodeRef(s.ref)}
                    className="surface-card flex flex-col gap-3 rounded-xl px-5 py-4 shadow-soft"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-serif text-lg text-ink">
                          {formatTime(s.startsAt)} · {s.classType.name}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {s.coach?.name ?? "Sin coach"}
                          {s.location?.name ? ` · ${s.location.name}` : ""} ·{" "}
                          {s.booked}/{s.capacity} reservas
                        </p>
                      </div>
                    </div>
                    <ScheduleSlotActions
                      refStr={encodeRef(s.ref)}
                      coaches={coaches}
                      currentCoachId={s.coach?.id ?? null}
                      sessionId={s.ref.kind === "session" ? s.ref.sessionId : null}
                    />
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  // --- Tab: one-off special event ---
  const eventoTab = (
    <section>
      <p className="mb-6 text-sm text-ink-soft">
        Crea una clase o evento único (fuera del horario semanal).
      </p>
      <SessionForm classTypes={classTypes} coaches={coaches} locations={locations} />
    </section>
  );

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Horario</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Tu horario semanal se repite solo. Ajusta excepciones cuando haga falta.
      </p>

      <Tabs
        tabs={[
          { key: "plantilla", label: "Horario semanal", content: plantillaTab },
          { key: "proximas", label: "Próximas clases", content: proximasTab },
          { key: "evento", label: "Evento único", content: eventoTab },
        ]}
      />
    </div>
  );
}

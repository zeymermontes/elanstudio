"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import {
  saveSessionAction,
  deleteSessionAction,
  cancelEventAction,
  type FormState,
} from "@/lib/actions/admin";
import type { ClassType, Coach, Location, ScheduleSlot } from "@/lib/types";
import { toDateTimeLocal } from "@/lib/format";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";
import { DeleteButton } from "./delete-button";

/**
 * Alta y edición de un evento único (fuera del horario semanal). Sin `event`
 * es el formulario de alta; con `event` edita ese evento, incluida la fecha y
 * la sede — que antes solo se podían corregir borrando y volviendo a crear.
 */
export function SessionForm({
  event,
  classTypes,
  coaches,
  locations,
}: {
  event?: ScheduleSlot;
  classTypes: ClassType[];
  coaches: Coach[];
  locations: Location[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveSessionAction,
    null,
  );

  const sessionId =
    event && event.ref.kind === "session" ? event.ref.sessionId : null;

  return (
    <form action={action} className="surface-card rounded-2xl px-6 py-6 shadow-soft">
      {sessionId ? <input type="hidden" name="id" value={sessionId} /> : null}
      <div className="space-y-4">
        <StatusBanner state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Clase">
            <select
              name="class_type_id"
              defaultValue={event?.classType.id ?? ""}
              required
              className={inputClass}
            >
              <option value="">Selecciona…</option>
              {classTypes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha y hora">
            <input
              type="datetime-local"
              name="starts_at"
              /* Se lee en el huso de la sede del evento, para que el admin vea
                 de vuelta la misma hora de pared que escribió. */
              defaultValue={
                event ? toDateTimeLocal(event.startsAt, event.utcOffsetMin) : ""
              }
              required
              className={inputClass}
            />
          </Field>
          <Field label="Coach">
            <select
              name="coach_id"
              defaultValue={event?.coach?.id ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ubicación">
            <select
              name="location_id"
              defaultValue={event?.location?.id ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={event ? "Capacidad" : "Capacidad (opcional)"}>
            <input
              type="number"
              name="capacity"
              min={1}
              defaultValue={event?.capacity ?? ""}
              placeholder="Por defecto de la clase"
              className={inputClass}
            />
          </Field>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={event?.featured}
            className="mt-0.5 accent-pink"
          />
          <span>
            Anunciarlo en la portada
            <span className="mt-0.5 block text-xs text-ink-soft/80">
              Aparece en &laquo;Próximos eventos especiales&raquo; en el inicio.
              Sin marcar, el evento igual se ve en Horarios.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center justify-end gap-4">
          {sessionId ? (
            <>
              <Link
                href={`/admin/horario/${sessionId}`}
                className="mr-auto inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-pink-strong transition-colors hover:text-ink"
              >
                <ClipboardCheck size={13} strokeWidth={1.5} /> Lista
              </Link>
              {/*
                Con gente dentro la única salida segura es cancelar: la reserva
                cuelga del evento con borrado en cascada, así que eliminarlo se
                llevaría sus reservas sin devolverles la clase.
              */}
              {event && event.booked > 0 ? (
                <DeleteButton
                  id={sessionId}
                  onDelete={cancelEventAction}
                  label="Cancelar"
                  confirmText={`Se cancelará el evento y se devolverá su clase a las ${event.booked} personas que ya reservaron.`}
                />
              ) : (
                <DeleteButton
                  id={sessionId}
                  onDelete={deleteSessionAction}
                  confirmText="¿Eliminar este evento? Nadie ha reservado todavía."
                />
              )}
            </>
          ) : null}
          <SaveButton label={event ? "Guardar" : "Agendar clase"} />
        </div>
      </div>
    </form>
  );
}

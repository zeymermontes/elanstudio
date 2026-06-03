"use client";

import { useActionState } from "react";
import {
  saveWeeklyClassAction,
  deleteWeeklyClassAction,
  type FormState,
} from "@/lib/actions/admin";
import type { ClassType, Coach, Location, WeeklyClass } from "@/lib/types";
import { WEEKDAYS } from "@/lib/weekdays";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";
import { DeleteButton } from "./delete-button";

export function WeeklyClassForm({
  weekly,
  classTypes,
  coaches,
  locations,
}: {
  weekly?: WeeklyClass;
  classTypes: ClassType[];
  coaches: Coach[];
  locations: Location[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveWeeklyClassAction,
    null,
  );

  return (
    <form action={action} className="surface-card rounded-2xl px-6 py-6 shadow-soft">
      {weekly ? <input type="hidden" name="id" value={weekly.id} /> : null}
      <div className="space-y-4">
        <StatusBanner state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Clase">
            <select name="class_type_id" defaultValue={weekly?.classTypeId ?? ""} required className={inputClass}>
              <option value="">Selecciona…</option>
              {classTypes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Día de la semana">
            <select name="weekday" defaultValue={weekly?.weekday ?? 1} className={inputClass}>
              {WEEKDAYS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Hora">
            <input type="time" name="start_time" defaultValue={weekly?.startTime ?? "07:00"} required className={inputClass} />
          </Field>
          <Field label="Capacidad">
            <input type="number" name="capacity" min={1} defaultValue={weekly?.capacity ?? 10} className={inputClass} />
          </Field>
          <Field label="Coach">
            <select name="coach_id" defaultValue={weekly?.coachId ?? ""} className={inputClass}>
              <option value="">—</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Ubicación">
            <select name="location_id" defaultValue={weekly?.locationId ?? ""} className={inputClass}>
              <option value="">—</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-4">
          <label className="mr-auto flex items-center gap-2 text-sm text-ink-soft">
            Estado
            <select
              name="active"
              defaultValue={weekly ? (weekly.active ? "true" : "false") : "true"}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
            >
              <option value="true">Activa</option>
              <option value="false">Pausada</option>
            </select>
          </label>
          {weekly ? (
            <DeleteButton
              id={weekly.id}
              onDelete={deleteWeeklyClassAction}
              confirmText="¿Eliminar esta clase semanal del horario?"
            />
          ) : null}
          <SaveButton label={weekly ? "Guardar" : "Agregar al horario"} />
        </div>
      </div>
    </form>
  );
}

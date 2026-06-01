"use client";

import { useActionState } from "react";
import { createSessionAction, type FormState } from "@/lib/actions/admin";
import type { ClassType, Coach, Location } from "@/lib/types";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";

export function SessionForm({
  classTypes,
  coaches,
  locations,
}: {
  classTypes: ClassType[];
  coaches: Coach[];
  locations: Location[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    createSessionAction,
    null,
  );

  return (
    <form action={action} className="surface-card rounded-2xl px-6 py-6 shadow-soft">
      <div className="space-y-4">
        <StatusBanner state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Clase">
            <select name="class_type_id" required className={inputClass}>
              <option value="">Selecciona…</option>
              {classTypes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha y hora">
            <input type="datetime-local" name="starts_at" required className={inputClass} />
          </Field>
          <Field label="Coach">
            <select name="coach_id" className={inputClass}>
              <option value="">—</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ubicación">
            <select name="location_id" className={inputClass}>
              <option value="">—</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Capacidad (opcional)">
            <input type="number" name="capacity" min={1} placeholder="Por defecto de la clase" className={inputClass} />
          </Field>
        </div>
        <div className="flex justify-end">
          <SaveButton label="Agendar clase" />
        </div>
      </div>
    </form>
  );
}

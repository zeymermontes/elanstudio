"use client";

import { useActionState } from "react";
import {
  saveServiceAction,
  deleteServiceAction,
  saveClassTypeAction,
  deleteClassTypeAction,
  type FormState,
} from "@/lib/actions/admin";
import type { Service, ClassType } from "@/lib/types";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";
import { DeleteButton } from "./delete-button";
import { ImageUploadField } from "./image-upload";

const LEVELS = [
  "Todos los niveles",
  "Principiante",
  "Intermedio",
  "Avanzado",
];

export function ServiceForm({ service }: { service?: Service }) {
  const [state, action] = useActionState<FormState, FormData>(
    saveServiceAction,
    null,
  );
  return (
    <form action={action} className="surface-card rounded-2xl px-6 py-6 shadow-soft">
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <div className="space-y-4">
        <StatusBanner state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del servicio">
            <input name="name" defaultValue={service?.name} required className={inputClass} />
          </Field>
          <Field label="Orden">
            <input name="order" type="number" defaultValue={service?.order ?? 0} className={inputClass} />
          </Field>
        </div>
        <Field label="Descripción">
          <input name="description" defaultValue={service?.description} className={inputClass} />
        </Field>
        <div className="flex items-center justify-end gap-4">
          {service ? (
            <DeleteButton id={service.id} onDelete={deleteServiceAction} confirmText="¿Eliminar este servicio?" />
          ) : null}
          <SaveButton label={service ? "Guardar" : "Agregar servicio"} />
        </div>
      </div>
    </form>
  );
}

export function ClassTypeForm({
  classType,
  services,
}: {
  classType?: ClassType;
  services: Service[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveClassTypeAction,
    null,
  );
  return (
    <form action={action} className="surface-card rounded-2xl px-6 py-6 shadow-soft">
      {classType ? <input type="hidden" name="id" value={classType.id} /> : null}
      <div className="space-y-4">
        <StatusBanner state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de la clase">
            <input name="name" defaultValue={classType?.name} required className={inputClass} />
          </Field>
          <Field label="Servicio">
            <select name="service_id" defaultValue={classType?.serviceId ?? ""} className={inputClass}>
              <option value="">—</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Descripción">
          <input name="description" defaultValue={classType?.description} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Duración (min)">
            <input name="duration_min" type="number" min={1} defaultValue={classType?.durationMin ?? 50} className={inputClass} />
          </Field>
          <Field label="Nivel">
            <select name="level" defaultValue={classType?.level ?? "Todos los niveles"} className={inputClass}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Capacidad por defecto">
            <input name="default_capacity" type="number" min={1} defaultValue={classType?.defaultCapacity ?? 10} className={inputClass} />
          </Field>
        </div>
        <ImageUploadField
          name="image_url"
          label="Imagen de la clase (opcional)"
          folder="classes"
          defaultValue={classType?.imageUrl ?? ""}
        />
        <div className="flex items-center justify-end gap-4">
          {classType ? (
            <DeleteButton
              id={classType.id}
              onDelete={deleteClassTypeAction}
              confirmText="¿Eliminar esta clase? También se borrarán sus sesiones agendadas."
            />
          ) : null}
          <SaveButton label={classType ? "Guardar" : "Agregar clase"} />
        </div>
      </div>
    </form>
  );
}

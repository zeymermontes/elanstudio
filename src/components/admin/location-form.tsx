"use client";

import { useActionState } from "react";
import {
  saveLocationAction,
  deleteLocationAction,
  type FormState,
} from "@/lib/actions/admin";
import type { Location } from "@/lib/types";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";
import { DeleteButton } from "./delete-button";

export function LocationForm({ location }: { location?: Location }) {
  const [state, action] = useActionState<FormState, FormData>(
    saveLocationAction,
    null,
  );

  return (
    <form action={action} className="surface-card rounded-2xl px-6 py-6 shadow-soft">
      {location ? <input type="hidden" name="id" value={location.id} /> : null}
      <div className="space-y-4">
        <StatusBanner state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre">
            <input name="name" defaultValue={location?.name} required className={inputClass} />
          </Field>
          <Field label="Ciudad">
            <input name="city" defaultValue={location?.city} className={inputClass} />
          </Field>
        </div>
        <Field label="Dirección">
          <input name="address" defaultValue={location?.address} className={inputClass} />
        </Field>
        <Field label="Horario">
          <input name="hours" defaultValue={location?.hours} className={inputClass} placeholder="Lun–Vie 7:00–20:00" />
        </Field>
        <Field label="Enlace de Google Maps (opcional)">
          <input
            name="map_url"
            defaultValue={location?.mapUrl ?? ""}
            placeholder="https://maps.google.com/…"
            className={inputClass}
          />
        </Field>
        <Field label="URL de imagen (opcional)">
          <input
            name="image_url"
            defaultValue={location?.imageUrl ?? ""}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
        <div className="flex items-center justify-end gap-4">
          {location ? (
            <DeleteButton id={location.id} onDelete={deleteLocationAction} confirmText="¿Eliminar esta ubicación?" />
          ) : null}
          <SaveButton label={location ? "Guardar" : "Agregar ubicación"} />
        </div>
      </div>
    </form>
  );
}

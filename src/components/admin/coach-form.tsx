"use client";

import { useActionState } from "react";
import {
  saveCoachAction,
  deleteCoachAction,
  type FormState,
} from "@/lib/actions/admin";
import type { Coach } from "@/lib/types";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";
import { DeleteButton } from "./delete-button";
import { ImageUploadField } from "./image-upload";

export function CoachForm({ coach }: { coach?: Coach }) {
  const [state, action] = useActionState<FormState, FormData>(
    saveCoachAction,
    null,
  );

  return (
    <form action={action} className="surface-card rounded-2xl px-6 py-6 shadow-soft">
      {coach ? <input type="hidden" name="id" value={coach.id} /> : null}
      <div className="space-y-4">
        <StatusBanner state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre">
            <input name="name" defaultValue={coach?.name} required className={inputClass} />
          </Field>
          <Field label="Rol / título">
            <input name="role" defaultValue={coach?.role} className={inputClass} placeholder="Coach · Reformer" />
          </Field>
        </div>
        <Field label="Biografía">
          <textarea name="bio" defaultValue={coach?.bio} rows={2} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Especialidades (separadas por coma)">
            <input
              name="specialties"
              defaultValue={coach?.specialties.join(", ")}
              className={inputClass}
              placeholder="Reformer, Postura, Movilidad"
            />
          </Field>
          <Field label="Instagram (usuario)">
            <input name="instagram" defaultValue={coach?.instagram ?? ""} className={inputClass} />
          </Field>
        </div>
        <ImageUploadField
          name="photo_url"
          label="Foto (opcional)"
          folder="coaches"
          defaultValue={coach?.photoUrl ?? ""}
        />
        <div className="flex items-center justify-end gap-4">
          {coach ? (
            <DeleteButton id={coach.id} onDelete={deleteCoachAction} confirmText="¿Eliminar este coach?" />
          ) : null}
          <SaveButton label={coach ? "Guardar" : "Agregar coach"} />
        </div>
      </div>
    </form>
  );
}

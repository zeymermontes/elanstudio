"use client";

import { useActionState } from "react";
import {
  savePackageAction,
  deletePackageAction,
  type FormState,
} from "@/lib/actions/admin";
import type { Package } from "@/lib/types";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";
import { DeleteButton } from "./delete-button";

export function PackageForm({ pkg }: { pkg?: Package }) {
  const [state, action] = useActionState<FormState, FormData>(
    savePackageAction,
    null,
  );

  return (
    <form
      action={action}
      className="surface-card rounded-2xl px-6 py-6 shadow-soft"
    >
      {pkg ? <input type="hidden" name="id" value={pkg.id} /> : null}
      <div className="space-y-4">
        <StatusBanner state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre">
            <input name="name" defaultValue={pkg?.name} required className={inputClass} />
          </Field>
          <Field label="Descripción">
            <input name="description" defaultValue={pkg?.description} className={inputClass} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Créditos (999 = ilimitado)">
            <input name="credits" type="number" min={1} defaultValue={pkg?.credits ?? 1} className={inputClass} />
          </Field>
          <Field label="Precio (MXN)">
            <input name="price_mxn" type="number" min={0} step="1" defaultValue={pkg?.priceMxn ?? 0} className={inputClass} />
          </Field>
          <Field label="Vigencia (días)">
            <input name="validity_days" type="number" min={1} defaultValue={pkg?.validityDays ?? 30} className={inputClass} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" name="featured" defaultChecked={pkg?.featured} className="accent-pink" />
            Destacado
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            Estado
            <select
              name="active"
              defaultValue={pkg ? (pkg.active ? "true" : "false") : "true"}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
          <div className="ml-auto flex items-center gap-4">
            {pkg ? (
              <DeleteButton id={pkg.id} onDelete={deletePackageAction} confirmText="¿Eliminar este paquete?" />
            ) : null}
            <SaveButton label={pkg ? "Guardar" : "Crear paquete"} />
          </div>
        </div>
      </div>
    </form>
  );
}

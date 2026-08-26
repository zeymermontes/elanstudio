"use client";

import { useActionState } from "react";
import {
  savePackageAction,
  deletePackageAction,
  type FormState,
} from "@/lib/actions/admin";
import type { PackageWithStock } from "@/lib/admin-data";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";
import { DeleteButton } from "./delete-button";

export function PackageForm({ pkg }: { pkg?: PackageWithStock }) {
  const [state, action] = useActionState<FormState, FormData>(
    savePackageAction,
    null,
  );
  const stock = pkg?.stock ?? null;

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
          <Field label="Clases (999 = ilimitado)">
            <input name="credits" type="number" min={1} defaultValue={pkg?.credits ?? 1} className={inputClass} />
          </Field>
          <Field label="Precio (MXN)">
            <input name="price_mxn" type="number" min={0} step="1" defaultValue={pkg?.priceMxn ?? 0} className={inputClass} />
          </Field>
          <Field label="Vigencia (días)">
            <input name="validity_days" type="number" min={1} defaultValue={pkg?.validityDays ?? 30} className={inputClass} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Límite de compras (vacío = sin límite)">
            <input
              name="stock_limit"
              type="number"
              min={1}
              defaultValue={pkg?.stockLimit ?? ""}
              placeholder="Sin límite"
              className={inputClass}
            />
          </Field>
          <label className="flex items-end gap-2 pb-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="show_stock_left"
              defaultChecked={pkg?.showStockLeft}
              className="accent-pink"
            />
            Mostrar cuántos quedan en el sitio
          </label>
        </div>

        {stock ? (
          <p
            className={`rounded-xl px-4 py-2.5 text-sm ${
              stock.soldOut
                ? "bg-pink-soft/60 text-pink-strong"
                : "bg-gold-soft/40 text-ink"
            }`}
          >
            {stock.soldOut ? (
              <>
                <strong>Terminado</strong> — se vendieron los {stock.limit} y ya
                no aparece en el sitio.
              </>
            ) : (
              <>
                {stock.sold} de {stock.limit} vendidos · quedan {stock.left}.
              </>
            )}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" name="featured" defaultChecked={pkg?.featured} className="accent-pink" />
            Destacado
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" name="recurring" defaultChecked={pkg?.recurring} className="accent-pink" />
            Suscripción mensual
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

"use client";

import { useActionState, useState } from "react";
import {
  savePromotionAction,
  deletePromotionAction,
  type FormState,
} from "@/lib/actions/admin";
import type { Package, PromotionWithScope } from "@/lib/types";
import { toDateTimeLocal } from "@/lib/format";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";
import { DeleteButton } from "./delete-button";

export function PromotionForm({
  promo,
  packages,
}: {
  promo?: PromotionWithScope;
  /** One-time packages only — the monthly plan can't be discounted. */
  packages: Package[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    savePromotionAction,
    null,
  );
  const [kind, setKind] = useState<"percent" | "amount">(
    promo?.kind ?? "percent",
  );

  return (
    <form
      action={action}
      className="surface-card rounded-2xl px-6 py-6 shadow-soft"
    >
      {promo ? <input type="hidden" name="id" value={promo.id} /> : null}
      <div className="space-y-4">
        <StatusBanner state={state} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre (lo ve el cliente)">
            <input
              name="name"
              defaultValue={promo?.name}
              required
              placeholder="Buen Fin"
              className={inputClass}
            />
          </Field>
          <Field label="Código (vacío = se aplica solo)">
            <input
              name="code"
              defaultValue={promo?.code ?? ""}
              placeholder="BIENVENIDA"
              className={`${inputClass} uppercase`}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de descuento">
            <select
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as "percent" | "amount")}
              className={inputClass}
            >
              <option value="percent">Porcentaje (%)</option>
              <option value="amount">Cantidad fija (MXN)</option>
            </select>
          </Field>
          <Field label={kind === "percent" ? "Porcentaje" : "Pesos a descontar"}>
            <input
              name="value"
              type="number"
              min={1}
              max={kind === "percent" ? 100 : undefined}
              // Steps are counted from `min`, so a step of 10 would have made
              // 650 invalid (the browser only accepts 1, 11, 21…). Percentages
              // allow one decimal; pesos are whole.
              step={kind === "percent" ? 0.1 : 1}
              defaultValue={promo?.value ?? (kind === "percent" ? 10 : 100)}
              required
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Inicia (vacío = de inmediato)">
            <input
              name="starts_at"
              type="datetime-local"
              defaultValue={toDateTimeLocal(promo?.startsAt ?? null)}
              className={inputClass}
            />
          </Field>
          <Field label="Termina (vacío = sin fecha de fin)">
            <input
              name="ends_at"
              type="datetime-local"
              defaultValue={toDateTimeLocal(promo?.endsAt ?? null)}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Máximo de canjes (vacío = sin tope)">
            <input
              name="max_redemptions"
              type="number"
              min={1}
              defaultValue={promo?.maxRedemptions ?? ""}
              placeholder="Sin tope"
              className={inputClass}
            />
          </Field>
          <Field label="Máximo por persona (vacío = sin tope)">
            <input
              name="max_per_user"
              type="number"
              min={1}
              defaultValue={promo?.maxPerUser ?? ""}
              placeholder="Sin tope"
              className={inputClass}
            />
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 block text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft">
            Paquetes (ninguno = todos)
          </legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {packages.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 text-sm text-ink-soft"
              >
                <input
                  type="checkbox"
                  name="package_ids"
                  value={p.id}
                  defaultChecked={promo?.packageIds.includes(p.id)}
                  className="accent-pink"
                />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="new_clients_only"
              defaultChecked={promo?.newClientsOnly}
              className="accent-pink"
            />
            Solo primera compra
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            Estado
            <select
              name="active"
              defaultValue={promo ? (promo.active ? "true" : "false") : "true"}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
            >
              <option value="true">Activa</option>
              <option value="false">Pausada</option>
            </select>
          </label>

          {promo ? (
            <span className="text-sm text-ink-soft">
              {promo.redemptions} canje{promo.redemptions === 1 ? "" : "s"}
              {promo.maxRedemptions ? ` de ${promo.maxRedemptions}` : ""}
            </span>
          ) : null}

          <div className="ml-auto flex items-center gap-4">
            {promo ? (
              <DeleteButton
                id={promo.id}
                onDelete={deletePromotionAction}
                confirmText="¿Eliminar esta promoción?"
              />
            ) : null}
            <SaveButton label={promo ? "Guardar" : "Crear promoción"} />
          </div>
        </div>
      </div>
    </form>
  );
}

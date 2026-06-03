"use client";

import { useActionState, useState } from "react";
import { sellAction } from "@/lib/actions/admin-users";
import type { FormState } from "@/lib/actions/admin";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";

/** Staff manual sale: add classes to a member by email, with optional expiry. */
export function SellForm() {
  const [state, action] = useActionState<FormState, FormData>(sellAction, null);
  const [expiry, setExpiry] = useState("");
  const [quick, setQuick] = useState("none");

  function inDays(n: number) {
    // eslint-disable-next-line react-hooks/purity
    return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  }
  function pickDays(n: number, key: string) {
    setExpiry(inDays(n));
    setQuick(key);
  }

  const quickBtn = (key: string, label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-[0.7rem] uppercase tracking-[0.12em] transition-colors ${
        quick === key
          ? "bg-pink text-white"
          : "border border-line text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <form action={action} className="surface-card rounded-2xl px-6 py-6 shadow-soft">
      <div className="space-y-4">
        <StatusBanner state={state} />
        <Field label="Correo de la clienta">
          <input
            name="email"
            type="email"
            required
            placeholder="clienta@correo.com"
            className={inputClass}
          />
        </Field>
        <Field label="Clases a agregar">
          <input
            name="amount"
            type="number"
            min={1}
            defaultValue={1}
            className={inputClass}
          />
        </Field>

        <div>
          <span className="mb-1.5 block text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft">
            Vigencia
          </span>
          <div className="flex flex-wrap gap-2">
            {quickBtn("7", "7 días", () => pickDays(7, "7"))}
            {quickBtn("15", "15 días", () => pickDays(15, "15"))}
            {quickBtn("30", "30 días", () => pickDays(30, "30"))}
            {quickBtn("none", "Sin vencimiento", () => {
              setExpiry("");
              setQuick("none");
            })}
          </div>
          <div className="mt-3">
            <span className="mb-1.5 block text-[0.65rem] uppercase tracking-[0.12em] text-ink-soft">
              O fecha específica
            </span>
            <input
              type="date"
              name="expires_at"
              value={expiry}
              onChange={(e) => {
                setExpiry(e.target.value);
                setQuick(e.target.value ? "custom" : "none");
              }}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <SaveButton label="Agregar clases" />
        </div>
      </div>
    </form>
  );
}

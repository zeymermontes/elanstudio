"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adjustCreditsAction,
  grantSubscriptionAction,
  cancelUserSubscriptionAction,
  setRoleAction,
} from "@/lib/actions/admin-users";
import { Shield, ShieldOff } from "lucide-react";
import type { FormState } from "@/lib/actions/admin";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";

/** Add or remove credits for a member, with optional expiry. */
export function AdjustCreditsForm({ userId }: { userId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    adjustCreditsAction,
    null,
  );
  const [sign, setSign] = useState("add");
  const [expiry, setExpiry] = useState(""); // yyyy-mm-dd ("" = sin vencimiento)
  const [quick, setQuick] = useState<string>("none");

  function inDays(n: number) {
    // Called only from click handlers, never during render.
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
      <input type="hidden" name="user_id" value={userId} />
      <h3 className="mb-4 font-serif text-xl text-ink">Ajustar clases</h3>
      <div className="space-y-4">
        <StatusBanner state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Acción">
            <select
              name="sign"
              value={sign}
              onChange={(e) => setSign(e.target.value)}
              className={inputClass}
            >
              <option value="add">Agregar</option>
              <option value="remove">Quitar</option>
            </select>
          </Field>
          <Field label="Cantidad (clases)">
            <input name="amount" type="number" min={1} defaultValue={1} className={inputClass} />
          </Field>
        </div>

        {sign === "add" ? (
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
        ) : null}

        <div className="flex justify-end">
          <SaveButton label="Aplicar" />
        </div>
      </div>
    </form>
  );
}

/** Grant or extend a manual subscription. */
export function GrantSubscriptionForm({ userId }: { userId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    grantSubscriptionAction,
    null,
  );
  return (
    <form action={action} className="surface-card rounded-2xl px-6 py-6 shadow-soft">
      <input type="hidden" name="user_id" value={userId} />
      <h3 className="mb-4 font-serif text-xl text-ink">Suscripción manual</h3>
      <div className="space-y-4">
        <StatusBanner state={state} />
        <Field label="Meses a otorgar / extender">
          <input name="months" type="number" min={1} defaultValue={1} className={inputClass} />
        </Field>
        <p className="text-xs text-ink-soft">
          Otorga acceso ilimitado sin cobro (no usa Mercado Pago). Si ya tiene
          suscripción activa, extiende el periodo.
        </p>
        <div className="flex justify-end">
          <SaveButton label="Otorgar / extender" />
        </div>
      </div>
    </form>
  );
}

/** Toggle a member's admin role. */
export function RoleToggle({
  userId,
  isAdmin,
}: {
  userId: string;
  isAdmin: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle() {
    const msg = isAdmin
      ? "¿Quitar el acceso de administrador a esta persona?"
      : "¿Dar acceso de administrador a esta persona? Podrá gestionar todo el estudio.";
    if (!confirm(msg)) return;
    start(async () => {
      const res = await setRoleAction(userId, !isAdmin);
      if (res?.error) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[0.7rem] uppercase tracking-[0.12em] transition-colors disabled:opacity-60 ${
        isAdmin
          ? "border-line text-ink-soft hover:text-pink-strong"
          : "border-gold/50 text-gold hover:border-gold"
      }`}
    >
      {isAdmin ? (
        <>
          <ShieldOff size={14} strokeWidth={1.5} />
          {pending ? "…" : "Quitar admin"}
        </>
      ) : (
        <>
          <Shield size={14} strokeWidth={1.5} />
          {pending ? "…" : "Hacer admin"}
        </>
      )}
    </button>
  );
}

/** Cancel a member's active subscription. */
export function CancelUserSubscription({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  function cancel() {
    if (!confirm("¿Cancelar la suscripción de este usuario?")) return;
    start(async () => {
      await cancelUserSubscriptionAction(userId);
      router.refresh();
    });
  }
  return (
    <button
      onClick={cancel}
      disabled={pending}
      className="text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong disabled:opacity-60"
    >
      {pending ? "Cancelando…" : "Cancelar suscripción"}
    </button>
  );
}

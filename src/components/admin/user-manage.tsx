"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adjustCreditsAction,
  grantSubscriptionAction,
  cancelUserSubscriptionAction,
} from "@/lib/actions/admin-users";
import type { FormState } from "@/lib/actions/admin";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";

/** Add or remove credits for a member. */
export function AdjustCreditsForm({ userId }: { userId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    adjustCreditsAction,
    null,
  );
  return (
    <form action={action} className="surface-card rounded-2xl px-6 py-6 shadow-soft">
      <input type="hidden" name="user_id" value={userId} />
      <h3 className="mb-4 font-serif text-xl text-ink">Ajustar créditos</h3>
      <div className="space-y-4">
        <StatusBanner state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Acción">
            <select name="sign" defaultValue="add" className={inputClass}>
              <option value="add">Agregar</option>
              <option value="remove">Quitar</option>
            </select>
          </Field>
          <Field label="Cantidad (clases)">
            <input name="amount" type="number" min={1} defaultValue={1} className={inputClass} />
          </Field>
        </div>
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

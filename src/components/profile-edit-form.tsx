"use client";

import { useActionState } from "react";
import {
  updateProfileAction,
  type ProfileState,
} from "@/lib/actions/profile";

const inputClass =
  "w-full rounded-xl border border-line bg-surface/70 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-pink";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft">
      {children}
    </span>
  );
}

export function ProfileEditForm({
  birthDate,
  injuries,
  health,
  notes,
}: {
  birthDate: string;
  injuries: string;
  health: string;
  notes: string;
}) {
  const [state, action] = useActionState<ProfileState, FormData>(
    updateProfileAction,
    null,
  );

  return (
    <form action={action} className="space-y-5">
      {state?.error ? (
        <p className="rounded-xl bg-pink-soft/60 px-4 py-3 text-sm text-pink-strong">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="rounded-xl bg-gold-soft/40 px-4 py-3 text-sm text-ink">
          Tu información se actualizó. ♡
        </p>
      ) : null}

      <label className="block">
        <Label>Tu cumpleaños 🎂</Label>
        <input
          type="date"
          name="birth_date"
          defaultValue={birthDate}
          className={inputClass}
        />
      </label>

      <label className="block">
        <Label>¿Hay alguna lesión o molestia que debamos cuidar?</Label>
        <textarea
          name="injuries"
          rows={2}
          defaultValue={injuries}
          placeholder="Cuéntanos para adaptar los ejercicios a ti"
          className={inputClass}
        />
      </label>

      <label className="block">
        <Label>¿Algo de salud que tus coaches deban tener presente?</Label>
        <textarea
          name="health_conditions"
          rows={2}
          defaultValue={health}
          className={inputClass}
        />
      </label>

      <label className="block">
        <Label>¿Algo más que quieras contarnos?</Label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={notes}
          className={inputClass}
        />
      </label>

      <button
        type="submit"
        className="rounded-full bg-pink px-7 py-3 text-sm uppercase tracking-[0.18em] text-white shadow-soft transition-colors hover:bg-pink-strong"
      >
        Guardar cambios
      </button>
    </form>
  );
}

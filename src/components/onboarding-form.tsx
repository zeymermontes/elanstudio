"use client";

import { useActionState } from "react";
import {
  completeOnboardingAction,
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

export function OnboardingForm({ firstName }: { firstName: string }) {
  const [state, action] = useActionState<ProfileState, FormData>(
    completeOnboardingAction,
    null,
  );

  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <div className="text-center">
        <p className="text-[0.7rem] uppercase tracking-luxe text-gold">
          Te damos la bienvenida{firstName ? `, ${firstName}` : ""} ♡
        </p>
        <h1 className="mt-2 font-serif text-4xl text-ink">
          Qué gusto tenerte aquí
        </h1>
        <div className="gold-rule mx-auto my-6 w-24" />
        <p className="text-sm leading-relaxed text-ink-soft">
          Ahora eres parte de ÉLANSTUDIO. Cuéntanos un poquito de ti para que
          tus coaches puedan acompañarte y cuidarte en cada movimiento. Todo es
          opcional y completamente privado.
        </p>
      </div>

      <form action={action} className="mt-8 space-y-5">
        {state?.error ? (
          <p className="rounded-xl bg-pink-soft/60 px-4 py-3 text-sm text-pink-strong">
            {state.error}
          </p>
        ) : null}

        <label className="block">
          <Label>Tu cumpleaños 🎂</Label>
          <input type="date" name="birth_date" className={inputClass} />
          <span className="mt-1 block text-xs text-ink-soft">
            Para celebrarte como mereces en tu día.
          </span>
        </label>

        <label className="block">
          <Label>¿Hay alguna lesión o molestia que debamos cuidar?</Label>
          <textarea
            name="injuries"
            rows={2}
            placeholder="Cuéntanos para adaptar los ejercicios a ti (déjalo vacío si todo bien)"
            className={inputClass}
          />
        </label>

        <label className="block">
          <Label>¿Algo de salud que tus coaches deban tener presente?</Label>
          <textarea
            name="health_conditions"
            rows={2}
            placeholder="Solo si quieres compartirlo — nos ayuda a acompañarte mejor"
            className={inputClass}
          />
        </label>

        <label className="block">
          <Label>¿Algo más que quieras contarnos?</Label>
          <textarea
            name="notes"
            rows={2}
            placeholder="Tus objetivos, lo que te emociona, cómo te gusta que te acompañen…"
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-full bg-pink px-6 py-3 text-sm uppercase tracking-[0.18em] text-white shadow-soft transition-colors hover:bg-pink-strong"
        >
          Comenzar mi experiencia
        </button>
        <p className="text-center text-xs text-ink-soft">
          Tu información es privada y solo la usamos para cuidarte.
        </p>
      </form>
    </div>
  );
}

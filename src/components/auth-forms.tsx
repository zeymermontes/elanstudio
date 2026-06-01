"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, signUpAction, type AuthState } from "@/lib/actions/auth";

const inputClass =
  "w-full rounded-xl border border-line bg-surface/70 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-pink";

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="rounded-xl bg-pink-soft/60 px-4 py-3 text-sm text-pink-strong">
      {error}
    </p>
  );
}

function Submit({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="w-full rounded-full bg-pink px-6 py-3 text-sm uppercase tracking-[0.18em] text-white shadow-soft transition-colors hover:bg-pink-strong"
    >
      {label}
    </button>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(
    signInAction,
    null,
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <ErrorNote error={state?.error} />
      <input
        name="email"
        type="email"
        required
        placeholder="Correo electrónico"
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Contraseña"
        className={inputClass}
      />
      <Submit label="Ingresar" />
      <p className="pt-2 text-center text-sm text-ink-soft">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="text-pink-strong hover:underline">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState<AuthState, FormData>(
    signUpAction,
    null,
  );
  return (
    <form action={action} className="space-y-4">
      <ErrorNote error={state?.error} />
      <input
        name="full_name"
        type="text"
        required
        placeholder="Nombre completo"
        className={inputClass}
      />
      <input
        name="phone"
        type="tel"
        placeholder="Teléfono (opcional)"
        className={inputClass}
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Correo electrónico"
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Contraseña (mín. 6 caracteres)"
        className={inputClass}
      />
      <Submit label="Crear cuenta" />
      <p className="pt-2 text-center text-sm text-ink-soft">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="text-pink-strong hover:underline">
          Ingresar
        </Link>
      </p>
    </form>
  );
}

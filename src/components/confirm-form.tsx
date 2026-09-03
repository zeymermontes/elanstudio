"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { confirmEmailAction, type AuthState } from "@/lib/actions/auth";

/**
 * El botón que consume el token del correo. Ver confirmEmailAction: la
 * verificación ocurre al apretarlo, nunca al abrir la página, para que los
 * escáneres de correo no gasten el enlace antes que la persona.
 */
export function ConfirmForm({
  tokenHash,
  type,
  next,
  label,
}: {
  tokenHash: string;
  type: string;
  next: string;
  label: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    confirmEmailAction,
    null,
  );

  if (state?.error)
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-xl bg-pink-soft/60 px-4 py-3 text-sm leading-relaxed text-pink-strong">
          {state.error}
        </p>
        <Link
          href="/ingresar"
          className="inline-flex rounded-full border border-gold/50 px-6 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-ink transition-colors hover:border-gold hover:text-pink-strong"
        >
          Ir a ingresar
        </Link>
      </div>
    );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-pink px-6 py-3.5 text-sm uppercase tracking-[0.18em] text-white shadow-soft transition-colors hover:bg-pink-strong disabled:opacity-60"
      >
        {pending ? "Un momento…" : label}
        {pending ? null : <ArrowRight size={16} strokeWidth={1.5} />}
      </button>
    </form>
  );
}

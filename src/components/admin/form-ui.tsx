"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/actions/admin";

export const inputClass =
  "w-full rounded-xl border border-line bg-surface/70 px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-pink";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}

export function StatusBanner({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p className="rounded-xl bg-pink-soft/60 px-4 py-2.5 text-sm text-pink-strong">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="rounded-xl bg-gold-soft/40 px-4 py-2.5 text-sm text-ink">
        Guardado correctamente.
      </p>
    );
  return null;
}

export function SaveButton({ label = "Guardar" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-pink px-7 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink-strong disabled:opacity-60"
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}

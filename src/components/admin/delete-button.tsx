"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { FormState } from "@/lib/actions/admin";

/**
 * Generic delete button. Receives a server action (id) => Promise and the id.
 * Confirms before firing.
 */
export function DeleteButton({
  id,
  onDelete,
  label = "Eliminar",
  confirmText = "¿Eliminar este elemento?",
}: {
  id: string;
  onDelete: (id: string) => Promise<FormState>;
  label?: string;
  confirmText?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm(confirmText)) start(() => onDelete(id).then(() => {}));
      }}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong disabled:opacity-60"
    >
      <Trash2 size={13} strokeWidth={1.5} />
      {pending ? "…" : label}
    </button>
  );
}

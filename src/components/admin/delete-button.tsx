"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { FormState } from "@/lib/actions/admin";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * Generic delete button. Opens a branded confirmation modal (with a loading
 * spinner while deleting) instead of the native confirm().
 */
export function DeleteButton({
  id,
  onDelete,
  label = "Eliminar",
  confirmText = "Esta acción no se puede deshacer.",
}: {
  id: string;
  onDelete: (id: string) => Promise<FormState>;
  label?: string;
  confirmText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function confirm() {
    start(async () => {
      await onDelete(id);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong"
      >
        <Trash2 size={13} strokeWidth={1.5} />
        {label}
      </button>

      {open ? (
        <ConfirmDialog
          message={confirmText}
          confirmLabel="Eliminar"
          loadingLabel="Eliminando…"
          loading={pending}
          onConfirm={confirm}
          onCancel={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

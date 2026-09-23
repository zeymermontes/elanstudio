"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarX } from "lucide-react";
import { adminCancelBookingAction } from "@/lib/actions/admin-users";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * "Cancelar reserva" por una alumna, desde la lista de una clase o desde su
 * ficha. Confirma antes: le devuelve lo que gastó y libera el lugar.
 */
export function CancelBookingButton({
  sessionId,
  userId,
  who,
}: {
  sessionId: string;
  userId: string;
  /** Cómo nombrar a la alumna en la confirmación. */
  who: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function confirm() {
    start(async () => {
      const res = await adminCancelBookingAction(sessionId, userId);
      setOpen(false);
      if (res && "error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={error ?? undefined}
        className={`inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] transition-colors hover:text-pink-strong ${
          error ? "text-pink-strong" : "text-ink-soft"
        }`}
      >
        <CalendarX size={13} strokeWidth={1.5} />
        {error ? "No se pudo" : "Cancelar reserva"}
      </button>

      {open ? (
        <ConfirmDialog
          title="¿Cancelar esta reserva?"
          message={`Se cancela la reserva de ${who} y se le devuelve lo que gastó (sus clases, con su vencimiento). Si pagó el lugar aparte, el dinero se devuelve a mano.`}
          confirmLabel="Cancelar reserva"
          loadingLabel="Cancelando…"
          loading={pending}
          onConfirm={confirm}
          onCancel={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

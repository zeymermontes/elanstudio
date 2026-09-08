"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, RotateCcw } from "lucide-react";
import { reviewTransferAction } from "@/lib/actions/transfer";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * Botones para revisar una transferencia. Con `reviewed` en false son la
 * primera revisión (Confirmar / Rechazar); después quedan como corrección:
 * una aprobada se puede rechazar y una rechazada volver a aprobar, por si el
 * admin se equivocó. Rechazar pide confirmación porque retira clases.
 */
export function TransferReview({
  purchaseId,
  status,
  reviewed,
  memberName,
  credits,
}: {
  purchaseId: string;
  status: string;
  reviewed: boolean;
  memberName: string;
  credits: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmReject, setConfirmReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(decision: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      const res = await reviewTransferAction(purchaseId, decision);
      setConfirmReject(false);
      if (!res.ok) setError(res.error ?? "No se pudo guardar.");
      router.refresh();
    });
  }

  const approved = status === "approved";
  const clases = credits === 1 ? "1 clase" : `${credits} clases`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!reviewed ? (
        <>
          <button
            type="button"
            onClick={() => run("approve")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full bg-pink px-4 py-2 text-[0.7rem] uppercase tracking-[0.12em] text-white shadow-soft transition-colors hover:bg-pink-strong disabled:opacity-60"
          >
            {pending ? (
              <Loader2 size={13} strokeWidth={2} className="animate-spin" />
            ) : (
              <Check size={13} strokeWidth={2} />
            )}
            Confirmar
          </button>
          <button
            type="button"
            onClick={() => setConfirmReject(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-pink-strong hover:text-pink-strong disabled:opacity-60"
          >
            <X size={13} strokeWidth={2} /> Rechazar
          </button>
        </>
      ) : approved ? (
        <button
          type="button"
          onClick={() => setConfirmReject(true)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong disabled:opacity-60"
        >
          <RotateCcw size={12} strokeWidth={1.75} /> Marcar rechazada
        </button>
      ) : (
        <button
          type="button"
          onClick={() => run("approve")}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={12} strokeWidth={2} className="animate-spin" />
          ) : (
            <RotateCcw size={12} strokeWidth={1.75} />
          )}
          Volver a aprobar
        </button>
      )}

      {error ? <p className="w-full text-xs text-pink-strong">{error}</p> : null}

      {confirmReject ? (
        <ConfirmDialog
          title="¿Rechazar la transferencia?"
          message={`Se le retirarán ${clases} a ${memberName}. Si luego resulta que sí llegó, puedes volver a aprobarla desde aquí mismo.`}
          confirmLabel="Rechazar"
          loadingLabel="Rechazando…"
          loading={pending}
          onConfirm={() => run("reject")}
          onCancel={() => setConfirmReject(false)}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reserveAction, cancelAction } from "@/lib/actions/booking";
import { bookingMessage } from "@/lib/booking-messages";

/** Confirmation card shown when arriving at /cuenta?reservar=<id>. */
export function ConfirmReserve({
  sessionId,
  label,
}: {
  sessionId: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  function confirm() {
    start(async () => {
      const res = await reserveAction(sessionId);
      setMsg({ ok: res.ok, text: bookingMessage(res.code) });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="surface-card mb-8 rounded-2xl border-l-2 border-pink px-6 py-5 shadow-soft">
      {msg ? (
        <p
          className={`text-sm ${msg.ok ? "text-gold" : "text-pink-strong"}`}
        >
          {msg.text}
        </p>
      ) : (
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-ink">
            Confirmar reserva: <span className="font-medium">{label}</span>
          </p>
          <button
            onClick={confirm}
            disabled={pending}
            className="rounded-full bg-pink px-6 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink-strong disabled:opacity-60"
          >
            {pending ? "Confirmando…" : "Confirmar"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Cancel button on a booked class. */
export function CancelBooking({ sessionId }: { sessionId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function cancel() {
    start(async () => {
      await cancelAction(sessionId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={cancel}
      disabled={pending}
      className="text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong disabled:opacity-60"
    >
      {pending ? "Cancelando…" : "Cancelar"}
    </button>
  );
}

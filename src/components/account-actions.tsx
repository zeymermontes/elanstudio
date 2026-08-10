"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reserveAction, cancelAction } from "@/lib/actions/booking";
import { bookingMessage } from "@/lib/booking-messages";
import { CANCEL_WINDOW_NOTE } from "@/lib/booking-rules";
import { cancelSubscriptionAction } from "@/lib/actions/subscription";

/** Confirmation card shown when arriving at /cuenta?reservar=<ref>. */
export function ConfirmReserve({
  refStr,
  label,
}: {
  refStr: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  function confirm() {
    start(async () => {
      const res = await reserveAction(refStr);
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

/** Cancel the monthly subscription (with confirmation). */
export function CancelSubscription() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const router = useRouter();

  function cancel() {
    if (!confirm("¿Cancelar tu suscripción mensual? No se harán más cobros."))
      return;
    start(async () => {
      const res = await cancelSubscriptionAction();
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
    });
  }

  if (done) {
    return (
      <span className="text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft">
        Suscripción cancelada
      </span>
    );
  }

  return (
    <button
      onClick={cancel}
      disabled={pending}
      className="text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong disabled:opacity-60"
    >
      {pending ? "Cancelando…" : "Cancelar suscripción"}
    </button>
  );
}

/**
 * Cancel button on a booked class.
 *
 * `canCancel` is computed on the server so the label doesn't depend on the
 * device's clock (and doesn't mismatch during hydration). It only hides the
 * button early — cancel_booking enforces the window regardless, which is why
 * the 'too_late' reply is still handled: the deadline can pass while the page
 * sits open.
 */
export function CancelBooking({
  sessionId,
  canCancel,
}: {
  sessionId: string;
  canCancel: boolean;
}) {
  const [pending, start] = useTransition();
  const [tooLate, setTooLate] = useState(false);
  const router = useRouter();

  function cancel() {
    start(async () => {
      const res = await cancelAction(sessionId);
      if (res.code === "too_late") {
        setTooLate(true);
        return;
      }
      router.refresh();
    });
  }

  if (!canCancel || tooLate) {
    return (
      <span
        title={CANCEL_WINDOW_NOTE}
        className="text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft/70"
      >
        Ya no se puede cancelar
      </span>
    );
  }

  return (
    <button
      onClick={cancel}
      disabled={pending}
      title={CANCEL_WINDOW_NOTE}
      className="text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong disabled:opacity-60"
    >
      {pending ? "Cancelando…" : "Cancelar"}
    </button>
  );
}

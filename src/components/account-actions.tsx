"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  reserveAction,
  reserveTrialAction,
  cancelAction,
} from "@/lib/actions/booking";
import { bookingMessage } from "@/lib/booking-messages";
import { CANCEL_WINDOW_NOTE } from "@/lib/booking-rules";
import { cancelSubscriptionAction } from "@/lib/actions/subscription";
import { trackPixel } from "@/lib/pixel";
import Link from "next/link";
import { formatMxn } from "@/lib/format";
import {
  creditsLabel,
  isSpecialPricing,
  isPayOnly,
  NOT_IN_PLAN_NOTE,
} from "@/lib/slot-cost";
import type { SlotPricing } from "@/lib/types";

/**
 * What a special class asks of this member (0027): its pricing, how many
 * credits she has and whether her monthly plan is active — enough to offer
 * "use your credits" and "pay separately" side by side.
 */
export type ReserveCost = {
  sessionId: string;
  pricing: SlotPricing;
  credits: number;
  subActive: boolean;
};

/**
 * Confirmation card shown when arriving at /cuenta?reservar=<ref>.
 *
 * `blocked` is a booking-result code ('started' / 'empty_closed') when the
 * class already closed while the member was on their way here — the server
 * computes it so the card explains it instead of offering a button that
 * book_session would only refuse.
 */
export function ConfirmReserve({
  refStr,
  label,
  blocked,
  cost = null,
  trial = false,
}: {
  refStr: string;
  label: string;
  blocked?: string | null;
  cost?: ReserveCost | null;
  /** Puede reservar esta clase como clase muestra, sin costo (0030). */
  trial?: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  // Clase especial: decidir aquí qué botones ofrecer, con la misma regla que
  // book_session aplica después (la mensualidad solo cubre lo incluido).
  const special = cost !== null && isSpecialPricing(cost.pricing);
  const payOnly = !!cost && isPayOnly(cost.pricing);
  const coveredByPlan =
    !!cost && !payOnly && cost.subActive && cost.pricing.planIncluded;
  const canUseCredits =
    !cost ||
    (!payOnly && (coveredByPlan || cost.credits >= cost.pricing.creditCost));
  const payHref = cost?.pricing.priceMxn
    ? `/comprar/evento/${cost.sessionId}`
    : null;

  function confirm() {
    start(async () => {
      const res = await reserveAction(refStr);
      setMsg({ ok: res.ok, text: bookingMessage(res.code) });
      if (res.ok) {
        trackPixel("Schedule"); // Pixel: reservó una clase
        router.refresh();
      }
    });
  }

  function confirmTrial() {
    start(async () => {
      const res = await reserveTrialAction(refStr);
      setMsg({
        ok: res.ok,
        text: res.ok
          ? "¡Tu clase muestra está reservada! Te esperamos."
          : bookingMessage(res.code),
      });
      if (res.ok) {
        trackPixel("Schedule");
        router.refresh();
      }
    });
  }

  // La muestra solo aplica a clases normales; una especial sigue su flujo.
  const useTrial = trial && !special;

  return (
    <div className="surface-card mb-8 rounded-2xl border-l-2 border-pink px-6 py-5 shadow-soft">
      {blocked && !msg ? (
        <p className="text-sm text-pink-strong">{bookingMessage(blocked)}</p>
      ) : msg ? (
        <p className={`text-sm ${msg.ok ? "text-gold" : "text-pink-strong"}`}>
          {msg.text}
        </p>
      ) : (
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-ink">
              Confirmar reserva: <span className="font-medium">{label}</span>
            </p>
            {useTrial ? (
              <p className="mt-1 text-xs text-gold">
                Es tu primera vez: esta clase es de muestra, sin costo.
              </p>
            ) : null}
            {special && cost ? (
              <p className="mt-1 text-xs text-ink-soft">
                {payOnly
                  ? "Esta clase especial solo se paga aparte; no descuenta clases ni la cubre la mensualidad."
                  : coveredByPlan
                    ? "Incluida en tu plan mensual."
                    : `Esta clase especial descuenta ${creditsLabel(cost.pricing.creditCost)}${
                        cost.credits >= cost.pricing.creditCost
                          ? ` · tienes ${creditsLabel(cost.credits)}`
                          : cost.credits > 0
                            ? ` · solo tienes ${creditsLabel(cost.credits)}`
                            : " · no tienes clases disponibles"
                      }.`}
                {!payOnly && cost.subActive && !cost.pricing.planIncluded ? (
                  <span className="text-pink-strong"> {NOT_IN_PLAN_NOTE}.</span>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {useTrial ? (
              <button
                onClick={confirmTrial}
                disabled={pending}
                className="rounded-full bg-pink px-6 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink-strong disabled:opacity-60"
              >
                {pending ? "Reservando…" : "Reservar clase muestra"}
              </button>
            ) : canUseCredits ? (
              <button
                onClick={confirm}
                disabled={pending}
                className="rounded-full bg-pink px-6 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink-strong disabled:opacity-60"
              >
                {pending
                  ? "Confirmando…"
                  : special && cost && !coveredByPlan
                    ? `Usar ${creditsLabel(cost.pricing.creditCost)}`
                    : "Confirmar"}
              </button>
            ) : null}
            {payHref && cost?.pricing.priceMxn ? (
              <Link
                href={payHref}
                className={`rounded-full px-6 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] shadow-soft transition-colors ${
                  canUseCredits
                    ? "border border-gold/50 text-ink hover:border-gold hover:text-pink-strong"
                    : "bg-pink text-white hover:bg-pink-strong"
                }`}
              >
                Pagar {formatMxn(cost.pricing.priceMxn)} aparte
              </Link>
            ) : null}
            {!useTrial && !canUseCredits && !payHref ? (
              <Link
                href="/paquetes"
                className="rounded-full bg-pink px-6 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink-strong"
              >
                Comprar paquete
              </Link>
            ) : null}
          </div>
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

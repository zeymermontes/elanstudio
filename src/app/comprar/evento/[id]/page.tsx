import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, Clock, MapPin, User } from "lucide-react";
import { getSettings } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadPayableEvent, PAYABLE_EVENT_MESSAGES } from "@/lib/event-checkout";
import { formatMxn, formatDayLabel, formatTime, cap } from "@/lib/format";
import { creditsLabel, isPayOnly, NOT_IN_PLAN_NOTE } from "@/lib/slot-cost";
import { EmbeddedCheckout } from "@/components/embedded-checkout";
import { PaymentMethods } from "@/components/payment-methods";
import { PixelEventOnMount } from "@/components/pixel-event";
import { packageParams } from "@/lib/pixel";
import { encodeRef } from "@/lib/schedule-ref";

export const metadata: Metadata = { title: "Pagar clase especial" };
export const dynamic = "force-dynamic";

/**
 * Pago aparte del lugar en una clase especial (0027). Misma pasarela que un
 * paquete — tarjeta con Mercado Pago o transferencia — pero sin promociones,
 * y lo que se recibe al aprobarse es la reserva, no clases.
 */
export default async function ComprarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar?next=/comprar/evento/${id}`);

  const admin = createSupabaseAdminClient();
  if (!admin) notFound();

  const loaded = await loadPayableEvent(admin, id, user.id);
  if (!loaded.ok) {
    if (loaded.code === "not_found") notFound();
    return <Unavailable text={PAYABLE_EVENT_MESSAGES[loaded.code]} />;
  }
  const event = loaded.event;
  const price = event.pricing.priceMxn;
  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";

  const settings = await getSettings();
  const offerTransfer =
    settings.transferEnabled && !!settings.transferAccounts.trim();

  const when = `${cap(formatDayLabel(event.startsAt, event.utcOffsetMin))} · ${formatTime(
    event.startsAt,
    event.utcOffsetMin,
  )}`;

  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      <PixelEventOnMount
        event="ViewContent"
        params={packageParams({
          id: event.id,
          name: event.name,
          valueMxn: price,
        })}
      />
      <Link
        href="/horarios"
        className="mb-6 inline-flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-pink-strong"
      >
        <ArrowLeft size={14} strokeWidth={1.5} /> Volver a horarios
      </Link>

      {/* Resumen */}
      <div className="surface-card rounded-2xl px-7 py-6 shadow-soft">
        <p className="text-[0.7rem] uppercase tracking-luxe text-gold">
          Clase especial
        </p>
        <h1 className="mt-1 font-serif text-3xl text-ink">{event.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">{when}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
          {event.coach ? (
            <span className="inline-flex items-center gap-1">
              <User size={12} strokeWidth={1.5} /> {event.coach}
            </span>
          ) : null}
          {event.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} strokeWidth={1.5} /> {event.location}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 text-gold">
            <Clock size={12} strokeWidth={1.5} /> {event.spotsLeft} lugares
          </span>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-serif text-4xl text-pink-strong">
            {formatMxn(price)}
          </span>
          <span className="text-sm text-ink-soft">por tu lugar</span>
        </div>
        <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
          <li className="flex items-center gap-2">
            <Check size={15} strokeWidth={1.5} className="text-gold" />
            Tu lugar queda reservado al pagar
          </li>
          <li className="flex items-center gap-2">
            <Check size={15} strokeWidth={1.5} className="text-gold" />
            No descuenta clases de tu paquete
            {event.pricing.planIncluded
              ? ""
              : ` · ${NOT_IN_PLAN_NOTE.toLowerCase()}`}
          </li>
        </ul>
        {isPayOnly(event.pricing) ? null : (
          <p className="mt-4 text-xs text-ink-soft">
            ¿Prefieres usar tus clases? Esta clase descuenta{" "}
            {creditsLabel(event.pricing.creditCost)}.{" "}
            <Link
              href={`/cuenta?reservar=${encodeURIComponent(encodeRef({ kind: "session", sessionId: event.id }))}`}
              className="text-pink-strong underline-offset-2 hover:underline"
            >
              Reservar con mis clases
            </Link>
          </p>
        )}
      </div>

      {/* Pago */}
      <div className="mt-6">
        {offerTransfer ? (
          <div>
            <h2 className="mb-4 font-serif text-2xl text-ink">
              ¿Cómo quieres pagar?
            </h2>
            <PaymentMethods
              eventId={event.id}
              packageName={event.name}
              amount={price}
              publicKey={publicKey}
              payerEmail={user.email ?? null}
              initialPromo={null}
              transferAccounts={settings.transferAccounts}
            />
          </div>
        ) : (
          <div>
            <h2 className="mb-4 font-serif text-2xl text-ink">Datos de pago</h2>
            <EmbeddedCheckout
              eventId={event.id}
              packageName={event.name}
              amount={price}
              publicKey={publicKey}
              payerEmail={user.email ?? null}
            />
            <p className="mt-6 text-center text-xs text-ink-soft">
              Pago seguro procesado por Mercado Pago.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Ya tiene lugar, se llenó o cerró: decirlo con calma en vez de un 404. */
function Unavailable({ text }: { text: string }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-14 text-center">
      <p className="text-[0.7rem] uppercase tracking-luxe text-gold">
        Clase especial
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{text}</p>
      <Link
        href="/cuenta"
        className="mt-7 inline-flex items-center justify-center rounded-full bg-pink px-7 py-3 text-sm uppercase tracking-[0.18em] text-white shadow-soft transition-colors hover:bg-pink-strong"
      >
        Ir a mi cuenta
      </Link>
    </div>
  );
}

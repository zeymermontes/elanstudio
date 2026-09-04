import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, Calendar, ShoppingBag } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signOutAction } from "@/lib/actions/auth";
import {
  ConfirmReserve,
  CancelBooking,
  CancelSubscription,
} from "@/components/account-actions";
import {
  canCancelBooking,
  CANCEL_WINDOW_NOTE,
  bookingWindow,
} from "@/lib/booking-rules";
import { OnboardingForm } from "@/components/onboarding-form";
import { decodeRef } from "@/lib/schedule-ref";
import {
  formatDayLabel,
  formatTime,
  cap,
  zonedToUtc,
  DEFAULT_UTC_OFFSET_MIN,
} from "@/lib/format";

/** Huso con el que se muestra la hora de una reserva: el de la sede de su clase. */
function bookingOffset(cs: { locations: { utc_offset_minutes: number } | null }) {
  return cs.locations?.utc_offset_minutes ?? DEFAULT_UTC_OFFSET_MIN;
}

export const metadata: Metadata = { title: "Mi cuenta" };
export const dynamic = "force-dynamic";

type BookingRow = {
  session_id: string;
  class_sessions: {
    starts_at: string;
    status: string;
    class_types: { name: string; duration_min: number } | null;
    coaches: { name: string } | null;
    locations: { name: string; utc_offset_minutes: number } | null;
  } | null;
};

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ reservar?: string; pago?: string; suscripcion?: string }>;
}) {
  const { reservar, pago, suscripcion } = await searchParams;

  // Demo mode: no backend configured yet.
  if (!isSupabaseConfigured()) {
    return <DemoNotice />;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return <DemoNotice />;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = reservar
      ? `/cuenta?reservar=${encodeURIComponent(reservar)}`
      : "/cuenta";
    redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  }

  // First visit: collect health/birthday info before showing the dashboard.
  const { data: onboardingProfile } = await supabase
    .from("profiles")
    .select("full_name, onboarded")
    .eq("id", user.id)
    .single();
  if (onboardingProfile && !onboardingProfile.onboarded) {
    const fn = (onboardingProfile.full_name ?? "").split(" ")[0];
    return <OnboardingForm firstName={fn} />;
  }

  const [{ data: profile }, { data: balance }, { data: bookings }, { data: sub }] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase.rpc("credit_balance", { p_user: user.id }),
      supabase
        .from("bookings")
        .select(
          "session_id, class_sessions!inner(starts_at, status, class_types(name, duration_min), coaches(name), locations(name, utc_offset_minutes))",
        )
        .eq("user_id", user.id)
        .eq("status", "confirmed"),
      supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user.id)
        .eq("status", "authorized")
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // Server component (force-dynamic): reading the current time is intentional.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const subActive =
    !!sub &&
    (!sub.current_period_end ||
      new Date(sub.current_period_end).getTime() > nowMs);

  const upcoming = ((bookings ?? []) as unknown as BookingRow[])
    .filter(
      (b) =>
        b.class_sessions &&
        b.class_sessions.status === "scheduled" &&
        new Date(b.class_sessions.starts_at).getTime() >= nowMs,
    )
    .sort((a, b) =>
      (a.class_sessions!.starts_at).localeCompare(b.class_sessions!.starts_at),
    );

  /** Confirmed bookings on a session, for the booking window. */
  async function bookedCount(sessionId: string): Promise<number> {
    const { count } = await supabase!
      .from("bookings")
      .select("user_id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("status", "confirmed");
    return count ?? 0;
  }

  // Label for the reservation confirmation card, plus the reason the class
  // can't be booked any more ('started' / 'empty_closed') when the member gets
  // here too late — book_session would refuse it, so say so before the click.
  let reservarLabel: string | null = null;
  let reservarBlocked: string | null = null;
  const reserveRef = reservar ? decodeRef(reservar) : null;
  if (reserveRef?.kind === "session") {
    const { data: sess } = await supabase
      .from("class_sessions")
      .select("starts_at, class_types(name), locations(utc_offset_minutes)")
      .eq("id", reserveRef.sessionId)
      .single();
    if (sess) {
      const raw = sess as unknown as {
        starts_at: string;
        class_types: { name: string } | { name: string }[] | null;
        locations: { utc_offset_minutes: number } | null;
      };
      const ct = Array.isArray(raw.class_types)
        ? raw.class_types[0]
        : raw.class_types;
      const off = raw.locations?.utc_offset_minutes ?? DEFAULT_UTC_OFFSET_MIN;
      reservarLabel = `${ct?.name ?? "Clase"} · ${cap(
        formatDayLabel(raw.starts_at, off),
      )} ${formatTime(raw.starts_at, off)}`;
      const win = bookingWindow(
        raw.starts_at,
        await bookedCount(reserveRef.sessionId),
        nowMs,
      );
      if (win !== "open") reservarBlocked = win;
    }
  } else if (reserveRef?.kind === "weekly") {
    const { data: wc } = await supabase
      .from("weekly_classes")
      .select("start_time, class_types(name), locations(utc_offset_minutes)")
      .eq("id", reserveRef.weeklyId)
      .single();
    if (wc) {
      const raw = wc as unknown as {
        start_time: string;
        class_types: { name: string } | { name: string }[] | null;
        locations: { utc_offset_minutes: number } | null;
      };
      const ct = Array.isArray(raw.class_types)
        ? raw.class_types[0]
        : raw.class_types;
      const off = raw.locations?.utc_offset_minutes ?? DEFAULT_UTC_OFFSET_MIN;
      // La plantilla guarda una hora de pared suelta. Anclarla al huso de la
      // sede: concatenar "fecha T hora" dejaba una cadena sin zona, que
      // JavaScript interpretaba en la del servidor — en Render, UTC — y una
      // clase de 8:30 a.m. se anunciaba como 2:30 a.m.
      const startsAt = zonedToUtc(
        reserveRef.date,
        String(raw.start_time).slice(0, 5),
        off,
      ).toISOString();
      reservarLabel = `${ct?.name ?? "Clase"} · ${cap(
        formatDayLabel(startsAt, off),
      )} ${formatTime(startsAt, off)}`;

      // A recurring slot only has a session row once someone books it, so no
      // row means nobody has — which is exactly what closes it 2 h ahead.
      const { data: mat } = await supabase
        .from("class_sessions")
        .select("id")
        .eq("weekly_class_id", reserveRef.weeklyId)
        .eq("session_date", reserveRef.date)
        .maybeSingle();
      const win = bookingWindow(
        startsAt,
        mat ? await bookedCount(mat.id) : 0,
        nowMs,
      );
      if (win !== "open") reservarBlocked = win;
    }
  }

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "Bienvenida";
  const credits = (balance as number | null) ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[0.7rem] uppercase tracking-luxe text-gold">
            Mi cuenta
          </p>
          <h1 className="mt-1 font-serif text-4xl text-ink">Hola, {firstName}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/cuenta/perfil"
            className="text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong"
          >
            Mi información
          </Link>
          <form action={signOutAction}>
            <button className="text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft hover:text-pink-strong">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      <div className="gold-rule my-7 w-full" />

      {pago ? <PagoBanner status={pago} /> : null}
      {suscripcion ? (
        <div className="mb-8 rounded-2xl bg-gold-soft/40 px-6 py-4 text-sm text-ink">
          ¡Gracias! Tu suscripción se está activando. Se reflejará en unos
          momentos.
        </div>
      ) : null}

      {reservar && reservarLabel ? (
        <ConfirmReserve
          refStr={reservar}
          label={reservarLabel}
          blocked={reservarBlocked}
        />
      ) : null}

      {/* Credits */}
      <div className="surface-card mb-8 flex items-center justify-between rounded-2xl px-7 py-6 shadow-soft">
        <div className="flex items-center gap-3">
          <Sparkles size={22} strokeWidth={1.25} className="text-pink" />
          <div>
            <p className="font-serif text-3xl text-ink">
              {subActive ? "Ilimitado" : credits}
            </p>
            <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">
              {subActive ? "Suscripción mensual activa" : "Clases disponibles"}
            </p>
          </div>
        </div>
        {subActive ? (
          <CancelSubscription />
        ) : (
          <Link
            href="/paquetes"
            className="inline-flex items-center gap-2 rounded-full border border-gold/50 px-5 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-ink transition-colors hover:border-gold hover:text-pink-strong"
          >
            <ShoppingBag size={14} strokeWidth={1.5} /> Comprar paquete
          </Link>
        )}
      </div>

      {/* Upcoming bookings */}
      <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl text-ink">
        <Calendar size={18} strokeWidth={1.5} className="text-gold" /> Mis
        próximas clases
      </h2>

      {upcoming.length === 0 ? (
        <div className="surface-card rounded-2xl px-7 py-10 text-center shadow-soft">
          <p className="text-sm text-ink-soft">
            Aún no tienes clases reservadas.
          </p>
          <Link
            href="/horarios"
            className="mt-4 inline-flex rounded-full bg-pink px-6 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink-strong"
          >
            Ver horarios
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((b) => {
            const cs = b.class_sessions!;
            return (
              <article
                key={b.session_id}
                className="surface-card flex items-center justify-between rounded-2xl px-6 py-5 shadow-soft"
              >
                <div>
                  <h3 className="font-serif text-xl text-ink">
                    {cs.class_types?.name}
                  </h3>
                  <p className="mt-1 text-xs text-ink-soft">
                    {cap(
                      formatDayLabel(cs.starts_at, bookingOffset(cs)),
                    )}{" "}
                    · {formatTime(cs.starts_at, bookingOffset(cs))}
                    {cs.coaches?.name ? ` · ${cs.coaches.name}` : ""}
                    {cs.locations?.name ? ` · ${cs.locations.name}` : ""}
                  </p>
                </div>
                <CancelBooking
                  sessionId={b.session_id}
                  canCancel={canCancelBooking(cs.starts_at)}
                />
              </article>
            );
          })}
          <p className="px-1 pt-1 text-xs text-ink-soft">
            {CANCEL_WINDOW_NOTE}
          </p>
        </div>
      )}
    </div>
  );
}

function PagoBanner({ status }: { status: string }) {
  const map: Record<string, { text: string; ok: boolean }> = {
    ok: {
      text: "¡Pago recibido! Tus clases se acreditan en unos segundos.",
      ok: true,
    },
    pendiente: {
      text: "Tu pago está pendiente de confirmación.",
      ok: true,
    },
    error: { text: "El pago no se completó. Intenta de nuevo.", ok: false },
  };
  const m = map[status] ?? map.error;
  return (
    <div
      className={`mb-8 rounded-2xl px-6 py-4 text-sm ${
        m.ok ? "bg-gold-soft/40 text-ink" : "bg-pink-soft/60 text-pink-strong"
      }`}
    >
      {m.text}
    </div>
  );
}

function DemoNotice() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="text-[0.7rem] uppercase tracking-luxe text-gold">Mi cuenta</p>
      <h1 className="mt-2 font-serif text-4xl text-ink">Modo demostración</h1>
      <div className="gold-rule mx-auto my-6 w-24" />
      <p className="text-sm leading-relaxed text-ink-soft">
        Las cuentas, reservas y pagos se activan al configurar Supabase y Mercado
        Pago. Mientras tanto, puedes explorar las clases, paquetes, coaches y
        horarios del sitio.
      </p>
      <Link
        href="/horarios"
        className="mt-7 inline-flex rounded-full bg-pink px-7 py-3 text-sm uppercase tracking-[0.18em] text-white shadow-soft transition-colors hover:bg-pink-strong"
      >
        Ver horarios
      </Link>
    </div>
  );
}

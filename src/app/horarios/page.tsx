import type { Metadata } from "next";
import { Sun, Sunset } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/admin/tabs";
import { getSchedule, getSpecialEvents, getSettings } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  formatDayLabel,
  formatTabDay,
  dayKey,
  zonedHour,
  cap,
} from "@/lib/format";
import { ScheduleSlotItem } from "@/components/schedule-slot-item";
import { encodeRef } from "@/lib/schedule-ref";
import { slotBlockedLabel } from "@/lib/booking-rules";
import { resolveDay, slotMatches } from "@/lib/schedule-links";
import type { ScheduleSlot } from "@/lib/types";

/**
 * Why a slot can't be booked, or null. Threaded down from the page instead of
 * computed per card because the booking window depends on the current time,
 * and every card on a render has to read the same clock.
 */
type BlockedFor = (slot: ScheduleSlot) => string | null;
/** Is this the slot a deep link (?clase=) points at? */
type IsTarget = (slot: ScheduleSlot) => boolean;

export const metadata: Metadata = { title: "Horarios" };
export const dynamic = "force-dynamic";

function PartOfDay({
  title,
  icon: Icon,
  slots,
  blockedFor,
  isTarget,
}: {
  title: string;
  icon: typeof Sun;
  slots: ScheduleSlot[];
  blockedFor: BlockedFor;
  isTarget: IsTarget;
}) {
  if (slots.length === 0) return null;
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-[0.7rem] uppercase tracking-luxe text-gold">
        <Icon size={15} strokeWidth={1.5} /> {title}
      </h3>
      <div className="space-y-3">
        {slots.map((s) => (
          <ScheduleSlotItem
            key={encodeRef(s.ref)}
            slot={s}
            refStr={encodeRef(s.ref)}
            blocked={blockedFor(s)}
            autoOpen={isTarget(s)}
          />
        ))}
      </div>
    </section>
  );
}

/** Group slots by the calendar day they read as, preserving chronological order. */
function groupByDay(slots: ScheduleSlot[]): [string, ScheduleSlot[]][] {
  const byDay = new Map<string, ScheduleSlot[]>();
  for (const s of slots) {
    const key = dayKey(s.startsAt, s.utcOffsetMin);
    const list = byDay.get(key) ?? [];
    list.push(s);
    byDay.set(key, list);
  }
  return [...byDay.entries()];
}

/** Build one tab per calendar day (with a morning/afternoon split) for a set of slots. */
function buildDayTabs(
  slots: ScheduleSlot[],
  blockedFor: BlockedFor,
  isTarget: IsTarget,
) {
  return groupByDay(slots).map(([date, daySlots]) => {
    const morning = daySlots.filter(
      (s) => zonedHour(s.startsAt, s.utcOffsetMin) < 12,
    );
    const afternoon = daySlots.filter(
      (s) => zonedHour(s.startsAt, s.utcOffsetMin) >= 12,
    );
    return {
      key: date,
      label: formatTabDay(daySlots[0].startsAt, daySlots[0].utcOffsetMin),
      content: (
        <div>
          <h2 className="mb-6 font-serif text-2xl text-ink">
            {cap(
              formatDayLabel(daySlots[0].startsAt, daySlots[0].utcOffsetMin),
            )}
          </h2>
          <div className="space-y-9">
            <PartOfDay
              title="Mañana"
              icon={Sun}
              slots={morning}
              blockedFor={blockedFor}
              isTarget={isTarget}
            />
            <PartOfDay
              title="Tarde"
              icon={Sunset}
              slots={afternoon}
              blockedFor={blockedFor}
              isTarget={isTarget}
            />
          </div>
        </div>
      ),
    };
  });
}

/** The recurring template is only expanded a week out; events reach much further. */
const WEEK_DAYS = 7;

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; clase?: string }>;
}) {
  const { dia, clase } = await searchParams;
  const [slots, allEvents, settings] = await Promise.all([
    getSchedule(WEEK_DAYS),
    getSpecialEvents(),
    getSettings(),
  ]);

  // Aviso de clase muestra: a quien no ha entrado se le invita a crear su
  // cuenta; a quien ya entró solo si le aplica (nunca ha tenido clases).
  // Quien ya tiene paquete, mensualidad o tomó clases no lo ve.
  let trialBanner: "signup" | "book" | null = settings.trialClassEnabled
    ? "signup"
    : null;
  if (trialBanner) {
    const supabase = await createSupabaseServerClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    if (user && supabase) {
      const { data: eligible } = await supabase.rpc("trial_eligible", {
        p_user: user.id,
      });
      trialBanner = eligible ? "book" : null;
    }
  }

  // Server component (force-dynamic): reading the current time is intentional.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const blockedFor: BlockedFor = (s) => slotBlockedLabel(s, nowMs);
  const isTarget: IsTarget = (s) => !!clase && slotMatches(s, clase);

  // Events inside the week already have their own day tab; the rest would be
  // invisible without a section of their own, which is the point of listing
  // them here — a workshop a month out has to be findable today.
  const inTabs = new Set(
    slots.map((s) => (s.ref.kind === "session" ? s.ref.sessionId : "")),
  );
  const laterEvents = allEvents.filter(
    (e) => e.ref.kind === "session" && !inTabs.has(e.ref.sessionId),
  );

  // Group by branch so users can filter the week by location.
  const byLocation = new Map<string, { name: string; slots: ScheduleSlot[] }>();
  for (const s of slots) {
    const id = s.location?.id ?? "__none";
    const name = s.location?.name ?? "Sin sede";
    const group = byLocation.get(id) ?? { name, slots: [] };
    group.slots.push(s);
    byLocation.set(id, group);
  }
  const locations = [...byLocation.entries()].sort((a, b) =>
    a[1].name.localeCompare(b[1].name, "es"),
  );

  const dayTabs = buildDayTabs(slots, blockedFor, isTarget);
  const showLocationFilter = locations.length > 1;

  // Deep link: the day asked for (?dia=), or the day of the class asked for
  // (?clase=). A weekday name resolves to its next occurrence in the week.
  const target = clase ? slots.find(isTarget) : undefined;
  const initialDay =
    (dia
      ? resolveDay(
          dia,
          dayTabs.map((t) => t.key),
        )
      : null) ?? (target ? dayKey(target.startsAt, target.utcOffsetMin) : null);

  // With more than one branch, wrap the day tabs in an outer "location" tab bar.
  const locationTabs = showLocationFilter
    ? [
        {
          key: "todas",
          label: "Todas",
          content: <Tabs tabs={dayTabs} initialKey={initialDay} />,
        },
        ...locations.map(([id, group]) => ({
          key: id,
          label: group.name,
          content: (
            <Tabs
              tabs={buildDayTabs(group.slots, blockedFor, isTarget)}
              initialKey={initialDay}
            />
          ),
        })),
      ]
    : [];

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Reserva tu lugar"
        title="Horarios"
        intro="Elige el día y la clase que mejor se adapten a ti. Toca una clase para ver el detalle y reservar."
      />

      <div className="mx-auto max-w-4xl px-5">
        {trialBanner ? (
          <div className="mb-10 flex flex-col items-start gap-3 rounded-2xl border border-gold/40 bg-gold-soft/20 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2.5 text-sm text-ink">
              <Sparkles
                size={16}
                strokeWidth={1.5}
                className="mt-0.5 shrink-0 text-gold"
              />
              <span>
                <span className="font-medium">¿Primera vez en ÉLAN?</span> Tu
                primera clase es de muestra, sin costo.{" "}
                {trialBanner === "signup"
                  ? "Crea tu cuenta, elige una clase y reserva."
                  : "Elige una clase y reserva."}
              </span>
            </p>
            {trialBanner === "signup" ? (
              <Link
                href="/registro"
                className="shrink-0 rounded-full border border-gold/50 px-5 py-2 text-[0.7rem] uppercase tracking-[0.15em] text-ink transition-colors hover:border-gold hover:text-pink-strong"
              >
                Crear mi cuenta
              </Link>
            ) : null}
          </div>
        ) : null}
        {dayTabs.length === 0 ? (
          laterEvents.length === 0 ? (
            <p className="text-center text-sm text-ink-soft">
              Aún no hay clases publicadas. Vuelve pronto.
            </p>
          ) : null
        ) : showLocationFilter ? (
          <Tabs tabs={locationTabs} />
        ) : (
          <Tabs tabs={dayTabs} initialKey={initialDay} />
        )}

        {laterEvents.length > 0 ? (
          <section className="mt-16 border-t border-line pt-12">
            <div className="mb-8 text-center">
              <p className="mb-2 text-[0.7rem] uppercase tracking-luxe text-gold">
                Más adelante
              </p>
              <h2 className="font-serif text-3xl font-light text-ink">
                Eventos especiales
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
                Fechas únicas fuera del horario semanal. Puedes reservar tu
                lugar desde ahora.
              </p>
            </div>
            <div className="space-y-9">
              {groupByDay(laterEvents).map(([day, daySlots]) => (
                <section key={day} id={`dia-${day}`}>
                  <h3 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
                    {cap(
                      formatDayLabel(
                        daySlots[0].startsAt,
                        daySlots[0].utcOffsetMin,
                      ),
                    )}
                  </h3>
                  <div className="space-y-3">
                    {daySlots.map((e) => (
                      <ScheduleSlotItem
                        key={encodeRef(e.ref)}
                        slot={e}
                        refStr={encodeRef(e.ref)}
                        blocked={blockedFor(e)}
                        autoOpen={isTarget(e)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

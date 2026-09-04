import type { Metadata } from "next";
import { Sun, Sunset } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/admin/tabs";
import { getSchedule, getSpecialEvents } from "@/lib/data";
import { formatDayLabel, formatTabDay, dayKey, zonedHour, cap } from "@/lib/format";
import { ScheduleSlotItem } from "@/components/schedule-slot-item";
import { encodeRef } from "@/lib/schedule-ref";
import { slotBlockedLabel } from "@/lib/booking-rules";
import type { ScheduleSlot } from "@/lib/types";

/**
 * Why a slot can't be booked, or null. Threaded down from the page instead of
 * computed per card because the booking window depends on the current time,
 * and every card on a render has to read the same clock.
 */
type BlockedFor = (slot: ScheduleSlot) => string | null;

export const metadata: Metadata = { title: "Horarios" };
export const dynamic = "force-dynamic";

function PartOfDay({
  title,
  icon: Icon,
  slots,
  blockedFor,
}: {
  title: string;
  icon: typeof Sun;
  slots: ScheduleSlot[];
  blockedFor: BlockedFor;
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
function buildDayTabs(slots: ScheduleSlot[], blockedFor: BlockedFor) {
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
            {cap(formatDayLabel(daySlots[0].startsAt, daySlots[0].utcOffsetMin))}
          </h2>
          <div className="space-y-9">
            <PartOfDay
              title="Mañana"
              icon={Sun}
              slots={morning}
              blockedFor={blockedFor}
            />
            <PartOfDay
              title="Tarde"
              icon={Sunset}
              slots={afternoon}
              blockedFor={blockedFor}
            />
          </div>
        </div>
      ),
    };
  });
}

/** The recurring template is only expanded a week out; events reach much further. */
const WEEK_DAYS = 7;

export default async function HorariosPage() {
  const [slots, allEvents] = await Promise.all([
    getSchedule(WEEK_DAYS),
    getSpecialEvents(),
  ]);

  // Server component (force-dynamic): reading the current time is intentional.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const blockedFor: BlockedFor = (s) => slotBlockedLabel(s, nowMs);

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
  const byLocation = new Map<
    string,
    { name: string; slots: ScheduleSlot[] }
  >();
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

  const dayTabs = buildDayTabs(slots, blockedFor);
  const showLocationFilter = locations.length > 1;

  // With more than one branch, wrap the day tabs in an outer "location" tab bar.
  const locationTabs = showLocationFilter
    ? [
        { key: "todas", label: "Todas", content: <Tabs tabs={dayTabs} /> },
        ...locations.map(([id, group]) => ({
          key: id,
          label: group.name,
          content: <Tabs tabs={buildDayTabs(group.slots, blockedFor)} />,
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
        {dayTabs.length === 0 ? (
          laterEvents.length === 0 ? (
            <p className="text-center text-sm text-ink-soft">
              Aún no hay clases publicadas. Vuelve pronto.
            </p>
          ) : null
        ) : showLocationFilter ? (
          <Tabs tabs={locationTabs} />
        ) : (
          <Tabs tabs={dayTabs} />
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
                Fechas únicas fuera del horario semanal. Puedes reservar tu lugar
                desde ahora.
              </p>
            </div>
            <div className="space-y-9">
              {groupByDay(laterEvents).map(([day, daySlots]) => (
                <section key={day}>
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

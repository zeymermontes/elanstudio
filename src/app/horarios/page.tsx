import type { Metadata } from "next";
import { Sun, Sunset } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/admin/tabs";
import { getSchedule } from "@/lib/data";
import { formatDayLabel, formatTabDay, dayKey, zonedHour, cap } from "@/lib/format";
import { ScheduleSlotItem } from "@/components/schedule-slot-item";
import { encodeRef } from "@/lib/schedule-ref";
import type { ScheduleSlot } from "@/lib/types";

export const metadata: Metadata = { title: "Horarios" };
export const dynamic = "force-dynamic";

function PartOfDay({
  title,
  icon: Icon,
  slots,
}: {
  title: string;
  icon: typeof Sun;
  slots: ScheduleSlot[];
}) {
  if (slots.length === 0) return null;
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-[0.7rem] uppercase tracking-luxe text-gold">
        <Icon size={15} strokeWidth={1.5} /> {title}
      </h3>
      <div className="space-y-3">
        {slots.map((s) => (
          <ScheduleSlotItem key={encodeRef(s.ref)} slot={s} refStr={encodeRef(s.ref)} />
        ))}
      </div>
    </section>
  );
}

/** Build one tab per calendar day (with a morning/afternoon split) for a set of slots. */
function buildDayTabs(slots: ScheduleSlot[]) {
  const byDay = new Map<string, ScheduleSlot[]>();
  for (const s of slots) {
    const key = dayKey(s.startsAt, s.utcOffsetMin);
    const list = byDay.get(key) ?? [];
    list.push(s);
    byDay.set(key, list);
  }

  return [...byDay.entries()].map(([date, daySlots]) => {
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
            <PartOfDay title="Mañana" icon={Sun} slots={morning} />
            <PartOfDay title="Tarde" icon={Sunset} slots={afternoon} />
          </div>
        </div>
      ),
    };
  });
}

export default async function HorariosPage() {
  const slots = await getSchedule(7);

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

  const dayTabs = buildDayTabs(slots);
  const showLocationFilter = locations.length > 1;

  // With more than one branch, wrap the day tabs in an outer "location" tab bar.
  const locationTabs = showLocationFilter
    ? [
        { key: "todas", label: "Todas", content: <Tabs tabs={dayTabs} /> },
        ...locations.map(([id, group]) => ({
          key: id,
          label: group.name,
          content: <Tabs tabs={buildDayTabs(group.slots)} />,
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
          <p className="text-center text-sm text-ink-soft">
            Aún no hay clases publicadas. Vuelve pronto.
          </p>
        ) : showLocationFilter ? (
          <Tabs tabs={locationTabs} />
        ) : (
          <Tabs tabs={dayTabs} />
        )}
      </div>
    </div>
  );
}

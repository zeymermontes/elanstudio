import type { Metadata } from "next";
import { Clock, MapPin, User, Sun, Sunset } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/admin/tabs";
import { getSchedule } from "@/lib/data";
import {
  formatDayLabel,
  formatTime,
  formatTabDay,
  dayKey,
  cap,
} from "@/lib/format";
import { ReserveButton } from "@/components/reserve-button";
import { encodeRef } from "@/lib/schedule-ref";
import type { ScheduleSlot } from "@/lib/types";

export const metadata: Metadata = { title: "Horarios" };
export const dynamic = "force-dynamic";

function SlotCard({ s }: { s: ScheduleSlot }) {
  return (
    <article className="surface-card flex flex-col gap-4 rounded-2xl px-6 py-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-5">
        <div className="text-center">
          <p className="font-serif text-xl text-pink-strong">
            {formatTime(s.startsAt)}
          </p>
          <p className="text-[0.65rem] uppercase tracking-[0.12em] text-ink-soft">
            {s.classType.durationMin} min
          </p>
        </div>
        <div className="h-12 w-px bg-line" />
        <div>
          <h3 className="font-serif text-xl text-ink">{s.classType.name}</h3>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
            {s.coach ? (
              <span className="inline-flex items-center gap-1">
                <User size={12} strokeWidth={1.5} /> {s.coach.name}
              </span>
            ) : null}
            {s.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} strokeWidth={1.5} /> {s.location.name}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span
          className={`inline-flex items-center gap-1 text-xs ${
            s.spotsLeft === 0 ? "text-ink-soft" : "text-gold"
          }`}
        >
          <Clock size={12} strokeWidth={1.5} />
          {s.spotsLeft === 0 ? "Sin lugares" : `${s.spotsLeft} lugares`}
        </span>
        <ReserveButton refStr={encodeRef(s.ref)} disabled={s.spotsLeft === 0} />
      </div>
    </article>
  );
}

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
          <SlotCard key={encodeRef(s.ref)} s={s} />
        ))}
      </div>
    </section>
  );
}

export default async function HorariosPage() {
  const slots = await getSchedule(7);

  // Group by local calendar day (so morning/afternoon never split into two tabs).
  const byDay = new Map<string, ScheduleSlot[]>();
  for (const s of slots) {
    const key = dayKey(s.startsAt);
    const list = byDay.get(key) ?? [];
    list.push(s);
    byDay.set(key, list);
  }

  const dayTabs = [...byDay.entries()].map(([date, daySlots]) => {
    const morning = daySlots.filter((s) => new Date(s.startsAt).getHours() < 12);
    const afternoon = daySlots.filter(
      (s) => new Date(s.startsAt).getHours() >= 12,
    );
    return {
      key: date,
      label: formatTabDay(daySlots[0].startsAt),
      content: (
        <div>
          <h2 className="mb-6 font-serif text-2xl text-ink">
            {cap(formatDayLabel(daySlots[0].startsAt))}
          </h2>
          <div className="space-y-9">
            <PartOfDay title="Mañana" icon={Sun} slots={morning} />
            <PartOfDay title="Tarde" icon={Sunset} slots={afternoon} />
          </div>
        </div>
      ),
    };
  });

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Reserva tu lugar"
        title="Horarios"
        intro="Elige el día y la clase que mejor se adapten a ti. Los lugares son limitados para cuidar la experiencia."
      />

      <div className="mx-auto max-w-4xl px-5">
        {dayTabs.length === 0 ? (
          <p className="text-center text-sm text-ink-soft">
            Aún no hay clases publicadas. Vuelve pronto.
          </p>
        ) : (
          <Tabs tabs={dayTabs} />
        )}
      </div>
    </div>
  );
}

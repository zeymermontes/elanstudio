import type { Metadata } from "next";
import { Clock, MapPin, User } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getUpcomingSessions } from "@/lib/data";
import { formatDayLabel, formatTime, cap } from "@/lib/format";
import { ReserveButton } from "@/components/reserve-button";
import type { SessionView } from "@/lib/types";

export const metadata: Metadata = { title: "Horarios" };

// Always render the current week.
export const dynamic = "force-dynamic";

export default async function HorariosPage() {
  const sessions = await getUpcomingSessions(7);

  // Group by calendar day.
  const byDay = new Map<string, SessionView[]>();
  for (const s of sessions) {
    const key = s.startsAt.slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(s);
    byDay.set(key, list);
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Reserva tu lugar"
        title="Horarios"
        intro="Elige el día y la clase que mejor se adapten a ti. Los lugares son limitados para cuidar la experiencia."
      />

      <div className="mx-auto max-w-4xl space-y-12 px-5">
        {[...byDay.entries()].map(([day, daySessions]) => (
          <section key={day}>
            <h2 className="mb-5 font-serif text-2xl text-ink">
              {cap(formatDayLabel(daySessions[0].startsAt))}
            </h2>
            <div className="space-y-3">
              {daySessions.map((s) => (
                <article
                  key={s.id}
                  className="surface-card flex flex-col gap-4 rounded-2xl px-6 py-5 shadow-soft sm:flex-row sm:items-center sm:justify-between"
                >
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
                      <h3 className="font-serif text-xl text-ink">
                        {s.classType.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                        <span className="inline-flex items-center gap-1">
                          <User size={12} strokeWidth={1.5} /> {s.coach.name}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} strokeWidth={1.5} /> {s.location.name}
                        </span>
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
                      {s.spotsLeft === 0
                        ? "Sin lugares"
                        : `${s.spotsLeft} lugares`}
                    </span>
                    <ReserveButton
                      sessionId={s.id}
                      disabled={s.spotsLeft === 0}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

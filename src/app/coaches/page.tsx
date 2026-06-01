import type { Metadata } from "next";
import { AtSign } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCoaches } from "@/lib/data";

export const metadata: Metadata = { title: "Coaches" };

export default async function CoachesPage() {
  const coaches = await getCoaches();

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Nuestro equipo"
        title="Coaches"
        intro="Mujeres expertas y cercanas que te acompañan en cada paso de tu práctica."
      />

      <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-3">
        {coaches.map((coach) => (
          <article
            key={coach.id}
            className="surface-card overflow-hidden rounded-2xl text-center shadow-soft"
          >
            {coach.photoUrl ? (
              <img
                src={coach.photoUrl}
                alt={coach.name}
                className="h-64 w-full object-cover"
              />
            ) : (
              <div className="flex h-64 items-center justify-center bg-gradient-to-br from-pink-soft to-cream">
                <span className="font-serif text-5xl italic text-pink-strong/50">
                  {coach.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
            )}
            <div className="px-6 py-7">
              <h3 className="font-serif text-2xl text-ink">{coach.name}</h3>
              <p className="mt-1 text-[0.7rem] uppercase tracking-[0.15em] text-gold">
                {coach.role}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {coach.bio}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {coach.specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-pink-soft/60 px-3 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-pink-strong"
                  >
                    {s}
                  </span>
                ))}
              </div>
              {coach.instagram ? (
                <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-ink-soft">
                  <AtSign size={13} strokeWidth={1.5} /> {coach.instagram}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

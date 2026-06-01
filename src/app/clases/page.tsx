import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Signal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getServices, getClassTypes } from "@/lib/data";

export const metadata: Metadata = { title: "Clases" };

export default async function ClasesPage() {
  const [services, classTypes] = await Promise.all([
    getServices(),
    getClassTypes(),
  ]);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Nuestras disciplinas"
        title="Clases"
        intro="Descubre nuestras disciplinas, diseñadas para que encuentres fuerza, equilibrio y elegancia en cada movimiento."
      />

      <div className="mx-auto max-w-6xl space-y-16 px-5">
        {services.map((service) => {
          const items = classTypes.filter((c) => c.serviceId === service.id);
          return (
            <section key={service.id}>
              <div className="mb-7 flex flex-col items-center text-center">
                <h2 className="font-serif text-3xl text-ink sm:text-4xl">
                  {service.name}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
                  {service.description}
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {items.map((c) => (
                  <article
                    key={c.id}
                    className="surface-card flex flex-col overflow-hidden rounded-2xl shadow-soft sm:flex-row"
                  >
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        className="min-h-[8rem] w-full object-cover sm:w-2/5"
                      />
                    ) : (
                      <div className="flex min-h-[8rem] items-center justify-center bg-gradient-to-br from-pink-soft to-cream px-8 sm:w-2/5">
                        <span className="font-serif text-2xl italic text-pink-strong/70">
                          {c.name}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 px-6 py-6">
                      <h3 className="font-serif text-2xl text-ink">{c.name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                        {c.description}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-[0.7rem] uppercase tracking-[0.15em] text-gold">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={13} strokeWidth={1.5} /> {c.durationMin} min
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Signal size={13} strokeWidth={1.5} /> {c.level}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-16 text-center">
        <Link
          href="/horarios"
          className="inline-flex items-center gap-2 rounded-full bg-pink px-8 py-3.5 text-sm uppercase tracking-[0.18em] text-white shadow-soft transition-colors hover:bg-pink-strong"
        >
          Ver horarios y reservar
        </Link>
      </div>
    </div>
  );
}

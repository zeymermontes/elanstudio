import type { Metadata } from "next";
import { MapPin, Clock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getLocations } from "@/lib/data";

export const metadata: Metadata = { title: "Ubicaciones" };

export default async function UbicacionesPage() {
  const locations = await getLocations();

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Dónde encontrarnos"
        title="Ubicaciones"
        intro="Espacios serenos y luminosos, pensados para que cada visita sea una experiencia."
      />

      <div className="mx-auto grid max-w-5xl gap-6 px-5 md:grid-cols-2">
        {locations.map((loc) => (
          <article
            key={loc.id}
            className="surface-card overflow-hidden rounded-2xl shadow-soft"
          >
            {loc.imageUrl ? (
              <img
                src={loc.imageUrl}
                alt={loc.name}
                className="h-44 w-full object-cover"
              />
            ) : (
              <div className="flex h-44 items-center justify-center bg-gradient-to-br from-pink-soft to-cream">
                <MapPin size={40} strokeWidth={1} className="text-pink-strong/50" />
              </div>
            )}
            <div className="px-7 py-7">
              <h3 className="font-serif text-2xl text-ink">{loc.name}</h3>
              <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-ink-soft">
                <MapPin size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
                <span>
                  {loc.address}
                  <br />
                  {loc.city}
                </span>
              </p>
              <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-ink-soft">
                <Clock size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
                <span>{loc.hours}</span>
              </p>
              {loc.mapUrl ? (
                <a
                  href={loc.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/50 px-5 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-ink transition-colors hover:border-gold hover:text-pink-strong"
                >
                  <MapPin size={14} strokeWidth={1.5} /> Abrir en mapa
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

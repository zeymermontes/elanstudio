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
            <div className="flex h-44 items-center justify-center bg-gradient-to-br from-pink-soft to-cream">
              <MapPin size={40} strokeWidth={1} className="text-pink-strong/50" />
            </div>
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
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

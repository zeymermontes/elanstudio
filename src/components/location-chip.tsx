"use client";

import { useState } from "react";
import { MapPin, Clock, X, ExternalLink } from "lucide-react";
import type { Location } from "@/lib/types";

/**
 * Enlace a Maps de la sede: el `mapUrl` que configuró el admin y, si no hay,
 * una búsqueda de Google Maps con la dirección — así el botón siempre lleva a
 * algún lado en vez de desaparecer.
 */
function mapsHref(loc: Location): string | null {
  if (loc.mapUrl) return loc.mapUrl;
  const query = [loc.name, loc.address, loc.city].filter(Boolean).join(", ");
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

/**
 * El nombre de la sede junto a una clase o evento, ahora tocable: abre la
 * dirección completa con el horario y un botón para abrir en Maps. Antes era
 * texto muerto — decía dónde es, pero no cómo llegar.
 */
export function LocationChip({
  location: loc,
  className = "",
}: {
  location: Location;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const href = mapsHref(loc);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // Estos chips viven dentro de tarjetas que abren su propio detalle.
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 transition-colors hover:text-pink-strong ${className}`}
      >
        <MapPin size={12} strokeWidth={1.5} /> {loc.name}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <div className="surface-card animate-in relative w-full max-w-sm rounded-3xl px-7 py-8 text-left shadow-soft">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="absolute right-5 top-5 text-ink-soft transition-colors hover:text-pink-strong"
            >
              <X size={20} strokeWidth={1.5} />
            </button>

            <p className="text-[0.7rem] uppercase tracking-luxe text-gold">
              Cómo llegar
            </p>
            <h2 className="mt-1 font-serif text-3xl text-ink">{loc.name}</h2>

            {loc.address || loc.city ? (
              <p className="mt-5 flex items-start gap-2.5 text-sm leading-relaxed text-ink">
                <MapPin size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
                <span>
                  {loc.address}
                  {loc.address && loc.city ? <br /> : null}
                  {loc.city}
                </span>
              </p>
            ) : null}

            {loc.hours ? (
              <p className="mt-3 flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
                <Clock size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
                <span>{loc.hours}</span>
              </p>
            ) : null}

            <div className="mt-7 flex flex-col gap-3">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-pink px-6 py-3 text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink-strong"
                >
                  Abrir en Maps <ExternalLink size={14} strokeWidth={1.5} />
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-line px-6 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

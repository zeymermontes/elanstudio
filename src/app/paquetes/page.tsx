import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BuyButton } from "@/components/buy-button";
import { getPackages } from "@/lib/data";
import { formatMxn } from "@/lib/format";

export const metadata: Metadata = { title: "Paquetes" };

export default async function PaquetesPage() {
  const packages = await getPackages();

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Membresías & paquetes"
        title="Paquetes"
        intro="Elige el plan que se adapta a tu ritmo. Compra en línea y reserva tus clases al instante."
      />

      <div className="mx-auto grid max-w-6xl gap-6 px-5 sm:grid-cols-2 lg:grid-cols-4">
        {packages.map((p) => {
          const unlimited = p.credits >= 999;
          return (
            <article
              key={p.id}
              className={`surface-card relative flex flex-col rounded-2xl px-7 py-8 shadow-soft ${
                p.featured ? "ring-1 ring-pink" : ""
              }`}
            >
              {p.featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-pink px-3 py-1 text-[0.6rem] uppercase tracking-luxe text-white">
                  Más popular
                </span>
              ) : null}

              <h3 className="font-serif text-2xl text-ink">{p.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                {p.description}
              </p>

              <div className="my-6">
                <span className="font-serif text-4xl text-pink-strong">
                  {formatMxn(p.priceMxn)}
                </span>
              </div>

              <ul className="space-y-2 text-sm text-ink-soft">
                <li className="flex items-center gap-2">
                  <Check size={15} strokeWidth={1.5} className="text-gold" />
                  {unlimited ? "Clases ilimitadas" : `${p.credits} clase${p.credits > 1 ? "s" : ""}`}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={15} strokeWidth={1.5} className="text-gold" />
                  Vigencia de {p.validityDays} días
                </li>
                <li className="flex items-center gap-2">
                  <Check size={15} strokeWidth={1.5} className="text-gold" />
                  Reserva en línea
                </li>
              </ul>

              <BuyButton packageId={p.id} featured={p.featured} />
            </article>
          );
        })}
      </div>

      <p className="mx-auto mt-10 max-w-xl px-5 text-center text-xs text-ink-soft">
        Los pagos se procesan de forma segura con Mercado Pago. Necesitas una
        cuenta para comprar y reservar.
      </p>
    </div>
  );
}

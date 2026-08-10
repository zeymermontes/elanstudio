import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getPackages } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  resolvePromotionsFor,
  promoBadge,
  type AppliedPromo,
} from "@/lib/promotions";
import { formatMxn } from "@/lib/format";
import { PromoTerms } from "@/components/promo-terms";

export const metadata: Metadata = { title: "Paquetes" };

export default async function PaquetesPage() {
  const packages = await getPackages();

  // Self-applying promotions for whoever is looking. Resolved per-visitor so a
  // member who already bought doesn't see a "new clients" price they can't get.
  const admin = createSupabaseAdminClient();
  const user = await getCurrentUser();
  const promos: Map<string, AppliedPromo> = admin
    ? await resolvePromotionsFor(admin, packages, user?.id ?? null)
    : new Map();

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
          const promo = promos.get(p.id);
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
                <div className="flex items-baseline gap-1.5">
                  {promo ? (
                    <span className="font-serif text-xl text-ink-soft line-through">
                      {formatMxn(p.priceMxn)}
                    </span>
                  ) : null}
                  <span className="font-serif text-4xl text-pink-strong">
                    {formatMxn(promo?.finalMxn ?? p.priceMxn)}
                  </span>
                  {p.recurring ? (
                    <span className="text-sm text-ink-soft">/ mes</span>
                  ) : null}
                </div>
                {promo ? (
                  <>
                    <p className="mt-1.5 flex items-center gap-2 text-sm text-pink-strong">
                      <span className="rounded-full bg-pink px-2 py-0.5 text-[0.65rem] font-medium tracking-wide text-white">
                        {promoBadge(promo.promotion)}
                      </span>
                      {promo.promotion.name}
                    </p>
                    <p className="mt-1">
                      <PromoTerms
                        name={promo.promotion.name}
                        terms={promo.terms}
                      />
                    </p>
                  </>
                ) : null}
              </div>

              {/* mb-7 keeps a minimum gap for the tallest card, where mt-auto
                  on the button has no slack left to distribute. */}
              <ul className="mb-7 space-y-2 text-sm text-ink-soft">
                <li className="flex items-center gap-2">
                  <Check size={15} strokeWidth={1.5} className="text-gold" />
                  {unlimited ? "Clases ilimitadas" : `${p.credits} clase${p.credits > 1 ? "s" : ""}`}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={15} strokeWidth={1.5} className="text-gold" />
                  {p.recurring
                    ? "Renovación automática mensual"
                    : `Vigencia de ${p.validityDays} días`}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={15} strokeWidth={1.5} className="text-gold" />
                  Reserva en línea
                </li>
              </ul>

              {/* mt-auto pins the button to the bottom of the card. Cards with
                  a promotion carry two extra lines, so without this the buttons
                  sit at different heights across the row. */}
              <Link
                href={`/comprar/${p.id}`}
                className={`mt-auto inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm uppercase tracking-[0.18em] transition-colors ${
                  p.featured
                    ? "bg-pink text-white hover:bg-pink-strong"
                    : "border border-gold/50 text-ink hover:border-gold hover:text-pink-strong"
                }`}
              >
                {p.recurring ? "Suscribirme" : "Comprar"}
              </Link>
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

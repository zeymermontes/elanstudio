import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { getPackageById } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolvePromotion } from "@/lib/promotions";
import { formatMxn } from "@/lib/format";
import { EmbeddedCheckout } from "@/components/embedded-checkout";
import { SubscribeButton } from "@/components/subscribe-button";

export const metadata: Metadata = { title: "Comprar" };
export const dynamic = "force-dynamic";

export default async function ComprarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Must be signed in to buy.
  let userId: string | null = null;
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect(`/ingresar?next=/comprar/${id}`);
    userId = user.id;
  }

  const pkg = await getPackageById(id);
  if (!pkg) notFound();

  const unlimited = pkg.credits >= 999;
  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";

  // Self-applying promotion, if this member qualifies for one. Codes are
  // handled inside the checkout; both are re-resolved server-side when charging.
  const admin = createSupabaseAdminClient();
  const promo = admin
    ? await resolvePromotion(admin, { pkg, userId })
    : null;

  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      <Link
        href="/paquetes"
        className="mb-6 inline-flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-pink-strong"
      >
        <ArrowLeft size={14} strokeWidth={1.5} /> Volver a paquetes
      </Link>

      {/* Summary */}
      <div className="surface-card rounded-2xl px-7 py-6 shadow-soft">
        <p className="text-[0.7rem] uppercase tracking-luxe text-gold">
          {pkg.recurring ? "Suscripción mensual" : "Compra"}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-ink">{pkg.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">{pkg.description}</p>
        <div className="mt-4 flex items-baseline gap-2">
          {promo ? (
            <span className="font-serif text-2xl text-ink-soft line-through">
              {formatMxn(pkg.priceMxn)}
            </span>
          ) : null}
          <span className="font-serif text-4xl text-pink-strong">
            {formatMxn(promo?.finalMxn ?? pkg.priceMxn)}
          </span>
          {pkg.recurring ? (
            <span className="text-sm text-ink-soft">/ mes</span>
          ) : null}
        </div>
        {promo ? (
          <p className="mt-1 text-sm text-pink-strong">{promo.promotion.name}</p>
        ) : null}
        <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
          <li className="flex items-center gap-2">
            <Check size={15} strokeWidth={1.5} className="text-gold" />
            {unlimited
              ? "Clases ilimitadas"
              : `${pkg.credits} clase${pkg.credits > 1 ? "s" : ""}`}
          </li>
          <li className="flex items-center gap-2">
            <Check size={15} strokeWidth={1.5} className="text-gold" />
            {pkg.recurring
              ? "Renovación automática mensual"
              : `Vigencia de ${pkg.validityDays} días`}
          </li>
        </ul>
      </div>

      {/* Payment */}
      <div className="mt-6">
        {pkg.recurring ? (
          <div className="surface-card rounded-2xl px-7 py-7 shadow-soft">
            <h2 className="mb-4 font-serif text-2xl text-ink">Suscripción</h2>
            <SubscribeButton packageId={pkg.id} />
          </div>
        ) : (
          <div>
            <h2 className="mb-4 font-serif text-2xl text-ink">Datos de pago</h2>
            <EmbeddedCheckout
              packageId={pkg.id}
              amount={pkg.priceMxn}
              publicKey={publicKey}
              initialPromo={
                promo
                  ? {
                      name: promo.promotion.name,
                      discountMxn: promo.discountMxn,
                      finalMxn: promo.finalMxn,
                    }
                  : null
              }
            />
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-ink-soft">
        Pago seguro procesado por Mercado Pago.
      </p>
    </div>
  );
}

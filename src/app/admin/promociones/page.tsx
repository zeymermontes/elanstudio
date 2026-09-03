import { getAllPackages, getStudioUtcOffset } from "@/lib/data";
import { listPromotions } from "@/lib/admin-data";
import { PromotionForm } from "@/components/admin/promotion-form";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPromocionesPage() {
  await requireAdmin();
  const [promotions, packages, studioOffset] = await Promise.all([
    listPromotions(),
    getAllPackages(),
    getStudioUtcOffset(),
  ]);

  // Discounts only apply to one-time packages, so the monthly plan is not
  // offered as a scope option (see src/lib/promotions.ts).
  const oneTime = packages.filter((p) => !p.recurring);

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Promociones</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Descuentos sobre los paquetes de contado. Sin código se aplican solas a
        quien cumpla las condiciones; con código, el cliente lo escribe al pagar.
        El plan mensual no admite descuentos.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          Nueva promoción
        </h2>
        <PromotionForm packages={oneTime} utcOffsetMin={studioOffset} />
      </section>

      <section>
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          Promociones ({promotions.length})
        </h2>
        {promotions.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Aún no hay promociones. Crea la primera arriba.
          </p>
        ) : (
          <div className="space-y-5">
            {promotions.map((p) => (
              <PromotionForm
                key={p.id}
                promo={p}
                packages={oneTime}
                utcOffsetMin={studioOffset}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

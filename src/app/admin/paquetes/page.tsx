import { getAllPackages } from "@/lib/data";
import { PackageForm } from "@/components/admin/package-form";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPaquetesPage() {
  await requireAdmin();
  const packages = await getAllPackages();

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Paquetes</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Crea y edita los paquetes y precios que se muestran en el sitio.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          Nuevo paquete
        </h2>
        <PackageForm />
      </section>

      <section>
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          Paquetes existentes ({packages.length})
        </h2>
        <div className="space-y-5">
          {packages.map((p) => (
            <PackageForm key={p.id} pkg={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

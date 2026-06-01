import { getLocations } from "@/lib/data";
import { LocationForm } from "@/components/admin/location-form";

export const dynamic = "force-dynamic";

export default async function AdminUbicacionesPage() {
  const locations = await getLocations();
  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Ubicaciones</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Administra tus estudios y horarios de atención.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          Nueva ubicación
        </h2>
        <LocationForm />
      </section>

      <section>
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          Estudios ({locations.length})
        </h2>
        <div className="space-y-5">
          {locations.map((l) => (
            <LocationForm key={l.id} location={l} />
          ))}
        </div>
      </section>
    </div>
  );
}

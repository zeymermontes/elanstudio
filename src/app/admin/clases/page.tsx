import { getServices, getClassTypes } from "@/lib/data";
import { ServiceForm, ClassTypeForm } from "@/components/admin/class-forms";

export const dynamic = "force-dynamic";

export default async function AdminClasesPage() {
  const [services, classTypes] = await Promise.all([
    getServices(),
    getClassTypes(),
  ]);

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Clases & Servicios</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Define los tipos de clase que aparecen al agendar en el horario y en el
        sitio público. Los servicios agrupan tus clases.
      </p>

      {/* Class types */}
      <section className="mb-12">
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          Nueva clase
        </h2>
        <ClassTypeForm services={services} />

        <h2 className="mb-3 mt-8 text-[0.7rem] uppercase tracking-luxe text-gold">
          Clases existentes ({classTypes.length})
        </h2>
        <div className="space-y-5">
          {classTypes.map((c) => (
            <ClassTypeForm key={c.id} classType={c} services={services} />
          ))}
        </div>
      </section>

      {/* Services */}
      <section>
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          Nuevo servicio
        </h2>
        <ServiceForm />

        <h2 className="mb-3 mt-8 text-[0.7rem] uppercase tracking-luxe text-gold">
          Servicios ({services.length})
        </h2>
        <div className="space-y-5">
          {services.map((s) => (
            <ServiceForm key={s.id} service={s} />
          ))}
        </div>
      </section>
    </div>
  );
}

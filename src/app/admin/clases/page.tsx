import { getServices, getClassTypes } from "@/lib/data";
import { ServiceForm, ClassTypeForm } from "@/components/admin/class-forms";
import { Tabs } from "@/components/admin/tabs";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminClasesPage() {
  await requireAdmin();
  const [services, classTypes] = await Promise.all([
    getServices(),
    getClassTypes(),
  ]);

  const clasesTab = (
    <section>
      <p className="mb-6 text-sm text-ink-soft">
        Los tipos de clase son las opciones que aparecen al agendar en el horario
        y en el sitio público.
      </p>
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
  );

  const serviciosTab = (
    <section>
      <p className="mb-6 text-sm text-ink-soft">
        Los servicios agrupan tus clases por disciplina en el sitio público.
      </p>
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
  );

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Clases & Servicios</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Administra los tipos de clase y las disciplinas que los agrupan.
      </p>

      <Tabs
        tabs={[
          { key: "clases", label: "Clases", content: clasesTab },
          { key: "servicios", label: "Servicios", content: serviciosTab },
        ]}
      />
    </div>
  );
}

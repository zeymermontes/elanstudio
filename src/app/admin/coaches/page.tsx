import { getCoaches } from "@/lib/data";
import { CoachForm } from "@/components/admin/coach-form";

export const dynamic = "force-dynamic";

export default async function AdminCoachesPage() {
  const coaches = await getCoaches();
  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Coaches</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Administra el equipo que se muestra en el sitio.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          Nuevo coach
        </h2>
        <CoachForm />
      </section>

      <section>
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          Equipo ({coaches.length})
        </h2>
        <div className="space-y-5">
          {coaches.map((c) => (
            <CoachForm key={c.id} coach={c} />
          ))}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { listMembers } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const members = await listMembers();

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Usuarios</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Miembros registrados. Entra a cada uno para gestionar créditos,
        suscripción y ver asistencias.
      </p>

      {members.length === 0 ? (
        <p className="text-sm text-ink-soft">Aún no hay usuarios registrados.</p>
      ) : (
        <div className="surface-card overflow-hidden rounded-2xl shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-[0.65rem] uppercase tracking-[0.12em] text-ink-soft">
              <tr>
                <th className="px-5 py-3">Miembro</th>
                <th className="px-5 py-3">Créditos</th>
                <th className="px-5 py-3">Suscripción</th>
                <th className="px-5 py-3">Reservas</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-line/60 last:border-0 hover:bg-cream/50"
                >
                  <td className="px-5 py-3">
                    <Link href={`/admin/usuarios/${m.id}`} className="block">
                      <span className="text-ink">{m.fullName || "—"}</span>
                      {m.role === "admin" ? (
                        <span className="ml-2 rounded-full bg-gold-soft/50 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.1em] text-ink">
                          admin
                        </span>
                      ) : null}
                      <span className="block text-xs text-ink-soft">{m.email}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">
                    {m.subActive ? "—" : m.credits}
                  </td>
                  <td className="px-5 py-3">
                    {m.subActive ? (
                      <span className="rounded-full bg-pink-soft/60 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.1em] text-pink-strong">
                        Activa
                      </span>
                    ) : (
                      <span className="text-ink-soft/60">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{m.bookings}</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/usuarios/${m.id}`}
                      className="inline-flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.12em] text-pink-strong"
                    >
                      Gestionar <ChevronRight size={13} strokeWidth={1.5} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

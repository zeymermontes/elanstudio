import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMxn } from "@/lib/format";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  user_id: string;
  amount_mxn: number;
  credits: number;
  status: string;
  created_at: string;
  packages: { name: string } | { name: string }[] | null;
};

function pkgName(p: Row["packages"]): string {
  if (!p) return "—";
  return Array.isArray(p) ? (p[0]?.name ?? "—") : p.name;
}

const STATUS_LABEL: Record<string, string> = {
  approved: "Aprobado",
  pending: "Pendiente",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

export default async function AdminPagosPage() {
  const supabase = await createSupabaseServerClient();

  let rows: Row[] = [];
  const names = new Map<string, string>();

  if (supabase) {
    const { data } = await supabase
      .from("purchases")
      .select(
        "id, user_id, amount_mxn, credits, status, created_at, packages(name)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    rows = (data ?? []) as unknown as Row[];

    const ids = [...new Set(rows.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      for (const p of profs ?? []) names.set(p.id, p.full_name);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Pagos</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Compras de paquetes vía Mercado Pago.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">Aún no hay pagos registrados.</p>
      ) : (
        <div className="surface-card overflow-hidden rounded-2xl shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-[0.65rem] uppercase tracking-[0.12em] text-ink-soft">
              <tr>
                <th className="px-5 py-3">Miembro</th>
                <th className="px-5 py-3">Paquete</th>
                <th className="px-5 py-3">Monto</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-3 text-ink">{names.get(r.user_id) ?? "—"}</td>
                  <td className="px-5 py-3 text-ink-soft">{pkgName(r.packages)}</td>
                  <td className="px-5 py-3 text-ink-soft">{formatMxn(Number(r.amount_mxn))}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.1em] ${
                        r.status === "approved"
                          ? "bg-gold-soft/50 text-ink"
                          : r.status === "pending"
                            ? "bg-pink-soft/60 text-pink-strong"
                            : "bg-line text-ink-soft"
                      }`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
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

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDayLabel, formatTime, cap } from "@/lib/format";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  user_id: string;
  created_at: string;
  class_sessions: {
    starts_at: string;
    class_types: { name: string } | { name: string }[] | null;
  } | null;
};

function ctName(cs: Row["class_sessions"]): string {
  const ct = cs?.class_types;
  if (!ct) return "Clase";
  return Array.isArray(ct) ? (ct[0]?.name ?? "Clase") : ct.name;
}

export default async function AdminReservasPage() {
  const supabase = await createSupabaseServerClient();

  let rows: Row[] = [];
  let names = new Map<string, string>();

  if (supabase) {
    const { data } = await supabase
      .from("bookings")
      .select(
        "id, user_id, created_at, class_sessions(starts_at, class_types(name))",
      )
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(100);
    rows = (data ?? []) as unknown as Row[];

    const ids = [...new Set(rows.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      names = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    }
  }

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Reservas</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">
        Últimas reservas confirmadas.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">Aún no hay reservas.</p>
      ) : (
        <div className="surface-card overflow-hidden rounded-2xl shadow-soft">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-line text-[0.65rem] uppercase tracking-[0.12em] text-ink-soft">
              <tr>
                <th className="px-5 py-3">Miembro</th>
                <th className="px-5 py-3">Clase</th>
                <th className="px-5 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-3 text-ink">
                    {names.get(r.user_id) ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{ctName(r.class_sessions)}</td>
                  <td className="px-5 py-3 text-ink-soft">
                    {r.class_sessions
                      ? `${cap(formatDayLabel(r.class_sessions.starts_at))} · ${formatTime(r.class_sessions.starts_at)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Package, Users, CreditCard, Cake, Gift } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUpcomingBirthdays, getBirthdayBookings } from "@/lib/admin-data";
import { formatMxn, formatDayLabel, formatTime, cap } from "@/lib/format";

export const dynamic = "force-dynamic";

function daysLabel(d: number) {
  if (d === 0) return "¡Hoy!";
  if (d === 1) return "Mañana";
  return `En ${d} días`;
}

export default async function AdminDashboard() {
  const profile = await requireStaff();
  if (profile.role === "coach") redirect("/admin/mis-clases");

  const supabase = await createSupabaseServerClient();

  let upcoming = 0;
  let members = 0;
  let pkgs = 0;
  let revenue = 0;

  if (supabase) {
    const nowIso = new Date().toISOString();
    const [s, m, p, rev] = await Promise.all([
      supabase
        .from("class_sessions")
        .select("id", { count: "exact", head: true })
        .gte("starts_at", nowIso),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("packages")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
      supabase
        .from("purchases")
        .select("amount_mxn")
        .eq("status", "approved"),
    ]);
    upcoming = s.count ?? 0;
    members = m.count ?? 0;
    pkgs = p.count ?? 0;
    revenue = (rev.data ?? []).reduce(
      (sum, r) => sum + Number((r as { amount_mxn: number }).amount_mxn),
      0,
    );
  }

  const [birthdays, birthdayBookings] = await Promise.all([
    getUpcomingBirthdays(30),
    getBirthdayBookings(60),
  ]);

  const stats = [
    { label: "Clases próximas", value: upcoming, icon: CalendarDays, href: "/admin/horario" },
    { label: "Miembros", value: members, icon: Users, href: "/admin/usuarios" },
    { label: "Paquetes activos", value: pkgs, icon: Package, href: "/admin/paquetes" },
    { label: "Ingresos", value: formatMxn(revenue), icon: CreditCard, href: "/admin/pagos" },
  ];

  return (
    <div>
      <h1 className="font-serif text-4xl text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Resumen de tu estudio de un vistazo.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="surface-card rounded-2xl px-6 py-6 shadow-soft transition-colors hover:border-pink/40"
          >
            <s.icon size={22} strokeWidth={1.25} className="text-pink" />
            <p className="mt-4 font-serif text-3xl text-ink">{s.value}</p>
            <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">
              {s.label}
            </p>
          </Link>
        ))}
      </div>

      <div className="surface-card mt-8 rounded-2xl px-7 py-7 shadow-soft">
        <h2 className="font-serif text-2xl text-ink">Acciones rápidas</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/horario" className="rounded-full bg-pink px-5 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-white hover:bg-pink-strong">
            Agendar clase
          </Link>
          <Link href="/admin/paquetes" className="rounded-full border border-gold/50 px-5 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-ink hover:border-gold hover:text-pink-strong">
            Nuevo paquete
          </Link>
          <Link href="/admin/ajustes" className="rounded-full border border-gold/50 px-5 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-ink hover:border-gold hover:text-pink-strong">
            Editar marca
          </Link>
        </div>
      </div>

      {/* Birthday-in-class alerts */}
      {birthdayBookings.length > 0 ? (
        <div className="surface-card mt-8 rounded-2xl border-l-2 border-pink px-7 py-7 shadow-soft">
          <h2 className="flex items-center gap-2 font-serif text-2xl text-ink">
            <Gift size={18} strokeWidth={1.5} className="text-pink" /> Cumpleaños en clase
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Estas personas reservaron una clase el día de su cumpleaños —
            prepárales un detalle. 🎁
          </p>
          <ul className="mt-4 space-y-2">
            {birthdayBookings.map((b, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl bg-pink-soft/40 px-5 py-3 text-sm"
              >
                <span className="font-medium text-ink">{b.name}</span>
                <span className="text-ink-soft">
                  {b.className} · {cap(formatDayLabel(b.startsAt))} ·{" "}
                  {formatTime(b.startsAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Upcoming birthdays */}
      <div className="surface-card mt-8 rounded-2xl px-7 py-7 shadow-soft">
        <h2 className="flex items-center gap-2 font-serif text-2xl text-ink">
          <Cake size={18} strokeWidth={1.5} className="text-gold" /> Próximos cumpleaños
        </h2>
        {birthdays.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            No hay cumpleaños en los próximos 30 días.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {birthdays.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-3">
                <Link
                  href={`/admin/usuarios/${b.id}`}
                  className="text-sm text-ink hover:text-pink-strong"
                >
                  {b.name}
                </Link>
                <span className="text-sm text-ink-soft">
                  {cap(formatDayLabel(b.date))} · cumple {b.turningAge} ·{" "}
                  <span className="text-gold">{daysLabel(b.daysUntil)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

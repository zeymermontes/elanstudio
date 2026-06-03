import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, CalendarCheck } from "lucide-react";
import { getMemberDetail } from "@/lib/admin-data";
import { formatDayLabel, formatTime, cap } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import {
  AdjustCreditsForm,
  GrantSubscriptionForm,
  CancelUserSubscription,
  RoleToggle,
} from "@/components/admin/user-manage";

export const dynamic = "force-dynamic";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm leading-relaxed text-ink">{value}</dd>
    </div>
  );
}

const REASONS: Record<string, string> = {
  purchase: "Compra",
  booking: "Reserva",
  refund: "Reembolso",
  manual: "Ajuste manual",
  subscription: "Suscripción",
};

export default async function UsuarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const m = await getMemberDetail(id);
  if (!m) notFound();

  // Server component (force-dynamic): reading current time is intentional.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const upcoming = m.bookings.filter(
    (b) => b.startsAt && new Date(b.startsAt).getTime() >= nowMs,
  );
  const past = m.bookings.filter(
    (b) => b.startsAt && new Date(b.startsAt).getTime() < nowMs,
  );
  const attendedCount = m.bookings.filter((b) => b.attended === true).length;

  return (
    <div>
      <Link
        href="/admin/usuarios"
        className="mb-6 inline-flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-pink-strong"
      >
        <ArrowLeft size={14} strokeWidth={1.5} /> Usuarios
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-ink">
            {m.fullName || "Miembro"}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {m.email}
            {m.phone ? ` · ${m.phone}` : ""}
            {m.birthDate ? ` · 🎂 ${cap(formatDayLabel(m.birthDate))}` : ""}
            {m.role === "admin" ? " · admin" : ""}
          </p>
        </div>
        <RoleToggle userId={m.id} isAdmin={m.role === "admin"} />
      </div>

      {/* Health / intake info */}
      {m.health || m.injuries || m.activityType || m.notes ? (
        <div className="surface-card mt-6 rounded-2xl px-7 py-6 shadow-soft">
          <h2 className="mb-3 font-serif text-xl text-ink">Ficha del miembro</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            {m.health ? (
              <Info label="Enfermedades / condiciones" value={m.health} />
            ) : null}
            {m.injuries ? <Info label="Lesiones" value={m.injuries} /> : null}
            {m.activityType ? (
              <Info label="Actividad física" value={m.activityType} />
            ) : null}
            {m.notes ? <Info label="Comentarios" value={m.notes} /> : null}
          </dl>
        </div>
      ) : null}

      {/* Summary */}
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <div className="surface-card rounded-2xl px-6 py-6 shadow-soft">
          <Sparkles size={20} strokeWidth={1.25} className="text-pink" />
          <p className="mt-3 font-serif text-3xl text-ink">
            {m.subActive ? "Ilimitado" : m.credits}
          </p>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">
            {m.subActive ? "Suscripción activa" : "Clases disponibles"}
          </p>
        </div>
        <div className="surface-card rounded-2xl px-6 py-6 shadow-soft">
          <CalendarCheck size={20} strokeWidth={1.25} className="text-pink" />
          <p className="mt-3 font-serif text-3xl text-ink">{attendedCount}</p>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">
            Asistencias confirmadas
          </p>
        </div>
        <div className="surface-card flex flex-col rounded-2xl px-6 py-6 shadow-soft">
          <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">
            Suscripción
          </p>
          <p className="mt-1 font-serif text-xl text-ink">
            {m.subActive ? "Activa" : "Sin suscripción"}
          </p>
          {m.subActive && m.subEnd ? (
            <p className="mt-1 text-xs text-ink-soft">
              Hasta {cap(formatDayLabel(m.subEnd))}
            </p>
          ) : null}
          {m.subActive ? (
            <div className="mt-auto pt-3">
              <CancelUserSubscription userId={m.id} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Profile change history */}
      {m.history.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-4 font-serif text-2xl text-ink">
            Historial de la ficha
          </h2>
          <ol className="relative space-y-4 border-l border-line pl-5">
            {m.history.map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[1.42rem] top-1.5 h-2 w-2 rounded-full bg-pink" />
                <p className="text-xs uppercase tracking-[0.12em] text-gold">
                  {cap(formatDayLabel(h.changed_at))} · {formatTime(h.changed_at)}
                </p>
                <div className="surface-card mt-1.5 rounded-xl px-5 py-3 text-sm shadow-soft">
                  {h.injuries ? (
                    <p className="text-ink">
                      <span className="text-ink-soft">Lesiones:</span> {h.injuries}
                    </p>
                  ) : null}
                  {h.health_conditions ? (
                    <p className="text-ink">
                      <span className="text-ink-soft">Salud:</span>{" "}
                      {h.health_conditions}
                    </p>
                  ) : null}
                  {h.notes ? (
                    <p className="text-ink">
                      <span className="text-ink-soft">Notas:</span> {h.notes}
                    </p>
                  ) : null}
                  {!h.injuries && !h.health_conditions && !h.notes ? (
                    <p className="text-ink-soft">Sin información de salud.</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* Management */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <AdjustCreditsForm userId={m.id} />
        <GrantSubscriptionForm userId={m.id} />
      </div>

      {/* Attendances */}
      <section className="mt-10">
        <h2 className="mb-4 font-serif text-2xl text-ink">Asistencias y reservas</h2>

        <h3 className="mb-2 text-[0.7rem] uppercase tracking-luxe text-gold">
          Próximas ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <p className="mb-6 text-sm text-ink-soft">Sin reservas próximas.</p>
        ) : (
          <ul className="mb-6 space-y-2">
            {upcoming.map((b) => (
              <li
                key={b.sessionId}
                className="surface-card flex items-center justify-between rounded-xl px-5 py-3 text-sm shadow-soft"
              >
                <span className="text-ink">{b.className}</span>
                <span className="text-ink-soft">
                  {b.startsAt
                    ? `${cap(formatDayLabel(b.startsAt))} · ${formatTime(b.startsAt)}`
                    : ""}
                  {b.coach ? ` · ${b.coach}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mb-2 text-[0.7rem] uppercase tracking-luxe text-gold">
          Historial ({past.length})
        </h3>
        {past.length === 0 ? (
          <p className="text-sm text-ink-soft">Sin asistencias registradas.</p>
        ) : (
          <ul className="space-y-2">
            {past.slice(0, 30).map((b) => (
              <li
                key={b.sessionId}
                className="surface-card flex items-center justify-between gap-3 rounded-xl px-5 py-3 text-sm shadow-soft"
              >
                <span className="flex items-center gap-2 text-ink">
                  {b.className}
                  {b.attended === true ? (
                    <span className="rounded-full bg-gold-soft/50 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.1em] text-ink">
                      Presente
                    </span>
                  ) : b.attended === false ? (
                    <span className="rounded-full bg-pink-soft/60 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.1em] text-pink-strong">
                      Ausente
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-ink-soft">
                  {b.startsAt
                    ? `${cap(formatDayLabel(b.startsAt))} · ${formatTime(b.startsAt)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Credit movements */}
      <section className="mt-10">
        <h2 className="mb-4 font-serif text-2xl text-ink">
          Movimientos de clases
        </h2>
        {m.ledger.length === 0 ? (
          <p className="text-sm text-ink-soft">Sin movimientos.</p>
        ) : (
          <div className="surface-card overflow-hidden rounded-2xl shadow-soft">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-sm">
              <tbody>
                {m.ledger.map((l, i) => {
                  const expired =
                    l.expires_at && new Date(l.expires_at).getTime() < nowMs;
                  return (
                    <tr key={i} className="border-b border-line/60 last:border-0">
                      <td className="px-5 py-3 text-ink-soft">
                        {REASONS[l.reason] ?? l.reason}
                        {l.delta > 0 && l.expires_at ? (
                          <span
                            className={`ml-2 text-xs ${expired ? "text-pink-strong" : "text-ink-soft"}`}
                          >
                            {expired ? "venció " : "vence "}
                            {cap(formatDayLabel(l.expires_at))}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            l.delta > 0
                              ? "text-gold"
                              : l.delta < 0
                                ? "text-pink-strong"
                                : "text-ink-soft"
                          }
                        >
                          {l.delta > 0 ? `+${l.delta}` : l.delta}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-ink-soft">
                        {cap(formatDayLabel(l.created_at))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

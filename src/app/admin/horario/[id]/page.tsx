import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getSessionRoster, sessionCoachUserId } from "@/lib/admin-data";
import { CheckInRow } from "@/components/admin/check-in";
import { formatDayLabel, formatTime, cap } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Coaches may only view rosters of their own sessions.
  const profile = await requireStaff();
  if (profile.role === "coach") {
    const owner = await sessionCoachUserId(id);
    if (owner !== profile.id) redirect("/admin/mis-clases");
  }

  const data = await getSessionRoster(id);
  if (!data) notFound();

  const backHref = profile.role === "coach" ? "/admin/mis-clases" : "/admin/horario";

  const present = data.roster.filter((r) => r.attended === true).length;

  return (
    <div>
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-pink-strong"
      >
        <ArrowLeft size={14} strokeWidth={1.5} /> Horario
      </Link>

      <h1 className="font-serif text-4xl text-ink">{data.className}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {cap(formatDayLabel(data.startsAt))} · {formatTime(data.startsAt)}
        {data.coach ? ` · ${data.coach}` : ""}
        {data.location ? ` · ${data.location}` : ""}
      </p>

      <div className="mt-6 flex items-center gap-3 text-sm text-ink-soft">
        <Users size={16} strokeWidth={1.5} className="text-gold" />
        <span>
          {data.roster.length} / {data.capacity} reservas · {present} presentes
        </span>
      </div>

      <div className="mt-6">
        {data.roster.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Nadie ha reservado esta clase todavía.
          </p>
        ) : (
          <div className="space-y-2">
            {data.roster.map((r) => (
              <CheckInRow
                key={r.userId}
                sessionId={data.id}
                userId={r.userId}
                name={r.name}
                email={r.email}
                attended={r.attended}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

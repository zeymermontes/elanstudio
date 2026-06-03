"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, X } from "lucide-react";
import { coverCoachAction, cancelClassAction } from "@/lib/actions/admin";
import type { Coach } from "@/lib/types";

/**
 * Per-slot admin actions on the schedule: change the coach for that single date
 * (cover), open the roster (materialized sessions only), or cancel the class
 * (refunds anyone booked).
 */
export function ScheduleSlotActions({
  refStr,
  coaches,
  currentCoachId,
  sessionId,
}: {
  refStr: string;
  coaches: Coach[];
  currentCoachId: string | null;
  sessionId: string | null;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function cover(coachId: string) {
    start(async () => {
      await coverCoachAction(refStr, coachId);
      router.refresh();
    });
  }
  function cancel() {
    if (
      !confirm(
        "¿Cancelar esta clase? Se reembolsará la clase a quienes ya reservaron.",
      )
    )
      return;
    start(async () => {
      await cancelClassAction(refStr);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.12em] text-ink-soft">
        Coach
        <select
          defaultValue={currentCoachId ?? ""}
          onChange={(e) => cover(e.target.value)}
          disabled={pending}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-ink"
        >
          <option value="">—</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {sessionId ? (
        <Link
          href={`/admin/horario/${sessionId}`}
          className="inline-flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.12em] text-pink-strong transition-colors hover:text-ink"
        >
          <ClipboardCheck size={13} strokeWidth={1.5} /> Lista
        </Link>
      ) : null}

      <button
        type="button"
        onClick={cancel}
        disabled={pending}
        className="inline-flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-pink-strong disabled:opacity-60"
      >
        <X size={13} strokeWidth={1.5} /> Cancelar
      </button>
    </div>
  );
}

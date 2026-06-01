"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { setAttendanceAction } from "@/lib/actions/admin";

/**
 * One member row in a session roster with present/absent check-in. Optimistic:
 * updates locally and persists in the background. Click an active state again
 * to clear it.
 */
export function CheckInRow({
  sessionId,
  userId,
  name,
  email,
  attended,
}: {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  attended: boolean | null;
}) {
  const [state, setState] = useState<boolean | null>(attended);
  const [pending, start] = useTransition();

  function mark(value: boolean) {
    const next = state === value ? null : value;
    setState(next);
    start(() => setAttendanceAction(sessionId, userId, next).then(() => {}));
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[0.7rem] uppercase tracking-[0.12em] transition-colors disabled:opacity-60";

  return (
    <article className="surface-card flex items-center justify-between gap-4 rounded-xl px-5 py-3 shadow-soft">
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{name || email || "Miembro"}</p>
        {name && email ? (
          <p className="truncate text-xs text-ink-soft">{email}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => mark(true)}
          disabled={pending}
          className={`${btn} ${
            state === true
              ? "bg-gold-soft/60 text-ink"
              : "border border-line text-ink-soft hover:text-ink"
          }`}
        >
          <Check size={13} strokeWidth={1.5} /> Presente
        </button>
        <button
          type="button"
          onClick={() => mark(false)}
          disabled={pending}
          className={`${btn} ${
            state === false
              ? "bg-pink-soft/70 text-pink-strong"
              : "border border-line text-ink-soft hover:text-ink"
          }`}
        >
          <X size={13} strokeWidth={1.5} /> Ausente
        </button>
      </div>
    </article>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, User, X, Signal, ArrowRight } from "lucide-react";
import { formatDayLabel, formatTime, cap } from "@/lib/format";
import { ReserveButton } from "@/components/reserve-button";
import { LocationChip } from "@/components/location-chip";
import { BOOKING_WINDOW_NOTE } from "@/lib/booking-rules";
import type { ScheduleSlot } from "@/lib/types";

/**
 * A schedule slot in /horarios. The whole card is clickable and opens a detail
 * modal (class description, coach, time, spots) with Reservar / Cerrar.
 *
 * `blocked` is why the slot can't be booked (full, or outside the booking
 * window) or null when it can. It comes from the server: the window depends on
 * the current time, and reading the clock here would mismatch on hydration.
 */
export function ScheduleSlotItem({
  slot,
  refStr,
  blocked,
}: {
  slot: ScheduleSlot;
  refStr: string;
  blocked: string | null;
}) {
  const [open, setOpen] = useState(false);
  const full = slot.spotsLeft === 0;

  return (
    <>
      <article className="surface-card flex flex-col gap-4 rounded-2xl px-6 py-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        {/* Click the info to open the detail modal */}
        <div className="flex items-center gap-5 text-left">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 text-center"
          >
            <p className="font-serif text-xl text-pink-strong">
              {formatTime(slot.startsAt, slot.utcOffsetMin)}
            </p>
            <p className="text-[0.65rem] uppercase tracking-[0.12em] text-ink-soft">
              {slot.classType.durationMin} min
            </p>
          </button>
          <div className="h-12 w-px shrink-0 bg-line" />
          <div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-left"
            >
              <h3 className="font-serif text-xl text-ink transition-colors hover:text-pink-strong">
                {slot.classType.name}
              </h3>
            </button>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
              {slot.coach ? (
                <span className="inline-flex items-center gap-1">
                  <User size={12} strokeWidth={1.5} /> {slot.coach.name}
                </span>
              ) : null}
              {slot.location ? <LocationChip location={slot.location} /> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <span
            className={`inline-flex items-center gap-1 text-xs ${
              full ? "text-ink-soft" : "text-gold"
            }`}
          >
            <Clock size={12} strokeWidth={1.5} />
            {full ? "Sin lugares" : `${slot.spotsLeft} lugares`}
          </span>
          {/* Direct reserve shortcut (skips the modal) */}
          <ReserveButton
            refStr={refStr}
            blocked={blocked}
            title={full ? undefined : BOOKING_WINDOW_NOTE}
          />
        </div>
      </article>

      {open ? (
        <Modal
          slot={slot}
          refStr={refStr}
          full={full}
          blocked={blocked}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function Modal({
  slot,
  refStr,
  full,
  blocked,
  onClose,
}: {
  slot: ScheduleSlot;
  refStr: string;
  full: boolean;
  blocked: string | null;
  onClose: () => void;
}) {
  const c = slot.coach;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="surface-card animate-in relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl px-7 py-8 shadow-soft">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-5 top-5 text-ink-soft transition-colors hover:text-pink-strong"
        >
          <X size={20} strokeWidth={1.5} />
        </button>

        <p className="text-[0.7rem] uppercase tracking-luxe text-gold">
          {cap(formatDayLabel(slot.startsAt, slot.utcOffsetMin))} ·{" "}
          {formatTime(slot.startsAt, slot.utcOffsetMin)}
        </p>
        <div className="mt-1.5 flex items-center gap-2.5">
          {slot.classType.imageUrl ? (
            <img
              src={slot.classType.imageUrl}
              alt={slot.classType.name}
              className="h-9 w-9 shrink-0 rounded-md bg-cream object-cover"
            />
          ) : null}
          <h2 className="font-serif text-3xl text-ink">
            {slot.classType.name}
          </h2>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-[0.12em] text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} strokeWidth={1.5} /> {slot.classType.durationMin} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Signal size={13} strokeWidth={1.5} /> {slot.classType.level}
          </span>
          {slot.location ? (
            <LocationChip
              location={slot.location}
              className="uppercase tracking-[0.12em]"
            />
          ) : null}
        </div>

        {slot.classType.description ? (
          <p className="mt-5 text-sm leading-relaxed text-ink-soft">
            {slot.classType.description}
          </p>
        ) : null}

        {/* Coach */}
        {c ? (
          <div className="mt-6 flex items-start gap-4 rounded-2xl bg-cream/60 px-4 py-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-soft to-cream">
              {c.photoUrl ? (
                <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-serif text-lg italic text-pink-strong/60">
                  {c.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              )}
            </div>
            <div>
              <p className="font-serif text-lg text-ink">{c.name}</p>
              {c.role ? (
                <p className="text-[0.65rem] uppercase tracking-[0.12em] text-gold">
                  {c.role}
                </p>
              ) : null}
              {c.bio ? (
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                  {c.bio}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <p
          className={`mt-6 text-sm ${full ? "text-ink-soft" : "text-gold"}`}
        >
          {full ? "Esta clase está llena." : `${slot.spotsLeft} lugares disponibles`}
        </p>
        {blocked && !full ? (
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            {BOOKING_WINDOW_NOTE}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-5 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink"
          >
            Cerrar
          </button>
          {blocked ? (
            <span className="cursor-not-allowed rounded-full border border-line px-6 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-ink-soft/60">
              {blocked}
            </span>
          ) : (
            <Link
              href={`/cuenta?reservar=${encodeURIComponent(refStr)}`}
              className="inline-flex items-center gap-2 rounded-full bg-pink px-6 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink-strong"
            >
              Reservar <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

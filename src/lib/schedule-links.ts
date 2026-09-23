/**
 * Deep links into /horarios, for social posts and for members sharing a
 * class. Plain module: the admin buttons, the share button and the page
 * that resolves them all import from here.
 *
 *   /horarios?dia=2026-09-25            → opens that day's tab
 *   /horarios?dia=jueves                → the next Thursday in the week shown
 *   /horarios?dia=…&clase=<ref>         → also opens that class's detail
 *
 * A recurring class is linked by template + date (w:<id>:<date>). Once
 * someone books it the slot becomes a materialized session, so the page
 * matches by `weeklyId` + day as well as by exact ref — the link keeps
 * working after the first booking.
 */
import { dayKey } from "./format";
import { decodeRef, encodeRef } from "./schedule-ref";
import type { ScheduleSlot } from "./types";

/** URL slugs for ?dia=, indexed 0 = Sunday … 6 = Saturday. */
export const WEEKDAY_SLUGS = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

export function slotPath(slot: ScheduleSlot): string {
  const dia = dayKey(slot.startsAt, slot.utcOffsetMin);
  return `/horarios?dia=${dia}&clase=${encodeURIComponent(encodeRef(slot.ref))}`;
}

export function dayPath(date: string): string {
  return `/horarios?dia=${date}`;
}

export function weekdayPath(weekday: number): string {
  return `/horarios?dia=${WEEKDAY_SLUGS[weekday]}`;
}

/** Does this slot answer to the ?clase= value? */
export function slotMatches(slot: ScheduleSlot, clase: string): boolean {
  if (encodeRef(slot.ref) === clase) return true;
  const ref = decodeRef(clase);
  if (!ref || ref.kind !== "weekly") return false;
  return (
    slot.weeklyId === ref.weeklyId &&
    dayKey(slot.startsAt, slot.utcOffsetMin) === ref.date
  );
}

/**
 * Which day tab ?dia= asks for: a date as-is, or the first day in the list
 * that falls on that weekday. null when nothing matches.
 */
export function resolveDay(dia: string, days: string[]): string | null {
  if (days.includes(dia)) return dia;
  const wd = WEEKDAY_SLUGS.indexOf(dia.toLowerCase());
  if (wd < 0) return null;
  return (
    days.find((d) => new Date(`${d}T00:00:00Z`).getUTCDay() === wd) ?? null
  );
}

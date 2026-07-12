/** Spanish (es-MX) formatting helpers. */

/**
 * Default UTC offset (minutes) used when a slot/location has none set.
 * -360 = UTC-6, Ciudad de México.
 */
export const DEFAULT_UTC_OFFSET_MIN = -360;

/** Options for the per-location UTC selector (México + zonas cercanas). */
export const UTC_OFFSET_OPTIONS: { min: number; label: string }[] = [
  { min: -480, label: "UTC-8 · Tijuana" },
  { min: -420, label: "UTC-7 · Hermosillo / La Paz" },
  { min: -360, label: "UTC-6 · Ciudad de México" },
  { min: -300, label: "UTC-5 · Cancún" },
];

/** Compact "UTC-6" style label for a given offset in minutes. */
export function offsetLabel(min: number): string {
  const sign = min < 0 ? "-" : "+";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

/** Shift a UTC instant so its wall-clock reads in the given offset. */
function atOffset(iso: string, offsetMin: number): Date {
  return new Date(new Date(iso).getTime() + offsetMin * 60000);
}

/**
 * Turn a wall-clock date + time in a fixed UTC offset into the UTC instant.
 * e.g. zonedToUtc("2026-07-13", "07:00", -360) → 2026-07-13T13:00:00Z.
 */
export function zonedToUtc(
  dateStr: string,
  timeStr: string,
  offsetMin: number,
): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - offsetMin * 60000);
}

/** Wall-clock hour (0-23) of an instant at the given offset. */
export function zonedHour(iso: string, offsetMin = DEFAULT_UTC_OFFSET_MIN): number {
  return atOffset(iso, offsetMin).getUTCHours();
}

export function formatMxn(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDayLabel(
  iso: string,
  offsetMin = DEFAULT_UTC_OFFSET_MIN,
): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(atOffset(iso, offsetMin));
}

export function formatTime(
  iso: string,
  offsetMin = DEFAULT_UTC_OFFSET_MIN,
): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(atOffset(iso, offsetMin));
}

/** Capitalize the first letter (Intl weekday/month come back lowercase in es). */
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Calendar-day key (YYYY-MM-DD) at the given offset — groups by the day shown. */
export function dayKey(iso: string, offsetMin = DEFAULT_UTC_OFFSET_MIN): string {
  const d = atOffset(iso, offsetMin);
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

/** Short tab label like "Lun 8". */
export function formatTabDay(
  iso: string,
  offsetMin = DEFAULT_UTC_OFFSET_MIN,
): string {
  const d = atOffset(iso, offsetMin);
  const wd = new Intl.DateTimeFormat("es-MX", { weekday: "short", timeZone: "UTC" })
    .format(d)
    .replace(".", "");
  return `${cap(wd)} ${d.getUTCDate()}`;
}

/** Spanish (es-MX) formatting helpers. */

/**
 * Último recurso cuando una sede no tiene huso configurado. -360 = UTC-6.
 *
 * NO es un default de formato: las funciones de abajo exigen el huso a
 * propósito. Tenerlo opcional dejó que veinte llamadas lo omitieran en
 * silencio, y como el default era Ciudad de México, cada pantalla que lo
 * olvidaba pintaba una hora de más para un estudio en Culiacán (UTC-7).
 */
export const DEFAULT_UTC_OFFSET_MIN = -360;

/** Compact "UTC-6" style label for a given offset in minutes. */
export function offsetLabel(min: number): string {
  const sign = min < 0 ? "-" : "+";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

/** Every real-world UTC offset, in minutes (UTC-12 … UTC+14). */
const ALL_UTC_OFFSET_MIN = [
  -720, -660, -600, -570, -540, -480, -420, -360, -300, -240, -210, -180, -120,
  -60, 0, 60, 120, 180, 210, 240, 270, 300, 330, 345, 360, 390, 420, 480, 525,
  540, 570, 600, 630, 660, 720, 765, 780, 840,
];

/** Hints shown next to the offsets relevant to México. */
const UTC_OFFSET_HINTS: Record<number, string> = {
  [-480]: "Tijuana",
  [-420]: "Hermosillo / La Paz",
  [-360]: "Ciudad de México",
  [-300]: "Cancún",
};

/** Options for the per-location UTC selector — the full list of offsets. */
export const UTC_OFFSET_OPTIONS: { min: number; label: string }[] =
  ALL_UTC_OFFSET_MIN.map((min) => ({
    min,
    label: UTC_OFFSET_HINTS[min]
      ? `${offsetLabel(min)} · ${UTC_OFFSET_HINTS[min]}`
      : offsetLabel(min),
  }));

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

/**
 * "YYYY-MM-DDTHH:mm" for a <input type="datetime-local">, read in the studio's
 * offset. The inverse of zonedToUtc, so an admin sees back the same wall time
 * they typed regardless of where the server runs.
 */
export function toDateTimeLocal(
  iso: string | null,
  offsetMin: number,
): string {
  if (!iso) return "";
  return atOffset(iso, offsetMin).toISOString().slice(0, 16);
}

/** Wall-clock hour (0-23) of an instant at the given offset. */
export function zonedHour(iso: string, offsetMin: number): number {
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
  offsetMin: number,
): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(atOffset(iso, offsetMin));
}

/**
 * Format a civil date — a birthday, not an instant.
 *
 * A birthday has no time of day, so it must NOT be shifted by a UTC offset the
 * way formatDayLabel shifts class times: subtracting six hours from a bare date
 * lands it on the previous day. Accepts "YYYY-MM-DD" or an ISO instant that is
 * already UTC midnight.
 */
export function formatCivilDate(value: string): string {
  const iso = value.length === 10 ? `${value}T00:00:00Z` : value;
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function formatTime(
  iso: string,
  offsetMin: number,
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
export function dayKey(iso: string, offsetMin: number): string {
  const d = atOffset(iso, offsetMin);
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

/**
 * Day number + short month for a date badge, e.g. { day: "12", month: "sep" }.
 * Split in two so each half can be styled on its own line.
 */
export function dateBadge(
  iso: string,
  offsetMin: number,
): { day: string; month: string } {
  const d = atOffset(iso, offsetMin);
  const month = new Intl.DateTimeFormat("es-MX", {
    month: "short",
    timeZone: "UTC",
  })
    .format(d)
    .replace(".", "");
  return { day: String(d.getUTCDate()), month };
}

/** Short tab label like "Lun 8". */
export function formatTabDay(
  iso: string,
  offsetMin: number,
): string {
  const d = atOffset(iso, offsetMin);
  const wd = new Intl.DateTimeFormat("es-MX", { weekday: "short", timeZone: "UTC" })
    .format(d)
    .replace(".", "");
  return `${cap(wd)} ${d.getUTCDate()}`;
}

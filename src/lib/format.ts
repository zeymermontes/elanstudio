/** Spanish (es-MX) formatting helpers. */

export function formatMxn(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** Capitalize the first letter (Intl weekday/month come back lowercase in es). */
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Local calendar-day key (YYYY-MM-DD) — groups by the day as shown, not UTC. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Short tab label like "Lun 8". */
export function formatTabDay(iso: string): string {
  const d = new Date(iso);
  const wd = new Intl.DateTimeFormat("es-MX", { weekday: "short" })
    .format(d)
    .replace(".", "");
  return `${cap(wd)} ${d.getDate()}`;
}

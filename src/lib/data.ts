/**
 * Read-side data access.
 *
 * Each function returns live Supabase data when configured, otherwise the seed
 * dataset — so every page renders before the backend exists, and reflects admin
 * edits once it does.
 */
import { createSupabaseServerClient } from "./supabase/server";
import { defaultSettings, type SiteSettings } from "./site";
import { DEFAULT_UTC_OFFSET_MIN, zonedToUtc } from "./format";
import {
  services as seedServices,
  classTypes as seedClassTypes,
  coaches as seedCoaches,
  locations as seedLocations,
  packages as seedPackages,
  generateUpcomingSessions,
} from "./seed";
import type {
  Service,
  ClassType,
  Coach,
  Location,
  Package,
  SessionView,
  WeeklyClass,
  ScheduleSlot,
} from "./types";

/** Brand/site settings from the DB, or defaults when not configured. */
export async function getSettings(): Promise<SiteSettings> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return defaultSettings;
  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (!data) return defaultSettings;
  return {
    studioName: data.studio_name ?? defaultSettings.studioName,
    tagline: data.tagline ?? defaultSettings.tagline,
    primaryColor: data.primary_color ?? defaultSettings.primaryColor,
    accentColor: data.accent_color ?? defaultSettings.accentColor,
    bgColor: data.bg_color ?? defaultSettings.bgColor,
    whatsapp: data.whatsapp ?? "",
    email: data.email ?? "",
    instagram: data.instagram ?? "",
    address: data.address ?? "",
  };
}

/**
 * Huso del estudio, para las horas que no cuelgan de una sede concreta: fechas
 * de promociones, historial, cumpleaños. Se toma de la primera sede en vez de
 * fijarlo en el código, porque tenerlo fijo en UTC-6 hacía que un estudio en
 * Culiacán (UTC-7) viera todo con una hora de más.
 */
export async function getStudioUtcOffset(): Promise<number> {
  const locations = await getLocations();
  return locations[0]?.utcOffsetMin ?? DEFAULT_UTC_OFFSET_MIN;
}

export async function getServices(): Promise<Service[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return [...seedServices].sort((a, b) => a.order - b.order);
  const { data } = await supabase
    .from("services")
    .select("*")
    .order("order", { ascending: true });
  if (!data) return seedServices;
  return data.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description ?? "",
    order: s.order ?? 0,
  }));
}

export async function getClassTypes(): Promise<ClassType[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return seedClassTypes;
  const { data } = await supabase.from("class_types").select("*");
  if (!data) return seedClassTypes;
  return data.map(mapClassType);
}

export async function getCoaches(): Promise<Coach[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return seedCoaches;
  const { data } = await supabase.from("coaches").select("*").order("name");
  if (!data) return seedCoaches;
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role ?? "",
    bio: c.bio ?? "",
    specialties: c.specialties ?? [],
    photoUrl: c.photo_url ?? null,
    instagram: c.instagram ?? null,
  }));
}

export async function getLocations(): Promise<Location[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return seedLocations;
  const { data } = await supabase.from("locations").select("*").order("name");
  if (!data) return seedLocations;
  return data.map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address ?? "",
    city: l.city ?? "",
    hours: l.hours ?? "",
    mapUrl: l.map_url ?? null,
    imageUrl: l.image_url ?? null,
    utcOffsetMin:
      typeof l.utc_offset_minutes === "number"
        ? l.utc_offset_minutes
        : DEFAULT_UTC_OFFSET_MIN,
  }));
}

/** Active packages for the public site. */
export async function getPackages(): Promise<Package[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return [...seedPackages].sort((a, b) => a.priceMxn - b.priceMxn);
  const { data } = await supabase
    .from("packages")
    .select("*")
    .eq("active", true)
    .order("price_mxn", { ascending: true });
  if (!data) return seedPackages;
  return data.map(mapPackage);
}

/** All packages (active + inactive) for the admin. */
export async function getAllPackages(): Promise<Package[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return [...seedPackages].sort((a, b) => a.priceMxn - b.priceMxn);
  const { data } = await supabase
    .from("packages")
    .select("*")
    .order("price_mxn", { ascending: true });
  if (!data) return seedPackages;
  return data.map(mapPackage);
}

/** A single package by id (active only), or null. */
export async function getPackageById(id: string): Promise<Package | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return seedPackages.find((p) => p.id === id) ?? null;
  }
  const { data } = await supabase
    .from("packages")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .single();
  return data ? mapPackage(data) : null;
}

/**
 * Upcoming schedule enriched with class type / coach / location and computed
 * spots-left, sorted chronologically.
 */
export async function getUpcomingSessions(
  daysAhead = 7,
): Promise<SessionView[]> {
  const supabase = await createSupabaseServerClient();
  const [classTypes, coaches, locations] = await Promise.all([
    getClassTypes(),
    getCoaches(),
    getLocations(),
  ]);

  // Seed fallback.
  if (!supabase) {
    return generateUpcomingSessions(daysAhead)
      .map((s) => enrich(s, classTypes, coaches, locations))
      .filter((s): s is SessionView => s !== null)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  const from = new Date();
  const to = new Date(from.getTime() + daysAhead * 86400000);

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("*")
    .eq("status", "scheduled")
    .gte("starts_at", from.toISOString())
    .lte("starts_at", to.toISOString())
    .order("starts_at", { ascending: true });
  if (!sessions) return [];

  // Confirmed booking counts per session.
  const counts = await getBookedCounts(
    supabase,
    sessions.map((s) => s.id),
  );

  return sessions
    .map((s) =>
      enrich(
        {
          id: s.id,
          classTypeId: s.class_type_id,
          coachId: s.coach_id,
          locationId: s.location_id,
          startsAt: s.starts_at,
          endsAt: s.ends_at,
          capacity: s.capacity,
          booked: counts.get(s.id) ?? 0,
          status: s.status,
        },
        classTypes,
        coaches,
        locations,
      ),
    )
    .filter((s): s is SessionView => s !== null);
}

/**
 * Confirmed bookings per session, as {sessionId → count}.
 *
 * Goes through the session_booked_counts RPC (0020) rather than reading
 * `bookings` directly: RLS only shows a member her own row, so a plain count
 * gave every visitor the full capacity no matter how many had booked.
 */
async function getBookedCounts(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  ids: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!ids.length) return counts;
  const { data, error } = await supabase.rpc("session_booked_counts", {
    p_sessions: ids,
  });
  if (error) console.error("[session_booked_counts]", error.code, error.message);
  for (const r of (data ?? []) as { session_id: string; booked: number }[])
    counts.set(r.session_id, r.booked);
  return counts;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** All recurring weekly classes (template). */
export async function getWeeklyClasses(): Promise<WeeklyClass[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("weekly_classes")
    .select("*")
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });
  return (data ?? []).map((w) => ({
    id: w.id,
    classTypeId: w.class_type_id,
    coachId: w.coach_id ?? null,
    locationId: w.location_id ?? null,
    weekday: w.weekday,
    startTime: String(w.start_time).slice(0, 5),
    durationMin: w.duration_min ?? 50,
    capacity: w.capacity ?? 10,
    active: Boolean(w.active),
  }));
}

/**
 * How far ahead one-off events are looked up. Unlike the recurring template —
 * which only makes sense a week or two out — a workshop or a guest class is
 * announced well in advance, so it has to be visible long before its date.
 */
export const EVENT_HORIZON_DAYS = 180;

type SlotMaps = {
  ctById: Map<string, ClassType>;
  coachById: Map<string, Coach>;
  locById: Map<string, Location>;
};

/** A one-off session row → schedule slot. Null when cancelled or orphaned. */
function toEventSlot(
  s: Row,
  { ctById, coachById, locById }: SlotMaps,
  booked: number,
): ScheduleSlot | null {
  if (s.status === "cancelled") return null;
  const ct = ctById.get(s.class_type_id as string);
  if (!ct) return null;
  const locationId = (s.location_id as string) ?? null;
  const capacity = s.capacity as number;
  return {
    ref: { kind: "session", sessionId: s.id as string },
    classType: ct,
    coach: s.coach_id ? coachById.get(s.coach_id as string) ?? null : null,
    location: locationId ? locById.get(locationId) ?? null : null,
    startsAt: s.starts_at as string,
    endsAt: s.ends_at as string,
    capacity,
    booked,
    spotsLeft: Math.max(0, capacity - booked),
    utcOffsetMin:
      (locationId ? locById.get(locationId)?.utcOffsetMin : undefined) ??
      DEFAULT_UTC_OFFSET_MIN,
    isEvent: true,
    featured: Boolean(s.featured),
  };
}

/**
 * Upcoming one-off events (no weekly template behind them), from now to the
 * event horizon. `featuredOnly` narrows it to the ones the admin chose to
 * announce on the landing page.
 */
export async function getSpecialEvents({
  featuredOnly = false,
  daysAhead = EVENT_HORIZON_DAYS,
}: { featuredOnly?: boolean; daysAhead?: number } = {}): Promise<ScheduleSlot[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 86400000);

  let query = supabase
    .from("class_sessions")
    .select("*")
    .is("weekly_class_id", null)
    .eq("status", "scheduled")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", end.toISOString())
    .order("starts_at", { ascending: true });
  if (featuredOnly) query = query.eq("featured", true);

  const { data: rows } = await query;
  if (!rows?.length) return [];

  const [classTypes, coaches, locations] = await Promise.all([
    getClassTypes(),
    getCoaches(),
    getLocations(),
  ]);
  const maps: SlotMaps = {
    ctById: new Map(classTypes.map((c) => [c.id, c])),
    coachById: new Map(coaches.map((c) => [c.id, c])),
    locById: new Map(locations.map((l) => [l.id, l])),
  };

  const counts = await getBookedCounts(
    supabase,
    rows.map((r) => r.id),
  );

  return rows
    .map((r) => toEventSlot(r, maps, counts.get(r.id) ?? 0))
    .filter((s): s is ScheduleSlot => s !== null);
}

/**
 * Compute the bookable schedule for the next `daysAhead` days from the weekly
 * template, overlaying materialized exceptions (coach cover, cancellations) and
 * one-off events.
 */
export async function getSchedule(daysAhead = 14): Promise<ScheduleSlot[]> {
  const supabase = await createSupabaseServerClient();
  const [classTypes, coaches, locations] = await Promise.all([
    getClassTypes(),
    getCoaches(),
    getLocations(),
  ]);
  const ctById = new Map(classTypes.map((c) => [c.id, c]));
  const coachById = new Map(coaches.map((c) => [c.id, c]));
  const locById = new Map(locations.map((l) => [l.id, l]));

  // Seed fallback: synthesize from generateUpcomingSessions.
  if (!supabase) {
    return generateUpcomingSessions(daysAhead)
      .map((s): ScheduleSlot | null => {
        const ct = ctById.get(s.classTypeId);
        if (!ct) return null;
        return {
          ref: { kind: "session", sessionId: s.id },
          classType: ct,
          coach: coachById.get(s.coachId) ?? null,
          location: locById.get(s.locationId) ?? null,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          capacity: s.capacity,
          booked: s.booked,
          spotsLeft: Math.max(0, s.capacity - s.booked),
          utcOffsetMin:
            locById.get(s.locationId)?.utcOffsetMin ?? DEFAULT_UTC_OFFSET_MIN,
          isEvent: false,
          featured: false,
        };
      })
      .filter((s): s is ScheduleSlot => s !== null)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  const [weekly] = await Promise.all([getWeeklyClasses()]);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + daysAhead * 86400000);

  const { data: sessionsRaw } = await supabase
    .from("class_sessions")
    .select("*")
    .gte("starts_at", start.toISOString())
    .lte("starts_at", end.toISOString());
  const sessions = sessionsRaw ?? [];

  // Booked counts.
  const counts = await getBookedCounts(
    supabase,
    sessions.map((s) => s.id),
  );

  const materialized = new Map<string, (typeof sessions)[number]>();
  const oneOffs: typeof sessions = [];
  for (const s of sessions) {
    if (s.weekly_class_id && s.session_date)
      materialized.set(`${s.weekly_class_id}|${s.session_date}`, s);
    else oneOffs.push(s);
  }

  const slots: ScheduleSlot[] = [];

  for (let d = 0; d < daysAhead; d++) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);
    const weekday = day.getDay();
    const dateStr = isoDate(day);

    for (const w of weekly) {
      if (!w.active || w.weekday !== weekday) continue;
      const ct = ctById.get(w.classTypeId);
      if (!ct) continue;

      const mat = materialized.get(`${w.id}|${dateStr}`);
      // Anchor the template's wall-clock start_time to the location's UTC
      // offset, so the instant is fixed regardless of server/viewer timezone.
      const offsetMin =
        (w.locationId ? locById.get(w.locationId)?.utcOffsetMin : undefined) ??
        DEFAULT_UTC_OFFSET_MIN;
      const startsAt = zonedToUtc(dateStr, w.startTime, offsetMin);

      if (mat) {
        if (mat.status === "cancelled") continue;
        const endsAt = new Date(
          startsAt.getTime() + w.durationMin * 60000,
        );
        slots.push({
          ref: { kind: "session", sessionId: mat.id },
          classType: ct,
          coach: mat.coach_id ? coachById.get(mat.coach_id) ?? null : null,
          location: mat.location_id
            ? locById.get(mat.location_id) ?? null
            : null,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          capacity: mat.capacity,
          booked: counts.get(mat.id) ?? 0,
          spotsLeft: Math.max(0, mat.capacity - (counts.get(mat.id) ?? 0)),
          utcOffsetMin: offsetMin,
          isEvent: false,
          featured: false,
        });
      } else {
        const endsAt = new Date(startsAt.getTime() + w.durationMin * 60000);
        slots.push({
          ref: { kind: "weekly", weeklyId: w.id, date: dateStr },
          classType: ct,
          coach: w.coachId ? coachById.get(w.coachId) ?? null : null,
          location: w.locationId ? locById.get(w.locationId) ?? null : null,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          capacity: w.capacity,
          booked: 0,
          spotsLeft: w.capacity,
          utcOffsetMin: offsetMin,
          isEvent: false,
          featured: false,
        });
      }
    }
  }

  // One-off special events (no template).
  for (const s of oneOffs) {
    const slot = toEventSlot(s, { ctById, coachById, locById }, counts.get(s.id) ?? 0);
    if (slot) slots.push(slot);
  }

  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

// --- mappers ---------------------------------------------------------------
type Row = Record<string, unknown>;

function mapClassType(c: Row): ClassType {
  return {
    id: c.id as string,
    serviceId: (c.service_id as string) ?? "",
    name: c.name as string,
    description: (c.description as string) ?? "",
    durationMin: (c.duration_min as number) ?? 50,
    level: (c.level as ClassType["level"]) ?? "Todos los niveles",
    defaultCapacity: (c.default_capacity as number) ?? 10,
    imageUrl: (c.image_url as string) ?? null,
  };
}

function mapPackage(p: Row): Package {
  return {
    id: p.id as string,
    name: p.name as string,
    description: (p.description as string) ?? "",
    credits: (p.credits as number) ?? 1,
    priceMxn: Number(p.price_mxn ?? 0),
    validityDays: (p.validity_days as number) ?? 30,
    featured: Boolean(p.featured),
    active: Boolean(p.active),
    recurring: Boolean(p.recurring),
    stockLimit: (p.stock_limit as number) ?? null,
    showStockLeft: Boolean(p.show_stock_left),
  };
}

function enrich(
  s: {
    id: string;
    classTypeId: string;
    coachId: string;
    locationId: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    booked: number;
    status: "scheduled" | "cancelled";
  },
  classTypes: ClassType[],
  coaches: Coach[],
  locations: Location[],
): SessionView | null {
  const classType = classTypes.find((c) => c.id === s.classTypeId);
  const coach = coaches.find((c) => c.id === s.coachId);
  const location = locations.find((l) => l.id === s.locationId);
  if (!classType) return null;
  return {
    ...s,
    classType,
    coach: coach ?? coaches[0],
    location: location ?? locations[0],
    spotsLeft: Math.max(0, s.capacity - s.booked),
  };
}

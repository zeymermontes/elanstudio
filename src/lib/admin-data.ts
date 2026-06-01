/**
 * Admin-only data access for the Usuarios screens. Uses the service-role client
 * (to read auth emails + bypass RLS). Only imported by /admin pages, which are
 * gated by requireAdmin in the admin layout.
 */
import { createSupabaseAdminClient } from "./supabase/admin";

export type MemberRow = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  credits: number;
  subActive: boolean;
  bookings: number;
};

export async function listMembers(): Promise<MemberRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data: list } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const users = list?.users ?? [];

  const [{ data: profiles }, { data: ledger }, { data: subs }, { data: bookings }] =
    await Promise.all([
      admin.from("profiles").select("id, full_name, role"),
      admin.from("credit_ledger").select("user_id, delta"),
      admin
        .from("subscriptions")
        .select("user_id, current_period_end")
        .eq("status", "authorized"),
      admin.from("bookings").select("user_id").eq("status", "confirmed"),
    ]);

  const nameRole = new Map(
    (profiles ?? []).map((p) => [p.id, { name: p.full_name, role: p.role }]),
  );
  const credits = new Map<string, number>();
  for (const l of ledger ?? [])
    credits.set(l.user_id, (credits.get(l.user_id) ?? 0) + l.delta);
  const now = Date.now();
  const subActive = new Set(
    (subs ?? [])
      .filter(
        (s) =>
          !s.current_period_end ||
          new Date(s.current_period_end).getTime() > now,
      )
      .map((s) => s.user_id),
  );
  const bookingCount = new Map<string, number>();
  for (const b of bookings ?? [])
    bookingCount.set(b.user_id, (bookingCount.get(b.user_id) ?? 0) + 1);

  return users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      fullName: nameRole.get(u.id)?.name ?? "",
      role: nameRole.get(u.id)?.role ?? "member",
      credits: credits.get(u.id) ?? 0,
      subActive: subActive.has(u.id),
      bookings: bookingCount.get(u.id) ?? 0,
    }))
    .sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email));
}

export type MemberBooking = {
  sessionId: string;
  startsAt: string | null;
  className: string;
  coach: string;
  attended: boolean | null;
};

export type MemberDetail = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  birthDate: string | null;
  health: string;
  injuries: string;
  activityType: string;
  notes: string;
  credits: number;
  subActive: boolean;
  subEnd: string | null;
  ledger: {
    delta: number;
    reason: string;
    created_at: string;
    expires_at: string | null;
  }[];
  bookings: MemberBooking[];
  history: {
    changed_at: string;
    birth_date: string | null;
    health_conditions: string;
    injuries: string;
    notes: string;
  }[];
};

function firstName(v: { name: string } | { name: string }[] | null): string {
  if (!v) return "";
  return Array.isArray(v) ? (v[0]?.name ?? "") : v.name;
}

export async function getMemberDetail(
  id: string,
): Promise<MemberDetail | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data: userRes } = await admin.auth.admin.getUserById(id);
  if (!userRes?.user) return null;

  const [{ data: profile }, { data: balance }, { data: sub }, { data: rawBookings }] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          "full_name, phone, role, birth_date, health_conditions, injuries, activity_type, notes",
        )
        .eq("id", id)
        .single(),
      admin.rpc("credit_balance", { p_user: id }),
      admin
        .from("subscriptions")
        .select("current_period_end")
        .eq("user_id", id)
        .eq("status", "authorized")
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("bookings")
        .select(
          "session_id, status, attended, created_at, class_sessions(starts_at, class_types(name), coaches(name))",
        )
        .eq("user_id", id)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false }),
    ]);

  const { data: ledger } = await admin
    .from("credit_ledger")
    .select("delta, reason, created_at, expires_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(40);

  const { data: history } = await admin
    .from("profile_history")
    .select("changed_at, birth_date, health_conditions, injuries, notes")
    .eq("user_id", id)
    .order("changed_at", { ascending: false })
    .limit(20);

  const now = Date.now();
  const subEnd = (sub?.current_period_end as string | null) ?? null;
  const subActive = !!sub && (!subEnd || new Date(subEnd).getTime() > now);

  const bookings: MemberBooking[] = (
    (rawBookings ?? []) as unknown as {
      session_id: string;
      attended: boolean | null;
      class_sessions: {
        starts_at: string;
        class_types: { name: string } | { name: string }[] | null;
        coaches: { name: string } | { name: string }[] | null;
      } | null;
    }[]
  ).map((b) => ({
    sessionId: b.session_id,
    startsAt: b.class_sessions?.starts_at ?? null,
    className: firstName(b.class_sessions?.class_types ?? null) || "Clase",
    coach: firstName(b.class_sessions?.coaches ?? null),
    attended: b.attended,
  }));

  return {
    id,
    email: userRes.user.email ?? "",
    fullName: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    role: profile?.role ?? "member",
    birthDate: profile?.birth_date ?? null,
    health: profile?.health_conditions ?? "",
    injuries: profile?.injuries ?? "",
    activityType: profile?.activity_type ?? "",
    notes: profile?.notes ?? "",
    credits: (balance as number | null) ?? 0,
    subActive,
    subEnd,
    ledger: ledger ?? [],
    bookings,
    history: history ?? [],
  };
}

export type RosterEntry = {
  userId: string;
  name: string;
  email: string;
  attended: boolean | null;
};

export type SessionRoster = {
  id: string;
  startsAt: string;
  className: string;
  coach: string;
  location: string;
  capacity: number;
  roster: RosterEntry[];
};

export type Birthday = {
  id: string;
  name: string;
  daysUntil: number;
  turningAge: number;
  date: string; // ISO of the next birthday
};

/** Members whose birthday falls within the next `withinDays` days. */
export async function getUpcomingBirthdays(
  withinDays = 30,
): Promise<Birthday[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("profiles")
    .select("id, full_name, birth_date")
    .not("birth_date", "is", null);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: Birthday[] = [];

  for (const p of data ?? []) {
    const [yy, mm, dd] = String(p.birth_date).split("-").map(Number);
    if (!mm || !dd) continue;
    let next = new Date(today.getFullYear(), mm - 1, dd);
    if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd);
    const daysUntil = Math.round(
      (next.getTime() - today.getTime()) / 86400000,
    );
    if (daysUntil > withinDays) continue;
    out.push({
      id: p.id,
      name: p.full_name || "Miembro",
      daysUntil,
      turningAge: next.getFullYear() - yy,
      date: next.toISOString(),
    });
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

export type BirthdayBooking = {
  name: string;
  className: string;
  startsAt: string;
};

/**
 * Upcoming bookings that fall on the member's birthday — so the studio can
 * prepare a detail/gift for them on the day.
 */
export async function getBirthdayBookings(
  withinDays = 60,
): Promise<BirthdayBooking[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data: bookings } = await admin
    .from("bookings")
    .select("user_id, class_sessions(starts_at, class_types(name))")
    .eq("status", "confirmed");
  if (!bookings?.length) return [];

  const ids = [...new Set(bookings.map((b) => b.user_id))];
  const { data: profs } = await admin
    .from("profiles")
    .select("id, full_name, birth_date")
    .in("id", ids)
    .not("birth_date", "is", null);

  const bmap = new Map<string, { name: string; month: number; day: number }>();
  for (const p of profs ?? []) {
    const [, m, d] = String(p.birth_date).split("-").map(Number);
    bmap.set(p.id, { name: p.full_name || "Miembro", month: m, day: d });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const max = today.getTime() + withinDays * 86400000;
  const out: BirthdayBooking[] = [];

  for (const b of bookings) {
    const bd = bmap.get(b.user_id);
    if (!bd) continue;
    const cs = (b as { class_sessions: unknown }).class_sessions as
      | {
          starts_at: string;
          class_types: { name: string } | { name: string }[] | null;
        }
      | { starts_at: string; class_types: unknown }[]
      | null;
    const session = Array.isArray(cs) ? cs[0] : cs;
    if (!session?.starts_at) continue;
    const sd = new Date(session.starts_at);
    const t = sd.getTime();
    if (t < today.getTime() || t > max) continue;
    if (sd.getMonth() + 1 === bd.month && sd.getDate() === bd.day) {
      out.push({
        name: bd.name,
        className: firstName(session.class_types as never) || "Clase",
        startsAt: session.starts_at,
      });
    }
  }
  return out.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Booked members for a session, for the check-in (attendance) screen. */
export async function getSessionRoster(
  sessionId: string,
): Promise<SessionRoster | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data: session } = await admin
    .from("class_sessions")
    .select(
      "starts_at, capacity, class_types(name), coaches(name), locations(name)",
    )
    .eq("id", sessionId)
    .single();
  if (!session) return null;

  const { data: bookings } = await admin
    .from("bookings")
    .select("user_id, attended")
    .eq("session_id", sessionId)
    .eq("status", "confirmed");

  const ids = (bookings ?? []).map((b) => b.user_id);
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    for (const p of profs ?? []) names.set(p.id, p.full_name);
  }
  const { data: list } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emails = new Map(
    (list?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );

  const s = session as unknown as {
    starts_at: string;
    capacity: number;
    class_types: { name: string } | { name: string }[] | null;
    coaches: { name: string } | { name: string }[] | null;
    locations: { name: string } | { name: string }[] | null;
  };

  const roster: RosterEntry[] = (bookings ?? [])
    .map((b) => ({
      userId: b.user_id,
      name: names.get(b.user_id) ?? "",
      email: emails.get(b.user_id) ?? "",
      attended: b.attended as boolean | null,
    }))
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));

  return {
    id: sessionId,
    startsAt: s.starts_at,
    className: firstName(s.class_types) || "Clase",
    coach: firstName(s.coaches),
    location: firstName(s.locations),
    capacity: s.capacity,
    roster,
  };
}

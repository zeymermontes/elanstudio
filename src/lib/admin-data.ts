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
  credits: number;
  subActive: boolean;
  subEnd: string | null;
  ledger: { delta: number; reason: string; created_at: string }[];
  bookings: MemberBooking[];
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
      admin.from("profiles").select("full_name, phone, role").eq("id", id).single(),
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
    .select("delta, reason, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(40);

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
    credits: (balance as number | null) ?? 0,
    subActive,
    subEnd,
    ledger: ledger ?? [],
    bookings,
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

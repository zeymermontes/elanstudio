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
          "session_id, status, created_at, class_sessions(starts_at, class_types(name), coaches(name))",
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

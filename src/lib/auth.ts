import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

export type Role = "member" | "admin" | "coach";

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
};

/** The current authenticated user, or null. */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** The current user's profile row (includes role), or null. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("id", user.id)
    .single();
  return (data as Profile) ?? null;
}

/** Require a signed-in user; redirect to /ingresar otherwise. */
export async function requireUser(nextPath = "/cuenta") {
  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Require an admin; redirect non-admins away. */
export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile) redirect("/ingresar?next=/admin");
  if (profile.role !== "admin") redirect("/");
  return profile;
}

/** Require staff (admin or coach); redirect everyone else. */
export async function requireStaff() {
  const profile = await getProfile();
  if (!profile) redirect("/ingresar?next=/admin");
  if (profile.role !== "admin" && profile.role !== "coach") redirect("/");
  return profile;
}

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

export type FormState = { ok?: boolean; error?: string } | null;

const NOT_CONFIGURED =
  "Backend no configurado. Agrega las credenciales de Supabase.";

/** Guard: returns a server client only for an authenticated admin. */
async function adminClient() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return null;
  return createSupabaseServerClient();
}

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function num(fd: FormData, k: string) {
  return Number(fd.get(k) ?? 0);
}
function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Brand / settings
// ---------------------------------------------------------------------------
export async function updateSettingsAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  const { error } = await supabase
    .from("site_settings")
    .update({
      studio_name: str(fd, "studio_name"),
      tagline: str(fd, "tagline"),
      primary_color: str(fd, "primary_color"),
      accent_color: str(fd, "accent_color"),
      bg_color: str(fd, "bg_color"),
      whatsapp: str(fd, "whatsapp"),
      email: str(fd, "email"),
      instagram: str(fd, "instagram"),
      address: str(fd, "address"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { error: error.message };
  revalidatePath("/", "layout"); // re-theme the whole site
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------
export async function savePackageAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  const id = str(fd, "id");
  const row = {
    name: str(fd, "name"),
    description: str(fd, "description"),
    credits: num(fd, "credits"),
    price_mxn: num(fd, "price_mxn"),
    validity_days: num(fd, "validity_days"),
    featured: fd.get("featured") === "on",
    active: str(fd, "active") !== "false",
    recurring: fd.get("recurring") === "on",
  };

  const { error } = id
    ? await supabase.from("packages").update(row).eq("id", id)
    : await supabase.from("packages").insert(row);

  if (error) return { error: error.message };
  revalidatePath("/admin/paquetes");
  revalidatePath("/paquetes");
  return { ok: true };
}

export async function deletePackageAction(id: string): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from("packages").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/paquetes");
  revalidatePath("/paquetes");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Coaches
// ---------------------------------------------------------------------------
export async function saveCoachAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  const id = str(fd, "id");
  const row = {
    name: str(fd, "name"),
    role: str(fd, "role"),
    bio: str(fd, "bio"),
    specialties: str(fd, "specialties")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    instagram: str(fd, "instagram"),
    photo_url: str(fd, "photo_url") || null,
  };

  const { error } = id
    ? await supabase.from("coaches").update(row).eq("id", id)
    : await supabase.from("coaches").insert(row);

  if (error) return { error: error.message };
  revalidatePath("/admin/coaches");
  revalidatePath("/coaches");
  return { ok: true };
}

export async function deleteCoachAction(id: string): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from("coaches").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/coaches");
  revalidatePath("/coaches");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------
export async function saveLocationAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  const id = str(fd, "id");
  const row = {
    name: str(fd, "name"),
    address: str(fd, "address"),
    city: str(fd, "city"),
    hours: str(fd, "hours"),
    map_url: str(fd, "map_url") || null,
    image_url: str(fd, "image_url") || null,
  };

  const { error } = id
    ? await supabase.from("locations").update(row).eq("id", id)
    : await supabase.from("locations").insert(row);

  if (error) return { error: error.message };
  revalidatePath("/admin/ubicaciones");
  revalidatePath("/ubicaciones");
  return { ok: true };
}

export async function deleteLocationAction(id: string): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from("locations").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/ubicaciones");
  revalidatePath("/ubicaciones");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
export async function saveServiceAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  const id = str(fd, "id");
  const name = str(fd, "name");
  const row = {
    name,
    slug: str(fd, "slug") || slugify(name),
    description: str(fd, "description"),
    order: num(fd, "order"),
  };

  const { error } = id
    ? await supabase.from("services").update(row).eq("id", id)
    : await supabase.from("services").insert(row);

  if (error) return { error: error.message };
  revalidatePath("/admin/clases");
  revalidatePath("/clases");
  return { ok: true };
}

export async function deleteServiceAction(id: string): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/clases");
  revalidatePath("/clases");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Class types
// ---------------------------------------------------------------------------
export async function saveClassTypeAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  const id = str(fd, "id");
  const row = {
    service_id: str(fd, "service_id") || null,
    name: str(fd, "name"),
    description: str(fd, "description"),
    duration_min: num(fd, "duration_min") || 50,
    level: str(fd, "level") || "Todos los niveles",
    default_capacity: num(fd, "default_capacity") || 10,
    image_url: str(fd, "image_url") || null,
  };

  const { error } = id
    ? await supabase.from("class_types").update(row).eq("id", id)
    : await supabase.from("class_types").insert(row);

  if (error) return { error: error.message };
  revalidatePath("/admin/clases");
  revalidatePath("/admin/horario");
  revalidatePath("/clases");
  return { ok: true };
}

export async function deleteClassTypeAction(id: string): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };
  // Note: deleting a class type also removes its scheduled sessions (FK cascade).
  const { error } = await supabase.from("class_types").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/clases");
  revalidatePath("/admin/horario");
  revalidatePath("/clases");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Schedule (class sessions)
// ---------------------------------------------------------------------------
export async function createSessionAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  const classTypeId = str(fd, "class_type_id");
  const startsAtLocal = str(fd, "starts_at"); // from <input type=datetime-local>
  if (!classTypeId || !startsAtLocal)
    return { error: "Selecciona clase y fecha." };

  // Look up duration to compute the end time.
  const { data: ct } = await supabase
    .from("class_types")
    .select("duration_min, default_capacity")
    .eq("id", classTypeId)
    .single();

  const starts = new Date(startsAtLocal);
  const duration = ct?.duration_min ?? 50;
  const ends = new Date(starts.getTime() + duration * 60000);
  const capacity = num(fd, "capacity") || ct?.default_capacity || 10;

  const { error } = await supabase.from("class_sessions").insert({
    class_type_id: classTypeId,
    coach_id: str(fd, "coach_id") || null,
    location_id: str(fd, "location_id") || null,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    capacity,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/horario");
  revalidatePath("/horarios");
  return { ok: true };
}

export async function deleteSessionAction(id: string): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase
    .from("class_sessions")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/horario");
  revalidatePath("/horarios");
  return { ok: true };
}

/**
 * Mark a booked member's attendance for a session.
 * value: true = present, false = no-show, null = clear.
 */
export async function setAttendanceAction(
  sessionId: string,
  userId: string,
  value: boolean | null,
): Promise<FormState> {
  const supabase = await adminClient();
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase
    .from("bookings")
    .update({ attended: value })
    .eq("session_id", sessionId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/horario/${sessionId}`);
  return { ok: true };
}

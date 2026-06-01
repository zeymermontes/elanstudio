"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileState = { error?: string; success?: boolean } | null;

/**
 * First-visit onboarding: the member fills out their health/birthday info.
 * Writes to their own profile (allowed by RLS) and marks onboarded = true,
 * then redirects back to the account dashboard.
 */
export async function completeOnboardingAction(
  _prev: ProfileState,
  fd: FormData,
): Promise<ProfileState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Backend no configurado." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión." };

  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const birth = s("birth_date");

  const { error } = await supabase
    .from("profiles")
    .update({
      birth_date: birth || null,
      health_conditions: s("health_conditions"),
      injuries: s("injuries"),
      activity_type: s("activity_type"),
      notes: s("notes"),
      onboarded: true,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  redirect("/cuenta");
}

/**
 * Edit profile info from the account (after onboarding). The DB trigger records
 * a snapshot in profile_history on every change, so there's a real timeline.
 */
export async function updateProfileAction(
  _prev: ProfileState,
  fd: FormData,
): Promise<ProfileState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Backend no configurado." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión." };

  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const birth = s("birth_date");

  const { error } = await supabase
    .from("profiles")
    .update({
      birth_date: birth || null,
      health_conditions: s("health_conditions"),
      injuries: s("injuries"),
      notes: s("notes"),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/cuenta/perfil");
  revalidatePath("/cuenta");
  return { success: true };
}

"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AuthState = { error?: string; success?: string } | null;

const NOT_CONFIGURED =
  "El backend aún no está configurado. Agrega las credenciales de Supabase en .env.local.";

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/cuenta");

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Correo o contraseña incorrectos." };

  redirect(next || "/cuenta");
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (password.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  });
  if (error) return { error: error.message };

  // If email confirmation is enabled there is no session yet — tell the user to
  // check their inbox. If it's disabled, signUp returns a session: go straight in.
  if (data.session) redirect("/cuenta");
  return {
    success:
      "Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada (y la carpeta de spam).",
  };
}

export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Ingresa tu correo electrónico." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  // The recovery email (Supabase template) links to /auth/confirm?type=recovery,
  // which sets the session and lands the user on /restablecer to pick a password.
  await supabase.auth.resetPasswordForEmail(email);

  // Always report success — never reveal whether an account exists for this email.
  return {
    success:
      "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y la carpeta de spam).",
  };
}

export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  // Requires the recovery session established by /auth/confirm. Distinguish a
  // missing session (expired/invalid link) from an update Supabase rejected.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      error:
        "Tu sesión de recuperación no está activa (el enlace pudo expirar o ya se usó). Solicita un enlace nuevo.",
    };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error(
      "[updatePassword]",
      error.status,
      error.code,
      error.message,
    );
    return { error: `No pudimos actualizar tu contraseña: ${error.message}` };
  }

  redirect("/cuenta");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}

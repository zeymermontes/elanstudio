"use server";

import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AuthState = {
  error?: string;
  success?: string;
  /**
   * Correo que existe pero está sin confirmar. Lo llena tanto el registro
   * (acabamos de mandar el correo) como un intento de ingreso rechazado por
   * falta de confirmación, y es lo que habilita el botón de reenviar.
   */
  pendingEmail?: string;
  /** El correo ya estaba confirmado: no hay nada que reenviar, toca ingresar. */
  alreadyConfirmed?: boolean;
} | null;

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
  if (error) {
    // La contraseña era correcta pero la cuenta sigue sin confirmar. Decirlo tal
    // cual: con el mensaje genérico la usuaria cree que se equivocó de
    // contraseña y la intenta cambiar, cuando el correo está en no deseado.
    if (isNotConfirmed(error))
      return {
        error:
          "Tu cuenta todavía no está confirmada. Te enviamos un correo cuando te registraste — ábrelo y toca el enlace para activarla.",
        pendingEmail: email,
      };
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect(next || "/cuenta");
}

/**
 * ¿El rechazo fue por falta de confirmación? Supabase manda el código
 * `email_not_confirmed`; el mensaje se revisa como respaldo por si una versión
 * del servidor de auth aún no lo trae.
 */
function isNotConfirmed(error: { code?: string; message: string }): boolean {
  return (
    error.code === "email_not_confirmed" ||
    /email not confirmed/i.test(error.message)
  );
}

/**
 * Reenvía el correo de confirmación del registro. Nunca revela si la cuenta
 * existe o si ya estaba confirmada: la respuesta es siempre la misma.
 */
export async function resendConfirmationAction(
  email: string,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  // Si la cuenta ya está confirmada no hay nada que reenviar, y callarlo deja a
  // la persona esperando un correo que nunca va a llegar.
  if (await isAlreadyConfirmed(email))
    return {
      alreadyConfirmed: true,
      success:
        "Tu correo ya está confirmado. Solo inicia sesión con tu contraseña.",
    };

  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) {
    console.error("[resendConfirmation]", error.status, error.code, error.message);
    // El único caso que sí conviene distinguir: Supabase limita los reenvíos.
    if (error.code === "over_email_send_rate_limit")
      return {
        error:
          "Ya enviamos varios correos en poco tiempo. Espera unos minutos antes de volver a intentarlo.",
      };
  }
  return {
    success: `Listo, reenviamos el correo a ${email}. Si no aparece en tu bandeja, búscalo en correo no deseado.`,
  };
}

/**
 * ¿Esa cuenta ya tiene el correo confirmado? Se consulta con la clave de
 * servicio porque el cliente público no puede ver el estado de otra cuenta.
 *
 * Ante cualquier duda devuelve false: preferimos reenviar un correo de más a
 * mandar a ingresar a alguien que todavía no puede.
 */
async function isAlreadyConfirmed(email: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  if (!admin) return false;
  const target = email.trim().toLowerCase();
  try {
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error || !data) return false;
      const hit = data.users.find(
        (u) => (u.email ?? "").toLowerCase() === target,
      );
      if (hit) return Boolean(hit.email_confirmed_at);
      if (data.users.length < 200) return false;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Consume el token de un correo de autenticación (alta, magic link, cambio de
 * correo o recuperación) y deja la sesión iniciada.
 *
 * Vive en una acción, no en la carga de la página, a propósito: el token es de
 * un solo uso y los escáneres de seguridad del correo — Outlook entre ellos —
 * abren los enlaces automáticamente al entregar el mensaje. Si verificáramos al
 * abrir, el escáner gastaría el token y la persona encontraría el enlace ya
 * usado sin haberlo tocado. Un robot no aprieta un botón; ella sí.
 */
export async function confirmEmailAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  const token_hash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  const next = String(formData.get("next") ?? "") || "/cuenta";
  if (!token_hash || !type)
    return { error: "El enlace está incompleto. Solicita uno nuevo." };

  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    console.error("[confirmEmail]", type, error.status, error.code, error.message);
    return {
      error:
        "Este enlace ya no es válido: pudo expirar o ya haberse usado. Pide uno nuevo e inténtalo otra vez.",
    };
  }

  redirect(next);
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
      "Ya casi. Te enviamos un correo para confirmar tu cuenta: ábrelo y toca el enlace para activarla.",
    pendingEmail: email,
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

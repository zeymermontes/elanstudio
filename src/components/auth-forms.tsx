"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { MailCheck, Inbox, CheckCircle2 } from "lucide-react";
import {
  signInAction,
  signUpAction,
  requestPasswordResetAction,
  updatePasswordAction,
  resendConfirmationAction,
  type AuthState,
} from "@/lib/actions/auth";

const inputClass =
  "w-full rounded-xl border border-line bg-surface/70 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-pink";

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="rounded-xl bg-pink-soft/60 px-4 py-3 text-sm text-pink-strong">
      {error}
    </p>
  );
}

/**
 * Aviso de "tu cuenta está sin confirmar" — el mismo al registrarse y al intentar
 * ingresar sin haber confirmado. Nombra el correo exacto (la usuaria suele
 * teclearlo mal o no recordar cuál usó), manda a revisar no deseado, que es
 * donde acaban casi todos, y ofrece reenviarlo sin salir de la página.
 */
function PendingEmailNote({
  message,
  email,
  onSignInPage = false,
}: {
  message: string;
  email: string;
  /** En /ingresar el formulario ya está debajo: sobra mandarla a otro lado. */
  onSignInPage?: boolean;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AuthState>(null);

  return (
    <div className="space-y-3 rounded-2xl bg-gold-soft/40 px-5 py-5 text-left">
      <p className="flex items-start gap-2.5 text-sm leading-relaxed text-ink">
        <MailCheck size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
        <span>{message}</span>
      </p>

      <p className="rounded-xl bg-surface/80 px-4 py-2.5 text-center text-sm font-medium break-all text-ink">
        {email}
      </p>

      <p className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-soft">
        <Inbox size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
        <span>
          ¿No lo ves? Casi siempre está en{" "}
          <strong className="font-semibold text-ink">correo no deseado</strong>{" "}
          o spam. Búscalo ahí antes de volver a registrarte.
        </span>
      </p>

      {result?.alreadyConfirmed ? (
        <div className="space-y-3">
          <p className="flex items-start gap-2.5 text-sm leading-relaxed text-ink">
            <CheckCircle2
              size={18}
              strokeWidth={1.5}
              className="mt-0.5 shrink-0 text-gold"
            />
            <span>{result.success}</span>
          </p>
          {onSignInPage ? (
            <p className="text-xs leading-relaxed text-ink-soft">
              Escribe tu contraseña aquí abajo para entrar.
            </p>
          ) : (
            <Link
              href="/ingresar"
              className="block rounded-full bg-pink px-5 py-2.5 text-center text-[0.75rem] uppercase tracking-[0.15em] text-white shadow-soft transition-colors hover:bg-pink-strong"
            >
              Ir a ingresar
            </Link>
          )}
        </div>
      ) : result?.success ? (
        <p className="text-xs leading-relaxed text-pink-strong">{result.success}</p>
      ) : result?.error ? (
        <p className="text-xs leading-relaxed text-pink-strong">{result.error}</p>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => setResult(await resendConfirmationAction(email)))
          }
          className="w-full rounded-full border border-gold/50 px-5 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-ink transition-colors hover:border-gold hover:text-pink-strong disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Reenviar correo"}
        </button>
      )}
    </div>
  );
}

function Submit({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="w-full rounded-full bg-pink px-6 py-3 text-sm uppercase tracking-[0.18em] text-white shadow-soft transition-colors hover:bg-pink-strong"
    >
      {label}
    </button>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(
    signInAction,
    null,
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state?.pendingEmail ? (
        <PendingEmailNote
          message={state.error ?? ""}
          email={state.pendingEmail}
          onSignInPage
        />
      ) : (
        <ErrorNote error={state?.error} />
      )}
      <input
        name="email"
        type="email"
        required
        placeholder="Correo electrónico"
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Contraseña"
        className={inputClass}
      />
      <div className="text-right">
        <Link
          href="/recuperar"
          className="text-xs text-ink-soft transition-colors hover:text-pink-strong hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <Submit label="Ingresar" />
      <p className="pt-2 text-center text-sm text-ink-soft">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="text-pink-strong hover:underline">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState<AuthState, FormData>(
    signUpAction,
    null,
  );

  // After signup with email confirmation, replace the form with a check-inbox note.
  if (state?.success) {
    return (
      <div className="space-y-4">
        <PendingEmailNote
          message={state.success}
          email={state.pendingEmail ?? ""}
        />
        <p className="text-center text-xs text-ink-soft">
          Una vez confirmado, podrás ingresar a tu cuenta.
        </p>
        <div className="text-center">
          <Link
            href="/ingresar"
            className="inline-flex rounded-full border border-gold/50 px-6 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-ink transition-colors hover:border-gold hover:text-pink-strong"
          >
            Ir a ingresar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <ErrorNote error={state?.error} />
      <input
        name="full_name"
        type="text"
        required
        placeholder="Nombre completo"
        className={inputClass}
      />
      <input
        name="phone"
        type="tel"
        placeholder="Teléfono (opcional)"
        className={inputClass}
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Correo electrónico"
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Contraseña (mín. 6 caracteres)"
        className={inputClass}
      />
      <Submit label="Crear cuenta" />
      <p className="pt-2 text-center text-sm text-ink-soft">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="text-pink-strong hover:underline">
          Ingresar
        </Link>
      </p>
    </form>
  );
}

export function RequestResetForm() {
  const [state, action] = useActionState<AuthState, FormData>(
    requestPasswordResetAction,
    null,
  );

  // After a request, replace the form with a check-inbox note.
  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-xl bg-gold-soft/40 px-4 py-4 text-sm leading-relaxed text-ink">
          {state.success}
        </div>
        <Link
          href="/ingresar"
          className="inline-flex rounded-full border border-gold/50 px-6 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] text-ink transition-colors hover:border-gold hover:text-pink-strong"
        >
          Volver a ingresar
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <ErrorNote error={state?.error} />
      <input
        name="email"
        type="email"
        required
        placeholder="Correo electrónico"
        className={inputClass}
      />
      <Submit label="Enviar enlace" />
      <p className="pt-2 text-center text-sm text-ink-soft">
        <Link href="/ingresar" className="text-pink-strong hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState<AuthState, FormData>(
    updatePasswordAction,
    null,
  );
  return (
    <form action={action} className="space-y-4">
      <ErrorNote error={state?.error} />
      <input
        name="password"
        type="password"
        required
        placeholder="Nueva contraseña (mín. 6 caracteres)"
        className={inputClass}
      />
      <input
        name="confirm"
        type="password"
        required
        placeholder="Confirma tu nueva contraseña"
        className={inputClass}
      />
      <Submit label="Guardar contraseña" />
    </form>
  );
}

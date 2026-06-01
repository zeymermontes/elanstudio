"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startSubscriptionAction } from "@/lib/actions/subscription";

const ERRORS: Record<string, string> = {
  not_configured: "Las suscripciones aún no están disponibles. Vuelve pronto.",
  not_found: "Este plan no está disponible.",
  error: "Ocurrió un error. Intenta de nuevo.",
};

/**
 * Starts the monthly subscription. Creates the preapproval server-side and
 * redirects the user to Mercado Pago's hosted authorization (one time); after
 * that, MP charges monthly automatically.
 */
export function SubscribeButton({ packageId }: { packageId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function subscribe() {
    setError(null);
    start(async () => {
      const res = await startSubscriptionAction(packageId);
      if (res.url) {
        window.location.href = res.url; // hosted authorization (one time)
        return;
      }
      if (res.error === "auth") {
        router.push("/ingresar?next=/paquetes");
        return;
      }
      setError(ERRORS[res.error ?? "error"] ?? ERRORS.error);
    });
  }

  return (
    <div>
      <button
        onClick={subscribe}
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-pink px-6 py-3 text-sm uppercase tracking-[0.18em] text-white shadow-soft transition-colors hover:bg-pink-strong disabled:opacity-60"
      >
        {pending ? "Redirigiendo…" : "Suscribirme"}
      </button>
      <p className="mt-3 text-center text-xs text-ink-soft">
        Autorizas una sola vez; el cobro se renueva cada mes y puedes cancelar
        cuando quieras.
      </p>
      {error ? (
        <p className="mt-2 text-center text-xs text-pink-strong">{error}</p>
      ) : null}
    </div>
  );
}

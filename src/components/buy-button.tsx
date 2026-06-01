"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startCheckoutAction } from "@/lib/actions/checkout";

const ERRORS: Record<string, string> = {
  not_configured: "Pagos en línea aún no disponibles. Vuelve pronto.",
  not_found: "Este paquete no está disponible.",
  error: "Ocurrió un error. Intenta de nuevo.",
};

export function BuyButton({
  packageId,
  featured,
}: {
  packageId: string;
  featured?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function buy() {
    setError(null);
    start(async () => {
      const res = await startCheckoutAction(packageId);
      if (res.url) {
        window.location.href = res.url; // redirect to Mercado Pago checkout
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
    <div className="mt-7">
      <button
        onClick={buy}
        disabled={pending}
        className={`inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm uppercase tracking-[0.18em] transition-colors disabled:opacity-60 ${
          featured
            ? "bg-pink text-white hover:bg-pink-strong"
            : "border border-gold/50 text-ink hover:border-gold hover:text-pink-strong"
        }`}
      >
        {pending ? "Redirigiendo…" : "Comprar"}
      </button>
      {error ? (
        <p className="mt-2 text-center text-xs text-pink-strong">{error}</p>
      ) : null}
    </div>
  );
}

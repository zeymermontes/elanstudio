"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";

/**
 * Embedded one-time checkout using the Mercado Pago Card Payment Brick, styled
 * with the brand pink. The Brick tokenizes the card in-page; onSubmit posts the
 * token to /api/mp/process which creates the payment server-side. No redirect.
 */
export function EmbeddedCheckout({
  packageId,
  amount,
  publicKey,
}: {
  packageId: string;
  amount: number;
  publicKey: string;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (publicKey) {
      // Initialize the MP SDK (browser-only) before mounting the Brick, then
      // gate rendering on it. This setState is intentional — it reflects the
      // readiness of an external system.
      initMercadoPago(publicKey, { locale: "es-MX" });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
    }
  }, [publicKey]);

  if (!publicKey) {
    return (
      <p className="rounded-xl bg-pink-soft/60 px-4 py-3 text-sm text-pink-strong">
        Los pagos en línea aún no están disponibles. Vuelve pronto.
      </p>
    );
  }

  if (!ready) {
    return <p className="text-sm text-ink-soft">Cargando formulario de pago…</p>;
  }

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-xl bg-pink-soft/60 px-4 py-3 text-sm text-pink-strong">
          {error}
        </p>
      ) : null}

      <CardPayment
        initialization={{ amount }}
        customization={{
          visual: {
            style: {
              theme: "default",
              customVariables: {
                baseColor: "#e29aaa",
                baseColorFirstVariant: "#d6849a",
                formBackgroundColor: "#fffdfb",
                borderRadiusLarge: "16px",
                borderRadiusMedium: "12px",
                borderRadiusSmall: "8px",
                fontSizeMedium: "15px",
              },
            },
          },
        }}
        onSubmit={async (formData) => {
          setError(null);
          const res = await fetch("/api/mp/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packageId, formData }),
          });
          const data = await res.json();
          if (data.status === "approved") {
            router.push("/cuenta?pago=ok");
          } else if (
            data.status === "in_process" ||
            data.status === "pending"
          ) {
            router.push("/cuenta?pago=pendiente");
          } else {
            setError(
              "No se pudo procesar el pago. Revisa los datos de tu tarjeta e intenta de nuevo.",
            );
          }
        }}
        onError={() =>
          setError("Ocurrió un error con el formulario de pago.")
        }
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { paymentRejectionMessage } from "@/lib/mp-errors";
import { PromoSection, type CheckoutPromo } from "@/components/promo-section";

export type { CheckoutPromo };

/**
 * Embedded one-time checkout using the Mercado Pago Card Payment Brick, styled
 * with the brand pink. The Brick tokenizes the card in-page; onSubmit posts the
 * token to /api/mp/process which creates the payment server-side. No redirect.
 *
 * Promotions live in PromoSection; /api/mp/process re-resolves the promotion
 * and charges from its own calculation, never from anything sent by this form.
 */
export function EmbeddedCheckout({
  packageId,
  amount,
  publicKey,
  initialPromo = null,
  payerEmail = null,
}: {
  packageId: string;
  /** List price of the package, before any discount. */
  amount: number;
  publicKey: string;
  initialPromo?: CheckoutPromo | null;
  /**
   * Correo de la sesión. Se le pasa al Brick para que llegue precargado: es un
   * dato que ya conocemos y que la compradora no tiene por qué volver a
   * teclear, y quita de en medio el campo donde el autocompletado del teléfono
   * dejaba texto visible que el Brick no registraba como llenado.
   */
  payerEmail?: string | null;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promo, setPromo] = useState<CheckoutPromo | null>(initialPromo);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  const total = promo?.finalMxn ?? amount;

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

  return (
    <div>
      <PromoSection
        packageId={packageId}
        amount={amount}
        initialPromo={initialPromo}
        onChange={(p, c) => {
          setPromo(p);
          setAppliedCode(c);
        }}
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-pink-soft/60 px-4 py-3 text-sm text-pink-strong">
          {error}
        </p>
      ) : null}

      {!ready ? (
        <p className="text-sm text-ink-soft">Cargando formulario de pago…</p>
      ) : (
        <CardPayment
          /**
           * The Brick reads initialization.amount once, when it mounts — it does
           * not pick up a new prop. Keying on the total remounts it whenever a
           * code changes the price, so the member is never shown one figure and
           * charged another.
           */
          key={total}
          initialization={{
            amount: total,
            ...(payerEmail ? { payer: { email: payerEmail } } : {}),
          }}
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
              body: JSON.stringify({ packageId, formData, promoCode: appliedCode }),
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
              // The server reads Mercado Pago's status_detail and hands us a
              // message the member can act on. A wrong security code, a card
              // without funds and a bank block need three different fixes —
              // one generic line made them all look like the same problem.
              setError(data.message ?? paymentRejectionMessage(null));
            }
          }}
          onError={(err) => {
            // Hay un caso abierto sin explicación: campos escritos a mano que el
            // Brick marca como "Dato obligatorio". No sabemos la causa y no
            // vamos a adivinarla, así que lo que toca es dejar rastro. Cuando
            // vuelva a pasar, la causa real estará en los logs.
            console.error("[CardPayment]", err?.type, err?.cause, err?.message);
            // Solo los 'critical' se le muestran a la compradora. Un
            // 'non_critical' es una validación que el Brick ya pinta junto al
            // campo; repetirla arriba solo confunde.
            if (err?.type === "critical")
              setError("Ocurrió un error con el formulario de pago.");
          }}
        />
      )}
    </div>
  );
}

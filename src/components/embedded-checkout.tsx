"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { applyPromoCodeAction } from "@/lib/actions/promo";
import { formatMxn } from "@/lib/format";
import { paymentRejectionMessage } from "@/lib/mp-errors";
import { PromoTerms } from "@/components/promo-terms";

/** What the member is getting off, as resolved on the server. */
export type CheckoutPromo = {
  name: string;
  discountMxn: number;
  finalMxn: number;
  terms: string[];
};

/**
 * Embedded one-time checkout using the Mercado Pago Card Payment Brick, styled
 * with the brand pink. The Brick tokenizes the card in-page; onSubmit posts the
 * token to /api/mp/process which creates the payment server-side. No redirect.
 *
 * `initialPromo` is a self-applying promotion already resolved by the page. A
 * code the member types replaces it (only one discount applies at a time).
 * Prices shown here are for display: /api/mp/process re-resolves the promotion
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
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  function submitCode() {
    setCodeError(null);
    const typed = code.trim();
    startTransition(async () => {
      const res = await applyPromoCodeAction(packageId, typed);
      if (res.ok && res.applied) {
        setPromo(res.applied);
        setAppliedCode(typed);
      } else {
        setCodeError(res.error ?? "No se pudo aplicar el código.");
      }
    });
  }

  function clearCode() {
    setPromo(initialPromo);
    setAppliedCode(null);
    setCode("");
    setCodeError(null);
  }

  if (!publicKey) {
    return (
      <p className="rounded-xl bg-pink-soft/60 px-4 py-3 text-sm text-pink-strong">
        Los pagos en línea aún no están disponibles. Vuelve pronto.
      </p>
    );
  }

  return (
    <div>
      {/* ---------- Price breakdown ---------- */}
      {promo ? (
        <div className="mb-5 rounded-xl bg-pink-soft/40 px-4 py-3 text-sm">
          <div className="flex items-center justify-between text-ink-soft">
            <span>Precio de lista</span>
            <span className="line-through">{formatMxn(amount)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-pink-strong">
            <span>{promo.name}</span>
            <span>−{formatMxn(promo.discountMxn)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-pink/30 pt-2 font-medium text-ink">
            <span>Total</span>
            <span>{formatMxn(promo.finalMxn)}</span>
          </div>
          <p className="mt-2">
            <PromoTerms name={promo.name} terms={promo.terms} />
          </p>
        </div>
      ) : null}

      {/* ---------- Promo code ---------- */}
      <div className="mb-6">
        {appliedCode ? (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            Código <span className="font-medium text-ink">{appliedCode}</span> aplicado.
            <button
              type="button"
              onClick={clearCode}
              className="text-pink-strong underline underline-offset-2"
            >
              Quitar
            </button>
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="¿Tienes un código?"
                aria-label="Código de promoción"
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/70 focus:border-pink focus:outline-none"
              />
              <button
                type="button"
                onClick={submitCode}
                disabled={pending || !code.trim()}
                className="shrink-0 rounded-xl border border-pink px-4 py-2.5 text-sm text-pink-strong transition-colors hover:bg-pink-soft/50 disabled:opacity-50"
              >
                {pending ? "…" : "Aplicar"}
              </button>
            </div>
            {codeError ? (
              <p className="mt-2 text-sm text-pink-strong">{codeError}</p>
            ) : null}
          </>
        )}
      </div>

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

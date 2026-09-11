"use client";

import { useState } from "react";
import { CreditCard, Landmark } from "lucide-react";
import { EmbeddedCheckout } from "@/components/embedded-checkout";
import { TransferCheckout } from "@/components/transfer-checkout";
import type { CheckoutPromo } from "@/components/promo-section";

type Method = "card" | "transfer";

/**
 * Selector de forma de pago cuando el estudio acepta transferencia además de
 * tarjeta. Cada pestaña monta su propio checkout; el estado de la promoción
 * vive dentro de cada uno, así que cambiar de pestaña vuelve a la promoción
 * automática de la página.
 */
export function PaymentMethods({
  packageId,
  packageName,
  amount,
  publicKey,
  payerEmail,
  initialPromo,
  transferAccounts,
}: {
  packageId: string;
  packageName: string;
  amount: number;
  publicKey: string;
  payerEmail: string | null;
  initialPromo: CheckoutPromo | null;
  transferAccounts: string;
}) {
  const [method, setMethod] = useState<Method>("card");

  const tabs: { key: Method; label: string; icon: typeof CreditCard }[] = [
    { key: "card", label: "Tarjeta", icon: CreditCard },
    { key: "transfer", label: "Transferencia", icon: Landmark },
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-full border border-line bg-surface/70 p-1">
        {tabs.map((t) => {
          const active = method === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setMethod(t.key)}
              aria-pressed={active}
              className={`flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[0.75rem] uppercase tracking-[0.15em] transition-colors ${
                active
                  ? "bg-pink text-white shadow-soft"
                  : "text-ink-soft hover:text-pink-strong"
              }`}
            >
              <t.icon size={14} strokeWidth={1.5} />
              {t.label}
            </button>
          );
        })}
      </div>

      {method === "card" ? (
        <>
          <EmbeddedCheckout
            packageId={packageId}
            packageName={packageName}
            amount={amount}
            publicKey={publicKey}
            payerEmail={payerEmail}
            initialPromo={initialPromo}
          />
          <p className="mt-6 text-center text-xs text-ink-soft">
            Pago seguro procesado por Mercado Pago.
          </p>
        </>
      ) : (
        <TransferCheckout
          packageId={packageId}
          packageName={packageName}
          amount={amount}
          accounts={transferAccounts}
          initialPromo={initialPromo}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { applyPromoCodeAction } from "@/lib/actions/promo";
import { formatMxn } from "@/lib/format";
import { PromoTerms } from "@/components/promo-terms";

/** What the member is getting off, as resolved on the server. */
export type CheckoutPromo = {
  name: string;
  discountMxn: number;
  finalMxn: number;
  terms: string[];
};

/**
 * Price breakdown plus the "¿Tienes un código?" field, shared by the card and
 * the bank-transfer checkouts. Owns the promo state and tells the parent what
 * applies now, so it can charge — or ask for — the right total.
 *
 * `initialPromo` is a self-applying promotion already resolved by the page. A
 * code the member types replaces it (only one discount applies at a time).
 * Prices shown here are for display: the server re-resolves the promotion
 * before charging or crediting, never from anything sent by this form.
 */
export function PromoSection({
  packageId,
  amount,
  initialPromo,
  onChange,
}: {
  packageId: string;
  /** List price of the package, before any discount. */
  amount: number;
  initialPromo: CheckoutPromo | null;
  onChange: (promo: CheckoutPromo | null, appliedCode: string | null) => void;
}) {
  const [promo, setPromo] = useState<CheckoutPromo | null>(initialPromo);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitCode() {
    setCodeError(null);
    const typed = code.trim();
    startTransition(async () => {
      const res = await applyPromoCodeAction(packageId, typed);
      if (res.ok && res.applied) {
        setPromo(res.applied);
        setAppliedCode(typed);
        onChange(res.applied, typed);
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
    onChange(initialPromo, null);
  }

  return (
    <>
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
    </>
  );
}

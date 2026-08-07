"use client";

import { useRef } from "react";
import { X } from "lucide-react";

/**
 * The "*Aplican restricciones" link and its dialog.
 *
 * Uses a native <dialog> with showModal(): Escape-to-close, focus trapping and
 * the inert backdrop come from the platform rather than hand-rolled listeners.
 * The terms are generated from the promotion's own fields (see promoTerms in
 * src/lib/promotions.ts), so they can't drift from what checkout enforces.
 */
export function PromoTerms({
  name,
  terms,
}: {
  name: string;
  terms: string[];
}) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="text-[0.7rem] text-ink-soft underline underline-offset-2 transition-colors hover:text-pink-strong"
      >
        *Aplican restricciones
      </button>

      <dialog
        ref={ref}
        aria-labelledby="promo-terms-title"
        // Clicking the backdrop lands on the dialog element itself, not its
        // contents — that's what makes this a click-outside-to-close.
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="w-[min(30rem,calc(100vw-2.5rem))] rounded-2xl bg-surface p-0 text-ink shadow-soft backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="px-7 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.7rem] uppercase tracking-luxe text-gold">
                Términos de la promoción
              </p>
              <h2
                id="promo-terms-title"
                className="mt-1 font-serif text-2xl text-ink"
              >
                {name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Cerrar"
              className="-mr-1 -mt-1 rounded-full p-1.5 text-ink-soft transition-colors hover:bg-pink-soft/50 hover:text-pink-strong"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>

          <ul className="mt-5 space-y-2.5">
            {terms.map((t) => (
              <li
                key={t}
                className="flex gap-2.5 text-sm leading-relaxed text-ink-soft"
              >
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-gold" />
                {t}
              </li>
            ))}
          </ul>

          <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-soft">
            El descuento se aplica al momento de pagar. Si tienes dudas,
            escríbenos y con gusto te ayudamos.
          </p>
        </div>
      </dialog>
    </>
  );
}

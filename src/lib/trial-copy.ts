/**
 * Cómo se llama y se presenta la clase muestra de cara a la alumna. Un solo
 * lugar para que el aviso de horarios, Mi cuenta, la confirmación y el pago
 * digan exactamente lo mismo. (En el panel sigue siendo "clase muestra".)
 */
import { formatMxn } from "./format";

export const TRIAL_NAME = "Élan First.";

/** "Precio especial para nuevas alumnas, disponible una sola vez." / "Gratis para…" */
export function trialTagline(priceMxn: number | null): string {
  return priceMxn
    ? "Precio especial para nuevas alumnas, disponible una sola vez."
    : "Gratis para nuevas alumnas, disponible una sola vez.";
}

/** "$150" cuando hay precio; vacío cuando es gratis. */
export function trialPriceLabel(priceMxn: number | null): string {
  return priceMxn ? formatMxn(priceMxn) : "";
}

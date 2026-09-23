/**
 * Copy for what a slot costs, shared by the schedule, the landing page, the
 * confirmation card and the admin list. Plain module so both server and
 * client components can import it.
 */
import { formatMxn } from "./format";
import type { SlotPricing } from "./types";

/** "1 clase" / "2 clases". */
export function creditsLabel(n: number): string {
  return `${n} clase${n === 1 ? "" : "s"}`;
}

/** True when the class can only be paid for separately (credit_cost = 0). */
export function isPayOnly(p: SlotPricing): boolean {
  return p.creditCost === 0;
}

/** True when the slot costs anything other than a regular class. */
export function isSpecialPricing(p: SlotPricing): boolean {
  return p.creditCost !== 1 || p.priceMxn !== null || !p.planIncluded;
}

/**
 * Short pieces for a badge: ["2 clases", "o $500"], plus the plan note
 * when the unlimited subscription doesn't cover it. Empty for a regular class.
 */
export function pricingBadges(p: SlotPricing): string[] {
  if (!isSpecialPricing(p)) return [];
  if (isPayOnly(p))
    return [`Solo pago aparte${p.priceMxn !== null ? ` · ${formatMxn(p.priceMxn)}` : ""}`];
  const out = [creditsLabel(p.creditCost)];
  if (p.priceMxn !== null) out.push(`o ${formatMxn(p.priceMxn)}`);
  return out;
}

export const NOT_IN_PLAN_NOTE = "No se incluye en el plan mensual";

import { Ticket } from "lucide-react";
import { pricingBadges, NOT_IN_PLAN_NOTE } from "@/lib/slot-cost";
import type { SlotPricing } from "@/lib/types";

/**
 * Cost badge for a special class: "2 clases · o $500" and, when the monthly
 * plan doesn't cover it, "No se incluye en el plan mensual". Renders nothing
 * for a regular class, so the schedule stays clean.
 */
export function SlotCost({
  pricing,
  className = "",
}: {
  pricing: SlotPricing;
  className?: string;
}) {
  const badges = pricingBadges(pricing);
  if (badges.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${className}`}>
      <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft/50 px-2.5 py-0.5 text-ink">
        <Ticket size={12} strokeWidth={1.5} className="text-gold" />
        {badges.join(" · ")}
      </span>
      {!pricing.planIncluded ? (
        <span className="text-pink-strong">{NOT_IN_PLAN_NOTE}</span>
      ) : null}
    </div>
  );
}

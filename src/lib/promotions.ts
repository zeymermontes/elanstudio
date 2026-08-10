/**
 * Promotions: resolving which discount (if any) applies to a package purchase.
 *
 * Everything here runs server-side with the service-role client. Promotions are
 * not publicly readable by design (see 0013_promotions.sql) — a public read
 * policy would expose every discount code to anyone with the anon key.
 *
 * Scope is one-time packages only; recurring ones always resolve to no discount.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatDayLabel,
  formatTime,
  cap,
  DEFAULT_UTC_OFFSET_MIN,
} from "./format";
import type { Package, Promotion } from "./types";

/**
 * Mercado Pago rejects payments below a small floor, so a discount that would
 * take a package under this is dropped rather than producing a charge that
 * fails inside the Brick with an error the member can't act on.
 */
export const MIN_CHARGE_MXN = 10;

export type AppliedPromo = {
  promotion: Promotion;
  /** Amount taken off the list price, in MXN. */
  discountMxn: number;
  /** What the member actually pays. */
  finalMxn: number;
  /** Human-readable conditions, for the "Aplican restricciones" dialog. */
  terms: string[];
};

/** Money rounded to centavos — avoids 1234.5600000000001 reaching the API. */
function money(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Discount for a promotion against a list price, clamped so it never exceeds
 * the price itself. Pure and side-effect free; the caller decides whether the
 * resulting total is acceptable.
 */
export function calcDiscount(
  kind: "percent" | "amount",
  value: number,
  priceMxn: number,
): number {
  if (!(value > 0) || !(priceMxn > 0)) return 0;
  const raw = kind === "percent" ? (priceMxn * value) / 100 : value;
  return money(Math.min(raw, priceMxn));
}

/**
 * Last day the promotion can be used, as a member would say it.
 *
 * A window ending at midnight expires as that day *begins*, so "vigente hasta
 * el 17" would be wrong by a full day — name the previous day instead. Any
 * other end time is spelled out, since it isn't obvious from the date alone.
 */
function endLabel(endsAt: string): string {
  const local = new Date(
    new Date(endsAt).getTime() + DEFAULT_UTC_OFFSET_MIN * 60000,
  );
  if (local.getUTCHours() === 0 && local.getUTCMinutes() === 0) {
    const lastDay = new Date(new Date(endsAt).getTime() - 60000).toISOString();
    return cap(formatDayLabel(lastDay));
  }
  return `${cap(formatDayLabel(endsAt))} a las ${formatTime(endsAt)}`;
}

/**
 * The promotion's conditions in plain Spanish, for the asterisk dialog.
 *
 * Derived from the configured fields rather than typed by hand, so the terms
 * can never drift from what the checkout actually enforces. Deliberately omits
 * the code itself — the terms are shown publicly on /paquetes.
 */
export function promoTerms(promo: Promotion, scoped = false): string[] {
  const terms: string[] = [];

  const from = promo.startsAt ? cap(formatDayLabel(promo.startsAt)) : null;
  const to = promo.endsAt ? endLabel(promo.endsAt) : null;
  // The time part ("6:00 p.m.") already ends in a period — don't add a second.
  const stop = (s: string) => (s.endsWith(".") ? s : `${s}.`);
  if (from && to) terms.push(stop(`Vigente del ${from} al ${to}`));
  else if (to) terms.push(stop(`Vigente hasta el ${to}`));
  else if (from) terms.push(stop(`Vigente a partir del ${from}`));

  if (promo.newClientsOnly) {
    terms.push("Válida únicamente en tu primera compra.");
  }
  if (scoped) {
    terms.push("Aplica solo a los paquetes participantes.");
  }
  if (promo.maxRedemptions != null) {
    terms.push(`Limitada a las primeras ${promo.maxRedemptions} compras.`);
  }
  if (promo.maxPerUser != null) {
    terms.push(
      promo.maxPerUser === 1
        ? "Un uso por persona."
        : `Máximo ${promo.maxPerUser} usos por persona.`,
    );
  }

  // Only what the admin actually configured. Boilerplate ("no acumulable",
  // "no aplica al plan mensual") is true but reads as fine print nobody set,
  // and an empty list is the signal that there is nothing to disclose — the
  // asterisk is then not shown at all.
  return terms;
}

/** Applies a promotion to a price, or null when the result isn't chargeable. */
export function applyPromotion(
  promo: Promotion,
  priceMxn: number,
  scoped = false,
): AppliedPromo | null {
  const discountMxn = calcDiscount(promo.kind, promo.value, priceMxn);
  if (discountMxn <= 0) return null;
  const finalMxn = money(priceMxn - discountMxn);
  if (finalMxn < MIN_CHARGE_MXN) return null;
  return {
    promotion: promo,
    discountMxn,
    finalMxn,
    terms: promoTerms(promo, scoped),
  };
}

type PromoRow = Record<string, unknown>;

function mapPromotion(p: PromoRow): Promotion {
  return {
    id: p.id as string,
    name: p.name as string,
    code: (p.code as string) || null,
    kind: p.kind as "percent" | "amount",
    value: Number(p.value ?? 0),
    startsAt: (p.starts_at as string) ?? null,
    endsAt: (p.ends_at as string) ?? null,
    newClientsOnly: Boolean(p.new_clients_only),
    maxRedemptions: (p.max_redemptions as number) ?? null,
    maxPerUser: (p.max_per_user as number) ?? null,
    active: Boolean(p.active),
  };
}

/**
 * True when the member has never completed a purchase or held a subscription.
 * Deliberately counts *any* approved purchase, not just discounted ones.
 */
async function isNewClient(
  admin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const [{ count: purchases }, { count: subs }] = await Promise.all([
    admin
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "approved"),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["authorized", "paused"]),
  ]);
  return (purchases ?? 0) === 0 && (subs ?? 0) === 0;
}

/**
 * Redemption counts for a promotion. Counts 'pending' alongside 'approved' so
 * a payment sitting in_process still holds its spot — otherwise a capped promo
 * could be oversold while payments settle.
 */
async function redemptionCounts(
  admin: SupabaseClient,
  promotionId: string,
  userId: string | null,
): Promise<{ total: number; mine: number }> {
  const base = () =>
    admin
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("promotion_id", promotionId)
      .in("status", ["pending", "approved"]);

  const [{ count: total }, mine] = await Promise.all([
    base(),
    userId ? base().eq("user_id", userId) : Promise.resolve({ count: 0 }),
  ]);
  return { total: total ?? 0, mine: mine.count ?? 0 };
}

/**
 * Finds the best promotion for a package, or null.
 *
 * `code` is what the member typed at checkout. Without it only self-applying
 * promotions are considered — a coded promotion never fires on its own.
 *
 * `userId` may be null for anonymous visitors browsing /paquetes; per-user caps
 * and the new-client check are then treated optimistically, and re-checked for
 * real once they sign in to pay.
 */
export async function resolvePromotion(
  admin: SupabaseClient,
  {
    pkg,
    userId,
    code,
  }: { pkg: Package; userId: string | null; code?: string | null },
): Promise<AppliedPromo | null> {
  // Out of scope: the monthly plan bills a fixed preapproval amount.
  if (pkg.recurring || !(pkg.priceMxn > 0)) return null;

  const trimmed = (code ?? "").trim();
  const nowIso = new Date().toISOString();

  let query = admin
    .from("promotions")
    .select(
      "id, name, code, kind, value, starts_at, ends_at, new_clients_only, max_redemptions, max_per_user, active, promotion_packages(package_id)",
    )
    .eq("active", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`);

  query = trimmed
    ? query.ilike("code", trimmed)
    : query.is("code", null);

  const { data } = await query;
  if (!data?.length) return null;

  // Best discount wins; they never stack. Two promos combining into a price
  // nobody signed off on is worse than leaving money on the table.
  let best: AppliedPromo | null = null;

  for (const row of data) {
    const promo = mapPromotion(row);

    // Scope: no linked packages = applies to all one-time packages.
    const scope = (row.promotion_packages ?? []) as { package_id: string }[];
    if (scope.length && !scope.some((s) => s.package_id === pkg.id)) continue;

    const candidate = applyPromotion(promo, pkg.priceMxn, scope.length > 0);
    if (!candidate) continue;
    // Skip the DB round-trips below if it can't beat what we already have.
    if (best && candidate.discountMxn <= best.discountMxn) continue;

    if (promo.newClientsOnly && userId && !(await isNewClient(admin, userId))) {
      continue;
    }

    if (promo.maxRedemptions != null || promo.maxPerUser != null) {
      const { total, mine } = await redemptionCounts(admin, promo.id, userId);
      if (promo.maxRedemptions != null && total >= promo.maxRedemptions) continue;
      if (promo.maxPerUser != null && userId && mine >= promo.maxPerUser) continue;
    }

    best = candidate;
  }

  return best;
}

/**
 * Self-applying promotions for a list of packages, keyed by package id, for
 * showing struck-through prices on /paquetes. Resolves each package separately
 * — the catalog is a handful of rows, so the extra round-trips are cheaper than
 * duplicating the eligibility rules in a second code path.
 */
export async function resolvePromotionsFor(
  admin: SupabaseClient,
  packages: Package[],
  userId: string | null,
): Promise<Map<string, AppliedPromo>> {
  const entries = await Promise.all(
    packages.map(
      async (pkg) => [pkg.id, await resolvePromotion(admin, { pkg, userId })] as const,
    ),
  );
  return new Map(
    entries.filter((e): e is [string, AppliedPromo] => e[1] !== null),
  );
}

/** Short label for the discount, e.g. "-20%" or "-$200". */
export function promoBadge(promo: Promotion): string {
  return promo.kind === "percent"
    ? `-${promo.value % 1 === 0 ? promo.value : promo.value.toFixed(1)}%`
    : `-$${Math.round(promo.value)}`;
}
